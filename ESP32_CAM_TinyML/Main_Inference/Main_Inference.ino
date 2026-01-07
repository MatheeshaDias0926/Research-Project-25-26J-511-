/*
 * ESP32-CAM AI Passenger Counter (Edge Impulse FOMO)
 * 
 * LOGIC:
 * 1. Captures image frame.
 * 2. Runs Edge Impulse FOMO model.
 * 3. Tracks "head" centroids crossing the center line.
 * 4. Sends count to Backend API.
 * 
 * IMPORTANT:
 * You must export your Arduino Library from Edge Impulse and Add it to your Arduino Libraries folder!
 * Replace <project_name_inferencing.h> with your actual library name.
 */

#include <bus_passenger_counter_inferencing.h> // REPLACE THIS with your actual library name
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// =======================
// CONFIGURATION
// =======================
#define CAMERA_MODEL_AI_THINKER

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_IP:3000/api/iot/iot-data"; // Replace with your Mac/PC IP

// Counting Settings
#define CONFIDENCE_THRESHOLD 0.7
#define CENTER_LINE_Y 48  // Middle of 96x96 frame (or adjust for your resolution)
#define DEBOUNCE_FRAMES 2 // Must be tracked for X frames to count

// =======================
// CAMERA PINS
// =======================
#if defined(CAMERA_MODEL_AI_THINKER)
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
#else
  #error "Camera model not selected"
#endif

// Global Variables
int passengerCount = 0;
bool is_connected = false;

// Tracking State
struct ObjectTrack {
    int id;
    int y;
    int age;
    bool active;
};
ObjectTrack last_track = {0, 0, 0, false};


void setup() {
    Serial.begin(115200);
    // Camera Init
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
    config.pixel_format = PIXFORMAT_GRAYSCALE; // FOMO works best with Grayscale
    config.frame_size = FRAMESIZE_96X96;       // Must match Impulse Input Size!
    config.jpeg_quality = 12;
    config.fb_count = 1;

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed with error 0x%x", err);
        return;
    }

    // Connect WiFi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected");
    is_connected = true;
    
    Serial.println("Starting Inferencing...");
}

void loop() {
    // 1. Capture Frame
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("Camera capture failed");
        return;
    }

    // 2. Convert to Signal
    signal_t signal;
    signal.total_length = EI_CLASSIFIER_INPUT_WIDTH * EI_CLASSIFIER_INPUT_HEIGHT;
    signal.get_data = &raw_feature_get_data; // We need to define this function to convert FB to Signal

    // 3. Run Classifier
    ei_impulse_result_t result = { 0 };
    EI_IMPULSE_ERROR res = run_classifier(&signal, &result, false);

    if (res != EI_IMPULSE_OK) {
        Serial.printf("ERR: Failed to run classifier (%d)\n", res);
        return;
    }

    // 4. Process Results (FOMO)
    bool meta_head_found = false;
    int head_y = 0;

    for (size_t ix = 0; ix < result.bounding_boxes_count; ix++) {
        auto bb = result.bounding_boxes[ix];
        if (bb.value > CONFIDENCE_THRESHOLD && String(bb.label) == "head") {
             meta_head_found = true;
             head_y = bb.y + (bb.height / 2); // Centroid Y
             Serial.printf("HEAD found at Y=%d (Conf: %.2f)\n", head_y, bb.value);
        }
    }

    // 5. Tracking Logic (Simple Single-Object Vertical Crossing)
    if (meta_head_found) {
        if (!last_track.active) {
            // New Object appearing
            last_track.active = true;
            last_track.y = head_y;
        } else {
            // Existing Object Moving
            int prev_y = last_track.y;
            
            // CROSSING DOWN (Entering: Top -> Bottom)
            if (prev_y < CENTER_LINE_Y && head_y >= CENTER_LINE_Y) {
                passengerCount++;
                Serial.println(">>> PERSON ENTERED <<<");
                sendData(passengerCount);
            }
            // CROSSING UP (Exiting: Bottom -> Top)
            else if (prev_y > CENTER_LINE_Y && head_y <= CENTER_LINE_Y) {
                passengerCount--;
                if(passengerCount < 0) passengerCount = 0;
                Serial.println("<<< PERSON EXITED <<<");
                sendData(passengerCount);
            }
            
            last_track.y = head_y; // Update position
        }
    } else {
        // Object lost
        last_track.active = false;
    }

    esp_camera_fb_return(fb);
}

// Helper to convert Raw Framebuffer to Edge Impulse Signal
// Note: This needs implementation based on exact library version, 
// usually provided in Edge Impulse export example.
int raw_feature_get_data(size_t offset, size_t length, float *out_ptr) {
    // This is a placeholder. Real implementation copies converting uint8_t -> float
    // Copy implementation from Edge Impulse > Deployment > Arduino
    return 0; 
}


void sendData(int count) {
    if(WiFi.status() == WL_CONNECTED){
        HTTPClient http;
        http.begin(serverUrl);
        http.addHeader("Content-Type", "application/json");
        
        String payload = "{\"SensorModule\":\"CAM_01\",\"currentOccupancy\":" + String(count) + "}";
        int code = http.POST(payload);
        http.end();
        Serial.printf("Data Sent: %d\n", code);
    }
}
