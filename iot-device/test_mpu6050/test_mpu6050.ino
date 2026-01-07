/*
 * MPU-6050 Test Code for ESP32
 *
 * Connections:
 * MPU-6050 VCC -> ESP32 3.3V
 * MPU-6050 GND -> ESP32 GND
 * MPU-6050 SCL -> ESP32 GPIO 22
 * MPU-6050 SDA -> ESP32 GPIO 21
 */

#include <Wire.h>

// MPU-6050 I2C address
const int MPU_ADDR = 0x68;

// Variables to store sensor data
int16_t accel_x, accel_y, accel_z;
int16_t gyro_x, gyro_y, gyro_z;
int16_t temperature;

void setup() {
  Serial.begin(115200);
  Wire.begin(); // Initialize I2C (SDA=21, SCL=22 on ESP32)

  delay(1000);
  Serial.println("\n=== MPU-6050 Test ===");

  // Wake up MPU-6050 (it starts in sleep mode)
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);  // PWR_MGMT_1 register
  Wire.write(0);     // Set to 0 to wake up MPU-6050
  Wire.endTransmission(true);

  Serial.println("MPU-6050 initialized!");
  Serial.println("Reading sensor data...\n");
  delay(100);
}

void loop() {
  // Read accelerometer and gyroscope data
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);  // Starting register for accelerometer readings
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);  // Request 14 bytes

  // Read accelerometer data (3 axes, 2 bytes each)
  accel_x = Wire.read() << 8 | Wire.read();
  accel_y = Wire.read() << 8 | Wire.read();
  accel_z = Wire.read() << 8 | Wire.read();

  // Read temperature (2 bytes)
  temperature = Wire.read() << 8 | Wire.read();

  // Read gyroscope data (3 axes, 2 bytes each)
  gyro_x = Wire.read() << 8 | Wire.read();
  gyro_y = Wire.read() << 8 | Wire.read();
  gyro_z = Wire.read() << 8 | Wire.read();

  // Convert raw values to real units
  float accel_x_g = accel_x / 16384.0;  // ±2g range
  float accel_y_g = accel_y / 16384.0;
  float accel_z_g = accel_z / 16384.0;

  float gyro_x_dps = gyro_x / 131.0;    // ±250°/s range
  float gyro_y_dps = gyro_y / 131.0;
  float gyro_z_dps = gyro_z / 131.0;

  float temp_c = temperature / 340.0 + 36.53;

  // Print data
  Serial.println("--- Sensor Readings ---");
  Serial.print("Acceleration X: "); Serial.print(accel_x_g); Serial.println(" g");
  Serial.print("Acceleration Y: "); Serial.print(accel_y_g); Serial.println(" g");
  Serial.print("Acceleration Z: "); Serial.print(accel_z_g); Serial.println(" g");
  Serial.println();

  Serial.print("Gyroscope X: "); Serial.print(gyro_x_dps); Serial.println(" °/s");
  Serial.print("Gyroscope Y: "); Serial.print(gyro_y_dps); Serial.println(" °/s");
  Serial.print("Gyroscope Z: "); Serial.print(gyro_z_dps); Serial.println(" °/s");
  Serial.println();

  Serial.print("Temperature: "); Serial.print(temp_c); Serial.println(" °C");
  Serial.println("=======================\n");

  delay(500);  // Read every 500ms
}
