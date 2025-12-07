"""
Physics Engine for Bus Rollover Prediction

Functions:
- compute_total_mass(n_seated, n_standing)
- compute_cog_height(n_seated, n_standing, constants)
- rollover_threshold_g(cog_height, constants)
- check_safety(n_seated, n_standing, speed_kmh, gps_queue, road_reader, constants)

Constants are provided as a simple dataclass/dict for clarity and testing.
"""
from dataclasses import dataclass
from typing import Tuple, Dict, Any
import math

# default constants tuned for Sri Lankan Ashok Leyland Viking estimates
@dataclass
class BusConstants:
    MASS_BUS: float = 10000.0  # kg
    MASS_PAX: float = 65.0     # kg per passenger
    H_EMPTY: float = 1.2       # meters - empty bus CoG height
    H_SEAT: float = 1.4        # meters - seated pax CoG
    H_STAND: float = 2.2       # meters - standing pax CoG (worst-case)
    TRACK_WIDTH: float = 2.0   # meters
    G: float = 9.81            # m/s^2


def compute_total_mass(n_seated: int, n_standing: int, const: BusConstants = BusConstants()) -> float:
    return const.MASS_BUS + (n_seated + n_standing) * const.MASS_PAX


def compute_cog_height(n_seated: int, n_standing: int, const: BusConstants = BusConstants()) -> float:
    mass_bus = const.MASS_BUS
    mass_seated = n_seated * const.MASS_PAX
    mass_standing = n_standing * const.MASS_PAX
    total_mass = mass_bus + mass_seated + mass_standing
    moment = (mass_bus * const.H_EMPTY) + (mass_seated * const.H_SEAT) + (mass_standing * const.H_STAND)
    return moment / total_mass


def rollover_threshold_g(cog_height: float, const: BusConstants = BusConstants()) -> float:
    """
    Compute the rollover threshold in units of g (dimensionless).

    We'll use the Static Stability Factor (SSF) approximation:
      SSF = track_width / (2 * CoG_height)
    SSF is commonly used as a proxy for rollover threshold in g.

    Note: The alternative formula described in the problem text (2*CoG / TrackWidth * g)
    is the inverse. We use SSF (=track_width/(2*CoG)) since it yields realistic g values
    (e.g. 0.3-1.0) for typical bus proportions.
    """
    ssf = const.TRACK_WIDTH / (2.0 * cog_height)
    return ssf


def check_safety(n_seated: int,
                 n_standing: int,
                 speed_kmh: float,
                 gps_queue: "list[tuple[float,float]]",
                 road_reader_module,
                 const: BusConstants = BusConstants(),
                 warn_factor: float = 0.5,
                 critical_factor: float = 0.7) -> Dict[str, Any]:
    """
    Run the safety check pipeline.

    - gps_queue should be a list of at least 3 (lat, lon) tuples; we use the last 3 to compute curvature.
    - road_reader_module must expose `calculate_curvature_radius(p1,p2,p3)` which returns radius in meters.

    Returns a dict with computed values and decision message.
    """
    total_mass = compute_total_mass(n_seated, n_standing, const)
    cog_height = compute_cog_height(n_seated, n_standing, const)
    rollover_g = rollover_threshold_g(cog_height, const)

    # radius
    radius = float("inf")
    if gps_queue is not None and len(gps_queue) >= 3:
        try:
            radius = road_reader_module.calculate_curvature_radius(gps_queue[-3], gps_queue[-2], gps_queue[-1])
        except Exception:
            radius = float("inf")

    speed_ms = speed_kmh * (1000.0 / 3600.0)

    lateral_accel_ms2 = 0.0 if not math.isfinite(radius) or radius == 0 else (speed_ms ** 2) / radius
    lateral_accel_g = lateral_accel_ms2 / const.G if lateral_accel_ms2 > 0 else 0.0

    status = "Status: Safe"
    if lateral_accel_g > (rollover_g * critical_factor):
        status = "CRITICAL ALERT: SLOW DOWN!"
    elif lateral_accel_g > (rollover_g * warn_factor):
        status = "WARNING: Unstable on Curve"

    result = {
        "n_seated": n_seated,
        "n_standing": n_standing,
        "total_mass_kg": total_mass,
        "cog_height_m": cog_height,
        "rollover_threshold_g": rollover_g,
        "radius_m": radius,
        "speed_kmh": speed_kmh,
        "lateral_accel_g": lateral_accel_g,
        "decision": status,
    }
    return result


def check_safety_with_radius(n_seated: int,
                             n_standing: int,
                             speed_kmh: float,
                             radius: float,
                             const: BusConstants = BusConstants(),
                             warn_factor: float = 0.5,
                             critical_factor: float = 0.7) -> Dict[str, Any]:
    """
    Run the safety check pipeline with a pre-computed radius (from OSMnx lookahead).

    Returns a dict with computed values and decision message.
    """
    total_mass = compute_total_mass(n_seated, n_standing, const)
    cog_height = compute_cog_height(n_seated, n_standing, const)
    rollover_g = rollover_threshold_g(cog_height, const)

    speed_ms = speed_kmh * (1000.0 / 3600.0)

    lateral_accel_ms2 = 0.0 if not math.isfinite(radius) or radius == 0 else (speed_ms ** 2) / radius
    lateral_accel_g = lateral_accel_ms2 / const.G if lateral_accel_ms2 > 0 else 0.0

    status = "Status: Safe"
    if lateral_accel_g > (rollover_g * critical_factor):
        status = "CRITICAL ALERT: SLOW DOWN!"
    elif lateral_accel_g > (rollover_g * warn_factor):
        status = "WARNING: Unstable on Curve"

    return {
        "n_seated": n_seated,
        "n_standing": n_standing,
        "total_mass_kg": total_mass,
        "cog_height_m": cog_height,
        "rollover_threshold_g": rollover_g,
        "radius_m": radius,
        "speed_kmh": speed_kmh,
        "lateral_accel_g": lateral_accel_g,
        "decision": status,
    }


def calculate_stopping_distance(n_seated: int,
                                n_standing: int,
                                speed_kmh: float,
                                radius: float = float("inf"),
                                slope_deg: float = 0.0,
                                const: BusConstants = BusConstants(),
                                friction_coef: float = 0.7,
                                brake_efficiency: float = 0.8,
                                reaction_time: float = 1.5) -> Dict[str, Any]:
    """
    Calculate stopping distance on straight or curved road with slope consideration.
    
    Parameters:
    - n_seated, n_standing: passenger counts
    - speed_kmh: current speed
    - radius: curve radius (inf for straight road)
    - slope_deg: road slope in degrees (positive = uphill, negative = downhill)
    - friction_coef: tire-road friction coefficient (0.7 = dry asphalt, 0.4 = wet)
    - brake_efficiency: brake system efficiency (0.8 = 80% effective)
    - reaction_time: driver reaction time in seconds
    
    Returns dict with:
    - reaction_distance_m: distance traveled during reaction time
    - braking_distance_m: distance to stop after braking starts
    - total_stopping_distance_m: total distance needed
    - max_safe_speed_kmh: maximum safe speed for the curve (if curved)
    - is_safe_to_stop: whether vehicle can stop before curve ends
    """
    total_mass = compute_total_mass(n_seated, n_standing, const)
    cog_height = compute_cog_height(n_seated, n_standing, const)
    rollover_g = rollover_threshold_g(cog_height, const)
    
    speed_ms = speed_kmh * (1000.0 / 3600.0)
    slope_rad = math.radians(slope_deg)
    
    # Reaction distance: distance traveled during reaction time
    reaction_distance = speed_ms * reaction_time
    
    # Effective deceleration considering slope and friction
    # a = μ * g * cos(θ) ± g * sin(θ)
    # + for uphill (helps braking), - for downhill (hurts braking)
    friction_component = friction_coef * const.G * math.cos(slope_rad) * brake_efficiency
    slope_component = const.G * math.sin(slope_rad)
    
    # Net deceleration (positive = slowing down)
    decel_ms2 = friction_component + slope_component
    
    # Ensure minimum deceleration (can't be negative or zero)
    if decel_ms2 <= 0:
        decel_ms2 = 0.1  # Minimal braking (extreme downhill case)
    
    # Braking distance: v² / (2 * a)
    braking_distance = (speed_ms ** 2) / (2 * decel_ms2)
    
    # Total stopping distance
    total_stopping = reaction_distance + braking_distance
    
    # For curved road: calculate max safe speed and stopping safety
    is_curved = math.isfinite(radius) and radius > 0
    max_safe_speed_kmh = None
    is_safe_to_stop = True
    curve_arc_length = None
    
    if is_curved:
        # Maximum safe speed to avoid rollover: v = sqrt(μ * g * r)
        # But limited by SSF: v = sqrt(SSF * g * r)
        max_lateral_g = rollover_g * 0.5  # Use warning threshold (50%)
        max_safe_speed_ms = math.sqrt(max_lateral_g * const.G * radius)
        max_safe_speed_kmh = max_safe_speed_ms * 3.6
        
        # Estimate curve length (assume 90° curve for safety margin)
        curve_arc_length = (math.pi / 2) * radius  # Quarter circle
        
        # Can we stop before exiting the curve?
        is_safe_to_stop = total_stopping <= curve_arc_length
    
    result = {
        "speed_kmh": speed_kmh,
        "total_mass_kg": total_mass,
        "slope_degrees": slope_deg,
        "friction_coefficient": friction_coef,
        "reaction_time_s": reaction_time,
        "reaction_distance_m": reaction_distance,
        "braking_distance_m": braking_distance,
        "total_stopping_distance_m": total_stopping,
        "deceleration_ms2": decel_ms2,
        "deceleration_g": decel_ms2 / const.G,
        "is_curved_road": is_curved,
        "curve_radius_m": radius if is_curved else None,
        "curve_arc_length_m": curve_arc_length,
        "max_safe_speed_kmh": max_safe_speed_kmh,
        "is_safe_to_stop_in_curve": is_safe_to_stop if is_curved else None,
    }
    
    return result


if __name__ == "__main__":
    # quick demo when invoked directly
    from examples import demo  # type: ignore
    demo.run_demo()
