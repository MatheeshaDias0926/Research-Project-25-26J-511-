#ifndef CONFIG_H
#define CONFIG_H

// ============================================
//  ESP32 Smart Bus Configuration
//  Edit these values before flashing to ESP32
// ============================================

// --- WiFi Settings ---
// Connect to your phone's mobile hotspot
const char* WIFI_SSID     = "Matheesha";
const char* WIFI_PASSWORD  = "DewshiD#0926";

// --- Backend Server ---
// Use your Mac's IP on the phone hotspot network
// Find it with: ifconfig | grep inet (on Mac)
const char* BACKEND_URL = "http://172.20.10.2:3000/api/iot/iot-data";

// --- Bus Identity ---
// Must match a bus registered in the backend database
const char* LICENSE_PLATE = "NP-1234";

// --- Data Send Interval ---
// How often to send data to backend (in milliseconds)
// 3 seconds = 3000ms (For smooth real-world testing and faster warnings)
// 30 seconds = 30000ms
const unsigned long SEND_INTERVAL = 3000;  // 3 seconds

// --- Hardware Pins ---
#define SENSOR1_PIN  18   // IR Sensor 1 (Outer) - Entry side
#define SENSOR2_PIN  19   // IR Sensor 2 (Inner) - Inside bus
#define DISPLAY_CLK  22   // TM1637 Display Clock
#define DISPLAY_DIO  23   // TM1637 Display Data
#define BUZZER_PIN   21   // Buzzer signal pin

// --- Timing ---
#define STATE_TIMEOUT_MS       5000   // 5 seconds to complete entry/exit sequence
#define FOOTBOARD_BLOCK_MS     2000   // 2 seconds blocked = footboard suspect
#define FOOTBOARD_WAIT_MS      1000   // 1 second extra wait for sensor2
#define DEBOUNCE_DELAY_MS      50     // Debounce for IR sensors

// --- WiFi Reconnect ---
#define WIFI_CONNECT_TIMEOUT   30     // Max attempts to connect (x 500ms)
#define WIFI_RECONNECT_INTERVAL 10000 // Retry WiFi every 10 seconds if lost

#endif // CONFIG_H
