from flask import Flask
from flask_mqtt import Mqtt
from Configurations import get_config, MQTT_TOPIC, MQTT_TOPIC2
from models.MQTTModels import MQTTMessage
from threading import Lock
from datetime import datetime, timezone

mqtt = Mqtt()

# in-memory storage (latest message per topic)
_latest_by_topic = {
    MQTT_TOPIC: None,
    MQTT_TOPIC2: None,
}
_lock = Lock()

def get_latest(topic: str):
    with _lock:
        return _latest_by_topic.get(topic)

@mqtt.on_connect()
def handle_connect(client, userdata, flags, rc):
    mqtt.subscribe(MQTT_TOPIC)
    mqtt.subscribe(MQTT_TOPIC2)
    print("MQTT connected and subscribed to topics.")

@mqtt.on_message()
def handle_mqtt_message(client, userdata, message):
    topic = message.topic
    payload = message.payload.decode(errors="ignore")

    try:
        # validate JSON payload using your Pydantic model
        data = MQTTMessage.model_validate_json(payload)

        # store latest (include server receive time)
        item = {
            "topic": topic,
            "received_at": datetime.now(timezone.utc).isoformat(),
            "data": data.model_dump(),
            "raw": payload,
        }

        with _lock:
            if topic in _latest_by_topic:
                _latest_by_topic[topic] = item

        print(f"Received [{topic}]: {data}")

    except Exception as e:
        print(f"Invalid message on topic {topic}: {e}. Raw: {payload}")

def create_mqtt_app(app: Flask) -> Mqtt:
    app.config.update(get_config())
    mqtt.init_app(app)
    return mqtt
