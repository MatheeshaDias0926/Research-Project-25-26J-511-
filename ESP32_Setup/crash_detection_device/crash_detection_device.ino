#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <MPU6050_light.h>

// WiFi credentials
const char* ssid = "awa";
const char* password = "80608060";

// Crash Detection API endpoint (Ensure this IP matches your laptop!)
const char* crashApiUrl = "http://172.20.10.4:8000/api/crash-detection/detect";

// MPU-6050 I2C pins
#define MPU_SDA 21
#define MPU_SCL 22

// MPU-6050 object
MPU6050 mpu(Wire);
bool mpuReady = false;

// Sensor reading buffer - 50Hz (every 20ms) is standard for crash detection
const int BATCH_SIZE = 100;
const int READING_INTERVAL = 20; // 50Hz sampling

struct MPUReading {
  float acc_x, acc_y, acc_z;
  float gyro_x, gyro_y, gyro_z;
  float pitch, roll;
};

MPUReading readingsBuffer[BATCH_SIZE];
int readingIndex = 0;
unsigned long lastMPUReadTime = 0;
const char* busId = "NP-1234";

void setup() {
  Serial.begin(115200);
  
  // Initialize MPU-6050
  Wire.begin(MPU_SDA, MPU_SCL);
  byte status = mpu.begin();
  
  if (status != 0) {
    Serial.println("❌ MPU6050 Connection Failed! Check SCL/SDA wiring.");
    mpuReady = false;
  } else {
    Serial.println("✅ MPU6050 Connected! Calibrating...");
    delay(1000);
    mpu.calcOffsets(); // Ensure the device is FLAT and STILL during this
    mpuReady = true;
  }

  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
}

void loop() {
  if (!mpuReady) return;

  mpu.update(); // Must be called as often as possible

  // Only store data every 20ms
  if (millis() - lastMPUReadTime >= READING_INTERVAL) {
    lastMPUReadTime = millis();

    // Store raw data (converted to m/s^2)
    readingsBuffer[readingIndex].acc_x = mpu.getAccX() * 9.81;
    readingsBuffer[readingIndex].acc_y = mpu.getAccY() * 9.81;
    readingsBuffer[readingIndex].acc_z = mpu.getAccZ() * 9.81;
    readingsBuffer[readingIndex].gyro_x = mpu.getGyroX();
    readingsBuffer[readingIndex].gyro_y = mpu.getGyroY();
    readingsBuffer[readingIndex].gyro_z = mpu.getGyroZ();
    
    // CAPTURE TILT: Very important for rollover detection
    readingsBuffer[readingIndex].pitch = mpu.getAngleX(); 
    readingsBuffer[readingIndex].roll = mpu.getAngleY();

    readingIndex++;

    // When buffer is full (every 2 seconds at 50Hz), send to server
    if (readingIndex >= BATCH_SIZE) {
      sendCrashDetectionBatch();
      readingIndex = 0;
    }
  }
}

void sendCrashDetectionBatch() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  
  // DynamicJsonDocument is better for large batches (100 readings is ~15KB)
  DynamicJsonDocument doc(20000);
  doc["bus_id"] = busId;
  JsonArray readings = doc.createNestedArray("readings");

  for (int i = 0; i < BATCH_SIZE; i++) {
    JsonObject r = readings.createNestedObject();
    r["acceleration_x"] = readingsBuffer[i].acc_x;
    r["acceleration_y"] = readingsBuffer[i].acc_y;
    r["acceleration_z"] = readingsBuffer[i].acc_z;
    r["gyro_x"] = readingsBuffer[i].gyro_x;
    r["gyro_y"] = readingsBuffer[i].gyro_y;
    r["gyro_z"] = readingsBuffer[i].gyro_z;
    r["pitch"] = readingsBuffer[i].pitch;
    r["roll"] = readingsBuffer[i].roll;
  }

  String jsonString;
  serializeJson(doc, jsonString);

  http.begin(crashApiUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.POST(jsonString);
  if (httpCode > 0) {
    Serial.printf("[API] Batch Sent! Status: %d\n", httpCode);
  } else {
    Serial.printf("[API] POST failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}
