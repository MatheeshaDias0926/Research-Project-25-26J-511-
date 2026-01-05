#!/usr/bin/env python3
"""
Map The Road Ahead - end-to-end pipeline example

This script:
- builds a small OSMnx driving graph around a provided GPS point
- snaps to the nearest edge and slices the upcoming road geometry for a lookahead distance
- projects coordinates to a local metric CRS (UTM by default)
- samples points along the slice and computes curvature (3-point circumcircle)
- fetches elevation from Open-Elevation (or uses local DEM if provided)
- computes gradient (slope) and provides smoothed results

Usage examples and install instructions are in README.md
"""

import argparse
import math
import json
import sys
from typing import List, Tuple, Optional, Dict, Any

import numpy as np
import requests
from shapely.geometry import LineString, Point
from pyproj import Transformer, CRS

try:
    import osmnx as ox
except Exception as e:
    print("Please install osmnx (pip install osmnx). Error:", e)
    raise

try:
    from scipy.signal import savgol_filter
except Exception:
    savgol_filter = None

try:
    import rasterio
except Exception:
    rasterio = None


def utm_crs_for_latlon(lat: float, lon: float) -> CRS:
    """Return an appropriate UTM CRS for given lat/lon as a pyproj CRS."""
    zone = int((lon + 180) / 6) + 1
    if lat >= 0:
        epsg = 32600 + zone
    else:
        epsg = 32700 + zone
    return CRS.from_epsg(epsg)


def nearest_edge_for_point(G, lon: float, lat: float):
    """Return (u, v, key) of the nearest edge to lon/lat, handling osmnx API variations."""
    try:
        # newer OSMnx forms
        res = ox.distance.nearest_edges(G, X=[lon], Y=[lat])
        u, v, key = res[0]
        return int(u), int(v), int(key)
    except Exception:
        try:
            # fallback older helper
            return ox.nearest_edges(G, lon, lat)
        except Exception as exc:
            raise RuntimeError("Could not find nearest edge using OSMnx: %s" % exc)


def build_local_graph(lat: float, lon: float, dist_m: float = 250.0):
    """Build a small driving graph around (lat, lon).

    dist_m is search radius in meters.
    """
    # osmnx expects (lat, lon) for graph_from_point
    G = ox.graph_from_point((lat, lon), dist=dist_m, network_type="drive")
    return G


def edge_geometry_to_linestring(G, u, v, key) -> LineString:
    edge = G.edges[u, v, key]
    geom = edge.get("geometry")
    if geom is None:
        # fallback to straight segment between nodes
        p1 = (G.nodes[u]["x"], G.nodes[u]["y"])  # lon, lat
        p2 = (G.nodes[v]["x"], G.nodes[v]["y"])  # lon, lat
        geom = LineString([p1, p2])
    return geom


def project_linestring_to_crs(ls: LineString, crs_from: str = "EPSG:4326", crs_to: Optional[CRS] = None) -> Tuple[LineString, Transformer]:
    """Project a lon/lat LineString to metric CRS and return projected LineString and transformer.

    If crs_to is None, choose local UTM based on first point.
    """
    coords = list(ls.coords)
    if crs_to is None:
        # determine UTM based on first point (lat,lon)
        lon0, lat0 = coords[0]
        crs_to = utm_crs_for_latlon(lat0, lon0)
    transformer = Transformer.from_crs(crs_from, crs_to, always_xy=True)
    coords_m = [transformer.transform(x, y) for (x, y) in coords]
    line_m = LineString(coords_m)
    return line_m, transformer


def sample_along_linestring(line_m: LineString, start_dist: float, end_dist: float, spacing: float) -> List[Tuple[float, float]]:
    if end_dist > line_m.length:
        end_dist = line_m.length
    if start_dist < 0:
        start_dist = 0.0
    if end_dist <= start_dist:
        return []
    dists = np.arange(start_dist, end_dist + 1e-6, spacing)
    pts = [line_m.interpolate(float(d)) for d in dists]
    return [(p.x, p.y) for p in pts]


def circumradius(a, b, c) -> float:
    (ax, ay), (bx, by), (cx, cy) = a, b, c
    ab = math.hypot(bx - ax, by - ay)
    bc = math.hypot(cx - bx, cy - by)
    ca = math.hypot(ax - cx, ay - cy)
    s = (ab + bc + ca) / 2.0
    # Heron's formula for area (robust non-negative)
    tmp = max(0.0, s * (s - ab) * (s - bc) * (s - ca))
    area = math.sqrt(tmp) if tmp > 0 else 0.0
    if area == 0.0:
        return float("inf")
    R = (ab * bc * ca) / (4.0 * area)
    return R


def compute_curvature_three_point(sample_pts: List[Tuple[float, float]]) -> Tuple[float, float, List[float]]:
    """Compute sliding 3-point circumcircle radii along sample_pts.

    Returns (median_radius, min_radius, list_of_radii).
    """
    radii = []
    n = len(sample_pts)
    for i in range(n - 2):
        r = circumradius(sample_pts[i], sample_pts[i + 1], sample_pts[i + 2])
        radii.append(r)
    radii_arr = np.array([r for r in radii if np.isfinite(r)])
    if radii_arr.size == 0:
        return float("inf"), float("inf"), []
    return float(np.median(radii_arr)), float(np.min(radii_arr)), radii


def batch_query_elevation_open_elevation(lonlat_list: List[Tuple[float, float]], url: str = "https://api.open-elevation.com/api/v1/lookup", batch_size: int = 100) -> List[Optional[float]]:
    results = []
    idx = 0
    while idx < len(lonlat_list):
        batch = lonlat_list[idx: idx + batch_size]
        locations = [{"latitude": lat, "longitude": lon} for (lon, lat) in batch]
        try:
            resp = requests.post(url, json={"locations": locations}, timeout=15)
            resp.raise_for_status()
            j = resp.json()
            for item in j.get("results", []):
                results.append(item.get("elevation"))
        except Exception as e:
            # append None for failures
            for _ in batch:
                results.append(None)
        idx += batch_size
    return results


def compute_distance_along_pts(pts: List[Tuple[float, float]]) -> List[float]:
    dists = [0.0]
    for i in range(1, len(pts)):
        d = math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
        dists.append(dists[-1] + d)
    return dists


def slope_from_elevations(elevs: List[Optional[float]], dists: List[float]):
    """Compute slope with IQR-based outlier filtering."""
    # filter out Nones
    paired = [(d, e) for (d, e) in zip(dists, elevs) if e is not None]
    if len(paired) < 2:
        return None
    ds, es = zip(*paired)
    es = np.array(es)
    ds = np.array(ds)
    # IQR filter to remove elevation outliers
    if len(es) >= 4:
        q1, q3 = np.percentile(es, [25, 75])
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        mask = (es >= lower) & (es <= upper)
        es = es[mask]
        ds = ds[mask]
    if len(es) < 2:
        return None
    coeffs = np.polyfit(ds, es, 1)
    slope = float(coeffs[0])  # m per m
    return slope


def smooth_array(arr: List[float], window: int = 7, polyorder: int = 2) -> List[float]:
    if savgol_filter is None:
        return arr
    # ensure odd window and <= len(arr)
    if window >= len(arr):
        window = len(arr) - (1 - len(arr) % 2)
    if window < 3:
        return arr
    if window % 2 == 0:
        window += 1
    try:
        return savgol_filter(np.array(arr), window, polyorder).tolist()
    except Exception:
        return arr


# ---------------------------------------------------------------------------
# High-level API for integration with physics_engine
# ---------------------------------------------------------------------------

def get_road_data(lat: float, lon: float,
                  lookahead: float = 120.0,
                  spacing: float = 2.0,
                  graph_radius: float = 500.0,
                  elevation_api: str = "https://api.open-elevation.com/api/v1/lookup",
                  dem_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Return curvature and slope data for the road ahead of (lat, lon).

    Returns dict with keys:
      - median_radius_m
      - sharpest_radius_m
      - radii_samples
      - radii_smoothed
      - slope_m_per_m
      - slope_percent
      - slope_degrees
      - elevations
      - sample_points_lonlat
      - projected_crs
      - error (if any)
    """
    result: Dict[str, Any] = {}
    try:
        G = build_local_graph(lat, lon, dist_m=graph_radius)
        u, v, key = nearest_edge_for_point(G, lon, lat)
        geom = edge_geometry_to_linestring(G, u, v, key)

        line_m, transformer = project_linestring_to_crs(geom, crs_from="EPSG:4326", crs_to=None)
        vehicle_m = Point(transformer.transform(lon, lat))
        proj_dist = line_m.project(vehicle_m)
        start_dist = proj_dist
        end_dist = proj_dist + lookahead

        if start_dist >= line_m.length:
            result["error"] = "Vehicle is at/near end of geometry; no lookahead available."
            return result

        sample_pts = sample_along_linestring(line_m, start_dist, end_dist, spacing)
        if len(sample_pts) < 3:
            result["error"] = f"Not enough sample points ({len(sample_pts)}) to compute curvature."
            return result

        median_R, min_R, radii = compute_curvature_three_point(sample_pts)

        inv_transformer = Transformer.from_crs(transformer.target_crs, transformer.source_crs, always_xy=True)
        lonlat_pts = [inv_transformer.transform(x, y) for (x, y) in sample_pts]

        elevs = None
        if dem_path and rasterio is not None:
            try:
                with rasterio.open(dem_path) as src:
                    elevs = []
                    for lon_, lat_ in lonlat_pts:
                        for val in src.sample([(lon_, lat_)]):
                            elevs.append(float(val[0]) if val[0] is not None else None)
            except Exception:
                elevs = None

        if elevs is None:
            elevs = batch_query_elevation_open_elevation(lonlat_pts, url=elevation_api)

        dists = compute_distance_along_pts(sample_pts)
        slope = slope_from_elevations(elevs, dists)
        slope_percent = slope * 100.0 if slope is not None else None
        slope_deg = math.degrees(math.atan(slope)) if slope is not None else None

        finite_radii = [r if np.isfinite(r) else 1e9 for r in radii]
        smoothed = smooth_array(finite_radii, window=7, polyorder=2) if len(finite_radii) >= 7 else finite_radii

        if radii:
            min_index = np.argmin(radii)
            # Distance: index * spacing (approx) or use actual distances
            # The radius i corresponds to points i, i+1, i+2. The "center" of the curve is roughly i+1.
            # So distance is dists[min_index + 1]
            try:
                # dists array is len(sample_pts). radii is len(sample_pts)-2.
                # radii[0] uses pts[0,1,2]. Center is pts[1]. Distance is dists[1].
                distance_to_min = dists[min_index + 1]
            except IndexError:
                distance_to_min = 0.0
        else:
            distance_to_min = None

        result = {
            "projected_crs": transformer.target_crs.to_string(),
            "median_radius_m": None if not math.isfinite(median_R) else float(median_R),
            "sharpest_radius_m": None if not math.isfinite(min_R) else float(min_R),
            "distance_to_sharpest_radius_m": float(distance_to_min) if distance_to_min is not None else None,
            "radii_samples": radii,
            "radii_smoothed": smoothed,
            "slope_m_per_m": slope,
            "slope_percent": slope_percent,
            "slope_degrees": slope_deg,
            "elevations": elevs,
            "sample_points_lonlat": lonlat_pts,
        }
    except Exception as e:
        result["error"] = str(e)

    return result


# ---------------------------------------------------------------------------
# CLI entry point (original main)
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Map the Road Ahead - curvature & slope from a GPS point")
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lon", type=float, required=True)
    parser.add_argument("--lookahead", type=float, default=120.0, help="lookahead meters")
    parser.add_argument("--spacing", type=float, default=2.0, help="sample spacing in meters")
    parser.add_argument("--graph-radius", type=float, default=500.0, help="OSM graph build radius in meters")
    parser.add_argument("--elevation-api", type=str, default="https://api.open-elevation.com/api/v1/lookup")
    parser.add_argument("--dem-path", type=str, default=None, help="Optional local DEM raster (rasterio) path to use instead of elevation API")
    parser.add_argument("--output", type=str, default=None, help="Optional path to write JSON output")
    args = parser.parse_args()

    lat, lon = args.lat, args.lon
    G = build_local_graph(lat, lon, dist_m=args.graph_radius)
    u, v, key = nearest_edge_for_point(G, lon, lat)
    geom = edge_geometry_to_linestring(G, u, v, key)

    # project to local UTM
    line_m, transformer = project_linestring_to_crs(geom, crs_from="EPSG:4326", crs_to=None)
    vehicle_m = Point(transformer.transform(lon, lat))
    # distance along the line to closest point
    proj_dist = line_m.project(vehicle_m)
    start_dist = proj_dist
    end_dist = proj_dist + args.lookahead
    if start_dist >= line_m.length:
        print("Vehicle is at/near end of geometry; no lookahead available.")
        sys.exit(1)

    sample_pts = sample_along_linestring(line_m, start_dist, end_dist, args.spacing)
    if len(sample_pts) < 3:
        print("Not enough sample points in lookahead to compute curvature. Found:", len(sample_pts))
        sys.exit(1)

    # curvature
    median_R, min_R, radii = compute_curvature_three_point(sample_pts)

    # prepare lon/lat list to query elevation API or DEM
    inv_transformer = Transformer.from_crs(transformer.target_crs, transformer.source_crs, always_xy=True)
    lonlat_pts = [inv_transformer.transform(x, y) for (x, y) in sample_pts]

    elevs = None
    if args.dem_path and rasterio is not None:
        try:
            with rasterio.open(args.dem_path) as src:
                elevs = []
                for lon_, lat_ in lonlat_pts:
                    for val in src.sample([(lon_, lat_)]):
                        elevs.append(float(val[0]) if val[0] is not None else None)
        except Exception as e:
            print("DEM read failed, falling back to elevation API. Error:", e)
            elevs = None

    if elevs is None:
        elevs = batch_query_elevation_open_elevation(lonlat_pts, url=args.elevation_api)

    dists = compute_distance_along_pts(sample_pts)
    slope = slope_from_elevations(elevs, dists)
    if slope is None:
        slope_percent = None
        slope_deg = None
    else:
        slope_percent = slope * 100.0
        slope_deg = math.degrees(math.atan(slope))

    # smoothing example (smoothed radii)
    finite_radii = [r if np.isfinite(r) else 1e9 for r in radii]
    smoothed = smooth_array(finite_radii, window=7, polyorder=2) if len(finite_radii) >= 7 else finite_radii

    out = {
        "input": {"lat": lat, "lon": lon, "lookahead_m": args.lookahead, "spacing_m": args.spacing},
        "projected_crs": transformer.target_crs.to_string(),
        "median_radius_m": None if not math.isfinite(median_R) else float(median_R),
        "sharpest_radius_m": None if not math.isfinite(min_R) else float(min_R),
        "radii_samples": radii,
        "radii_smoothed": smoothed,
        "slope_m_per_m": slope,
        "slope_percent": slope_percent,
        "slope_degrees": slope_deg,
        "elevations": elevs,
        "sample_points_projected": sample_pts,
        "sample_points_lonlat": lonlat_pts,
    }

    print("Median radius (m):", None if out["median_radius_m"] is None else round(out["median_radius_m"], 2))
    print("Sharpest radius (m):", None if out["sharpest_radius_m"] is None else round(out["sharpest_radius_m"], 2))
    if slope is not None:
        print("Slope (m/m):", round(slope, 4), "->", f"{round(slope_percent,2)}% / {round(slope_deg,2)} deg")
    else:
        print("Slope: insufficient elevation data")

    if args.output:
        with open(args.output, "w") as f:
            json.dump(out, f, indent=2)
        print("Wrote JSON output to", args.output)


if __name__ == "__main__":
    main()
