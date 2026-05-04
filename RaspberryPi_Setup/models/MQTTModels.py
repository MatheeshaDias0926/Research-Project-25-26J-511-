from pydantic import BaseModel
from typing import Optional

class MQTTMessage(BaseModel):
    interiorTemperature: Optional[float] = None
    interiorHumidity: Optional[float] = None
    exteriorTemperature: float
    exteriorHumidity: float
    isSufficientLight: bool
    timestamp: int
    nitrogen: Optional[int] = None  # Make optional
    phosphorus: Optional[int] = None  # Make optional
    potassium: Optional[int] = None  # Make optional