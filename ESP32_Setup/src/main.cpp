#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include "config.h"

// ============================================================
//  GPS Module (NEO-6M via UART2)
// ============================================================
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);  // UART2: RX=GPIO16, TX=GPIO17

// GPS state
double gpsLat = 0.0;
double gpsLon = 0.0;
double gpsSpeed = 0.0;      // Speed in km/h
int    gpsSats = 0;
double gpsHdop = 99.9;
bool   gpsFixed = false;
unsigned long lastGpsUpdate = 0;

// ============================================================
//  IR Sensor State
// ============================================================
bool sensor1State = HIGH;   // HIGH = no obstacle, LOW = obstacle detected
bool sensor2State = HIGH;
bool lastSensor1State = HIGH;
bool lastSensor2State = HIGH;

// ============================================================
//  Passenger Counting
// ============================================================
int passengerCount = 0;

enum CountingState {
  IDLE,
  SENSOR1_TRIGGERED,
  SENSOR2_TRIGGERED,
  BOTH_TRIGGERED_IN,
  BOTH_TRIGGERED_OUT
};

CountingState currentState = IDLE;
unsigned long lastStateChange = 0;
bool sensor1WasTriggered = false;
bool sensor2WasTriggered = false;

// ============================================================
//  Footboard Detection
// ============================================================
unsigned long sensor1BlockedStartTime = 0;
bool sensor1BlockedFor2Sec = false;
bool footboardDetected = false;

// ============================================================
//  Debounce & Timing
// ============================================================
unsigned long lastDebounceTime1 = 0;
unsigned long lastDebounceTime2 = 0;
unsigned long lastSendTime = 0;
unsigned long lastWifiCheck = 0;

// ============================================================
//  BOOT Button (GPIO 0) — Manual Test Mode
// ============================================================
bool lastButtonState = HIGH;
unsigned long lastButtonDebounce = 0;

// ============================================================
//  Offline Buffer
// ============================================================
struct OfflineData {
  int occupancy;
  bool footboard;
  double lat;
  double lon;
  double speed;
  unsigned long timestamp;
};
OfflineData offlineBuffer[MAX_BUFFER];
int bufferCount = 0;

// ============================================================
//  Function Declarations
// ============================================================
void connectWiFi();
void checkWiFiReconnect();
void readSensors();
void readGPS();
void processCountingLogic();
void checkFootboardDetection();
void sendDataToBackend(bool isFootboardViolation);
void sendBufferedData();
void printGpsStatus();

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println(F("\n========================================"));
  Serial.println(F("  ESP32 Smart Bus — GPS Direct Mode"));
  Serial.println(F("========================================"));
  Serial.print(F("Bus:       ")); Serial.println(LICENSE_PLATE);
  Serial.print(F("Backend:   ")); Serial.println(BACKEND_URL);
  Serial.print(F("Interval:  ")); Serial.print(SEND_INTERVAL); Serial.println(F("ms"));
  Serial.println(F("GPS:       NEO-6M on UART2 (GPIO16/17)"));
  Serial.println(F("Sensors:   IR on GPIO18/19"));
  Serial.println(F("----------------------------------------"));

  // Configure IR sensor pins
  pinMode(SENSOR1_PIN, INPUT);
  pinMode(SENSOR2_PIN, INPUT);
  Serial.println(F("[INIT] IR Sensors ready (GPIO 18, 19)"));

  // Configure BOOT button
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  Serial.println(F("[INIT] BOOT button ready (GPIO 0)"));

  // Initialize GPS UART2
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.print(F("[INIT] GPS UART2 @ ")); Serial.print(GPS_BAUD); Serial.println(F(" baud"));
  Serial.println(F("[GPS]  Waiting for satellite fix..."));

  // Connect to WiFi
  connectWiFi();
}

// ============================================================
//  MAIN LOOP
// ============================================================
void loop() {
  // 1. Read GPS data from NEO-6M
  readGPS();

  // 2. Read IR sensors with debouncing
  readSensors();

  // 3. Process passenger counting state machine
  processCountingLogic();

  // 4. Check BOOT button → toggle manual passenger count
  bool buttonReading = digitalRead(BOOT_BUTTON_PIN);
  if (buttonReading == LOW && lastButtonState == HIGH && (millis() - lastButtonDebounce > 300)) {
    lastButtonDebounce = millis();
    if (passengerCount == TEST_PASSENGER_COUNT) {
      passengerCount = 0;
      Serial.println(F("\n[TEST] Reset passenger count → 0"));
    } else {
      passengerCount = TEST_PASSENGER_COUNT;
      Serial.print(F("\n[TEST] Set passenger count → "));
      Serial.println(TEST_PASSENGER_COUNT);
    }
  }
  lastButtonState = buttonReading;

  // 5. Check for footboard detection
  checkFootboardDetection();

  // 6. Auto-reconnect WiFi if lost
  checkWiFiReconnect();

  // 7. Send data to backend on schedule
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    sendDataToBackend(false);
    lastSendTime = millis();
  }

  delay(5);  // Small yield to prevent watchdog issues
}

// ============================================================
//  GPS READING
//  Called every loop iteration to feed NMEA bytes to TinyGPS++
// ============================================================
void readGPS() {
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read();
    if (gps.encode(c)) {
      // New sentence decoded — check if we have a valid location fix
      if (gps.location.isValid() && gps.location.isUpdated()) {
        double newLat = gps.location.lat();
        double newLon = gps.location.lng();
        
        // Basic sanity check — valid Sri Lanka coordinates roughly (5.9–9.9, 79.5–82.0)
        if (newLat > 4.0 && newLat < 12.0 && newLon > 79.0 && newLon < 83.0) {
          gpsLat = newLat;
          gpsLon = newLon;
          gpsFixed = true;
          lastGpsUpdate = millis();
        }
      }

      if (gps.speed.isValid()) {
        gpsSpeed = gps.speed.kmph();  // Speed in km/h from GPS
      }

      if (gps.satellites.isValid()) {
        gpsSats = gps.satellites.value();
      }

      if (gps.hdop.isValid()) {
        gpsHdop = gps.hdop.hdop();
      }
    }
  }

  // Check if GPS fix has gone stale
  if (gpsFixed && (millis() - lastGpsUpdate > GPS_STALE_MS)) {
    gpsFixed = false;
    Serial.println(F("[GPS] Fix gone stale — no update in 10s"));
  }
}

// ============================================================
//  WIFI CONNECTION
// ============================================================
void connectWiFi() {
  Serial.print(F("\n[WiFi] Connecting to: "));
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < WIFI_CONNECT_TIMEOUT) {
    delay(500);
    Serial.print(F("."));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[WiFi] Connected!"));
    Serial.print(F("[WiFi] IP: "));
    Serial.println(WiFi.localIP());

    if (bufferCount > 0) {
      Serial.println(F("[WiFi] Sending buffered offline data..."));
      sendBufferedData();
    }
  } else {
    Serial.println(F("\n[WiFi] Connection failed — will retry automatically"));
  }
}

void checkWiFiReconnect() {
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWifiCheck >= WIFI_RECONNECT_INTERVAL) {
      lastWifiCheck = millis();
      Serial.println(F("[WiFi] Disconnected — attempting reconnect..."));
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 4) {
        delay(500);
        attempts++;
      }

      if (WiFi.status() == WL_CONNECTED) {
        Serial.println(F("[WiFi] Reconnected!"));
        if (bufferCount > 0) sendBufferedData();
      }
    }
  }
}

// ============================================================
//  IR SENSOR READING (with debounce)
// ============================================================
void readSensors() {
  bool reading1 = digitalRead(SENSOR1_PIN);
  if (reading1 != lastSensor1State) lastDebounceTime1 = millis();
  if ((millis() - lastDebounceTime1) > DEBOUNCE_DELAY_MS) {
    if (reading1 != sensor1State) {
      sensor1State = reading1;
      Serial.print(F("SENSOR1: "));
      Serial.println(sensor1State == LOW ? F("BLOCKED") : F("CLEAR"));
    }
  }
  lastSensor1State = reading1;

  bool reading2 = digitalRead(SENSOR2_PIN);
  if (reading2 != lastSensor2State) lastDebounceTime2 = millis();
  if ((millis() - lastDebounceTime2) > DEBOUNCE_DELAY_MS) {
    if (reading2 != sensor2State) {
      sensor2State = reading2;
      Serial.print(F("SENSOR2: "));
      Serial.println(sensor2State == LOW ? F("BLOCKED") : F("CLEAR"));
    }
  }
  lastSensor2State = reading2;
}

// ============================================================
//  PASSENGER COUNTING STATE MACHINE
// ============================================================
void processCountingLogic() {
  // Timeout check
  if (currentState != IDLE && (millis() - lastStateChange > STATE_TIMEOUT_MS)) {
    if ((currentState == SENSOR1_TRIGGERED || currentState == BOTH_TRIGGERED_IN) && sensor2WasTriggered) {
      passengerCount++;
      Serial.print(F("*** PERSON ENTERED (timeout) — Occupancy: "));
      Serial.println(passengerCount);
    } else if ((currentState == SENSOR2_TRIGGERED || currentState == BOTH_TRIGGERED_OUT) && sensor1WasTriggered) {
      passengerCount = max(0, passengerCount - 1);
      Serial.print(F("*** PERSON EXITED (timeout) — Occupancy: "));
      Serial.println(passengerCount);
    }
    currentState = IDLE;
    sensor1WasTriggered = false;
    sensor2WasTriggered = false;
  }

  switch (currentState) {
    case IDLE:
      sensor1WasTriggered = false;
      sensor2WasTriggered = false;
      if (sensor1State == LOW) {
        currentState = SENSOR1_TRIGGERED;
        sensor1WasTriggered = true;
        lastStateChange = millis();
      } else if (sensor2State == LOW) {
        currentState = SENSOR2_TRIGGERED;
        sensor2WasTriggered = true;
        lastStateChange = millis();
      }
      break;

    case SENSOR1_TRIGGERED:
      if (sensor2State == LOW) {
        sensor2WasTriggered = true;
        currentState = BOTH_TRIGGERED_IN;
        lastStateChange = millis();
      }
      break;

    case BOTH_TRIGGERED_IN:
      if (sensor1State == HIGH && sensor2State == HIGH) {
        passengerCount++;
        Serial.print(F("\n=== PERSON ENTERED === Occupancy: "));
        Serial.println(passengerCount);
        currentState = IDLE;
        sensor1WasTriggered = false;
        sensor2WasTriggered = false;
      }
      break;

    case SENSOR2_TRIGGERED:
      if (sensor1State == LOW) {
        sensor1WasTriggered = true;
        currentState = BOTH_TRIGGERED_OUT;
        lastStateChange = millis();
      }
      break;

    case BOTH_TRIGGERED_OUT:
      if (sensor1State == HIGH && sensor2State == HIGH) {
        passengerCount = max(0, passengerCount - 1);
        Serial.print(F("\n=== PERSON EXITED === Occupancy: "));
        Serial.println(passengerCount);
        currentState = IDLE;
        sensor1WasTriggered = false;
        sensor2WasTriggered = false;
      }
      break;
  }
}

// ============================================================
//  FOOTBOARD DETECTION
// ============================================================
void checkFootboardDetection() {
  if (sensor1State == LOW && (currentState == IDLE || currentState == SENSOR1_TRIGGERED)) {
    if (sensor1BlockedStartTime == 0) {
      sensor1BlockedStartTime = millis();
    }

    if (!sensor1BlockedFor2Sec && (millis() - sensor1BlockedStartTime >= FOOTBOARD_BLOCK_MS)) {
      sensor1BlockedFor2Sec = true;
      Serial.println(F("[FOOTBOARD] Sensor 1 blocked 2+ sec!"));
    }

    if (sensor1BlockedFor2Sec &&
        (millis() - sensor1BlockedStartTime >= FOOTBOARD_BLOCK_MS + FOOTBOARD_WAIT_MS)) {
      if (!sensor2WasTriggered && sensor2State == HIGH) {
        footboardDetected = true;
        Serial.println(F("\n!!! FOOTBOARD VIOLATION DETECTED !!!"));
        sendDataToBackend(true);  // Immediate footboard violation send

        sensor1BlockedStartTime = 0;
        sensor1BlockedFor2Sec = false;
        footboardDetected = false;
        sensor1WasTriggered = false;
        sensor2WasTriggered = false;
        currentState = IDLE;
      }
    }
  } else {
    if (sensor1State == HIGH && sensor1BlockedStartTime > 0) {
      sensor1BlockedStartTime = 0;
      sensor1BlockedFor2Sec = false;
    }
  }
}

// ============================================================
//  SEND DATA TO BACKEND
//  Now includes real GPS from NEO-6M module!
// ============================================================
void sendDataToBackend(bool isFootboardViolation) {
  // Check if GPS is stale
  bool hasGps = gpsFixed && (millis() - lastGpsUpdate <= GPS_STALE_MS);
  
  // Use real GPS if available, else send 0,0 (backend will skip safety pipeline)
  double sendLat   = hasGps ? gpsLat   : 0.0;
  double sendLon   = hasGps ? gpsLon   : 0.0;
  double sendSpeed = hasGps ? gpsSpeed : 0.0;

  // Print GPS status to serial
  Serial.println(F("\n--- Sending Data ---"));
  if (hasGps) {
    Serial.print(F("[GPS] Fix: YES | Sats: ")); Serial.print(gpsSats);
    Serial.print(F(" | HDOP: ")); Serial.print(gpsHdop, 1);
    Serial.print(F(" | Lat: ")); Serial.print(sendLat, 6);
    Serial.print(F(" | Lon: ")); Serial.print(sendLon, 6);
    Serial.print(F(" | Speed: ")); Serial.print(sendSpeed, 1); Serial.println(F(" km/h"));
  } else {
    Serial.println(F("[GPS] Fix: NO — sending 0,0 (no satellites)"));
  }
  Serial.print(F("[BUS] Occupancy: ")); Serial.println(passengerCount);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[OFFLINE] WiFi not connected — buffering..."));
    if (bufferCount < MAX_BUFFER) {
      offlineBuffer[bufferCount] = {
        passengerCount,
        isFootboardViolation,
        sendLat,
        sendLon,
        sendSpeed,
        millis()
      };
      bufferCount++;
      Serial.print(F("[OFFLINE] Buffer count: ")); Serial.println(bufferCount);
    } else {
      Serial.println(F("[OFFLINE] Buffer full!"));
    }
    return;
  }

  // Build JSON payload
  JsonDocument jsonDoc;
  jsonDoc["licensePlate"]    = LICENSE_PLATE;
  jsonDoc["currentOccupancy"] = passengerCount;
  jsonDoc["footboardStatus"] = isFootboardViolation;
  jsonDoc["speed"]           = sendSpeed;

  JsonObject gpsObj = jsonDoc["gps"].to<JsonObject>();
  gpsObj["lat"] = sendLat;
  gpsObj["lon"] = sendLon;

  // GPS metadata (useful for debugging)
  JsonObject gpsMeta = jsonDoc["gpsMeta"].to<JsonObject>();
  gpsMeta["fixed"]     = gpsFixed;
  gpsMeta["satellites"] = gpsSats;
  gpsMeta["hdop"]      = gpsHdop;
  gpsMeta["source"]    = "esp32_neo6m";

  String jsonString;
  serializeJson(jsonDoc, jsonString);

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);  // 5s timeout — backend now responds immediately (async pipeline)

  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode > 0) {
    Serial.print(F("[HTTP] Response: ")); Serial.println(httpResponseCode);
    // Don't read full body to save memory — just check code
  } else {
    Serial.print(F("[HTTP] Error: ")); Serial.println(http.errorToString(httpResponseCode));
    // Buffer on failure
    if (bufferCount < MAX_BUFFER) {
      offlineBuffer[bufferCount] = {
        passengerCount, isFootboardViolation,
        sendLat, sendLon, sendSpeed, millis()
      };
      bufferCount++;
    }
  }

  http.end();
}

// ============================================================
//  SEND BUFFERED DATA (after WiFi reconnect)
// ============================================================
void sendBufferedData() {
  if (WiFi.status() != WL_CONNECTED || bufferCount == 0) return;

  Serial.print(F("[BUFFER] Sending ")); Serial.print(bufferCount); Serial.println(F(" buffered entries..."));

  HTTPClient http;

  for (int i = 0; i < bufferCount; i++) {
    JsonDocument jsonDoc;
    jsonDoc["licensePlate"]    = LICENSE_PLATE;
    jsonDoc["currentOccupancy"] = offlineBuffer[i].occupancy;
    jsonDoc["footboardStatus"] = offlineBuffer[i].footboard;
    jsonDoc["speed"]           = offlineBuffer[i].speed;

    JsonObject gpsObj = jsonDoc["gps"].to<JsonObject>();
    gpsObj["lat"] = offlineBuffer[i].lat;
    gpsObj["lon"] = offlineBuffer[i].lon;

    JsonObject gpsMeta = jsonDoc["gpsMeta"].to<JsonObject>();
    gpsMeta["source"] = "esp32_neo6m_buffered";
    gpsMeta["buffered"] = true;

    String jsonString;
    serializeJson(jsonDoc, jsonString);

    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(5000);
    int code = http.POST(jsonString);
    http.end();

    Serial.print(F("[BUFFER] ")); Serial.print(i + 1);
    Serial.print(F("/")); Serial.print(bufferCount);
    Serial.print(F(" → HTTP ")); Serial.println(code);
    delay(100);
  }

  bufferCount = 0;
  Serial.println(F("[BUFFER] All buffered data sent!"));
}
