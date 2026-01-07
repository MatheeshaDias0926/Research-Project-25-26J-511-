void setup() {
  Serial.begin(115200);
  delay(2000);  // Wait 2 seconds for serial to initialize

  Serial.println("========================================");
  Serial.println("HELLO! ESP32 is working!");
  Serial.println("Serial communication is working!");
  Serial.println("========================================");

  // Now test I2C
  pinMode(21, OUTPUT);
  pinMode(22, OUTPUT);

  Serial.println("\nTesting GPIO pins...");
  Serial.println("Toggling D21 and D22...");

  for(int i = 0; i < 5; i++) {
    digitalWrite(21, HIGH);
    digitalWrite(22, HIGH);
    Serial.println("Pins HIGH");
    delay(500);

    digitalWrite(21, LOW);
    digitalWrite(22, LOW);
    Serial.println("Pins LOW");
    delay(500);
  }

  Serial.println("\nGPIO test complete!");
  Serial.println("If you can read this, serial is working fine.");
}

void loop() {
  // Empty
}
