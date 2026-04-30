#ifndef FUNCTIONS_H
#define FUNCTIONS_H
#include <Arduino.h>

void init();
void blinkLED(int pin,int duration);


void TaskActuateDevices(void *pvParameters);

void TaskMQTT(void *pvParameters);
void mqttCallback(char *topic, byte *payload, unsigned int length);

void setTime();
int getUnixTime();

#endif // FUNCTIONS_H