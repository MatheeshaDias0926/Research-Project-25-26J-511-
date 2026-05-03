
from dotenv import load_dotenv
from typing import Dict
import os

def get_config()->Dict[str, str]:
    load_dotenv(override=True)
    return {
        "MQTT_BROKER_URL": os.getenv("MQTT_BROKER_URL", "broker.hivemq.com"),
        "MQTT_BROKER_PORT": int(os.getenv("MQTT_BROKER_PORT", 1883)),
        "MQTT_USERNAME": os.getenv("MQTT_USERNAME", ""),
        "MQTT_PASSWORD": os.getenv("MQTT_PASSWORD", ""),
        "MQTT_KEEPALIVE": int(os.getenv("MQTT_KEEPALIVE", 5)),
    }


MQTT_TOPIC:str = "herbq/sensordata"
MQTT_TOPIC2:str = "drystore/sensordata"