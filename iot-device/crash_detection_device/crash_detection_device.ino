/*
 * IoT Crash Detection Device
 *
 * Hardware:
 * - ESP32
 * - MPU-6050 (Accelerometer + Gyroscope)
 *
 * Connections:
 * MPU-6050 VCC -> ESP32 3.3V
 * MPU-6050 GND -> ESP32 GND
 * MPU-6050 SCL -> ESP32 GPIO 22
 * MPU-6050 SDA -> ESP32 GPIO 21
 */

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==================== CONFIGURATION ====================
// WiFi credentials - CHANGE THESE!
const char* WIFI_SSID = "awa’s iPhone";
const char* WIFI_PASSWORD = "80608060";

// FastAPI backend URL - CHANGE THIS!
// const char* API_URL = "http://192.168.1.100:8000/api/crash-detection/detect";
const char* API_URL = "http://172.20.10.4:8001/api/crash-detection/detect";


// Bus ID - CHANGE THIS!
const char* BUS_ID = "BUS-TEST-001";

// Sensor reading interval (milliseconds)
const int READING_INTERVAL = 100;  // 100ms = 10 readings per second

// Number of readings to collect before sending to API
const int WINDOW_SIZE = 100;  // 100 readings = 10 seconds of data
// =======================================================

// MPU-6050 I2C address
const int MPU_ADDR = 0x68;

// LED pin for status indication
const int LED_PIN = 2;

// Data structure for sensor readings
struct SensorReading {
  unsigned long timestamp;
  float accel_x;
  float accel_y;
  float accel_z;
  float gyro_x;
  float gyro_y;
  float gyro_z;
  float speed;
  float pitch;
  float roll;
};

// Buffer to store readings
SensorReading readings[WINDOW_SIZE];
int readingIndex = 0;

// Timing variables
unsigned long lastReadingTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n================================");
  Serial.println("  IoT Crash Detection Device");
  Serial.println("================================\n");

  // Initialize LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Initialize I2C for MPU-6050
  Serial.println("Initializing MPU-6050...");
  Wire.begin(21, 22);  // SDA=21, SCL=22
  delay(100);

  // Wake up MPU-6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);  // PWR_MGMT_1 register
  Wire.write(0);     // Wake up
  Wire.endTransmission(true);

  delay(100);
  Serial.println("✓ MPU-6050 initialized\n");

  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    // Blink LED to indicate WiFi connected
    for(int i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
  } else {
    Serial.println("\n✗ WiFi connection failed!");
    Serial.println("Device will collect data but cannot send to backend.");
  }

  Serial.println("\n================================");
  Serial.println("  System Ready!");
  Serial.println("  Monitoring for crashes...");
  Serial.println("================================\n");
}

void loop() {
  unsigned long currentTime = millis();

  // Read sensor at specified interval
  if (currentTime - lastReadingTime >= READING_INTERVAL) {
    lastReadingTime = currentTime;

    // Read MPU-6050 data
    SensorReading reading = readMPU6050();

    // Store in buffer
    readings[readingIndex] = reading;
    readingIndex++;

    // Print current reading
    Serial.printf("Reading %d/%d - Accel: (%.2f, %.2f, %.2f) g, Gyro: (%.2f, %.2f, %.2f) °/s\n",
                  readingIndex, WINDOW_SIZE,
                  reading.accel_x, reading.accel_y, reading.accel_z,
                  reading.gyro_x, reading.gyro_y, reading.gyro_z);

    // When buffer is full, send to API
    if (readingIndex >= WINDOW_SIZE) {
      Serial.println("\n--- Sending data batch to API ---");
      digitalWrite(LED_PIN, HIGH);  // LED on during transmission

      bool success = sendToAPI();

      digitalWrite(LED_PIN, LOW);   // LED off after transmission

      if (success) {
        Serial.println("✓ Data sent successfully\n");
      } else {
        Serial.println("✗ Failed to send data\n");
      }

      // Reset buffer
      readingIndex = 0;
    }
  }
}

SensorReading readMPU6050() {
  SensorReading reading;
  reading.timestamp = millis();
  reading.speed = 0.0;  // No speed sensor for now

  // Read accelerometer and gyroscope data
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);  // Starting register
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);

  if (Wire.available() >= 14) {
    // Read raw values
    int16_t ax = Wire.read() << 8 | Wire.read();
    int16_t ay = Wire.read() << 8 | Wire.read();
    int16_t az = Wire.read() << 8 | Wire.read();
    Wire.read(); Wire.read();  // Skip temperature
    int16_t gx = Wire.read() << 8 | Wire.read();
    int16_t gy = Wire.read() << 8 | Wire.read();
    int16_t gz = Wire.read() << 8 | Wire.read();

    // Convert to real units
    reading.accel_x = ax / 16384.0;  // ±2g range
    reading.accel_y = ay / 16384.0;
    reading.accel_z = az / 16384.0;
    reading.gyro_x = gx / 131.0;     // ±250°/s range
    reading.gyro_y = gy / 131.0;
    reading.gyro_z = gz / 131.0;

    // Calculate pitch and roll (optional, for visualization)
    reading.pitch = atan2(reading.accel_y, sqrt(reading.accel_x * reading.accel_x + reading.accel_z * reading.accel_z)) * 180.0 / PI;
    reading.roll = atan2(-reading.accel_x, reading.accel_z) * 180.0 / PI;
  } else {
    // Return zeros if read failed
    reading.accel_x = reading.accel_y = reading.accel_z = 0.0;
    reading.gyro_x = reading.gyro_y = reading.gyro_z = 0.0;
    reading.pitch = reading.roll = 0.0;
  }

  return reading;
}

bool sendToAPI() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected");
    return false;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);  // 10 second timeout

  // Build JSON payload
  String payload = buildJSON();

  // Send POST request
  int httpResponseCode = http.POST(payload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("API Response:");
    Serial.println(response);

    // Parse response to check if crash detected
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, response);

    bool crashDetected = doc["crash_detected"];
    if (crashDetected) {
      Serial.println("\n!!! CRASH DETECTED !!!");
      Serial.printf("Reconstruction Error: %.4f\n", (float)doc["reconstruction_error"]);
      Serial.printf("Max Acceleration: %.2f m/s²\n", (float)doc["max_acceleration"]);
      Serial.printf("Confidence: %.2f%%\n", (float)doc["confidence"] * 100);

      // Flash LED rapidly for crash alert
      for(int i = 0; i < 10; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(100);
        digitalWrite(LED_PIN, LOW);
        delay(100);
      }
    }

    http.end();
    return true;
  } else {
    Serial.printf("✗ HTTP Error: %d\n", httpResponseCode);
    Serial.println(http.errorToString(httpResponseCode));
    http.end();
    return false;
  }
}

String buildJSON() {
  DynamicJsonDocument doc(8192);  // Large buffer for all readings

  doc["bus_id"] = BUS_ID;
  JsonArray readingsArray = doc.createNestedArray("readings");

  for (int i = 0; i < WINDOW_SIZE; i++) {
    JsonObject reading = readingsArray.createNestedObject();

    // Convert timestamp to ISO format (simplified)
    reading["timestamp"] = "2026-01-06T00:00:00Z";  // Placeholder

    reading["acceleration_x"] = readings[i].accel_x;
    reading["acceleration_y"] = readings[i].accel_y;
    reading["acceleration_z"] = readings[i].accel_z;
    reading["gyro_x"] = readings[i].gyro_x;
    reading["gyro_y"] = readings[i].gyro_y;
    reading["gyro_z"] = readings[i].gyro_z;
    reading["speed"] = readings[i].speed;
    reading["pitch"] = readings[i].pitch;
    reading["roll"] = readings[i].roll;
  }

  String output;
  serializeJson(doc, output);
  return output;
}
