#ifndef CONFIG_H
#define CONFIG_H

// ============================================
//  ESP32 Smart Bus Configuration
//  Edit these values before flashing to ESP32
// ============================================

// --- WiFi Settings ---
// Connect to your phone's mobile hotspot OR campus/home WiFi
const char* WIFI_SSID     = "Wi-fi";
const char* WIFI_PASSWORD = "123456788";

// --- Backend Server ---
// Use your Mac's IP on the shared WiFi network
// Find it with: ifconfig | grep inet (on Mac)
const char* BACKEND_URL = "http://192.168.8.169:3000/api/iot/iot-data";

// --- Bus Identity ---
// Must match a bus registered in the backend database
const char* LICENSE_PLATE = "NA-1234";

// --- Data Send Interval ---
// 1000ms = 1 second (GPS module updates at 1Hz, match that rate)
const unsigned long SEND_INTERVAL = 1000;  // 1 second

// ============================================================
//  IR Sensor Pins (Passenger Counting)
// ============================================================
#define SENSOR1_PIN  18   // IR Sensor 1 (Outer) - Entry side
#define SENSOR2_PIN  19   // IR Sensor 2 (Inner) - Inside bus

// ============================================================
//  TM1637 Display & Buzzer
// ============================================================
#define DISPLAY_CLK  22   // TM1637 Display Clock
#define DISPLAY_DIO  23   // TM1637 Display Data
#define BUZZER_PIN   21   // Buzzer signal pin

// ============================================================
//  NEO-6M GPS Module — UART2 (Hardware Serial)
//  Wiring: NEO-6M TX → ESP32 GPIO16 (RX2)
//          NEO-6M RX ← ESP32 GPIO17 (TX2)
//          NEO-6M VCC → ESP32 3.3V (or VIN if using GY-NEO6MV2 breakout)
//          NEO-6M GND → ESP32 GND
// ============================================================
#define GPS_RX_PIN   16   // ESP32 RX2 ← GPS Module TX
#define GPS_TX_PIN   17   // ESP32 TX2 → GPS Module RX
#define GPS_BAUD     9600 // NEO-6M default baud rate

// GPS quality thresholds
#define GPS_MIN_SATS    3     // Minimum satellites for a valid fix
#define GPS_MAX_HDOP    5.0   // Max HDOP (horizontal dilution of precision) — lower = better

// ============================================================
//  BOOT Button (GPIO 0) — Manual Test Mode
//  Press to toggle passenger count between 0 and TEST_COUNT
// ============================================================
#define BOOT_BUTTON_PIN    0
#define TEST_PASSENGER_COUNT 45   // Simulated passenger load for testing

// ============================================================
//  Timing Constants
// ============================================================
#define STATE_TIMEOUT_MS        5000   // 5s to complete entry/exit sequence
#define FOOTBOARD_BLOCK_MS      2000   // 2s blocked = footboard suspect
#define FOOTBOARD_WAIT_MS       1000   // 1s extra wait for sensor2
#define DEBOUNCE_DELAY_MS       50     // Debounce for IR sensors

// ============================================================
//  WiFi Reconnect
// ============================================================
#define WIFI_CONNECT_TIMEOUT    30     // Max attempts to connect (x 500ms = 15s)
#define WIFI_RECONNECT_INTERVAL 10000  // Retry WiFi every 10 seconds if lost

// ============================================================
//  Offline Buffer (stores data when WiFi is down)
// ============================================================
#define MAX_BUFFER 20

// ============================================================
//  GPS Stale Timeout
//  If no valid GPS fix for this long, send 0,0 (backend skips pipeline)
// ============================================================
#define GPS_STALE_MS 10000   // 10 seconds

#endif // CONFIG_H
