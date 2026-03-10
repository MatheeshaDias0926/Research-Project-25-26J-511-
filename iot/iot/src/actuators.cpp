#include "functions.h"
#include "configurations.h"
#include "globals.h"
#include "types.h"

static const char *TAG = "Actuators";

void TaskActuateDevices(void *pvParameters)
{
  for (;;)
  {
    if (xSemaphoreTake(buzzerUpdateHandle, pdMS_TO_TICKS(CONFIG_SEMAPHORE_WAIT_INTERVAL)))
    {
      if (buzzerState == 1)
      {
        tone(BUZZER_PIN, CONFIG_BUZZER_FREQUENCY);
        ESP_LOGI(TAG, "Buzzer Activated");
        xSemaphoreGive(buzzerUpdateHandle);
        vTaskDelay(pdMS_TO_TICKS(buzzerInterval));
        noTone(BUZZER_PIN);
        if (xSemaphoreTake(buzzerUpdateHandle, pdMS_TO_TICKS(CONFIG_SEMAPHORE_WAIT_INTERVAL)))
        {
          buzzerState = 0;
          xSemaphoreGive(buzzerUpdateHandle);
        }
        ESP_LOGI(TAG, "Buzzer Deactivated after interval");
      }
      else
      {
        xSemaphoreGive(buzzerUpdateHandle);
      }
    }
    vTaskDelay(pdMS_TO_TICKS(CONFIG_BUZZER_CHECK_INTERVAL));
  }
}