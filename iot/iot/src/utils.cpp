#include "functions.h"
#include "configurations.h"
#include "globals.h"
#include "types.h"
#include <ConfigDevice.h>


static const char *TAG = "Utils";

const char *ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 19800;
const int daylightOffset_sec = 0;

void setTime()
{
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  delay(CONFIG_TIME_SYNCHRONIZATION_DELAY);
  ESP_LOGI(TAG, "Time Synchronized with NTP Server");
}

int getUnixTime()
{
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo))
  {
    ESP_LOGW(TAG, "Unable to retrieve Time from local RTC");
    return 0;
  }
  time_t now = mktime(&timeinfo);
  return (int)now;
}


void init()
{
  configDevice();

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RED_LED,OUTPUT);
  pinMode(GREEN_LED,OUTPUT);


  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED)
  {
    blinkLED(RED_LED,CONFIG_WIFI_WAIT_INTERVAL);
    ESP_LOGD(TAG, ".");
  }
  ESP_LOGI(TAG, "WiFi connected");

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  setTime();
  getUnixTime();

  buzzerUpdateHandle = xSemaphoreCreateMutex();

  ESP_LOGI(TAG, "Initialization Complete");
}

void blinkLED(int pin,int duration)
{
  digitalWrite(pin,HIGH);
  vTaskDelay(pdMS_TO_TICKS(duration));
  digitalWrite(pin,LOW);
  vTaskDelay(pdMS_TO_TICKS(duration));
}

