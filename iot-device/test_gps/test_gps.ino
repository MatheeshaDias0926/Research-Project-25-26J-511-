/*
 * GPS Module Test Code for ESP32
 *
 * Connections (assuming Neo-6M or similar GPS module):
 * GPS VCC -> ESP32 5V (or 3.3V, check your module)
 * GPS GND -> ESP32 GND
 * GPS TX  -> ESP32 RX2 (GPIO 16)
 * GPS RX  -> ESP32 TX2 (GPIO 17)
 */

#define GPS_RX 16  // ESP32 RX2 pin
#define GPS_TX 17  // ESP32 TX2 pin

void setup() {
  // Serial for debugging (USB)
  Serial.begin(115200);

  // Serial2 for GPS communication
  Serial2.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  delay(1000);
  Serial.println("\n=== GPS Module Test ===");
  Serial.println("Waiting for GPS data...");
  Serial.println("Note: GPS needs clear sky view to get fix (may take 1-5 minutes)\n");
}

void loop() {
  // Read data from GPS and print to Serial Monitor
  if (Serial2.available()) {
    String gpsData = Serial2.readStringUntil('\n');
    Serial.println(gpsData);

    // Parse basic GPS data (NMEA format)
    if (gpsData.startsWith("$GPGGA")) {
      Serial.println(">>> GPS Fix Data Received!");
      parseGPGGA(gpsData);
    }
    else if (gpsData.startsWith("$GPRMC")) {
      Serial.println(">>> GPS Recommended Minimum Data Received!");
    }
  }

  delay(100);
}

void parseGPGGA(String data) {
  // Simple parser for GPGGA sentence
  // Format: $GPGGA,time,lat,N/S,lon,E/W,quality,satellites,hdop,altitude,M,...

  int commaPos[15];
  int commaIndex = 0;

  // Find all comma positions
  for (int i = 0; i < data.length() && commaIndex < 15; i++) {
    if (data.charAt(i) == ',') {
      commaPos[commaIndex++] = i;
    }
  }

  if (commaIndex >= 10) {
    String time = data.substring(commaPos[0] + 1, commaPos[1]);
    String lat = data.substring(commaPos[1] + 1, commaPos[2]);
    String latDir = data.substring(commaPos[2] + 1, commaPos[3]);
    String lon = data.substring(commaPos[3] + 1, commaPos[4]);
    String lonDir = data.substring(commaPos[4] + 1, commaPos[5]);
    String quality = data.substring(commaPos[5] + 1, commaPos[6]);
    String satellites = data.substring(commaPos[6] + 1, commaPos[7]);
    String altitude = data.substring(commaPos[8] + 1, commaPos[9]);

    Serial.println("\n--- Parsed GPS Data ---");
    Serial.print("Time (UTC): "); Serial.println(time);
    Serial.print("Latitude: "); Serial.print(lat); Serial.println(latDir);
    Serial.print("Longitude: "); Serial.print(lon); Serial.println(lonDir);
    Serial.print("Fix Quality: "); Serial.println(quality);
    Serial.print("Satellites: "); Serial.println(satellites);
    Serial.print("Altitude: "); Serial.print(altitude); Serial.println(" M");
    Serial.println("=======================\n");
  }
}
