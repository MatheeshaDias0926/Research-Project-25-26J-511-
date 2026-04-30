import json
from pathlib import Path

import numpy as np
import osmnx as ox
import geopandas as gpd
from shapely.ops import linemerge
from shapely.geometry import LineString
from shapely.ops import transform as shp_transform
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT_ROUTES = DATA / "built_routes"
OUT_GRAPH = DATA / "graph_cache"

OUT_ROUTES.mkdir(parents=True, exist_ok=True)
OUT_GRAPH.mkdir(parents=True, exist_ok=True)

SRC_CRS = "EPSG:4326"
SL_CRS_METERS = "EPSG:32644"  # Sri Lanka 


def _simplify_in_meters(geom, tolerance_m: float):
    if geom is None:
        return None

    to_m = Transformer.from_crs(SRC_CRS, SL_CRS_METERS, always_xy=True)
    to_deg = Transformer.from_crs(SL_CRS_METERS, SRC_CRS, always_xy=True)

    g_m = shp_transform(to_m.transform, geom)
    g_m_s = g_m.simplify(tolerance_m, preserve_topology=True)
    g_deg = shp_transform(to_deg.transform, g_m_s)
    return g_deg


def _route_geom_from_nodes(G, route_nodes):
    """
    Build a LineString/MultiLineString geometry for a route (list of nodes)
    by pulling the chosen edges' 'geometry' directly from the graph.
    Works without ox.utils_graph / route_to_gdf.
    """
    geoms = []

    for u, v in zip(route_nodes[:-1], route_nodes[1:]):
        data = G.get_edge_data(u, v)
        if not data:
            continue

        # data is dict: {key: attr_dict, key2: attr_dict...}
        best_key = min(
            data.keys(),
            key=lambda k: data[k].get("length", float("inf")),
        )
        attr = data[best_key]

        geom = attr.get("geometry")
        if geom is None:
            # fallback: straight line between nodes
            geom = LineString([(G.nodes[u]["x"], G.nodes[u]["y"]), (G.nodes[v]["x"], G.nodes[v]["y"])])

        geoms.append(geom)

    if not geoms:
        return None

    return linemerge(geoms)


def main():
    cfg_path = DATA / "route_definitions.json"
    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    routes = cfg["routes"]
    bbox_buf = float(cfg.get("bbox_buffer_deg", 0.05))
    simplify_tol_m = float(cfg.get("simplify_tolerance_m", 10))

    # Build bbox around all waypoints
    lats, lons = [], []
    for r in routes:
        for lat, lon in r["waypoints"]:
            lats.append(lat)
            lons.append(lon)

    north = max(lats) + bbox_buf
    south = min(lats) - bbox_buf
    east = max(lons) + bbox_buf
    west = min(lons) - bbox_buf

    # MAPLESS MODE: Skipping graph download due to disk space
    G = None 
    print("Running in Mapless Mode (Straight-Line)...")

    index = {"routes": []}

    for r in routes:
        route_no = str(r["routeNo"])
        name = r.get("name", route_no)
        buffer_m = float(r.get("buffer_m", 80))
        wpts = r["waypoints"]


        # NO-DISK-SPACE MODE: Just use a direct line between waypoints
        geom = LineString([(lon, lat) for lat, lon in wpts])
        geom = _simplify_in_meters(geom, simplify_tol_m)

        if geom is None:
            raise RuntimeError(f"Route {route_no} produced empty geometry")

        # Save GeoJSON (EPSG:4326)
        gdf = gpd.GeoDataFrame(
            [{"routeNo": route_no, "name": name, "buffer_m": buffer_m, "geometry": geom}],
            crs=SRC_CRS,
        )
        out_path = OUT_ROUTES / f"route_{route_no}.geojson"
        gdf.to_file(out_path, driver="GeoJSON")
        print(f"Saved route {route_no} -> {out_path}")

        index["routes"].append(
            {"routeNo": route_no, "name": name, "buffer_m": buffer_m, "file": out_path.name}
        )

    with open(OUT_ROUTES / "routes_index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)

    print("DONE ✅")


if __name__ == "__main__":
    main()