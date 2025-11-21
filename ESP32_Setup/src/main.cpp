#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TM1637Display.h>

// WiFi credentials
const char* ssid = "Wi-fi";
const char* password = "123456788";

// Backend API endpoint - Use your Mac's IP address
const char* serverUrl = "http://192.168.43.31:3000/api/iot/iot-data";

// IR Sensor pins
#define SENSOR1_PIN 18  // Outer sensor
#define SENSOR2_PIN 19  // Inner sensor

// TM1637 Display pins
#define DISPLAY_CLK 22  // Clock pin
#define DISPLAY_DIO 23  // Data pin

// Buzzer pin
#define BUZZER_PIN 21   // Buzzer signal pin

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
const unsigned long STATE_TIMEOUT = 5000;  // 5 seconds timeout for slow hand movement

// Track if sensor was triggered during this sequence
bool sensor1WasTriggered = false;
bool sensor2WasTriggered = false;

// Footboard detection
unsigned long sensor1BlockedStartTime = 0;
bool sensor1BlockedFor2Sec = false;
bool footboardDetected = false;
const unsigned long FOOTBOARD_BLOCK_TIME = 2000;  // 2 seconds
const unsigned long FOOTBOARD_WAIT_TIME = 1000;   // 1 second wait for sensor2

// Debounce
unsigned long lastDebounceTime1 = 0;
unsigned long lastDebounceTime2 = 0;
const unsigned long debounceDelay = 50;  // Stable debounce

// Send interval
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 300000;  // 5 minutes (300000ms)

// GPS simulation data
struct GPSLocation {
  const char* name;
  float lat;
  float lng;
};

GPSLocation gpsLocations[] = {
  {"Bandarawela Stand", 6.8258, 80.9982},
  {"Bindunuwewa", 6.8448, 80.9997},
  {"Dhowa Temple", 6.8556, 81.0208},
  {"Kinigama", 6.8620, 81.0300},
  {"Ella Town", 6.8756, 81.0463}
};

int currentGPSIndex = 0;
unsigned long lastGPSUpdateTime = 0;
const unsigned long gpsUpdateInterval = 600000;  // 10 minutes (600000ms)

// Fixed values
const char* licensePlate = "NP-1234";
const int fixedSpeed = 60;

// TM1637 Display object
TM1637Display display(DISPLAY_CLK, DISPLAY_DIO);

// Function declarations
void connectWiFi();
void readSensors();
void processCountingLogic();
void checkFootboardDetection();
void updateGPSLocation();
void sendDataToBackend();
void sendDataToBackend(bool isFootboardViolation);
void sendFootboardViolation();
void updateDisplay();
void showFootboardWarning();
void playBuzzer(int duration, int frequency);
void playEntrySound();
void playExitSound();
void playFootboardWarning();

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== ESP32 Passenger Counter - Module M1 ===");

  // Configure IR sensor pins
  pinMode(SENSOR1_PIN, INPUT);
  pinMode(SENSOR2_PIN, INPUT);

  Serial.println("IR Sensors initialized:");
  Serial.print(" Sensor 1 (Outer): GPIO ");
  Serial.println(SENSOR1_PIN);
  Serial.print(" Sensor 2 (Inner): GPIO ");
  Serial.println(SENSOR2_PIN);

  // Configure buzzer pin
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.print(" Buzzer: GPIO ");
  Serial.println(BUZZER_PIN);

  // Initialize TM1637 Display
  display.setBrightness(0x0f);  // Set brightness (0x00-0x0f, max brightness)
  display.clear();
  Serial.print(" Display: CLK=GPIO");
  Serial.print(DISPLAY_CLK);
  Serial.print(", DIO=GPIO");
  Serial.println(DISPLAY_DIO);

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

  // Update GPS location every 10 minutes
  updateGPSLocation();

  // Send data periodically (every 5 minutes)
  if (millis() - lastSendTime >= sendInterval) {
    Serial.println("\n[SCHEDULED SEND - 5 min interval]");
    sendDataToBackend(false);  // Regular send, not footboard violation
    lastSendTime = millis();
  }

  delay(10);  // Small delay to prevent excessive polling
}

void connectWiFi() {
  Serial.print("\nConnecting to WiFi: ");
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
    Serial.println("Please check your credentials and restart.");
  }
}

void readSensors() {
  // Read Sensor 1 with debouncing
  bool reading1 = digitalRead(SENSOR1_PIN);
  if (reading1 != lastSensor1State) {
    lastDebounceTime1 = millis();
  }

  if ((millis() - lastDebounceTime1) > debounceDelay) {
    if (reading1 != sensor1State) {
      sensor1State = reading1;
      Serial.print("Sensor 1: ");
      Serial.println(sensor1State == LOW ? "BLOCKED" : "CLEAR");
    }
  }
  lastSensor1State = reading1;

  // Read Sensor 2 with debouncing
  bool reading2 = digitalRead(SENSOR2_PIN);
  if (reading2 != lastSensor2State) {
    lastDebounceTime2 = millis();
  }

  if ((millis() - lastDebounceTime2) > debounceDelay) {
    if (reading2 != sensor2State) {
      sensor2State = reading2;
      Serial.print("Sensor 2: ");
      Serial.println(sensor2State == LOW ? "BLOCKED" : "CLEAR");
    }
  }
  lastSensor2State = reading2;
}

void processCountingLogic() {
  // Check for timeout and process if both sensors were triggered
  if (currentState != IDLE && (millis() - lastStateChange > STATE_TIMEOUT)) {
    Serial.println("State timeout!");
    
    // Check if we detected a sequence even if not completed perfectly
    if ((currentState == SENSOR1_TRIGGERED || currentState == BOTH_TRIGGERED_IN) && 
        sensor2WasTriggered) {
      // Entry sequence detected (Sensor1 -> Sensor2)
      passengerCount++;
      Serial.println("*** PERSON ENTERED (timeout detected) ***");
      Serial.print("Current occupancy: ");
      Serial.println(passengerCount);
      updateDisplay();
      playEntrySound();
    } 
    else if ((currentState == SENSOR2_TRIGGERED || currentState == BOTH_TRIGGERED_OUT) && 
             sensor1WasTriggered) {
      // Exit sequence detected (Sensor2 -> Sensor1)
      passengerCount--;
      if (passengerCount < 0) passengerCount = 0;
      Serial.println("*** PERSON EXITED (timeout detected) ***");
      Serial.print("Current occupancy: ");
      Serial.println(passengerCount);
      updateDisplay();
      playExitSound();
    }
    
    // Reset state
    currentState = IDLE;
    sensor1WasTriggered = false;
    sensor2WasTriggered = false;
  }

  switch (currentState) {
    case IDLE:
      // Reset trigger flags when idle
      sensor1WasTriggered = false;
      sensor2WasTriggered = false;
      
      if (sensor1State == LOW) {
        // Sensor 1 triggered first (entering)
        currentState = SENSOR1_TRIGGERED;
        sensor1WasTriggered = true;
        lastStateChange = millis();
        Serial.println(">> State: SENSOR1_TRIGGERED (Entry started)");
      } else if (sensor2State == LOW) {
        // Sensor 2 triggered first (exiting)
        currentState = SENSOR2_TRIGGERED;
        sensor2WasTriggered = true;
        lastStateChange = millis();
        Serial.println(">> State: SENSOR2_TRIGGERED (Exit started)");
      }
      break;

    case SENSOR1_TRIGGERED:
      // Track if sensor 2 gets triggered at any point
      if (sensor2State == LOW) {
        sensor2WasTriggered = true;
        currentState = BOTH_TRIGGERED_IN;
        lastStateChange = millis();
        Serial.println(">> State: BOTH_TRIGGERED_IN");
      }
      break;

    case BOTH_TRIGGERED_IN:
      // Complete entry when both sensors clear
      if (sensor1State == HIGH && sensor2State == HIGH) {
        passengerCount++;
        Serial.println("*** PERSON ENTERED ***");
        Serial.print("Current occupancy: ");
        Serial.println(passengerCount);
        
        updateDisplay();
        playEntrySound();
        
        currentState = IDLE;
        sensor1WasTriggered = false;
        sensor2WasTriggered = false;
      }
      break;

    case SENSOR2_TRIGGERED:
      // Track if sensor 1 gets triggered at any point
      if (sensor1State == LOW) {
        sensor1WasTriggered = true;
        currentState = BOTH_TRIGGERED_OUT;
        lastStateChange = millis();
        Serial.println(">> State: BOTH_TRIGGERED_OUT");
      }
      break;

    case BOTH_TRIGGERED_OUT:
      // Complete exit when both sensors clear
      if (sensor1State == HIGH && sensor2State == HIGH) {
        passengerCount--;
        if (passengerCount < 0) passengerCount = 0;
        Serial.println("*** PERSON EXITED ***");
        Serial.print("Current occupancy: ");
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
    Serial.println("WiFi not connected. Attempting to reconnect...");
    connectWiFi();
    return;
  }

  HTTPClient http;

  // Create JSON payload with new format
  JsonDocument jsonDoc;
  jsonDoc["licensePlate"] = licensePlate;
  jsonDoc["currentOccupancy"] = passengerCount;
  
  // Add GPS location
  JsonObject gps = jsonDoc["gps"].to<JsonObject>();
  gps["lat"] = gpsLocations[currentGPSIndex].lat;
  gps["lon"] = gpsLocations[currentGPSIndex].lng;
  
  jsonDoc["footboardStatus"] = isFootboardViolation;
  jsonDoc["speed"] = fixedSpeed;

  String jsonString;
  serializeJson(jsonDoc, jsonString);

  Serial.println("\n--- Sending Data to Backend ---");
  Serial.print("URL: ");
  Serial.println(serverUrl);
  Serial.print("Location: ");
  Serial.println(gpsLocations[currentGPSIndex].name);
  Serial.print("JSON: ");
  Serial.println(jsonString);

  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.print("Response: ");
    Serial.println(response);
  } else {
    Serial.print("Error sending POST request. Error code: ");
    Serial.println(httpResponseCode);
    Serial.print("Error: ");
    Serial.println(http.errorToString(httpResponseCode));
  }

  http.end();
  Serial.println("-------------------------------\n");
}

void updateDisplay() {
  // Display current passenger count (right-aligned, 4 digits)
  display.showNumberDec(passengerCount, false);
  Serial.print("[DISPLAY] Showing count: ");
  Serial.println(passengerCount);
}

void playBuzzer(int duration, int frequency) {
  // Play tone on buzzer
  tone(BUZZER_PIN, frequency, duration);
  delay(duration);
  noTone(BUZZER_PIN);
}

void playEntrySound() {
  // Entry: Two ascending beeps
  playBuzzer(100, 1000);  // First beep (1000 Hz)
  delay(50);
  playBuzzer(100, 1500);  // Second beep (1500 Hz)
  Serial.println("[BUZZER] Entry sound played");
}

void playExitSound() {
  // Exit: Two descending beeps
  playBuzzer(100, 1500);  // First beep (1500 Hz)
  delay(50);
  playBuzzer(100, 1000);  // Second beep (1000 Hz)
  Serial.println("[BUZZER] Exit sound played");
}

void checkFootboardDetection() {
  // Track how long sensor 1 has been blocked (works in IDLE or SENSOR1_TRIGGERED states)
  if (sensor1State == LOW && (currentState == IDLE || currentState == SENSOR1_TRIGGERED)) {
    if (sensor1BlockedStartTime == 0) {
      sensor1BlockedStartTime = millis();
      Serial.println("[FOOTBOARD] Sensor 1 blocked, monitoring...");
    }
    
    // Check if blocked for more than 2 seconds
    if (!sensor1BlockedFor2Sec && (millis() - sensor1BlockedStartTime >= FOOTBOARD_BLOCK_TIME)) {
      sensor1BlockedFor2Sec = true;
      Serial.println("[FOOTBOARD] Sensor 1 blocked for 2+ seconds!");
    }
    
    // After 2 sec block + 1 sec wait (total 3 sec), check if sensor2 was triggered
    if (sensor1BlockedFor2Sec && 
        (millis() - sensor1BlockedStartTime >= FOOTBOARD_BLOCK_TIME + FOOTBOARD_WAIT_TIME)) {
      
      if (!sensor2WasTriggered && sensor2State == HIGH) {
        // Footboard violation detected!
        footboardDetected = true;
        Serial.println("\n*** FOOTBOARD VIOLATION DETECTED ***");
        Serial.println("Sensor 1 blocked for 2+ sec, Sensor 2 not triggered within 1 sec");
        
        // Show warning on display
        showFootboardWarning();
        
        // Play warning sound
        playFootboardWarning();
        
        // Send violation to backend immediately
        sendFootboardViolation();
        
        // Reset footboard detection and state machine
        sensor1BlockedStartTime = 0;
        sensor1BlockedFor2Sec = false;
        footboardDetected = false;
        sensor1WasTriggered = false;
        sensor2WasTriggered = false;
        currentState = IDLE;  // Force back to IDLE
      }
    }
  } else {
    // Reset if sensor 1 is clear
    if (sensor1State == HIGH && sensor1BlockedStartTime > 0) {
      Serial.println("[FOOTBOARD] Sensor 1 cleared, reset monitoring");
      sensor1BlockedStartTime = 0;
      sensor1BlockedFor2Sec = false;
    }
  }
}

void updateGPSLocation() {
  unsigned long currentTime = millis();
  
  // Check if 10 minutes have elapsed
  if (currentTime - lastGPSUpdateTime >= gpsUpdateInterval) {
    // Move to next location
    currentGPSIndex = (currentGPSIndex + 1) % 5;  // Wrap around after last location
    lastGPSUpdateTime = currentTime;
    
    Serial.println("\n--- GPS Location Updated ---");
    Serial.print("New Location: ");
    Serial.println(gpsLocations[currentGPSIndex].name);
    Serial.print("Coordinates: ");
    Serial.print(gpsLocations[currentGPSIndex].lat, 4);
    Serial.print(", ");
    Serial.println(gpsLocations[currentGPSIndex].lng, 4);
    Serial.println("----------------------------\n");
  }
}

void sendFootboardViolation() {
  Serial.println("\n--- FOOTBOARD VIOLATION DETECTED ---");
  sendDataToBackend(true);  // Reuse sendDataToBackend with footboard flag
}

void showFootboardWarning() {
  // Flash "FOOT" text on display (display shows numbers, so we show error code)
  // Show "Err" pattern or flash the display
  for (int i = 0; i < 3; i++) {
    display.clear();
    delay(200);
    display.showNumberDec(8888, true);  // Show all segments (error indicator)
    delay(200);
  }
  // Restore passenger count
  updateDisplay();
  Serial.println("[DISPLAY] Footboard warning shown");
}

void playFootboardWarning() {
  // Beep-beep warning pattern (rapid beeps)
  for (int i = 0; i < 4; i++) {
    playBuzzer(150, 2000);  // High pitch beep
    delay(100);
    playBuzzer(150, 2000);  // High pitch beep
    delay(300);
  }
  Serial.println("[BUZZER] Footboard warning sound played");
}
