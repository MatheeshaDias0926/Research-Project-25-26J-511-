#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials - UPDATE THESE
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Backend API endpoint
const char* serverUrl = "http://localhost:3000/api/iot/iot-data";

// IR Sensor pins
#define SENSOR1_PIN 18  // Outer sensor
#define SENSOR2_PIN 19  // Inner sensor

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
const unsigned long STATE_TIMEOUT = 2000; // 2 seconds timeout

// Debounce
unsigned long lastDebounceTime1 = 0;
unsigned long lastDebounceTime2 = 0;
const unsigned long debounceDelay = 50;

// Send interval
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 5000; // Send data every 5 seconds

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== ESP32 Passenger Counter ===");
  
  // Configure IR sensor pins
  pinMode(SENSOR1_PIN, INPUT);
  pinMode(SENSOR2_PIN, INPUT);
  
  Serial.println("IR Sensors initialized on pins:");
  Serial.print("  Sensor 1 (Outer): GPIO ");
  Serial.println(SENSOR1_PIN);
  Serial.print("  Sensor 2 (Inner): GPIO ");
  Serial.println(SENSOR2_PIN);
  
  // Connect to WiFi
  connectWiFi();
}

void loop() {
  // Read sensor states with debouncing
  readSensors();
  
  // Process passenger counting state machine
  processCountingLogic();
  
  // Send data periodically
  if (millis() - lastSendTime >= sendInterval) {
    sendDataToBackend();
    lastSendTime = millis();
  }
  
  delay(10); // Small delay to prevent excessive polling
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
  // Check for timeout
  if (currentState != IDLE && (millis() - lastStateChange > STATE_TIMEOUT)) {
    Serial.println("State timeout - resetting to IDLE");
    currentState = IDLE;
  }
  
  switch (currentState) {
    case IDLE:
      if (sensor1State == LOW && sensor2State == HIGH) {
        // Sensor 1 triggered first (entering)
        currentState = SENSOR1_TRIGGERED;
        lastStateChange = millis();
        Serial.println(">> State: SENSOR1_TRIGGERED (Entry started)");
      } else if (sensor2State == LOW && sensor1State == HIGH) {
        // Sensor 2 triggered first (exiting)
        currentState = SENSOR2_TRIGGERED;
        lastStateChange = millis();
        Serial.println(">> State: SENSOR2_TRIGGERED (Exit started)");
      }
      break;
      
    case SENSOR1_TRIGGERED:
      if (sensor2State == LOW) {
        // Both sensors triggered, moving inward
        currentState = BOTH_TRIGGERED_IN;
        lastStateChange = millis();
        Serial.println(">> State: BOTH_TRIGGERED_IN");
      } else if (sensor1State == HIGH) {
        // Sensor 1 cleared without triggering sensor 2
        Serial.println(">> False trigger - back to IDLE");
        currentState = IDLE;
      }
      break;
      
    case BOTH_TRIGGERED_IN:
      if (sensor1State == HIGH && sensor2State == HIGH) {
        // Person fully entered
        passengerCount++;
        Serial.println("*** PERSON ENTERED ***");
        Serial.print("Current occupancy: ");
        Serial.println(passengerCount);
        currentState = IDLE;
        sendDataToBackend(); // Send immediately on change
      }
      break;
      
    case SENSOR2_TRIGGERED:
      if (sensor1State == LOW) {
        // Both sensors triggered, moving outward
        currentState = BOTH_TRIGGERED_OUT;
        lastStateChange = millis();
        Serial.println(">> State: BOTH_TRIGGERED_OUT");
      } else if (sensor2State == HIGH) {
        // Sensor 2 cleared without triggering sensor 1
        Serial.println(">> False trigger - back to IDLE");
        currentState = IDLE;
      }
      break;
      
    case BOTH_TRIGGERED_OUT:
      if (sensor1State == HIGH && sensor2State == HIGH) {
        // Person fully exited
        passengerCount--;
        if (passengerCount < 0) passengerCount = 0; // Prevent negative count
        Serial.println("*** PERSON EXITED ***");
        Serial.print("Current occupancy: ");
        Serial.println(passengerCount);
        currentState = IDLE;
        sendDataToBackend(); // Send immediately on change
      }
      break;
  }
}

void sendDataToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Attempting to reconnect...");
    connectWiFi();
    return;
  }
  
  HTTPClient http;
  
  // Create JSON payload
  StaticJsonDocument<200> jsonDoc;
  jsonDoc["SensorModule"] = "M1";
  jsonDoc["currentOccupancy"] = passengerCount;
  
  String jsonString;
  serializeJson(jsonDoc, jsonString);
  
  Serial.println("\n--- Sending Data to Backend ---");
  Serial.print("URL: ");
  Serial.println(serverUrl);
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