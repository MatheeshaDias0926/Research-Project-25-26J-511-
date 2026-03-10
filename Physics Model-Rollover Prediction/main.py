#!/usr/bin/env python3
"""
Main CLI that ties the road reader and physics engine together.
Includes:
  - `--demo` mode that reproduces the user's rollover example (uses OSMnx by default).
  - Single GPS coordinate mode (default): uses OSMnx to look AHEAD on the road.
  - Legacy 3-point GPS mode (--gps or --no-osm): estimates curve from past positions.
"""
import argparse
from typing import List, Tuple

import road_reader
import physics_engine


def demo_scenario(use_osm: bool = True) -> None:
    """
    The user's example: overloaded bus, sharp curve radius, 50 km/h.
    By default uses OSMnx lookahead (single GPS coordinate) to get real road geometry.
    Set use_osm=False to fall back to legacy 3-point GPS mode (not recommended).
    """
    n_seated = 0
    n_standing = 75
    speed_kmh = 50.0

    const = physics_engine.BusConstants()

    # Demo location: Colombo area example (single GPS coordinate)
    lat, lon = 6.9271, 79.8612

    if use_osm:
        # Use OSMnx lookahead from a single GPS point - looks AHEAD on the road
        road_data = road_reader.get_road_data(lat, lon, lookahead=120, spacing=2.0)
        if "error" in road_data:
            print("OSM Error:", road_data["error"])
            print("Falling back to legacy 3-point GPS mode...")
            demo_scenario(use_osm=False)
            return

        # Use sharpest radius from upcoming road
        radius = road_data.get("sharpest_radius_m") or float("inf")
        slope_deg = road_data.get("slope_degrees") or 0.0

        result = physics_engine.check_safety_with_radius(
            n_seated, n_standing, speed_kmh, radius, const
        )

        # Calculate stopping distance
        stopping = physics_engine.calculate_stopping_distance(
            n_seated, n_standing, speed_kmh, radius, slope_deg, const
        )

        print("--- Demo Scenario (OSMnx Lookahead Mode) ---")
        print(f"Location: ({lat}, {lon})")
        print(f"Passengers (seated/standing): {n_seated}/{n_standing}")
        print(f"Computed CoG height: {result['cog_height_m']:.2f} m")
        print(f"Rollover threshold: {result['rollover_threshold_g']:.2f} g")
        print(f"Sharpest curve radius ahead: {radius:.1f} m")
        if slope_deg is not None and slope_deg != 0.0:
            print(f"Road slope: {slope_deg:.2f}°")
        print(f"Speed: {result['speed_kmh']} km/h")
        print(f"Lateral accel: {result['lateral_accel_g']:.2f} g")
        print("Decision:", result['decision'])
        
        print("\n--- Stopping Distance ---")
        print(f"Total stopping distance: {stopping['total_stopping_distance_m']:.1f} m")
        if stopping['is_curved_road']:
            print(f"Max safe speed for curve: {stopping['max_safe_speed_kmh']:.1f} km/h")
            if not stopping['is_safe_to_stop_in_curve']:
                print("⚠ WARNING: May not stop before exiting curve!")
    else:
        # Legacy fallback: estimate curve from where vehicle has been (less accurate)
        # This mode is kept for offline/lightweight deployments without OSMnx
        print("--- Demo Scenario (Legacy 3-Point GPS Mode) ---")
        print("Note: This mode estimates curve from past positions, not road ahead.")
        
        # Use the same location but with slight offsets to simulate 3 GPS readings
        # These represent where the vehicle WAS, not where it's going
        p1 = (lat, lon)
        p2 = (lat - 0.00005, lon + 0.00005)
        p3 = (lat - 0.00015, lon + 0.00015)
        gps = [p1, p2, p3]

        result = physics_engine.check_safety(n_seated, n_standing, speed_kmh, gps, road_reader, const)

        print(f"Location: ({lat}, {lon})")
        print(f"Passengers (seated/standing): {n_seated}/{n_standing}")
        print(f"Computed CoG height: {result['cog_height_m']:.2f} m")
        print(f"Rollover threshold: {result['rollover_threshold_g']:.2f} g")
        print(f"Curve radius (estimated from past points): {result['radius_m']:.1f} m")
        print(f"Speed: {result['speed_kmh']} km/h")
        print(f"Lateral accel: {result['lateral_accel_g']:.2f} g")
        print("Decision:", result['decision'])


def parse_args():
    p = argparse.ArgumentParser(description="Bus Rollover Predictor CLI")
    p.add_argument("--demo", action="store_true", help="Run the demo scenario (uses OSMnx by default)")
    p.add_argument("--no-osm", action="store_true", help="Disable OSMnx lookahead (use legacy 3-point GPS mode)")
    p.add_argument("--seated", type=int, default=0, help="Number of seated passengers")
    p.add_argument("--standing", type=int, default=0, help="Number of standing passengers")
    p.add_argument("--speed", type=float, default=0.0, help="Vehicle speed in km/h")
    p.add_argument("--lat", type=float, default=None, help="Current latitude")
    p.add_argument("--lon", type=float, default=None, help="Current longitude")
    p.add_argument("--lookahead", type=float, default=120.0, help="Lookahead distance in meters")
    p.add_argument("--gps", nargs="*", help="GPS points as lat,lon (space separated) - legacy mode, requires at least 3 points")
    p.add_argument("--friction", type=float, default=0.7, help="Road friction coefficient (0.7=dry, 0.4=wet)")
    p.add_argument("--reaction-time", type=float, default=1.5, help="Driver reaction time in seconds")
    return p.parse_args()


def gps_from_args(gps_args: List[str]):
    pts = []
    for s in gps_args:
        lat, lon = s.split(",")
        pts.append((float(lat.strip()), float(lon.strip())))
    return pts


def main():
    args = parse_args()
    use_osm = not args.no_osm  # OSM is default, --no-osm disables it
    
    if args.demo:
        demo_scenario(use_osm=use_osm)
        return

    const = physics_engine.BusConstants()

    # Legacy 3-point GPS mode (only if explicitly using --gps or --no-osm)
    if args.gps and len(args.gps) >= 3:
        gps_pts = gps_from_args(args.gps)
        result = physics_engine.check_safety(args.seated, args.standing, args.speed, gps_pts, road_reader, const)

        print("--- Legacy 3-Point GPS Mode ---")
        print("Note: This estimates curve from past positions, not road ahead.")
        print("Passengers (seated/standing):", args.seated, args.standing)
        print(f"CoG height: {result['cog_height_m']:.2f} m")
        print(f"Rollover threshold: {result['rollover_threshold_g']:.2f} g")
        print(f"Curve radius (estimated): {result['radius_m']:.1f} m")
        print(f"Lateral accel: {result['lateral_accel_g']:.2f} g")
        print("Decision:", result['decision'])
        return

    # Default: OSMnx-based lookahead mode (single GPS coordinate)
    if args.lat is None or args.lon is None:
        print("ERROR: Please provide --lat and --lon for the current location")
        print("       Or use --gps with 3+ points for legacy mode")
        print("\nExample (recommended):")
        print("  python main.py --seated 10 --standing 60 --speed 50 --lat 6.9271 --lon 79.8612")
        print("\nExample (legacy):")
        print("  python main.py --seated 10 --standing 60 --speed 50 --gps '6.9270,79.8615' '6.9269,79.8619' '6.9266,79.8624'")
        return

    road_data = road_reader.get_road_data(args.lat, args.lon, lookahead=args.lookahead)
    if "error" in road_data:
        print("OSM Error:", road_data["error"])
        if args.gps and len(args.gps) >= 3:
            print("Falling back to legacy GPS mode...")
            gps_pts = gps_from_args(args.gps)
            result = physics_engine.check_safety(args.seated, args.standing, args.speed, gps_pts, road_reader, const)
            print(f"Curve radius (estimated): {result['radius_m']:.1f} m")
            print(f"Lateral accel: {result['lateral_accel_g']:.2f} g")
            print("Decision:", result['decision'])
        return

    radius = road_data.get("sharpest_radius_m") or float("inf")
    slope_deg = road_data.get("slope_degrees") or 0.0

    result = physics_engine.check_safety_with_radius(
        args.seated, args.standing, args.speed, radius, const
    )

    # Calculate stopping distance
    stopping = physics_engine.calculate_stopping_distance(
        args.seated, args.standing, args.speed, radius, slope_deg, const,
        friction_coef=args.friction, reaction_time=args.reaction_time
    )

    print(f"Location: ({args.lat}, {args.lon})")
    print("Passengers (seated/standing):", args.seated, args.standing)
    print(f"CoG height: {result['cog_height_m']:.2f} m")
    print(f"Rollover threshold: {result['rollover_threshold_g']:.2f} g")
    print(f"Sharpest curve radius ahead: {radius:.1f} m")
    dist_curve = road_data.get("distance_to_sharpest_radius_m")
    if dist_curve is not None:
        print(f"Distance to sharpest curve: {dist_curve:.1f} m")
    if slope_deg is not None and slope_deg != 0.0:
        print(f"Road slope: {slope_deg:.2f}°")
    print(f"Lateral accel: {result['lateral_accel_g']:.2f} g")
    print("Decision:", result['decision'])
    
    # Display stopping distance information
    print("\n--- Stopping Distance Analysis ---")
    print(f"Reaction distance: {stopping['reaction_distance_m']:.1f} m")
    print(f"Braking distance: {stopping['braking_distance_m']:.1f} m")
    print(f"Total stopping distance: {stopping['total_stopping_distance_m']:.1f} m")
    print(f"Deceleration: {stopping['deceleration_g']:.2f} g")
    
    if stopping['is_curved_road']:
        print(f"\n--- Curve Safety Analysis ---")
        print(f"Curve radius: {stopping['curve_radius_m']:.1f} m")
        print(f"Estimated curve length: {stopping['curve_arc_length_m']:.1f} m")
        print(f"Max safe speed for curve: {stopping['max_safe_speed_kmh']:.1f} km/h")
        if stopping['is_safe_to_stop_in_curve']:
            print("✓ Can stop safely within curve")
        else:
            print("⚠ WARNING: May not stop before exiting curve!")
    else:
        print("\n--- Straight Road ---")
        print("✓ Sufficient distance to stop safely")


if __name__ == "__main__":
    main()
