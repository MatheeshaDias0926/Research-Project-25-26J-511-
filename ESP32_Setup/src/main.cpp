#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TM1637Display.h>
#include "config.h"

// Sensor states
bool sensor1State = HIGH;  // HIGH = no obstacle, LOW = obstacle detected
bool sensor2State = HIGH;
bool lastSensor1State = HIGH;
bool lastSensor2State = HIGH;

// Passenger counting
int passengerCount = 0;

// State machine for counting
enum CountingState {
  IDLE,
  SENSOR1_TRIGGERED,
  SENSOR2_TRIGGERED,
  BOTH_TRIGGERED_IN,
  BOTH_TRIGGERED_OUT
};

CountingState currentState = IDLE;
unsigned long lastStateChange = 0;

// Track if sensor was triggered during this sequence
bool sensor1WasTriggered = false;
bool sensor2WasTriggered = false;

// Footboard detection
unsigned long sensor1BlockedStartTime = 0;
bool sensor1BlockedFor2Sec = false;
bool footboardDetected = false;

// Debounce
unsigned long lastDebounceTime1 = 0;
unsigned long lastDebounceTime2 = 0;

// Send interval
unsigned long lastSendTime = 0;

// WiFi reconnect
unsigned long lastWifiCheck = 0;

// Offline data buffer (stores data when WiFi is down)
struct OfflineData {
  int occupancy;
  bool footboard;
  unsigned long timestamp;
};
const int MAX_BUFFER = 20;
OfflineData offlineBuffer[MAX_BUFFER];
int bufferCount = 0;

// TM1637 Display object
TM1637Display display(DISPLAY_CLK, DISPLAY_DIO);

// Function declarations
void connectWiFi();
void checkWiFiReconnect();
void readSensors();
void processCountingLogic();
void checkFootboardDetection();
void sendDataToBackend(bool isFootboardViolation);
void sendFootboardViolation();
void sendBufferedData();
void updateDisplay();
void showFootboardWarning();
void playBuzzer(int duration, int frequency);
void playEntrySound();
void playExitSound();
void playFootboardWarning();

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== ESP32 Passenger Counter — Real-World Mode ===");
  Serial.print("Bus: ");
  Serial.println(LICENSE_PLATE);
  Serial.print("Backend: ");
  Serial.println(BACKEND_URL);
  Serial.print("Send Interval: ");
  Serial.print(SEND_INTERVAL / 1000);
  Serial.println("s");

  // Configure IR sensor pins
  pinMode(SENSOR1_PIN, INPUT);
  pinMode(SENSOR2_PIN, INPUT);
  Serial.println("IR Sensors initialized");

  // Configure buzzer pin
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize TM1637 Display
  display.setBrightness(0x0f);
  display.clear();

  // Show initial count (0)
  updateDisplay();
  
  // Startup beep
  playBuzzer(200, 1000);
  delay(100);
  playBuzzer(200, 1500);

  // Connect to WiFi
  connectWiFi();
}

void loop() {
  // Read sensor states with debouncing
  readSensors();

  // Process passenger counting state machine
  processCountingLogic();

  // Check for footboard detection
  checkFootboardDetection();

  // Auto-reconnect WiFi if lost
  checkWiFiReconnect();

  // Send data periodically
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    Serial.println("\n[SCHEDULED SEND]");
    sendDataToBackend(false);
    lastSendTime = millis();
  }

  delay(10);
}

void connectWiFi() {
  Serial.print("\nConnecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < WIFI_CONNECT_TIMEOUT) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    // Send any buffered data
    if (bufferCount > 0) {
      Serial.println("Sending buffered offline data...");
      sendBufferedData();
    }
  } else {
    Serial.println("\nFailed to connect to WiFi!");
    Serial.println("Will retry automatically...");
  }
}

void checkWiFiReconnect() {
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWifiCheck >= WIFI_RECONNECT_INTERVAL) {
      lastWifiCheck = millis();
      Serial.println("[WiFi] Disconnected! Attempting reconnect...");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      
      // Quick check (2 seconds)
      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 4) {
        delay(500);
        attempts++;
      }
      
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("[WiFi] Reconnected!");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
        
        // Send buffered data
        if (bufferCount > 0) {
          sendBufferedData();
        }
      }
    }
  }
}

void readSensors() {
  // Read Sensor 1 with debouncing
  bool reading1 = digitalRead(SENSOR1_PIN);
  if (reading1 != lastSensor1State) {
    lastDebounceTime1 = millis();
  }
  if ((millis() - lastDebounceTime1) > DEBOUNCE_DELAY_MS) {
    if (reading1 != sensor1State) {
      sensor1State = reading1;
      Serial.print("SENSOR 1: ");
      Serial.println(sensor1State == LOW ? "BLOCKED" : "CLEAR");
    }
  }
  lastSensor1State = reading1;

  // Read Sensor 2 with debouncing
  bool reading2 = digitalRead(SENSOR2_PIN);
  if (reading2 != lastSensor2State) {
    lastDebounceTime2 = millis();
  }
  if ((millis() - lastDebounceTime2) > DEBOUNCE_DELAY_MS) {
    if (reading2 != sensor2State) {
      sensor2State = reading2;
      Serial.print("SENSOR 2: ");
      Serial.println(sensor2State == LOW ? "BLOCKED" : "CLEAR");
    }
  }
  lastSensor2State = reading2;
}

void processCountingLogic() {
  // Check for timeout
  if (currentState != IDLE && (millis() - lastStateChange > STATE_TIMEOUT_MS)) {
    if ((currentState == SENSOR1_TRIGGERED || currentState == BOTH_TRIGGERED_IN) && 
        sensor2WasTriggered) {
      passengerCount++;
      Serial.println("*** PERSON ENTERED (timeout) ***");
      Serial.print("Occupancy: ");
      Serial.println(passengerCount);
      updateDisplay();
      playEntrySound();
    } 
    else if ((currentState == SENSOR2_TRIGGERED || currentState == BOTH_TRIGGERED_OUT) && 
             sensor1WasTriggered) {
      passengerCount--;
      if (passengerCount < 0) passengerCount = 0;
      Serial.println("*** PERSON EXITED (timeout) ***");
      Serial.print("Occupancy: ");
      Serial.println(passengerCount);
      updateDisplay();
      playExitSound();
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
        Serial.println("\n=== PERSON ENTERED ===");
        Serial.print("Occupancy: ");
        Serial.println(passengerCount);
        updateDisplay();
        playEntrySound();
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
        passengerCount--;
        if (passengerCount < 0) passengerCount = 0;
        Serial.println("\n=== PERSON EXITED ===");
        Serial.print("Occupancy: ");
        Serial.println(passengerCount);
        updateDisplay();
        playExitSound();
        currentState = IDLE;
        sensor1WasTriggered = false;
        sensor2WasTriggered = false;
      }
      break;
  }
}

void sendDataToBackend(bool isFootboardViolation) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[OFFLINE] WiFi not connected, buffering data...");
    
    // Buffer the data for later
    if (bufferCount < MAX_BUFFER) {
      offlineBuffer[bufferCount].occupancy = passengerCount;
      offlineBuffer[bufferCount].footboard = isFootboardViolation;
      offlineBuffer[bufferCount].timestamp = millis();
      bufferCount++;
      Serial.print("[OFFLINE] Buffered. Count: ");
      Serial.println(bufferCount);
    } else {
      Serial.println("[OFFLINE] Buffer full! Oldest data will be lost.");
    }
    return;
  }

  HTTPClient http;

  // Create JSON payload — GPS will be filled by backend from phone GPS cache
  JsonDocument jsonDoc;
  jsonDoc["licensePlate"] = LICENSE_PLATE;
  jsonDoc["currentOccupancy"] = passengerCount;
  
  // Send placeholder GPS (0,0) — backend auto-fills from phone GPS
  JsonObject gps = jsonDoc["gps"].to<JsonObject>();
  gps["lat"] = 0;
  gps["lon"] = 0;
  
  jsonDoc["footboardStatus"] = isFootboardViolation;
  jsonDoc["speed"] = 0;  // Backend auto-fills from phone GPS

  String jsonString;
  serializeJson(jsonDoc, jsonString);

  Serial.println("\n--- Sending Data to Backend ---");
  Serial.print("URL: ");
  Serial.println(BACKEND_URL);
  Serial.print("JSON: ");
  Serial.println(jsonString);

  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode > 0) {
    Serial.print("HTTP Response: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.print("Response: ");
    Serial.println(response);
  } else {
    Serial.print("Error: ");
    Serial.println(http.errorToString(httpResponseCode));
    
    // Buffer on send failure
    if (bufferCount < MAX_BUFFER) {
      offlineBuffer[bufferCount].occupancy = passengerCount;
      offlineBuffer[bufferCount].footboard = isFootboardViolation;
      offlineBuffer[bufferCount].timestamp = millis();
      bufferCount++;
    }
  }

  http.end();
}

void sendBufferedData() {
  if (WiFi.status() != WL_CONNECTED || bufferCount == 0) return;

  Serial.print("[BUFFER] Sending ");
  Serial.print(bufferCount);
  Serial.println(" buffered entries...");

  HTTPClient http;

  for (int i = 0; i < bufferCount; i++) {
    JsonDocument jsonDoc;
    jsonDoc["licensePlate"] = LICENSE_PLATE;
    jsonDoc["currentOccupancy"] = offlineBuffer[i].occupancy;
    
    JsonObject gps = jsonDoc["gps"].to<JsonObject>();
    gps["lat"] = 0;
    gps["lon"] = 0;
    
    jsonDoc["footboardStatus"] = offlineBuffer[i].footboard;
    jsonDoc["speed"] = 0;

    String jsonString;
    serializeJson(jsonDoc, jsonString);

    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(jsonString);
    http.end();

    Serial.print("[BUFFER] Sent ");
    Serial.print(i + 1);
    Serial.print("/");
    Serial.print(bufferCount);
    Serial.print(" → HTTP ");
    Serial.println(code);
    
    delay(100);  // Small delay between sends
  }

  bufferCount = 0;
  Serial.println("[BUFFER] All buffered data sent!");
}

void checkFootboardDetection() {
  if (sensor1State == LOW && (currentState == IDLE || currentState == SENSOR1_TRIGGERED)) {
    if (sensor1BlockedStartTime == 0) {
      sensor1BlockedStartTime = millis();
    }
    
    if (!sensor1BlockedFor2Sec && (millis() - sensor1BlockedStartTime >= FOOTBOARD_BLOCK_MS)) {
      sensor1BlockedFor2Sec = true;
      Serial.println("FOOTBOARD: Sensor 1 blocked 2+ sec!");
    }
    
    if (sensor1BlockedFor2Sec && 
        (millis() - sensor1BlockedStartTime >= FOOTBOARD_BLOCK_MS + FOOTBOARD_WAIT_MS)) {
      
      if (!sensor2WasTriggered && sensor2State == HIGH) {
        footboardDetected = true;
        Serial.println("\n!!! FOOTBOARD VIOLATION DETECTED !!!");
        
        showFootboardWarning();
        playFootboardWarning();
        sendFootboardViolation();
        
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

void sendFootboardViolation() {
  Serial.println("--- FOOTBOARD VIOLATION ---");
  sendDataToBackend(true);
}

void updateDisplay() {
  display.showNumberDec(passengerCount, false);
}

void playBuzzer(int duration, int frequency) {
  tone(BUZZER_PIN, frequency, duration);
  delay(duration);
  noTone(BUZZER_PIN);
}

void playEntrySound() {
  playBuzzer(100, 1000);
  delay(50);
  playBuzzer(100, 1500);
}

void playExitSound() {
  playBuzzer(100, 1500);
  delay(50);
  playBuzzer(100, 1000);
}

void showFootboardWarning() {
  for (int i = 0; i < 3; i++) {
    display.clear();
    delay(200);
    display.showNumberDec(8888, true);
    delay(200);
  }
  updateDisplay();
}

void playFootboardWarning() {
  for (int i = 0; i < 6; i++) {
    playBuzzer(200, 800);
    delay(50);
    playBuzzer(200, 1200);
    delay(50);
  }
}
