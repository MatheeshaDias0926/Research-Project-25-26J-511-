/*
 * IR Speed Sensor Test Code for ESP32
 *
 * Connections:
 * IR Sensor VCC -> ESP32 3.3V or 5V (check your sensor)
 * IR Sensor GND -> ESP32 GND
 * IR Sensor OUT -> ESP32 GPIO 13 (or any digital pin)
 *
 * How it works:
 * - IR sensor detects when an object passes in front of it
 * - We count pulses to calculate RPM (for wheel rotation)
 * - Speed = (RPM × Wheel Circumference × 60) / 1000 in km/h
 */

#define IR_SENSOR_PIN 13
#define WHEEL_CIRCUMFERENCE 0.20  // Wheel circumference in meters (adjust for your toy car)

volatile unsigned long pulseCount = 0;
unsigned long lastTime = 0;
float currentSpeed = 0;

void IRAM_ATTR irSensorISR() {
  pulseCount++;
}

void setup() {
  Serial.begin(115200);
  pinMode(IR_SENSOR_PIN, INPUT);

  // Attach interrupt for IR sensor (triggers on falling edge)
  attachInterrupt(digitalPinToInterrupt(IR_SENSOR_PIN), irSensorISR, FALLING);

  delay(1000);
  Serial.println("\n=== IR Speed Sensor Test ===");
  Serial.println("Spin the wheel to see speed readings...\n");
}

void loop() {
  unsigned long currentTime = millis();

  // Calculate speed every 1 second
  if (currentTime - lastTime >= 1000) {
    // Calculate RPM (revolutions per minute)
    float rpm = (pulseCount * 60.0) / 1.0;  // pulses in 1 second × 60

    // Calculate speed in km/h
    // Speed = (RPM × Circumference × 60) / 1000
    currentSpeed = (rpm * WHEEL_CIRCUMFERENCE * 60.0) / 1000.0;

    // Also calculate in m/s for crash detection
    float speedMS = (rpm * WHEEL_CIRCUMFERENCE) / 60.0;

    Serial.println("--- Speed Readings ---");
    Serial.print("Pulses in last second: "); Serial.println(pulseCount);
    Serial.print("RPM: "); Serial.println(rpm);
    Serial.print("Speed: "); Serial.print(currentSpeed); Serial.println(" km/h");
    Serial.print("Speed: "); Serial.print(speedMS); Serial.println(" m/s");
    Serial.println("====================\n");

    // Reset for next measurement
    pulseCount = 0;
    lastTime = currentTime;
  }

  delay(10);
}
