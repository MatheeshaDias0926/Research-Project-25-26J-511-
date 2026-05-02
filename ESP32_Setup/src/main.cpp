#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <MPU6050_light.h>

// WiFi credentials
const char* ssid = "Wi-fi";
const char* password = "123456788";

// Crash Detection API endpoint
const char* crashApiUrl = "http://192.168.43.31:8000/api/crash-detection/detect";

// MPU-6050 I2C pins
#define MPU_SDA 21
#define MPU_SCL 22

// MPU-6050 object
MPU6050 mpu(Wire);
bool mpuReady = false;

// Sensor reading buffer for crash detection
const int BATCH_SIZE = 100;       // readings per batch (matches API window_size)
const int READING_INTERVAL = 100; // ms between readings (~10Hz)

struct MPUReading {
  float acc_x, acc_y, acc_z;      // m/s^2
  float gyro_x, gyro_y, gyro_z;   // deg/s
};

MPUReading readingsBuffer[BATCH_SIZE];
int readingIndex = 0;
unsigned long lastMPUReadTime = 0;
const char* busId = "NP-1234";

// Function declarations
void connectWiFi();
void initMPU6050();
void readMPU6050();
void sendCrashDetectionBatch();

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== ESP32 Crash Detection Module ===");
  Serial.println("MPU-6050 -> Crash Detection API");
  Serial.println("SDA: GPIO 21, SCL: GPIO 22\n");

  // Initialize MPU-6050
  initMPU6050();

  // Connect to WiFi
  connectWiFi();

  Serial.println("\nReady! Reading MPU-6050 at 10Hz...");
  Serial.println("Sending batch every ~10 seconds (100 readings)\n");
}

void loop() {
  // Read MPU-6050 at ~10Hz and send batch when buffer full
  readMPU6050();
  delay(10);
}

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect to WiFi!");
  }
}

void initMPU6050() {
  Wire.begin(MPU_SDA, MPU_SCL);

  byte status = mpu.begin();
  if (status != 0) {
    Serial.print("MPU6050 connection failed! Error: ");
    Serial.println(status);
    Serial.println("Check wiring: VCC->3V3, GND->GND, SDA->GPIO21, SCL->GPIO22");
    mpuReady = false;
    return;
  }

  Serial.println("MPU6050 connected!");
  Serial.println("Calculating offsets... Keep device still.");
  delay(1000);
  mpu.calcOffsets();
  Serial.println("Offsets done. MPU-6050 ready!");
  mpuReady = true;
}

void readMPU6050() {
  if (!mpuReady) return;

  // Read at ~10Hz (every 100ms)
  if (millis() - lastMPUReadTime < READING_INTERVAL) return;
  lastMPUReadTime = millis();

  mpu.update();

  // MPU6050_light returns acceleration in g, convert to m/s^2
  readingsBuffer[readingIndex].acc_x = mpu.getAccX() * 9.81;
  readingsBuffer[readingIndex].acc_y = mpu.getAccY() * 9.81;
  readingsBuffer[readingIndex].acc_z = mpu.getAccZ() * 9.81;
  readingsBuffer[readingIndex].gyro_x = mpu.getGyroX();
  readingsBuffer[readingIndex].gyro_y = mpu.getGyroY();
  readingsBuffer[readingIndex].gyro_z = mpu.getGyroZ();

  readingIndex++;

  // Print every 10th reading for debugging
  if (readingIndex % 10 == 0) {
    Serial.print("[MPU] Reading ");
    Serial.print(readingIndex);
    Serial.print("/");
    Serial.print(BATCH_SIZE);
    Serial.print(" | Acc: ");
    Serial.print(readingsBuffer[readingIndex - 1].acc_x, 2);
    Serial.print(", ");
    Serial.print(readingsBuffer[readingIndex - 1].acc_y, 2);
    Serial.print(", ");
    Serial.print(readingsBuffer[readingIndex - 1].acc_z, 2);
    Serial.print(" | Gyro: ");
    Serial.print(readingsBuffer[readingIndex - 1].gyro_x, 2);
    Serial.print(", ");
    Serial.print(readingsBuffer[readingIndex - 1].gyro_y, 2);
    Serial.print(", ");
    Serial.println(readingsBuffer[readingIndex - 1].gyro_z, 2);
  }

  // When buffer is full, send batch to crash detection API
  if (readingIndex >= BATCH_SIZE) {
    Serial.println("\n[MPU] Buffer full - sending batch to crash detection API...");
    sendCrashDetectionBatch();
    readingIndex = 0;
  }
}

void sendCrashDetectionBatch() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[CRASH API] WiFi not connected, skipping send");
    return;
  }

  HTTPClient http;

  // Build JSON: { "bus_id": "NP-1234", "readings": [ {...}, ... ] }
  JsonDocument doc;
  doc["bus_id"] = busId;

  JsonArray readings = doc["readings"].to<JsonArray>();
  for (int i = 0; i < BATCH_SIZE; i++) {
    JsonObject reading = readings.add<JsonObject>();
    reading["acceleration_x"] = readingsBuffer[i].acc_x;
    reading["acceleration_y"] = readingsBuffer[i].acc_y;
    reading["acceleration_z"] = readingsBuffer[i].acc_z;
    reading["gyro_x"] = readingsBuffer[i].gyro_x;
    reading["gyro_y"] = readingsBuffer[i].gyro_y;
    reading["gyro_z"] = readingsBuffer[i].gyro_z;
    reading["speed"] = 0.0;
    reading["pitch"] = 0.0;
    reading["roll"] = 0.0;
  }

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.print("[CRASH API] Sending ");
  Serial.print(BATCH_SIZE);
  Serial.print(" readings (");
  Serial.print(jsonString.length());
  Serial.println(" bytes)");

  http.begin(crashApiUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  int httpCode = http.POST(jsonString);

  if (httpCode > 0) {
    Serial.print("[CRASH API] Response: ");
    Serial.println(httpCode);
    String response = http.getString();
    Serial.println(response);
  } else {
    Serial.print("[CRASH API] Error: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}
