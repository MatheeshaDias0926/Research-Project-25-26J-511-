/*
 * Simple IR Sensor Test
 * Just reads the digital state - HIGH or LOW
 */

#define IR_SENSOR_PIN 13

void setup() {
  Serial.begin(115200);
  pinMode(IR_SENSOR_PIN, INPUT);

  delay(1000);
  Serial.println("\n=== Simple IR Sensor Test ===");
  Serial.println("Wave your hand in front of the sensor...\n");
}

void loop() {
  int sensorState = digitalRead(IR_SENSOR_PIN);

  Serial.print("Sensor State: ");

  if (sensorState == HIGH) {
    Serial.println("HIGH (No object detected)");
  } else {
    Serial.println("LOW (Object detected!) <<<");
  }

  delay(100);  // Read every 100ms
}
