from pydantic import BaseModel, Field
from typing import Optional


class RouteCheckRequest(BaseModel):
    busId: str = Field(..., min_length=1)
    lat: float
    lon: float
    
    routeNo: Optional[str] = None
    
    ts: Optional[float] = None


class RouteCheckResponse(BaseModel):
    ok: bool
    busId: str
    expectedRouteNo: Optional[str]
    matchedRouteNo: Optional[str]
    distanceToExpected_m: Optional[float]
    distanceToMatched_m: Optional[float]
    onRoute: bool
    status: str
    offRouteSeconds: float
    threshold_m: float