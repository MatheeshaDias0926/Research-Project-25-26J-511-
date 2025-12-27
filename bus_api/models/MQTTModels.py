from pydantic import BaseModel

class MQTTMessage(BaseModel):
    nitrogen:int
    phosphorus:int
    potassium:int
    timestamp:int