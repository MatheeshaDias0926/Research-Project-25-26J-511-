#ifndef GLOBALS_H
#define GLOBALS_H

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include "definitions.h"

extern "C" {
  #include "esp_log.h"
}


extern SemaphoreHandle_t buzzerUpdateHandle;

extern WiFiClient espClient;
extern PubSubClient mqttClient;

extern int buzzerState;
extern int lastUpdatedTime;
extern int buzzerInterval;


#endif // GLOBALS_H