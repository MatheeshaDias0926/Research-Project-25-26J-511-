#!/usr/bin/env python3
"""
Main CLI that ties the road reader and physics engine together.
Includes:
  - `--demo` mode that reproduces the user's rollover example.
  - `--use-osm` mode that uses the full OSMnx lookahead pipeline for accurate curvature.
"""
import argparse
from typing import List, Tuple

import road_reader
import physics_engine


def demo_scenario(use_osm: bool = False) -> None:
    """
    The user's example: overloaded bus, sharp curve radius 30m, 50 km/h.
    If use_osm is True, fetch real road geometry from OSM (requires osmnx).
    """
    n_seated = 0
    n_standing = 75
    speed_kmh = 50.0

    const = physics_engine.BusConstants()

    if use_osm:
        # Use OSMnx lookahead from a real-world point (Colombo area example)
        lat, lon = 6.9271, 79.8612
        road_data = road_reader.get_road_data(lat, lon, lookahead=120, spacing=2.0)
        if "error" in road_data:
            print("OSM Error:", road_data["error"])
            return

        # Use sharpest radius from upcoming road
        radius = road_data.get("sharpest_radius_m") or float("inf")
        slope_deg = road_data.get("slope_degrees")

        result = physics_engine.check_safety_with_radius(
            n_seated, n_standing, speed_kmh, radius, const
        )

        print("--- Demo Scenario (OSMnx mode) ---")
        print(f"Location: ({lat}, {lon})")
        print(f"Passengers (seated/standing): {n_seated}/{n_standing}")
        print(f"Computed CoG height: {result['cog_height_m']:.2f} m")
        print(f"Rollover threshold: {result['rollover_threshold_g']:.2f} g")
        print(f"Sharpest curve radius ahead: {radius:.1f} m")
        if slope_deg is not None:
            print(f"Road slope: {slope_deg:.2f}°")
        print(f"Speed: {result['speed_kmh']} km/h")
        print(f"Lateral accel: {result['lateral_accel_g']:.2f} g")
        print("Decision:", result['decision'])
    else:
        # Synthetic GPS queue demo (original behavior)
        p1 = (6.9270, 79.8615)
        p2 = (6.92695, 79.86155)
        p3 = (6.92685, 79.86165)
        gps = [p1, p2, p3]

        result = physics_engine.check_safety(n_seated, n_standing, speed_kmh, gps, road_reader, const)

        print("--- Demo Scenario ---")
        print(f"Passengers (seated/standing): {n_seated}/{n_standing}")
        print(f"Computed CoG height: {result['cog_height_m']:.2f} m")
        print(f"Rollover threshold: {result['rollover_threshold_g']:.2f} g")
        print(f"Curve radius: {result['radius_m']:.1f} m")
        print(f"Speed: {result['speed_kmh']} km/h")
        print(f"Lateral accel: {result['lateral_accel_g']:.2f} g")
        print("Decision:", result['decision'])


def parse_args():
    p = argparse.ArgumentParser(description="Bus Rollover Predictor CLI")
    p.add_argument("--demo", action="store_true", help="Run the demo scenario")
    p.add_argument("--use-osm", action="store_true", help="Use OSMnx-based lookahead (requires osmnx)")
    p.add_argument("--seated", type=int, default=0, help="Number of seated passengers")
    p.add_argument("--standing", type=int, default=0, help="Number of standing passengers")
    p.add_argument("--speed", type=float, default=0.0, help="Vehicle speed in km/h")
    p.add_argument("--lat", type=float, default=None, help="Current latitude (for --use-osm mode)")
    p.add_argument("--lon", type=float, default=None, help="Current longitude (for --use-osm mode)")
    p.add_argument("--lookahead", type=float, default=120.0, help="Lookahead distance in meters (for --use-osm)")
    p.add_argument("--gps", nargs="*", help="GPS points as lat,lon (space separated), last three used")
    return p.parse_args()


def gps_from_args(gps_args: List[str]):
    pts = []
    for s in gps_args:
        lat, lon = s.split(",")
        pts.append((float(lat.strip()), float(lon.strip())))
    return pts


def main():
    args = parse_args()
    if args.demo:
        demo_scenario(use_osm=args.use_osm)
        return

    const = physics_engine.BusConstants()

    # OSMnx-based lookahead mode
    if args.use_osm:
        if args.lat is None or args.lon is None:
            print("ERROR: --use-osm requires --lat and --lon")
            return
        road_data = road_reader.get_road_data(args.lat, args.lon, lookahead=args.lookahead)
        if "error" in road_data:
            print("OSM Error:", road_data["error"])
            return

        radius = road_data.get("sharpest_radius_m") or float("inf")
        slope_deg = road_data.get("slope_degrees")

        result = physics_engine.check_safety_with_radius(
            args.seated, args.standing, args.speed, radius, const
        )

        print(f"Location: ({args.lat}, {args.lon})")
        print("Passengers (seated/standing):", args.seated, args.standing)
        print(f"CoG height: {result['cog_height_m']:.2f} m")
        print(f"Rollover threshold: {result['rollover_threshold_g']:.2f} g")
        print(f"Sharpest curve radius ahead: {radius:.1f} m")
        if slope_deg is not None:
            print(f"Road slope: {slope_deg:.2f}°")
        print(f"Lateral accel: {result['lateral_accel_g']:.2f} g")
        print("Decision:", result['decision'])
        return

    # Simple GPS-triplet mode
    if not args.gps or len(args.gps) < 3:
        print("ERROR: supply at least 3 GPS points with --gps 'lat,lon' 'lat,lon' 'lat,lon'")
        return

    gps_pts = gps_from_args(args.gps)
    result = physics_engine.check_safety(args.seated, args.standing, args.speed, gps_pts, road_reader, const)

    print("Passengers (seated/standing):", args.seated, args.standing)
    print(f"CoG height: {result['cog_height_m']:.2f} m")
    print(f"Rollover threshold: {result['rollover_threshold_g']:.2f} g")
    print(f"Curve radius: {result['radius_m']:.1f} m")
    print(f"Lateral accel: {result['lateral_accel_g']:.2f} g")
    print("Decision:", result['decision'])


if __name__ == "__main__":
    main()
