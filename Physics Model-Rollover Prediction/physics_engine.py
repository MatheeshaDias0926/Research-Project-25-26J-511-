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


if __name__ == "__main__":
    # quick demo when invoked directly
    from examples import demo  # type: ignore
    demo.run_demo()
