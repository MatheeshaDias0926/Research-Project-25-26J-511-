#include "functions.h"
#include "configurations.h"
#include "globals.h"
#include "types.h"
#include <ArduinoJson.h>

static const char *TAG = "Connection";

const char* MQTT_CLIENT_ID = "00006CB3FA71FE68";

void TaskMQTT(void *pvParameters)
{
  for (;;)
  {
    if (!mqttClient.connected())
    {
      ESP_LOGI(TAG, "Attempting MQTT connection...");
      while (!mqttClient.connected())
      {
        if (mqttClient.connect(MQTT_CLIENT_ID))
        {
          mqttClient.subscribe(CONFIG_MQTT_BUZZER_CONTROL_TOPIC);
          mqttClient.subscribe(CONFIG_MQTT_BUZZER_INTERVAL_TOPIC);
          ESP_LOGI(TAG, "MQTT Broker Connected"); 
        }
        else
        {
          ESP_LOGW(TAG, "Failed to connect to MQTT Broker, rc=%d. Retrying in %d ms", mqttClient.state(), CONFIG_MQTT_RETRY_INTERVAL);
          blinkLED(RED_LED,CONFIG_MQTT_RETRY_INTERVAL);
        }
      }
    }
    mqttClient.loop();
    vTaskDelay(pdMS_TO_TICKS(CONFIG_MQTT_POLL_INTERVAL));
  }
}

void mqttCallback(char *topic, byte *payload, unsigned int length)
{
  String msg;
  for (unsigned int i = 0; i < length; i++)
  {
    msg += (char)payload[i];
  }
  String topicStr = String(topic);
  ESP_LOGI(TAG, "Message arrived on topic : %s", topic);
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, msg);
  if (error)
  {
    ESP_LOGW(TAG, "Failed to parse MQTT message: %s", error.c_str());
    return;
  }
  if(xSemaphoreTake(buzzerUpdateHandle, pdMS_TO_TICKS(CONFIG_SEMAPHORE_WAIT_INTERVAL)))
  {
    if (topicStr == CONFIG_MQTT_BUZZER_CONTROL_TOPIC)
    {
      if(doc[CONFIG_BUZZER_STATE_KEY].is<int>())
      {
        buzzerState = doc[CONFIG_BUZZER_STATE_KEY];
        lastUpdatedTime = getUnixTime();
        ESP_LOGI(TAG, "Buzzer State updated to: %d", buzzerState);
      }
      ESP_LOGI(TAG, "Buzzer State updated to: %d", buzzerState);
    }
    else if (topicStr == CONFIG_MQTT_BUZZER_INTERVAL_TOPIC)
    {
      if(doc[CONFIG_BUZZER_INTERVAL_KEY].is<int>())
      {
        buzzerInterval = doc[CONFIG_BUZZER_INTERVAL_KEY];
        ESP_LOGI(TAG, "Buzzer Interval received: %d ms", buzzerInterval);
      }
    }
    
    xSemaphoreGive(buzzerUpdateHandle);
  }
}