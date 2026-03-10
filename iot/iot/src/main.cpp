#include <Arduino.h>
#include "definitions.h"
#include "types.h"
#include "time.h"
#include "globals.h"
#include "functions.h"
#include "configurations.h"


static const char *TAG = "Main";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

SemaphoreHandle_t buzzerUpdateHandle;

int buzzerInterval = CONFIG_BUZZER_INTERVAL_DEFAULT;
int buzzerState = 0;
int lastUpdatedTime = 0;


void setup()
{

  Serial.begin(115200);
  esp_log_level_set(TAG, ESP_LOG_INFO);

  ESP_LOGI(TAG, "Initializing DryStore Firmware");
  
  init();

  xTaskCreatePinnedToCore(TaskActuateDevices, "TaskActuateDevices", CONFIG_DEFAULT_STACK_SIZE, NULL, CONFIG_DEFAULT_PRIORITY, NULL, CONFIG_DEFAULT_CORE);
  xTaskCreatePinnedToCore(TaskMQTT, "TaskMQTT", CONFIG_DEFAULT_DOUBLE_STACK_SIZE, NULL, CONFIG_DEFAULT_PRIORITY, NULL, CONFIG_DEFAULT_CORE);
  vTaskDelay(pdMS_TO_TICKS(CONFIG_SETUP_WAIT_INTERVAL));
}

void loop(){}


