import time
from typing import Dict, Any, Optional, Tuple

from shapely.geometry import Point
from shapely.ops import transform as shp_transform
from pyproj import Transformer

SRC_CRS = "EPSG:4326"
SL_CRS_METERS = "EPSG:32644"


class RouteMatcher:
    def __init__(self, default_buffer_m=80.0, warning_after_s=30.0, violation_after_s=120.0):
        self.default_buffer_m = float(default_buffer_m)
        self.warning_after_s = float(warning_after_s)
        self.violation_after_s = float(violation_after_s)

        self._to_m = Transformer.from_crs(SRC_CRS, SL_CRS_METERS, always_xy=True)

        # bus state (in-memory). For multi-server production, store in Redis.
        self._state: Dict[str, Dict[str, Any]] = {}

    def _now(self, ts: Optional[float]) -> float:
        return float(ts) if ts is not None else time.time()

    def _pt_m(self, lon: float, lat: float):
        pt = Point(lon, lat)
        return shp_transform(self._to_m.transform, pt)

    def _min_route(self, routes: Dict[str, Dict[str, Any]], pt_m) -> Tuple[Optional[str], float]:
        best_no, best_d = None, float("inf")
        for route_no, r in routes.items():
            d = pt_m.distance(r["geom_m"])
            if d < best_d:
                best_no, best_d = route_no, d
        return best_no, best_d

    def check(
        self,
        bus_id: str,
        lat: float,
        lon: float,
        expected_route: Optional[Dict[str, Any]],
        all_routes: Dict[str, Dict[str, Any]],
        ts: Optional[float] = None,
    ):
        t = self._now(ts)
        st = self._state.setdefault(bus_id, {"off_since": None, "last_on": None})

        pt_m = self._pt_m(lon, lat)

        matched_no, matched_d = self._min_route(all_routes, pt_m)

        expected_no = expected_route["routeNo"] if expected_route else None
        expected_d = pt_m.distance(expected_route["geom_m"]) if expected_route else None
        threshold = float(expected_route["buffer_m"]) if expected_route else self.default_buffer_m

        # on-route decision uses expected route
        on_route = False
        if expected_d is not None and expected_d <= threshold:
            on_route = True

        if on_route:
            st["off_since"] = None
            st["last_on"] = t
            status = "on_route"
            off_secs = 0.0
        else:
            # start off-route timer
            if st["off_since"] is None:
                st["off_since"] = t
            off_secs = max(0.0, t - st["off_since"])

            if off_secs >= self.violation_after_s:
                status = "violation"
            elif off_secs >= self.warning_after_s:
                status = "warning"
            else:
                status = "off_route"

            # optional extra label: on some other route corridor
            if matched_no and matched_d <= threshold and expected_d is not None and matched_d < expected_d:
                status = f"{status}_likely_on_route_{matched_no}"

        return {
            "busId": bus_id,
            "expectedRouteNo": expected_no,
            "matchedRouteNo": matched_no,
            "distanceToExpected_m": float(expected_d) if expected_d is not None else None,
            "distanceToMatched_m": float(matched_d) if matched_no is not None else None,
            "onRoute": bool(on_route),
            "status": status,
            "offRouteSeconds": float(off_secs),
            "threshold_m": float(threshold),
        }