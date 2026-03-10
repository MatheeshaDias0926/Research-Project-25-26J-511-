import os
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import RouteCheckRequest, RouteCheckResponse
from .route_store import RouteStore
from .matcher import RouteMatcher

API_KEY = os.getenv("API_KEY", "").strip()
DEFAULT_BUFFER_M = float(os.getenv("DEFAULT_BUFFER_M", "80"))
WARNING_AFTER_S = float(os.getenv("WARNING_AFTER_S", "30"))
VIOLATION_AFTER_S = float(os.getenv("VIOLATION_AFTER_S", "120"))

app = FastAPI(title="Bus Route Check Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_headers=["*"],
    allow_methods=["*"],
)

store = RouteStore()
matcher = RouteMatcher(
    default_buffer_m=DEFAULT_BUFFER_M,
    warning_after_s=WARNING_AFTER_S,
    violation_after_s=VIOLATION_AFTER_S,
)

@app.on_event("startup")
def startup():
    store.load()

def require_key(x_api_key: str | None):
    if API_KEY and (x_api_key or "").strip() != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

@app.get("/health")
def health():
    return {"ok": True, "routesLoaded": len(store.routes), "busesLoaded": len(store.bus_to_route)}

@app.get("/routes")
def routes():
    return {"ok": True, "routes": store.list_routes()}

@app.post("/route/check", response_model=RouteCheckResponse)
def route_check(payload: RouteCheckRequest, x_api_key: str | None = Header(default=None)):
    require_key(x_api_key)

    bus_id = payload.busId.strip()

    # Determine expected route number
    expected_route_no = payload.routeNo.strip() if payload.routeNo else store.expected_route_for_bus(bus_id)
    expected_route = store.get(expected_route_no) if expected_route_no else None

    result = matcher.check(
        bus_id=bus_id,
        lat=payload.lat,
        lon=payload.lon,
        expected_route=expected_route,
        all_routes=store.routes,
        ts=payload.ts,
    )

    return {"ok": True, **result}