/*
 * Smart Bus Safety System — ESP32 Firmware v2.0
 * ==============================================
 * Features:
 *   - Passenger counting via dual IR sensors (KY-032)
 *   - Real GPS positioning & speed via NEO-6M module
 *   - On-device ML inference for rollover risk & stopping distance
 *   - Footboard violation detection
 *   - Buzzer alarms for safety warnings
 *   - TM1637 occupancy display
 *   - Offline data buffering (LittleFS)
 *   - Periodic + event-driven data transmission to cloud backend
 *
 * Hardware:
 *   GPIO 16/17 — NEO-6M GPS (Serial2)
 *   GPIO 18    — IR Sensor 1 (Outer)
 *   GPIO 19    — IR Sensor 2 (Inner)
 *   GPIO 21    — Active Buzzer
 *   GPIO 22/23 — TM1637 Display (CLK/DIO)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TM1637Display.h>
#include <TinyGPSPlus.h>
#include <LittleFS.h>
#include <math.h>

#include "config.h"
#include "safety_model.h"  // Auto-generated ML model (m2cgen output)

// ============================================================
// Objects
// ============================================================
TM1637Display display(DISPLAY_CLK, DISPLAY_DIO);
TinyGPSPlus gpsParser;
HardwareSerial gpsSerial(2);  // UART2

// ============================================================
// Passenger Counting State
// ============================================================
bool sensor1State = HIGH;
bool sensor2State = HIGH;
bool lastSensor1State = HIGH;
bool lastSensor2State = HIGH;
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
const unsigned long STATE_TIMEOUT = 5000;
bool sensor1WasTriggered = false;
bool sensor2WasTriggered = false;

// ============================================================
// Footboard Detection State
// ============================================================
unsigned long sensor1BlockedStartTime = 0;
bool sensor1BlockedFor2Sec = false;
bool footboardDetected = false;
const unsigned long FOOTBOARD_BLOCK_TIME = 2000;
const unsigned long FOOTBOARD_WAIT_TIME = 1000;

// ============================================================
// Debounce
// ============================================================
unsigned long lastDebounceTime1 = 0;
unsigned long lastDebounceTime2 = 0;
const unsigned long debounceDelay = 50;

// ============================================================
// Timing
// ============================================================
unsigned long lastSendTime = 0;
unsigned long lastMLTime = 0;
unsigned long lastGPSReadTime = 0;
unsigned long lastWiFiRetry = 0;

// ============================================================
// GPS Data
// ============================================================
double currentLat = 0.0;
double currentLon = 0.0;
float currentSpeed = 0.0;         // km/h from GPS
float currentAltitude = 0.0;      // meters
int satelliteCount = 0;
float gpsAccuracy = 99.0;         // HDOP
bool gpsValid = false;

// Previous GPS for radius/gradient computation
double prevLat = 0.0;
double prevLon = 0.0;
float prevAltitude = 0.0;
float prevHeading = 0.0;
bool hasPrevGPS = false;

// ============================================================
// ML Inference Results
// ============================================================
float riskScore = 0.0;
float stoppingDistance = 0.0;
String safetyDecision = "UNKNOWN";
float estimatedRadius = MAX_RADIUS;    // Default: straight road
float estimatedGradient = 0.0;

// ============================================================
// Offline Buffer
// ============================================================
int bufferedRecordCount = 0;

// ============================================================
// Function Declarations
// ============================================================
void connectWiFi();
void readSensors();
void processCountingLogic();
void checkFootboardDetection();
void readGPS();
void runMLInference();
void computeRadiusAndGradient();
void sendDataToBackend(bool isFootboardViolation, bool isCriticalRisk);
void sendBufferedData();
void bufferDataLocally(const String& jsonPayload);
void updateDisplay();
void showFootboardWarning();
void playBuzzer(int duration, int frequency);
void playEntrySound();
void playExitSound();
void playFootboardWarning();
void playRiskWarning();
void playRiskCritical();
float haversineDistance(double lat1, double lon1, double lat2, double lon2);

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================");
  Serial.println("  Smart Bus Safety System v2.0");
  Serial.println("  ESP32 Edge ML + GPS + Cloud");
  Serial.println("========================================");

  // IR Sensors
  pinMode(SENSOR1_PIN, INPUT);
  pinMode(SENSOR2_PIN, INPUT);
  Serial.println("[INIT] IR Sensors: GPIO18 (outer), GPIO19 (inner)");

  // Buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.println("[INIT] Buzzer: GPIO21");

  // Display
  display.setBrightness(0x0f);
  display.clear();
  updateDisplay();
  Serial.println("[INIT] TM1637 Display: GPIO22/23");

  // GPS
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[INIT] GPS (NEO-6M): Serial2 @ 9600 baud, GPIO16/17");

  // LittleFS for offline buffering
  if (!LittleFS.begin(true)) {
    Serial.println("[INIT] LittleFS mount failed!");
  } else {
    Serial.println("[INIT] LittleFS mounted for offline buffering");
  }

  // Startup beeps
  playBuzzer(200, 1000);
  delay(100);
  playBuzzer(200, 1500);

  // Connect WiFi
  connectWiFi();

  Serial.println("\n[READY] System initialized. Waiting for GPS fix...");
  Serial.printf("[CONFIG] Device: %s | Bus: %s\n", DEVICE_ID, LICENSE_PLATE);
  Serial.printf("[CONFIG] Backend: %s\n", BACKEND_URL);
  Serial.printf("[CONFIG] Send interval: %dms | ML interval: %dms\n",
                SEND_INTERVAL_MS, ML_INFERENCE_INTERVAL);
}

// ============================================================
// MAIN LOOP
// ============================================================
void loop() {
  // 1. Read IR sensors
  readSensors();

  // 2. Process passenger counting
  processCountingLogic();

  // 3. Check footboard violations
  checkFootboardDetection();

  // 4. Read GPS data periodically
  if (millis() - lastGPSReadTime >= GPS_READ_INTERVAL) {
    readGPS();
    lastGPSReadTime = millis();
  }

  // 5. Run ML inference periodically
  if (millis() - lastMLTime >= ML_INFERENCE_INTERVAL) {
    if (gpsValid || passengerCount > 0) {
      runMLInference();
    }
    lastMLTime = millis();
  }

  // 6. WiFi reconnection check
  if (WiFi.status() != WL_CONNECTED && millis() - lastWiFiRetry >= WIFI_RETRY_INTERVAL) {
    Serial.println("[WIFI] Reconnecting...");
    connectWiFi();
    lastWiFiRetry = millis();
  }

  // 7. Send data periodically
  if (millis() - lastSendTime >= SEND_INTERVAL_MS) {
    Serial.println("\n[SEND] Scheduled 30s transmission");
    sendDataToBackend(false, false);
    lastSendTime = millis();

    // Also try to send any buffered data
    if (WiFi.status() == WL_CONNECTED && bufferedRecordCount > 0) {
      sendBufferedData();
    }
  }

  delay(10);
}

// ============================================================
// WiFi Connection
// ============================================================
void connectWiFi() {
  Serial.printf("[WIFI] Connecting to: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] Connection failed. Will retry later.");
  }
}

// ============================================================
// GPS Reading
// ============================================================
void readGPS() {
  while (gpsSerial.available() > 0) {
    gpsParser.encode(gpsSerial.read());
  }

  if (gpsParser.location.isValid() && gpsParser.location.isUpdated()) {
    // Store previous for radius/gradient computation
    if (gpsValid) {
      prevLat = currentLat;
      prevLon = currentLon;
      prevAltitude = currentAltitude;
      prevHeading = gpsParser.course.isValid() ? gpsParser.course.deg() : prevHeading;
      hasPrevGPS = true;
    }

    currentLat = gpsParser.location.lat();
    currentLon = gpsParser.location.lng();
    gpsValid = true;

    if (gpsParser.speed.isValid()) {
      currentSpeed = gpsParser.speed.kmph();
    }

    if (gpsParser.altitude.isValid()) {
      currentAltitude = gpsParser.altitude.meters();
    }

    satelliteCount = gpsParser.satellites.isValid() ? gpsParser.satellites.value() : 0;
    gpsAccuracy = gpsParser.hdop.isValid() ? gpsParser.hdop.hdop() : 99.0;

    // Compute curve radius and gradient from GPS trajectory
    if (hasPrevGPS) {
      computeRadiusAndGradient();
    }
  }

  // Log GPS status occasionally
  static unsigned long lastGPSLog = 0;
  if (millis() - lastGPSLog >= 10000) {
    if (gpsValid) {
      Serial.printf("[GPS] Lat: %.6f, Lon: %.6f, Speed: %.1f km/h, Sats: %d, Alt: %.1fm\n",
                    currentLat, currentLon, currentSpeed, satelliteCount, currentAltitude);
    } else {
      Serial.printf("[GPS] Waiting for fix... (chars processed: %lu)\n", gpsParser.charsProcessed());
    }
    lastGPSLog = millis();
  }
}

// ============================================================
// Compute Curve Radius & Gradient from GPS Trajectory
// ============================================================
void computeRadiusAndGradient() {
  float dist = haversineDistance(prevLat, prevLon, currentLat, currentLon);

  // Only compute if we've moved a meaningful distance
  if (dist < 2.0 || currentSpeed < MIN_SPEED_FOR_RADIUS) {
    return;
  }

  // --- Curve Radius ---
  float currentHeading = gpsParser.course.isValid() ? gpsParser.course.deg() : prevHeading;
  float headingChange = fabs(currentHeading - prevHeading);

  // Handle wrap-around (e.g., 350 to 10 degrees)
  if (headingChange > 180.0) {
    headingChange = 360.0 - headingChange;
  }

  if (headingChange > MIN_HEADING_CHANGE) {
    float headingRad = headingChange * PI / 180.0;
    float rawRadius = dist / headingRad;
    rawRadius = min(rawRadius, MAX_RADIUS);

    // Exponential Moving Average smoothing
    estimatedRadius = (RADIUS_SMOOTHING * rawRadius) + ((1.0 - RADIUS_SMOOTHING) * estimatedRadius);
  } else {
    // Straight road — increase radius toward max
    estimatedRadius = (RADIUS_SMOOTHING * MAX_RADIUS) + ((1.0 - RADIUS_SMOOTHING) * estimatedRadius);
  }

  // --- Gradient ---
  float altChange = currentAltitude - prevAltitude;
  if (dist > 5.0) {  // Need reasonable distance for gradient
    float rawGradient = atan2(altChange, dist) * 180.0 / PI;
    rawGradient = constrain(rawGradient, -10.0, 10.0);
    // Smooth gradient
    estimatedGradient = (0.2 * rawGradient) + (0.8 * estimatedGradient);
  }
}

// ============================================================
// Haversine Distance (meters)
// ============================================================
float haversineDistance(double lat1, double lon1, double lat2, double lon2) {
  const float R = 6371000.0;  // Earth radius in meters
  float dLat = (lat2 - lat1) * PI / 180.0;
  float dLon = (lon2 - lon1) * PI / 180.0;
  float a = sin(dLat / 2) * sin(dLat / 2) +
            cos(lat1 * PI / 180.0) * cos(lat2 * PI / 180.0) *
            sin(dLon / 2) * sin(dLon / 2);
  float c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return R * c;
}

// ============================================================
// ML Inference (on-device)
// ============================================================
void runMLInference() {
  // Prepare input features
  int nSeated = min(passengerCount, BUS_CAPACITY);
  int nStanding = max(passengerCount - BUS_CAPACITY, 0);

  double input[7] = {
    (double)nSeated,
    (double)nStanding,
    (double)currentSpeed,
    (double)estimatedRadius,
    (double)DEFAULT_IS_WET,
    (double)estimatedGradient,
    (double)DEFAULT_DIST_TO_CURVE
  };

  double output[2] = {0.0, 0.0};

  // Run inference — this calls the m2cgen-generated function
  score(input, output);

  float newRiskScore = (float)output[0];
  float newStoppingDist = (float)output[1];

  // Clamp values to reasonable ranges
  newRiskScore = max(0.0f, newRiskScore);
  newStoppingDist = max(0.0f, newStoppingDist);

  // Determine safety decision
  String newDecision;
  if (newRiskScore < RISK_SAFE_MAX) {
    newDecision = "SAFE";
  } else if (newRiskScore < RISK_CAUTION_MAX) {
    newDecision = "CAUTION";
  } else if (newRiskScore < RISK_WARNING_MAX) {
    newDecision = "WARNING";
  } else {
    newDecision = "CRITICAL";
  }

  // Log changes
  bool riskChanged = (safetyDecision != newDecision);

  riskScore = newRiskScore;
  stoppingDistance = newStoppingDist;
  safetyDecision = newDecision;

  // Always log ML output
  Serial.printf("[ML] Risk: %.3f (%s) | StopDist: %.1fm | Radius: %.0fm | Speed: %.1f km/h | Pax: %d\n",
                riskScore, safetyDecision.c_str(), stoppingDistance,
                estimatedRadius, currentSpeed, passengerCount);

  // Sound alarms based on risk level
  if (newDecision == "WARNING" && riskChanged) {
    Serial.println("[ALERT] WARNING — Risk elevated!");
    playRiskWarning();
  } else if (newDecision == "CRITICAL") {
    Serial.println("[ALERT] CRITICAL — Rollover risk HIGH!");
    playRiskCritical();
    // Send immediately to backend on critical risk
    sendDataToBackend(false, true);
  }
}

// ============================================================
// Send Data to Backend
// ============================================================
void sendDataToBackend(bool isFootboardViolation, bool isCriticalRisk) {
  // Build JSON payload
  JsonDocument jsonDoc;
  jsonDoc["licensePlate"] = LICENSE_PLATE;
  jsonDoc["currentOccupancy"] = passengerCount;

  JsonObject gpsObj = jsonDoc["gps"].to<JsonObject>();
  gpsObj["lat"] = currentLat;
  gpsObj["lon"] = currentLon;

  jsonDoc["footboardStatus"] = isFootboardViolation;
  jsonDoc["speed"] = currentSpeed;
  jsonDoc["riskScore"] = riskScore;
  jsonDoc["stoppingDistance"] = stoppingDistance;
  jsonDoc["safetyDecision"] = safetyDecision;
  jsonDoc["deviceId"] = DEVICE_ID;
  jsonDoc["gpsAccuracy"] = gpsAccuracy;
  jsonDoc["satelliteCount"] = satelliteCount;

  String jsonString;
  serializeJson(jsonDoc, jsonString);

  // If WiFi not connected, buffer locally
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[SEND] WiFi offline — buffering data locally");
    bufferDataLocally(jsonString);
    return;
  }

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", IOT_API_KEY);
  http.setTimeout(10000);

  Serial.printf("[SEND] POST %s\n", BACKEND_URL);

  int httpCode = http.POST(jsonString);

  if (httpCode > 0) {
    Serial.printf("[SEND] HTTP %d — %s\n", httpCode,
                  httpCode == 201 ? "OK" : http.getString().c_str());
  } else {
    Serial.printf("[SEND] Failed: %s — buffering locally\n",
                  http.errorToString(httpCode).c_str());
    bufferDataLocally(jsonString);
  }

  http.end();
}

// ============================================================
// Offline Data Buffering (LittleFS)
// ============================================================
void bufferDataLocally(const String& jsonPayload) {
  if (bufferedRecordCount >= MAX_BUFFERED_RECORDS) {
    Serial.println("[BUFFER] Buffer full — dropping oldest");
    return;
  }

  File f = LittleFS.open(BUFFER_FILE, FILE_APPEND);
  if (!f) {
    Serial.println("[BUFFER] Failed to open buffer file");
    return;
  }

  f.println(jsonPayload);
  f.close();
  bufferedRecordCount++;
  Serial.printf("[BUFFER] Stored record #%d\n", bufferedRecordCount);
}

void sendBufferedData() {
  if (bufferedRecordCount == 0) return;

  File f = LittleFS.open(BUFFER_FILE, FILE_READ);
  if (!f) return;

  Serial.printf("[BUFFER] Sending %d buffered records...\n", bufferedRecordCount);
  int sent = 0;

  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", IOT_API_KEY);
    http.setTimeout(5000);

    int httpCode = http.POST(line);
    http.end();

    if (httpCode == 201) {
      sent++;
    } else {
      Serial.printf("[BUFFER] Failed to send buffered record: HTTP %d\n", httpCode);
      break;  // Stop on first failure to avoid overwhelming backend
    }

    delay(200);  // Small delay between sends
  }

  f.close();

  // Clear buffer file after successful send
  if (sent > 0) {
    LittleFS.remove(BUFFER_FILE);
    bufferedRecordCount = max(0, bufferedRecordCount - sent);
    Serial.printf("[BUFFER] Sent %d records, %d remaining\n", sent, bufferedRecordCount);
  }
}

// ============================================================
// IR Sensor Reading (with debounce)
// ============================================================
void readSensors() {
  bool reading1 = digitalRead(SENSOR1_PIN);
  if (reading1 != lastSensor1State) {
    lastDebounceTime1 = millis();
  }
  if ((millis() - lastDebounceTime1) > debounceDelay) {
    if (reading1 != sensor1State) {
      sensor1State = reading1;
      Serial.printf("\n[SENSOR1] %s\n", sensor1State == LOW ? "BLOCKED" : "CLEAR");
    }
  }
  lastSensor1State = reading1;

  bool reading2 = digitalRead(SENSOR2_PIN);
  if (reading2 != lastSensor2State) {
    lastDebounceTime2 = millis();
  }
  if ((millis() - lastDebounceTime2) > debounceDelay) {
    if (reading2 != sensor2State) {
      sensor2State = reading2;
      Serial.printf("\n[SENSOR2] %s\n", sensor2State == LOW ? "BLOCKED" : "CLEAR");
    }
  }
  lastSensor2State = reading2;
}

// ============================================================
// Passenger Counting State Machine
// ============================================================
void processCountingLogic() {
  if (currentState != IDLE && (millis() - lastStateChange > STATE_TIMEOUT)) {
    if ((currentState == SENSOR1_TRIGGERED || currentState == BOTH_TRIGGERED_IN) &&
        sensor2WasTriggered) {
      passengerCount++;
      Serial.printf("[COUNT] ENTERED (timeout) — Occupancy: %d\n", passengerCount);
      updateDisplay();
      playEntrySound();
    }
    else if ((currentState == SENSOR2_TRIGGERED || currentState == BOTH_TRIGGERED_OUT) &&
             sensor1WasTriggered) {
      passengerCount--;
      if (passengerCount < 0) passengerCount = 0;
      Serial.printf("[COUNT] EXITED (timeout) — Occupancy: %d\n", passengerCount);
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
        Serial.printf("\n[COUNT] ENTERED — Occupancy: %d\n", passengerCount);
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
        Serial.printf("\n[COUNT] EXITED — Occupancy: %d\n", passengerCount);
        updateDisplay();
        playExitSound();
        currentState = IDLE;
        sensor1WasTriggered = false;
        sensor2WasTriggered = false;
      }
      break;
  }
}

// ============================================================
// Footboard Detection
// ============================================================
void checkFootboardDetection() {
  if (sensor1State == LOW && (currentState == IDLE || currentState == SENSOR1_TRIGGERED)) {
    if (sensor1BlockedStartTime == 0) {
      sensor1BlockedStartTime = millis();
    }

    if (!sensor1BlockedFor2Sec && (millis() - sensor1BlockedStartTime >= FOOTBOARD_BLOCK_TIME)) {
      sensor1BlockedFor2Sec = true;
    }

    if (sensor1BlockedFor2Sec &&
        (millis() - sensor1BlockedStartTime >= FOOTBOARD_BLOCK_TIME + FOOTBOARD_WAIT_TIME)) {
      if (!sensor2WasTriggered && sensor2State == HIGH) {
        footboardDetected = true;
        Serial.println("\n[VIOLATION] FOOTBOARD VIOLATION DETECTED!");

        showFootboardWarning();
        playFootboardWarning();
        sendDataToBackend(true, false);

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
// Display
// ============================================================
void updateDisplay() {
  display.showNumberDec(passengerCount, false);
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

// ============================================================
// Buzzer Sounds
// ============================================================
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

void playFootboardWarning() {
  for (int i = 0; i < 6; i++) {
    playBuzzer(200, 800);
    delay(50);
    playBuzzer(200, 1200);
    delay(50);
  }
}

void playRiskWarning() {
  // 3 warning beeps
  for (int i = 0; i < 3; i++) {
    playBuzzer(300, 1000);
    delay(150);
  }
}

void playRiskCritical() {
  // Urgent siren — alternating tones
  for (int i = 0; i < 8; i++) {
    playBuzzer(150, 900);
    delay(30);
    playBuzzer(150, 1400);
    delay(30);
  }
}
