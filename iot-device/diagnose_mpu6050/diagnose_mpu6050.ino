/*
 * MPU-6050 Diagnostic Tool
 * This will help identify connection issues
 */

#include <Wire.h>

const int MPU_ADDR = 0x68;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== MPU-6050 Diagnostic Tool ===\n");

  // Initialize I2C
  Wire.begin(21, 22); // SDA=21, SCL=22 for ESP32
  delay(100);

  Serial.println("Step 1: Scanning I2C bus...");
  scanI2C();

  Serial.println("\nStep 2: Testing MPU-6050 communication...");
  testMPU6050();

  Serial.println("\nStep 3: Reading WHO_AM_I register...");
  readWhoAmI();

  Serial.println("\nStep 4: Attempting to wake up MPU-6050...");
  wakeUpMPU6050();

  Serial.println("\nStep 5: Reading sample data...");
  readSampleData();

  Serial.println("\n=== Diagnostic Complete ===");
}

void loop() {
  // Nothing in loop
}

void scanI2C() {
  byte error, address;
  int deviceCount = 0;

  Serial.println("Scanning I2C addresses from 0x01 to 0x7F...");

  for(address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("✓ I2C device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      deviceCount++;

      if (address == 0x68) {
        Serial.println("  → This is MPU-6050 default address!");
      }
    }
  }

  if (deviceCount == 0) {
    Serial.println("✗ ERROR: No I2C devices found!");
    Serial.println("\nPossible causes:");
    Serial.println("  1. Wiring issue - check connections");
    Serial.println("  2. SDA/SCL swapped");
    Serial.println("  3. MPU-6050 not powered");
    Serial.println("  4. Faulty sensor");
  } else {
    Serial.print("✓ Found ");
    Serial.print(deviceCount);
    Serial.println(" device(s)");
  }
}

void testMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  byte error = Wire.endTransmission();

  if (error == 0) {
    Serial.println("✓ MPU-6050 responding at 0x68");
  } else {
    Serial.print("✗ ERROR: MPU-6050 not responding. Error code: ");
    Serial.println(error);
    Serial.println("\nError codes:");
    Serial.println("  1 = Data too long");
    Serial.println("  2 = NACK on address");
    Serial.println("  3 = NACK on data");
    Serial.println("  4 = Other error");
  }
}

void readWhoAmI() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x75);  // WHO_AM_I register
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 1, true);

  if (Wire.available()) {
    byte whoAmI = Wire.read();
    Serial.print("WHO_AM_I register: 0x");
    Serial.println(whoAmI, HEX);

    if (whoAmI == 0x68) {
      Serial.println("✓ Correct! MPU-6050 identified");
    } else if (whoAmI == 0x00 || whoAmI == 0xFF) {
      Serial.println("✗ ERROR: Reading 0x00 or 0xFF indicates wiring problem");
    } else {
      Serial.println("✗ WARNING: Unexpected value (should be 0x68)");
    }
  } else {
    Serial.println("✗ ERROR: No data received from WHO_AM_I register");
  }
}

void wakeUpMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);  // PWR_MGMT_1 register
  Wire.write(0);     // Wake up
  byte error = Wire.endTransmission(true);

  if (error == 0) {
    Serial.println("✓ Wake-up command sent successfully");
    delay(100);
  } else {
    Serial.print("✗ ERROR: Failed to send wake-up command. Error: ");
    Serial.println(error);
  }
}

void readSampleData() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);  // Starting register
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);

  if (Wire.available() >= 14) {
    int16_t ax = Wire.read() << 8 | Wire.read();
    int16_t ay = Wire.read() << 8 | Wire.read();
    int16_t az = Wire.read() << 8 | Wire.read();
    int16_t temp = Wire.read() << 8 | Wire.read();
    int16_t gx = Wire.read() << 8 | Wire.read();
    int16_t gy = Wire.read() << 8 | Wire.read();
    int16_t gz = Wire.read() << 8 | Wire.read();

    Serial.println("Raw sensor values:");
    Serial.print("  Accel X: "); Serial.println(ax);
    Serial.print("  Accel Y: "); Serial.println(ay);
    Serial.print("  Accel Z: "); Serial.println(az);
    Serial.print("  Temp:    "); Serial.println(temp);
    Serial.print("  Gyro X:  "); Serial.println(gx);
    Serial.print("  Gyro Y:  "); Serial.println(gy);
    Serial.print("  Gyro Z:  "); Serial.println(gz);

    if (ax == 0 && ay == 0 && az == 0 && gx == 0 && gy == 0 && gz == 0) {
      Serial.println("\n✗ ERROR: All zeros - MPU-6050 may be in sleep mode or not initialized");
    } else {
      Serial.println("\n✓ Non-zero values detected - sensor appears to be working!");

      float accel_z_g = az / 16384.0;
      Serial.print("\nZ-axis acceleration: ");
      Serial.print(accel_z_g);
      Serial.println(" g");

      if (accel_z_g > 0.8 && accel_z_g < 1.2) {
        Serial.println("✓ GOOD: Z-axis shows ~1g (gravity) - sensor working correctly!");
      }
    }
  } else {
    Serial.println("✗ ERROR: Could not read sensor data");
  }
}
