#ifndef CONFIGURATIONS_H
#define CONFIGURATIONS_H

#define CONFIG_EMAIL_SUMMARY_DELAY 1000 // milliseconds delay to show email summary
#define CONFIG_DISPLAY_THREAD_DELAY 20 // milliseconds delay for display thread this should be less than the smallest of other intervals
#define CONFIG_MARQUEE_DELAY 20 // milliseconds delay for marquee speed
#define CONFIG_TIME_UPDATE_INTERVAL 1000 // milliseconds interval to update time display
#define CONFIG_SENSOR_DISPLAY_DELAY 1000 // milliseconds interval to update sensor display

#define CONFIG_BUZZER_FREQUENCY 1000 // Frequency of the buzzer in Hz

#define CONFIG_BUZZER_CHECK_INTERVAL 10 // milliseconds interval to check buzzer state
#define CONFIG_MQTT_RETRY_INTERVAL 2000 // 2 seconds
#define CONFIG_MQTT_POLL_INTERVAL 100 // 100 ms

#define CONFIG_TIME_SYNCHRONIZATION_DELAY 350 // 350 ms
#define CONFIG_CONNECTION_MANAGER_POLL_INTERVAL 5000 // 5 seconds

#define CONFIG_SETUP_WAIT_INTERVAL 2000 // 2 seconds
#define CONFIG_WIFI_WAIT_INTERVAL 350 // 500 milliseconds

#define CONFIG_BUZZER_INTERVAL_DEFAULT 2000 // 2 seconds

#define CONFIG_SEMAPHORE_WAIT_INTERVAL 10 // 10 milliseconds

#define CONFIG_MQTT_BUZZER_CONTROL_TOPIC "buzzer/control"
#define CONFIG_MQTT_BUZZER_INTERVAL_TOPIC "buzzer/interval"

#define CONFIG_BUZZER_STATE_KEY "buzzerState"
#define CONFIG_BUZZER_INTERVAL_KEY "buzzerInterval"


#define CONFIG_TIME_BUFFER_SIZE 32
#define CONFIG_MQTT_BUFFER_SIZE 256
#define CONFIG_DEFAULT_STACK_SIZE 4096
#define CONFIG_DEFAULT_DOUBLE_STACK_SIZE 8192

#define CONFIG_DEFAULT_CORE 1
#define CONFIG_DEFAULT_PRIORITY 1

#define CONFIG_DEFAULT_QUEUE_LENGTH 5

#define CONFIG_TIME_FORMAT_FOR_DISPLAY "%H:%M"

#define CONFIG_SENSOR_DATA_PUBLISH_TOPIC "drystore/sensordata"
#endif // CONFIGURATIONS_H