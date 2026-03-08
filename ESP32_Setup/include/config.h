/*
 * ESP32 Smart Bus Configuration
 * ==============================
 * Update these values before flashing to ESP32.
 * This file should NOT be committed to git with real credentials.
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================
// WiFi Configuration (4G Router on the bus)
// ============================================================
#define WIFI_SSID       "BusRouter4G"          // 4G router SSID
#define WIFI_PASSWORD   "YourRouterPassword"   // 4G router password

// ============================================================
// Backend Server Configuration (AWS EC2)
// ============================================================
#define BACKEND_URL     "http://YOUR_EC2_IP:3000/api/iot/iot-data"
#define IOT_API_KEY     "your-iot-api-key-here"   // Must match backend IOT_API_KEY

// ============================================================
// Bus Identification
// ============================================================
#define LICENSE_PLATE   "NP-1234"
#define DEVICE_ID       "ESP32-BUS-001"
#define BUS_CAPACITY    55                     // Seated capacity

// ============================================================
// Timing Configuration
// ============================================================
#define SEND_INTERVAL_MS      30000   // Send data every 30 seconds
#define ML_INFERENCE_INTERVAL 5000    // Run ML inference every 5 seconds
#define GPS_READ_INTERVAL     1000    // Read GPS every 1 second
#define WIFI_RETRY_INTERVAL   10000   // Retry WiFi every 10 seconds

// ============================================================
// ML Safety Thresholds
// ============================================================
#define RISK_SAFE_MAX       0.3f      // Below this = SAFE (green)
#define RISK_CAUTION_MAX    0.5f      // Below this = CAUTION (yellow)
#define RISK_WARNING_MAX    0.7f      // Below this = WARNING (3 beeps)
                                      // Above 0.7 = CRITICAL (siren)

// ============================================================
// GPS Configuration (NEO-6M on Serial2)
// ============================================================
#define GPS_RX_PIN      16    // ESP32 RX2 ← GPS TX
#define GPS_TX_PIN      17    // ESP32 TX2 → GPS RX
#define GPS_BAUD        9600  // NEO-6M default baud rate

// ============================================================
// Sensor & Peripheral Pins
// ============================================================
#define SENSOR1_PIN     18    // Outer IR sensor (footboard side)
#define SENSOR2_PIN     19    // Inner IR sensor (bus interior side)
#define BUZZER_PIN      21    // Active buzzer
#define DISPLAY_CLK     22    // TM1637 clock
#define DISPLAY_DIO     23    // TM1637 data

// ============================================================
// Offline Buffer (LittleFS flash storage)
// ============================================================
#define MAX_BUFFERED_RECORDS  100  // Max records to store when offline
#define BUFFER_FILE           "/data_buffer.json"

// ============================================================
// Curve Radius Estimation
// ============================================================
#define MIN_SPEED_FOR_RADIUS  5.0f    // Min speed (km/h) to estimate radius
#define MIN_HEADING_CHANGE    0.5f    // Min heading change (deg) to compute radius
#define MAX_RADIUS            500.0f  // Cap radius at 500m (straight road)
#define RADIUS_SMOOTHING      0.3f    // EMA smoothing factor for radius

// ============================================================
// Default Environmental Assumptions
// ============================================================
#define DEFAULT_IS_WET        0.0f    // 0=dry, 1=wet (conservative default)
#define DEFAULT_GRADIENT      0.0f    // degrees (flat road default)
#define DEFAULT_DIST_TO_CURVE 0.0f    // meters (assume at curve for max sensitivity)

#endif /* CONFIG_H */
