import json
from pathlib import Path
from typing import Dict, Any, List

import geopandas as gpd
from shapely.ops import transform as shp_transform
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
BUILT = DATA / "built_routes"

SRC_CRS = "EPSG:4326"
SL_CRS_METERS = "EPSG:32644"


class RouteStore:
    def __init__(self):
        self.routes: Dict[str, Dict[str, Any]] = {}
        self.bus_to_route: Dict[str, str] = {}

        self._to_m = Transformer.from_crs(SRC_CRS, SL_CRS_METERS, always_xy=True)

    def load(self):
        # Load bus mapping
        buses_path = DATA / "buses.json"
        if buses_path.exists():
            self.bus_to_route = json.loads(buses_path.read_text(encoding="utf-8"))
            # normalize
            self.bus_to_route = {k: v.get("routeNo") for k, v in self.bus_to_route.items()}

        # Load routes index
        idx_path = BUILT / "routes_index.json"
        if not idx_path.exists():
            raise RuntimeError("routes_index.json not found. Run: python scripts/build_routes.py")

        idx = json.loads(idx_path.read_text(encoding="utf-8"))
        for r in idx.get("routes", []):
            file_name = r["file"]
            route_no = str(r["routeNo"])
            gdf = gpd.read_file(BUILT / file_name)
            if gdf.empty:
                continue

            geom = gdf.iloc[0].geometry
            geom_m = shp_transform(self._to_m.transform, geom)

            self.routes[route_no] = {
                "routeNo": route_no,
                "name": r.get("name", route_no),
                "buffer_m": float(r.get("buffer_m", 80)),
                "geom_deg": geom,
                "geom_m": geom_m,
            }

        if not self.routes:
            raise RuntimeError("No routes loaded. Check built_routes/ output.")

    def list_routes(self) -> List[Dict[str, Any]]:
        return [{"routeNo": v["routeNo"], "name": v["name"], "buffer_m": v["buffer_m"]} for v in self.routes.values()]

    def expected_route_for_bus(self, bus_id: str):
        return self.bus_to_route.get(bus_id)

    def get(self, route_no: str):
        return self.routes.get(str(route_no))