#ifndef DEFINITIONS_H
#define DEFINITIONS_H

#define BUZZER_PIN 4

#define GREEN_LED 16
#define RED_LED 2

#define WIFI_SSID "Dialog 4G 509"
#define WIFI_PASSWORD "thushan2021"

#define MQTT_SERVER "broker.hivemq.com"
#define MQTT_PORT 1883

extern const char *ntpServer;
extern const long gmtOffset_sec;
extern const int daylightOffset_sec;
extern const char* MQTT_CLIENT_ID;

#endif // DEFINITIONS_H