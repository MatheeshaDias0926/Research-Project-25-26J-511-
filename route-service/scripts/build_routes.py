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

    ox.settings.use_cache = True
    ox.settings.log_console = True

    graph_path = OUT_GRAPH / "colombo_bbox.graphml"

    # OSMnx v2 expects bbox as (left, bottom, right, top) => (west, south, east, north)
    bbox = (west, south, east, north)

    if graph_path.exists():
        print(f"Loading cached graph: {graph_path}")
        G = ox.load_graphml(graph_path)
    else:
        print("Downloading OSM road network (this can take a bit the first time)...")
        G = ox.graph_from_bbox(bbox, network_type="drive", simplify=True)
        ox.save_graphml(G, graph_path)
        print(f"Saved graph cache to: {graph_path}")

    
    nodes_gdf = ox.graph_to_gdfs(G, nodes=True, edges=False)

    node_ids = nodes_gdf.index.to_numpy()
    node_lat_rad = np.radians(nodes_gdf["y"].to_numpy())
    node_lon_rad = np.radians(nodes_gdf["x"].to_numpy())
    R = 6371000.0  # meters

    def nearest_node_id(lat: float, lon: float):
        lat1 = np.radians(lat)
        lon1 = np.radians(lon)

        dlat = node_lat_rad - lat1
        dlon = node_lon_rad - lon1

        a = (np.sin(dlat / 2) ** 2) + (np.cos(lat1) * np.cos(node_lat_rad) * (np.sin(dlon / 2) ** 2))
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
        dist = R * c

        return node_ids[int(dist.argmin())]

    index = {"routes": []}

    for r in routes:
        route_no = str(r["routeNo"])
        name = r.get("name", route_no)
        buffer_m = float(r.get("buffer_m", 80))
        wpts = r["waypoints"]

        # nearest nodes without scikit-learn
        nodes = [nearest_node_id(lat, lon) for lat, lon in wpts]

        full_nodes = []
        for a, b in zip(nodes[:-1], nodes[1:]):
            path = ox.shortest_path(G, a, b, weight="length")
            if not path:
                raise RuntimeError(f"Could not build path for route {route_no} segment {a}->{b}")

            if not full_nodes:
                full_nodes.extend(path)
            else:
                full_nodes.extend(path[1:])  # avoid duplicate join node

        geom = _route_geom_from_nodes(G, full_nodes)
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