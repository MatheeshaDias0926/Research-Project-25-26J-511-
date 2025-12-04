# Bus Rollover Prediction System — Technical Documentation

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Physics Theory & Equations](#physics-theory--equations)
4. [Road Geometry Analysis](#road-geometry-analysis)
5. [Module Reference](#module-reference)
6. [Deployment Guide](#deployment-guide)
7. [API Reference](#api-reference)
8. [Safety Thresholds & Calibration](#safety-thresholds--calibration)

---

## Executive Summary

This system is a **Digital Twin** for Sri Lankan buses (primarily Ashok Leyland Viking) that predicts rollover risk in real-time by combining:

- **Vehicle physics**: Mass distribution, Center of Gravity (CoG), Static Stability Factor (SSF)
- **Road geometry**: Curve radius from GPS or OpenStreetMap, road slope/gradient
- **Real-time inputs**: Passenger count (seated/standing), vehicle speed, GPS location

The system issues warnings before the bus enters dangerous curves, giving drivers time to reduce speed.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BUS ROLLOVER PREDICTION SYSTEM                       │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
     │   CAMERA     │      │  GPS MODULE  │      │  SPEED SENSOR│
     │  (Passenger  │      │  (NEO-6M or  │      │  (OBD-II or  │
     │   Counter)   │      │   similar)   │      │    GPS)      │
     └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
            │                     │                     │
            │  n_seated           │  lat, lon           │  speed_kmh
            │  n_standing         │                     │
            ▼                     ▼                     ▼
     ┌─────────────────────────────────────────────────────────────┐
     │                      INPUT LAYER                            │
     └─────────────────────────────────────────────────────────────┘
                                  │
          ┌───────────────────────┴───────────────────────┐
          │                                               │
          ▼                                               ▼
   ┌─────────────────┐                          ┌─────────────────┐
   │  PHYSICS ENGINE │                          │   ROAD READER   │
   │                 │                          │                 │
   │ • Total Mass    │                          │ • 3-Point GPS   │
   │ • CoG Height    │                          │   Curvature     │
   │ • SSF/Threshold │                          │       OR        │
   │ • Lateral Accel │                          │ • OSMnx Full    │
   │                 │                          │   Lookahead     │
   └────────┬────────┘                          └────────┬────────┘
            │                                            │
            │  rollover_threshold_g                      │  radius_m
            │  lateral_accel_g                           │  slope_deg
            │                                            │
            ▼                                            ▼
     ┌─────────────────────────────────────────────────────────────┐
     │                    DECISION ENGINE                          │
     │                                                             │
     │   if lateral_accel_g > 0.7 × rollover_threshold_g:         │
     │       → CRITICAL ALERT: SLOW DOWN!                          │
     │   elif lateral_accel_g > 0.5 × rollover_threshold_g:       │
     │       → WARNING: Unstable on Curve                          │
     │   else:                                                     │
     │       → Status: Safe                                        │
     └─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
     ┌─────────────────────────────────────────────────────────────┐
     │                      OUTPUT LAYER                           │
     │                                                             │
     │  • Terminal/Console Display                                 │
     │  • Audio Alert (buzzer/speaker)                             │
     │  • Visual Alert (LED/LCD)                                   │
     │  • MQTT to Fleet Server (optional)                          │
     └─────────────────────────────────────────────────────────────┘
```

---

## Physics Theory & Equations

### 1. Vehicle Parameters (Constants)

These are the "Digital Twin" constants for a typical Sri Lankan bus (Ashok Leyland Viking):

| Parameter                  | Symbol      | Value  | Unit | Description                        |
| -------------------------- | ----------- | ------ | ---- | ---------------------------------- |
| Empty Bus Mass             | $m_{bus}$   | 10,000 | kg   | Chassis + body + engine            |
| Passenger Mass             | $m_{pax}$   | 65     | kg   | Average adult mass                 |
| Track Width                | $T$         | 2.0    | m    | Distance between left/right wheels |
| Empty CoG Height           | $h_{empty}$ | 1.2    | m    | Center of gravity when empty       |
| Seated Passenger CoG       | $h_{seat}$  | 1.4    | m    | CoG height of seated passengers    |
| Standing Passenger CoG     | $h_{stand}$ | 2.2    | m    | CoG height of standing passengers  |
| Gravitational Acceleration | $g$         | 9.81   | m/s² | Standard gravity                   |

### 2. Dynamic Mass Calculation

Total vehicle mass changes with passenger load:

$$M_{total} = m_{bus} + (N_{seated} \times m_{pax}) + (N_{standing} \times m_{pax})$$

**Example**: Bus with 20 seated and 55 standing passengers:
$$M_{total} = 10000 + (20 \times 65) + (55 \times 65) = 14875 \text{ kg}$$

### 3. Dynamic Center of Gravity

The CoG height is a weighted average based on mass distribution:

$$h_{CoG} = \frac{(m_{bus} \cdot h_{empty}) + (M_{seated} \cdot h_{seat}) + (M_{standing} \cdot h_{stand})}{M_{total}}$$

Where:

- $M_{seated} = N_{seated} \times m_{pax}$
- $M_{standing} = N_{standing} \times m_{pax}$

**Why this matters**: Standing passengers raise the CoG significantly because they're positioned ~2.2m above ground. A higher CoG makes the bus more prone to rollover.

```
                    Standing Passengers (h = 2.2m)
                         ┌─────────────────┐
                         │  ○ ○ ○ ○ ○ ○ ○  │
                         │                 │
    Seated Passengers    │  ☺ ☺ ☺ ☺ ☺ ☺ ☺  │  (h = 1.4m)
         (h = 1.4m)      │                 │
                         │  ☺ ☺ ☺ ☺ ☺ ☺ ☺  │
                         └─────────────────┘
                              ◯       ◯        ← Wheels
                         ◄──── T = 2.0m ────►
                              Track Width
```

### 4. Static Stability Factor (SSF)

The SSF is a dimensionless ratio that predicts rollover resistance:

$$SSF = \frac{T}{2 \cdot h_{CoG}}$$

- **Higher SSF** → More stable (harder to tip)
- **Lower SSF** → Less stable (easier to tip)

| Condition             | CoG Height | SSF  | Interpretation |
| --------------------- | ---------- | ---- | -------------- |
| Empty bus             | 1.2 m      | 0.83 | Stable         |
| Moderately loaded     | 1.4 m      | 0.71 | Acceptable     |
| Overloaded (standing) | 1.6 m      | 0.63 | Marginal       |
| Severely overloaded   | 1.8 m      | 0.56 | Dangerous      |

### 5. Lateral Acceleration on Curves

When a vehicle travels around a curve, it experiences centripetal acceleration:

$$a_{lateral} = \frac{v^2}{r}$$

Where:

- $v$ = velocity in m/s
- $r$ = curve radius in meters

To convert to g-force units:

$$a_{lateral}(g) = \frac{v^2}{r \cdot g}$$

**Example**: Bus at 50 km/h (13.89 m/s) on a 30m radius curve:
$$a_{lateral} = \frac{13.89^2}{30} = 6.43 \text{ m/s}^2 = 0.66g$$

### 6. Rollover Condition

**The bus will roll over when:**

$$a_{lateral}(g) > SSF$$

Or equivalently:

$$\frac{v^2}{r \cdot g} > \frac{T}{2 \cdot h_{CoG}}$$

```
              Rollover Dynamics (Rear View)

    SAFE                          TIPPING                      ROLLOVER

      ┌──┐                          ┌──┐                         ╱──╲
      │  │                          │  │╲                       ╱    ╲
      │  │        Lateral     ───►  │  │ ╲         ───►        ╱      ╲
      │  │        Force             │  │  ╲                   ╱        ╲
    ──┴──┴──                      ──┴──┘   ╲               ──┘          ╲──
    ◯    ◯                        ◯    ◯                    ◯

   Both wheels                  Inner wheel              Inner wheel
   on ground                    lifting                  airborne → CRASH
```

### 7. Safety Margins

We don't wait until the physics limit is reached. Instead, we use safety factors:

| Alert Level  | Condition                      | Action                |
| ------------ | ------------------------------ | --------------------- |
| **CRITICAL** | $a_{lat} > 0.70 \times SSF$    | SLOW DOWN IMMEDIATELY |
| **WARNING**  | $a_{lat} > 0.50 \times SSF$    | Reduce speed, caution |
| **SAFE**     | $a_{lat} \leq 0.50 \times SSF$ | Normal operation      |

---

## Road Geometry Analysis

### Method 1: Three-Point GPS Curvature (Simple)

Given three consecutive GPS points, we compute the circumcircle radius using **Menger Curvature**:

```
                    P2 (current)
                     ●
                    ╱ ╲
                   ╱   ╲
                  ╱     ╲
                 ╱   R   ╲
                ╱    ●    ╲        R = Circumradius
               ╱   center  ╲
              ╱             ╲
             ●───────────────●
            P1              P3
         (previous)       (next)
```

**Algorithm:**

1. Compute distances between points using geodesic (great-circle) distance:

   - $a = \text{dist}(P1, P2)$
   - $b = \text{dist}(P2, P3)$
   - $c = \text{dist}(P1, P3)$

2. Compute triangle area using **Heron's Formula**:
   $$s = \frac{a + b + c}{2}$$
   $$A = \sqrt{s(s-a)(s-b)(s-c)}$$

3. Compute circumradius:
   $$R = \frac{a \cdot b \cdot c}{4 \cdot A}$$

**Edge case**: If $A = 0$ (collinear points), $R = \infty$ (straight road).

### Method 2: OSMnx Lookahead Pipeline (Advanced)

This method uses OpenStreetMap road geometry for accurate curve detection **before** the bus reaches the curve.

```
     ┌─────────────────────────────────────────────────────────────┐
     │                   OSMnx LOOKAHEAD PIPELINE                  │
     └─────────────────────────────────────────────────────────────┘

     Step 1: Build Local Graph
     ─────────────────────────

         Download OSM road network within radius of current GPS

                    ┌─────────────────┐
                    │   ════════      │
                    │  ║       ║      │
                    │  ║   ●   ║      │  ← Vehicle location
                    │  ║       ║      │
                    │   ══════════    │
                    └─────────────────┘
                      500m radius graph

     Step 2: Snap to Nearest Edge
     ────────────────────────────

         Find the road segment closest to vehicle GPS

                ════════●════════════════
                        ↑
                   Vehicle snapped to road

     Step 3: Slice Lookahead Geometry
     ─────────────────────────────────

         Extract road geometry for next N meters

                ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━●
                ↑                             ↑
              Start                    Lookahead (120m)

     Step 4: Project to Metric CRS (UTM)
     ───────────────────────────────────

         Convert lat/lon to meters for accurate distance calculations

         WGS84 (EPSG:4326)  →  UTM Zone 44N (EPSG:32644)
         (6.9271, 79.8612)  →  (432156.7, 765432.1) meters

     Step 5: Sample Points Along Road
     ─────────────────────────────────

         Interpolate points every 2m along the road slice

                ●──●──●──●──●──●──●──●──●──●──●──●
                0m 2m 4m 6m 8m ...            120m

     Step 6: Compute 3-Point Circumradii
     ───────────────────────────────────

         Sliding window of 3 consecutive points → radius

         Points:  ●  ●  ●  ●  ●  ●  ●  ●
                  └──┴──┘  │
                    R₁     │
                     └──┴──┘
                       R₂
                        └──┴──┘
                          R₃  ...

         Result: [R₁, R₂, R₃, R₄, ...]

     Step 7: Smooth Radii (Savitzky-Golay Filter)
     ────────────────────────────────────────────

         Remove noise while preserving curve shape

         Raw:      ─╱╲─╱╲─╱──╲──╱╲─
         Smoothed: ────────╲──╱────

     Step 8: Extract Key Metrics
     ───────────────────────────

         • Sharpest radius (minimum)  → Used for safety check
         • Median radius              → Overall road character
         • Smoothed radii array       → Full curve profile

     Step 9: Fetch Elevation Data
     ────────────────────────────

         Query Open-Elevation API or local DEM for each sample point

         Elevation profile:

         ▲ elev
         │      ╱╲
         │     ╱  ╲    ╱╲
         │    ╱    ╲  ╱  ╲
         │   ╱      ╲╱    ╲
         └──────────────────► distance

     Step 10: Compute Slope/Gradient
     ───────────────────────────────

         Linear regression with IQR outlier filtering

         slope (m/m) = Δelevation / Δdistance
         slope (%)   = slope × 100
         slope (deg) = arctan(slope)
```

### Comparison of Methods

| Aspect           | 3-Point GPS     | OSMnx Lookahead               |
| ---------------- | --------------- | ----------------------------- |
| **Accuracy**     | Low (noisy GPS) | High (map data)               |
| **Lookahead**    | None (reactive) | 50-200m ahead                 |
| **Dependencies** | geopy only      | osmnx, shapely, pyproj        |
| **Offline**      | Yes             | Needs internet or cached maps |
| **Use case**     | Simple/embedded | Production/fleet              |

---

## Module Reference

### File Structure

```
Physics model/
├── main.py                 # CLI entry point
├── physics_engine.py       # Mass, CoG, SSF, safety logic
├── road_reader.py          # Unified interface (simple + OSMnx)
├── map_road_ahead.py       # Full OSMnx lookahead pipeline
├── requirements.txt        # Python dependencies
├── README.md               # Quick start guide
├── docs/
│   └── TECHNICAL_DOCUMENTATION.md  # This file
├── tests/
│   └── test_physics.py     # Unit tests
└── examples/
    └── demo.py             # Demo utilities
```

### Module: `physics_engine.py`

```python
# Constants dataclass
@dataclass
class BusConstants:
    MASS_BUS: float = 10000.0   # kg
    MASS_PAX: float = 65.0      # kg
    H_EMPTY: float = 1.2        # m
    H_SEAT: float = 1.4         # m
    H_STAND: float = 2.2        # m
    TRACK_WIDTH: float = 2.0    # m
    G: float = 9.81             # m/s²

# Core functions
compute_total_mass(n_seated, n_standing, const) → float
compute_cog_height(n_seated, n_standing, const) → float
rollover_threshold_g(cog_height, const) → float
check_safety(n_seated, n_standing, speed_kmh, gps_queue, road_reader, const) → dict
check_safety_with_radius(n_seated, n_standing, speed_kmh, radius, const) → dict
```

### Module: `road_reader.py`

```python
# Simple 3-point curvature
calculate_curvature_radius(p1, p2, p3) → float  # Returns meters or inf

# Convenience wrapper
radius_from_queue(gps_queue) → float  # Uses last 3 points

# OSMnx lookahead (if available)
get_road_data(lat, lon, lookahead=120, spacing=2, ...) → dict
```

### Module: `map_road_ahead.py`

```python
# Graph building
build_local_graph(lat, lon, dist_m=250) → networkx.Graph
nearest_edge_for_point(G, lon, lat) → (u, v, key)
edge_geometry_to_linestring(G, u, v, key) → LineString

# Projection
utm_crs_for_latlon(lat, lon) → CRS
project_linestring_to_crs(ls, crs_from, crs_to) → (LineString, Transformer)

# Sampling & Curvature
sample_along_linestring(line_m, start, end, spacing) → List[Point]
circumradius(a, b, c) → float
compute_curvature_three_point(sample_pts) → (median_R, min_R, radii_list)

# Elevation
batch_query_elevation_open_elevation(lonlat_list, url, batch_size) → List[float]
slope_from_elevations(elevs, dists) → float  # With IQR filtering

# Smoothing
smooth_array(arr, window=7, polyorder=2) → List[float]  # Savitzky-Golay

# High-level API
get_road_data(lat, lon, lookahead, spacing, graph_radius, elevation_api, dem_path) → dict
```

---

## Deployment Guide

### Hardware Requirements

```
┌─────────────────────────────────────────────────────────────────┐
│                    HARDWARE SETUP                               │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Raspberry Pi 4  │ ◄─── Main processor (or Jetson Nano for ML)
│  or Jetson Nano  │
└────────┬─────────┘
         │
    ┌────┴────┬────────────┬────────────┐
    │         │            │            │
    ▼         ▼            ▼            ▼
┌───────┐ ┌───────┐  ┌──────────┐  ┌─────────┐
│GPS    │ │Camera │  │  Speed   │  │ Display │
│NEO-6M │ │Module │  │  Sensor  │  │  /Audio │
└───────┘ └───────┘  └──────────┘  └─────────┘
   │         │            │            │
   │    Passenger    OBD-II or      LCD + Buzzer
 UART    counting    GPS-derived     for alerts
        (OpenCV/     speed
         YOLO)
```

### Software Installation

```bash
# 1. Clone/copy project to device
cd /home/pi/
git clone <your-repo> bus-safety
cd bus-safety

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
# Minimal (3-point GPS only):
pip install numpy geopy

# Full (with OSMnx lookahead):
pip install -r requirements.txt

# 4. For Raspberry Pi, install system dependencies for GDAL:
sudo apt-get install libgdal-dev

# 5. Test installation
python main.py --demo
```

### Running as a Service

Create `/etc/systemd/system/bus-safety.service`:

```ini
[Unit]
Description=Bus Rollover Prediction System
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/bus-safety
ExecStart=/home/pi/bus-safety/venv/bin/python main.py --use-osm --lat 0 --lon 0 --speed 0
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable bus-safety
sudo systemctl start bus-safety
```

---

## API Reference

### CLI Usage

```bash
# Demo mode (synthetic data)
python main.py --demo

# Demo with OSMnx (real road data)
python main.py --demo --use-osm

# Custom 3-point GPS mode
python main.py \
  --seated 10 \
  --standing 50 \
  --speed 45 \
  --gps "6.9270,79.8610" "6.9268,79.8615" "6.9264,79.8618"

# OSMnx lookahead mode
python main.py \
  --seated 10 \
  --standing 50 \
  --speed 45 \
  --use-osm \
  --lat 7.2906 \
  --lon 80.6337 \
  --lookahead 150

# Standalone road reader
python map_road_ahead.py \
  --lat 7.2906 \
  --lon 80.6337 \
  --lookahead 200 \
  --spacing 2 \
  --output road_data.json
```

### Python API

```python
import physics_engine
import road_reader

# Configure bus constants (or use defaults)
const = physics_engine.BusConstants(
    MASS_BUS=10000,
    TRACK_WIDTH=2.0,
    # ... other params
)

# Method 1: With GPS queue
gps_queue = [(6.9270, 79.8610), (6.9268, 79.8615), (6.9264, 79.8618)]
result = physics_engine.check_safety(
    n_seated=10,
    n_standing=50,
    speed_kmh=45,
    gps_queue=gps_queue,
    road_reader_module=road_reader,
    const=const
)

# Method 2: With OSMnx lookahead
road_data = road_reader.get_road_data(lat=7.2906, lon=80.6337, lookahead=150)
radius = road_data.get("sharpest_radius_m", float("inf"))

result = physics_engine.check_safety_with_radius(
    n_seated=10,
    n_standing=50,
    speed_kmh=45,
    radius=radius,
    const=const
)

# Access results
print(result["cog_height_m"])        # 1.53
print(result["rollover_threshold_g"]) # 0.65
print(result["lateral_accel_g"])      # 0.79
print(result["decision"])             # "CRITICAL ALERT: SLOW DOWN!"
```

### Output Dictionary Structure

```python
{
    "n_seated": 10,
    "n_standing": 50,
    "total_mass_kg": 13900.0,
    "cog_height_m": 1.53,
    "rollover_threshold_g": 0.65,
    "radius_m": 25.0,
    "speed_kmh": 45.0,
    "lateral_accel_g": 0.65,
    "decision": "CRITICAL ALERT: SLOW DOWN!"
}
```

### Road Data Dictionary (OSMnx)

```python
{
    "projected_crs": "EPSG:32644",
    "median_radius_m": 85.3,
    "sharpest_radius_m": 16.3,
    "radii_samples": [102.5, 98.2, 45.6, 16.3, 28.9, ...],
    "radii_smoothed": [100.1, 95.4, 50.2, 20.1, 30.5, ...],
    "slope_m_per_m": -0.048,
    "slope_percent": -4.8,
    "slope_degrees": -2.78,
    "elevations": [512.0, 510.5, 509.2, ...],
    "sample_points_lonlat": [(79.8612, 6.9271), ...]
}
```

---

## Safety Thresholds & Calibration

### Default Thresholds

| Parameter       | Value | Rationale                             |
| --------------- | ----- | ------------------------------------- |
| Warning Factor  | 0.50  | Alert at 50% of rollover limit        |
| Critical Factor | 0.70  | Urgent alert at 70% of rollover limit |

### Adjusting for Different Vehicles

```python
# For a different bus type, adjust constants:
const = physics_engine.BusConstants(
    MASS_BUS=12000,      # Heavier bus
    TRACK_WIDTH=2.2,     # Wider track
    H_EMPTY=1.1,         # Lower CoG
    H_STAND=2.0,         # Lower standing height
)

# For more conservative alerts:
result = physics_engine.check_safety_with_radius(
    ...,
    warn_factor=0.40,     # Warn earlier
    critical_factor=0.60  # Critical earlier
)
```

### Field Calibration Procedure

1. **Weigh the empty bus** → Update `MASS_BUS`
2. **Measure track width** → Update `TRACK_WIDTH`
3. **Estimate CoG** (can use tilt test or manufacturer data)
4. **Test on known curves** with known radii
5. **Adjust safety factors** based on driver feedback

---

## References

1. **Static Stability Factor (SSF)**: NHTSA vehicle rollover resistance rating
2. **Menger Curvature**: Circumcircle method for 3 points
3. **Heron's Formula**: Triangle area from side lengths
4. **Savitzky-Golay Filter**: Smoothing with polynomial fitting
5. **OSMnx**: Boeing, G. (2017). OSMnx: Python for Street Networks

---

_Document Version: 1.0_  
_Last Updated: December 2025_  
_Project: Bus Rollover Prediction System for Sri Lanka_
