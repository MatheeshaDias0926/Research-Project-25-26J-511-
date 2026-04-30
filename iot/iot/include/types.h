#ifndef TYPES_H
#define TYPES_H
#include <Arduino.h>

typedef struct {
  int buzzerState;
  int lastUpdatedTime;
} MQTTMsg;


#endif // TYPES_H