"""
Road Reader utilities: curvature radius from GPS data.

Provides:
- calculate_curvature_radius(p1, p2, p3): radius in meters (float('inf') for straight/collinear)
- radius_from_queue(gps_queue): convenience wrapper for last 3 points
- get_road_data(lat, lon, ...): full OSMnx-based lookahead curvature + slope (if map_road_ahead is available)

Uses geopy.geodesic for accurate distance on Earth's surface.
"""
from typing import Tuple, Optional, List, Dict, Any
import numpy as np
from geopy.distance import geodesic

LatLon = Tuple[float, float]

# Try to import the full OSMnx-based pipeline for advanced lookahead
try:
    from map_road_ahead import get_road_data as _osm_get_road_data
    OSM_AVAILABLE = True
except ImportError:
    OSM_AVAILABLE = False
    _osm_get_road_data = None  # type: ignore


def calculate_curvature_radius(p1: LatLon, p2: LatLon, p3: LatLon) -> float:
    """
    Calculate circumcircle radius (meters) for three lat/lon points using Menger curvature approach.
    Returns float('inf') when the points are collinear or when area is zero.
    """
    # pairwise distances (meters)
    a = geodesic(p1, p2).meters
    b = geodesic(p2, p3).meters
    c = geodesic(p1, p3).meters

    # Heron's formula for triangle area
    s = (a + b + c) / 2.0
    tmp = s * (s - a) * (s - b) * (s - c)
    if tmp <= 0.0:
        return float("inf")
    area = np.sqrt(tmp)

    # circumradius: R = (a*b*c) / (4 * area)
    R = (a * b * c) / (4.0 * area)
    return float(R)


def radius_from_queue(gps_queue: List[LatLon]) -> float:
    """Convenience: compute radius from the last 3 points in a GPS queue."""
    if gps_queue is None or len(gps_queue) < 3:
        return float("inf")
    return calculate_curvature_radius(gps_queue[-3], gps_queue[-2], gps_queue[-1])


def get_road_data(lat: float, lon: float,
                  lookahead: float = 120.0,
                  spacing: float = 2.0,
                  graph_radius: float = 500.0,
                  elevation_api: str = "https://api.open-elevation.com/api/v1/lookup",
                  dem_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Return curvature and slope data for the road ahead of (lat, lon) using OSMnx.

    Requires map_road_ahead.py (OSMnx-based) to be available.
    Falls back to error dict if OSMnx pipeline is not installed.

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
    if not OSM_AVAILABLE or _osm_get_road_data is None:
        return {"error": "OSMnx pipeline (map_road_ahead.py) not available. Install osmnx and dependencies."}
    return _osm_get_road_data(lat, lon, lookahead=lookahead, spacing=spacing,
                              graph_radius=graph_radius, elevation_api=elevation_api, dem_path=dem_path)


if __name__ == "__main__":
    # quick local test
    p1 = (6.9271, 79.8612)  # Colombo approx
    p2 = (6.9269, 79.8618)
    p3 = (6.9265, 79.8625)
    print("Radius (m):", calculate_curvature_radius(p1, p2, p3))

    # Test OSMnx-based lookahead (will fail gracefully if osmnx not installed)
    if OSM_AVAILABLE:
        data = get_road_data(6.9271, 79.8612, lookahead=100)
        print("OSM lookahead data:", data)
