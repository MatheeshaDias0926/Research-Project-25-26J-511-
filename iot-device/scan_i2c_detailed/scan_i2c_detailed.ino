/*
 * Detailed I2C Scanner
 * Tests both standard and slow I2C speeds
 */

#include <Wire.h>

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== Detailed I2C Scanner ===\n");

  // Test 1: Standard speed (100kHz)
  Serial.println("Test 1: Scanning at 100kHz (standard speed)...");
  Wire.begin(21, 22);  // SDA=21, SCL=22
  Wire.setClock(100000);
  scanBus();

  delay(500);

  // Test 2: Slow speed (10kHz) - sometimes helps with bad connections
  Serial.println("\nTest 2: Scanning at 10kHz (slow speed)...");
  Wire.setClock(10000);
  scanBus();

  delay(500);

  // Test 3: Fast speed (400kHz)
  Serial.println("\nTest 3: Scanning at 400kHz (fast speed)...");
  Wire.setClock(400000);
  scanBus();

  Serial.println("\n=== Scan Complete ===");
  Serial.println("\nIf NO devices found in ANY test:");
  Serial.println("  → Wiring problem (loose connection, bad wire, or wrong pins)");
  Serial.println("  → MPU-6050 not powered (check VCC and GND)");
  Serial.println("  → Faulty MPU-6050 module");
}

void loop() {
  // Nothing
}

void scanBus() {
  byte error, address;
  int deviceCount = 0;

  for(address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("  ✓ Device found at 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);

      if (address == 0x68 || address == 0x69) {
        Serial.print(" ← MPU-6050!");
      }
      Serial.println();
      deviceCount++;
    }
  }

  if (deviceCount == 0) {
    Serial.println("  ✗ No devices found");
  } else {
    Serial.print("  Found ");
    Serial.print(deviceCount);
    Serial.println(" device(s)");
  }
}
