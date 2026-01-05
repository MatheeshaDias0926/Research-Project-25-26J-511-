#include <Arduino.h>
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// =========================================================================================
// ⚠️ TODO: STEP 1 - INCLUDE THE EDGE IMPULSE LIBRARY
// After you follow the AI_SETUP_GUIDE.md and export your library,
// install it in PlatformIO (lib folder) and uncomment the line below:
//
// #include <Your_Project_Name_inferencing.h>
//
// For now, we define a dummy placeholder so this code compiles for review.
// =========================================================================================
#ifndef _EDGE_IMPULSE_INFERENCING_H_
  #define EI_CLASSIFIER_SENSOR_CAMERA 1
  // Mock class for compilation
  class EdgeImpulseClassifier {
    public: false; 
  };
#endif


// ==========================================
// 📶 CONFIGURATION
// ==========================================
const char* ssid = "Wi-fi";
const char* password = "123456788";
const char* backendUrl = "http://192.168.43.31:3000/api/iot/iot-data"; // Use your Mac IP

// ==========================================
// 📷 CAMERA PINS (AI THINKER MODEL)
// ==========================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Global Variables
int passengerCount = 0;
unsigned long lastCaptureTime = 0;
const int inferneceInterval = 200; // Run every 200ms

// Function Declarations
bool initCamera();
void runInference();
void sendCountToBackend();

void setup() {
  Serial.begin(115200);
  Serial.println("Starting AI Passenger Counter...");

  // 1. Connect WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");

  // 2. Initialize Camera
  if (!initCamera()) {
    Serial.println("Camera Init Failed");
    while(true);
  }
}

void loop() {
  if (millis() - lastCaptureTime > inferneceInterval) {
    runInference();
    lastCaptureTime = millis();
  }
}

// ==========================================
// 🧠 AI INFERENCE LOGIC
// ==========================================
void runInference() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }

  // ----------------------------------------------------
  // TODO: UNCOMMENT THIS BLOCK AFTER ADDING LIBRARY
  // ----------------------------------------------------
  /*
  // Convert FB to RGB888 for Edge Impulse
  // (Assuming you trained with 96x96 images)
  
  ei_impulse_result_t result = { 0 };

  // Run classifier
  // bool converted = fmt2rgb888(fb->buf, fb->len, PIXFORMAT_JPEG, snapshot_buf);
  // signal_t signal;
  // numpy::signal_from_buffer(snapshot_buf, EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE, &signal);
  // EI_IMPULSE_ERROR res = run_classifier(&signal, &result, false);

  // Check results
  float person_confidence = 0.0;
  float bag_confidence = 0.0;

  for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
      if (strcmp(result.classification[ix].label, "person") == 0) {
          person_confidence = result.classification[ix].value;
      }
      if (strcmp(result.classification[ix].label, "bag") == 0) {
          bag_confidence = result.classification[ix].value;
      }
  }

  // DECISION LOGIC
  if (person_confidence > 0.75) {
      Serial.println("✅ PERSON DETECTED!");
      passengerCount++;
      sendCountToBackend();
      delay(1000); // Debounce to allow person to pass
  } else if (bag_confidence > 0.75) {
      Serial.println("⚠️ IGNORING BAG/OBJECT");
  }
  */
  
  // Placeholder for testing workflow
  Serial.println("Inference loop running... (Add Edge Impulse Library to generic logic)");

  esp_camera_fb_return(fb);
}


bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG; 
  
  config.frame_size = FRAMESIZE_QVGA; // 320x240
  config.jpeg_quality = 12;
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  return (err == ESP_OK);
}

void sendCountToBackend() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(backendUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<200> doc;
    doc["SensorModule"] = "AI_CAM_01";
    doc["currentOccupancy"] = passengerCount;
    doc["class"] = "person";
    doc["confidence"] = "0.85"; // Example

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);
    Serial.print("Backend Response: ");
    Serial.println(httpResponseCode);
    http.end();
  }
}
