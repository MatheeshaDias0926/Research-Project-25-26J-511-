# Full Technical Documentation: Rollover Prediction Module (Paper-Ready)

## 1. Research Scope and Purpose

This section documents the complete rollover prediction implementation used in the project
"Smart Safety Monitoring System for Long Distance Buses in Sri Lanka". The documentation
covers:

1. How rollover risk is computed from physics and machine learning.
2. How real-time road-ahead information is extracted from maps.
3. How backend services orchestrate all components in production.
4. All variables, assumptions, thresholds, and limitations.
5. A compact mathematical model with formal equation numbering.

The implementation follows a hybrid architecture:

1. Physics-based digital twin logic for physically meaningful safety behavior.
2. ML surrogate model for low-latency inference in live operation.
3. Backend-level caching and throttling for operational stability.

---

## 2. End-to-End System Architecture for Rollover Prediction

### 2.1 Components

1. ESP32 module:
   - IR-based occupancy input.
   - Footboard status.
   - Periodic telemetry transmission.

2. Mobile app (conductor phone):
   - Sends GPS coordinates and speed to backend.
   - Displays risk warnings through haptic and speech alerts.

3. Node.js backend:
   - Ingests IoT data.
   - Resolves best available GPS/speed source.
   - Runs safety orchestration pipeline.
   - Stores risk output in MongoDB.

4. Physics engine (Python):
   - Computes stability metrics and stopping-distance context.
   - Uses map-based road-ahead geometry and slope.

5. ML safety service (Python Flask):
   - Predicts `risk_score` and `stopping_distance`.
   - Deployed as REST endpoint `/predict-safety`.

6. Data storage:
   - `BusDataLog` stores occupancy, speed, GPS, `riskScore`, and `distToCurve`.

### 2.2 Operational Data Flow

1. Phone posts GPS and speed to `/api/iot/gps-feed`.
2. ESP32 posts occupancy/footboard telemetry to `/api/iot/iot-data`.
3. Backend resolves GPS and speed, preferring phone cache.
4. Backend derives seated/standing split from occupancy and bus seat capacity.
5. Backend obtains weather (wet/dry), physics road geometry, and calls ML safety model.
6. Risk outputs are stored and exposed to web/mobile dashboards.
7. Mobile app interprets thresholds and triggers warning/critical alerts.

---

## 3. Runtime Safety Orchestration Logic

The main live function is implemented in backend IoT ingestion logic. The behavior is:

1. Input validation:
   - Requires `licensePlate` and `currentOccupancy`.

2. Bus lookup:
   - Finds bus by `licensePlate` from database.

3. GPS resolution:
   - Priority 1: latest phone GPS cache (`lat`, `lon`, `speed`).
   - Priority 2: ESP32 payload if phone feed unavailable.

4. Safety execution condition:
   - Run full safety pipeline only when GPS is valid and speed > 0.

5. Throttling:
   - Expensive safety pipeline runs at most once every 5 seconds per bus.
   - Between full runs, previous risk result is reused.

6. Feature construction:
   - `actualSeated = min(currentOccupancy, seatCapacity)`
   - `actualStanding = max(0, currentOccupancy - seatCapacity)`

7. Physics + weather + ML:
   - If physics cache hit: reuse cached road geometry and call ML.
   - If cache miss: run weather API and physics subprocess in parallel, then call ML.

8. Persistence:
   - Save `riskScore`, `distToCurve`, GPS, occupancy, speed in `BusDataLog`.
   - Update bus `currentStatus` pointer.

9. Rule-based events:
   - Footboard and overcrowding checks are logged separately as violations.

---

## 4. Physics-Based Rollover Model

### 4.1 Physical Meaning

Rollover risk is governed by competition between:

1. Destabilizing lateral acceleration while cornering.
2. Stabilizing geometry represented by Static Stability Factor (SSF).

When cornering demand approaches or exceeds geometric stability margin, rollover risk rises.

### 4.2 Core Variables in Physics Module

1. `N_seated`, `N_standing`: passenger distribution.
2. `M_bus`, `M_pax`: bus and per-passenger mass constants.
3. `h_empty`, `h_seat`, `h_stand`: CoG heights by load category.
4. `TrackWidth`: effective wheel track width.
5. `speed_kmh`: current bus speed.
6. `radius_m`: curve radius.
7. `G`: gravitational acceleration.

### 4.3 Key Physics Outputs

1. `total_mass_kg`
2. `cog_height_m`
3. `rollover_threshold_g` (SSF proxy)
4. `lateral_accel_g`
5. `decision` (Safe / Warning / Critical)

### 4.4 Decision Threshold Logic

Physics decision layer uses safety factors:

1. Warning threshold at 50% of rollover threshold.
2. Critical threshold at 70% of rollover threshold.

This creates early intervention margin before absolute physical instability.

---

## 5. Road-Ahead Geometry and Curve Identification

### 5.1 Why Road-Ahead Analysis is Needed

A pure current-position model is reactive. Predictive warnings require identifying dangerous
curve geometry before the bus enters the bend. Therefore, the system performs lookahead
curve extraction from map geometry.

### 5.2 OSMnx Lookahead Pipeline

Given current `lat`, `lon`, the road module performs:

1. Build local driving graph around current position.
2. Snap vehicle point to nearest drivable edge.
3. Slice forward geometry for configured lookahead distance.
4. Project geometry to metric CRS (UTM) for meter-accurate computation.
5. Sample points at uniform spacing.
6. Compute sliding 3-point circumradius values.
7. Extract:
   - `sharpest_radius_m` (minimum finite radius)
   - `distance_to_sharpest_radius_m`
8. Retrieve elevation samples and estimate slope as `slope_degrees`.

### 5.3 Curvature Computation

Curvature uses circumradius of three points (Menger curvature form). Smaller radius implies
sharper curve and higher rollover demand at a given speed.

### 5.4 Distance-to-Curve Feature

`dist_to_curve_m` quantifies how far the bus is from the most critical bend ahead. This
enables predictive risk smoothing and earlier warnings.

---

## 6. Stopping Distance Model

Stopping distance is produced as a second safety target. It combines:

1. Reaction distance.
2. Braking distance under slope and friction conditions.

The implementation supports:

1. Dry vs wet friction behavior.
2. Uphill/downhill effect through slope.
3. Reaction-time and brake-efficiency parameters.

This complements rollover risk by estimating whether available road distance is adequate
for safe deceleration.

---

## 7. Machine Learning Safety Model

### 7.1 Model Type

The safety model is a multi-output Random Forest regressor:

1. Base learner: `RandomForestRegressor(n_estimators=100, random_state=42)`.
2. Wrapper: `MultiOutputRegressor`.
3. Two outputs predicted simultaneously:
   - `risk_score`
   - `stopping_dist`

### 7.2 Input Feature Vector

The exact ML safety features are:

1. `n_seated`
2. `n_standing`
3. `speed_kmh`
4. `radius_m`
5. `is_wet`
6. `gradient_deg`
7. `dist_to_curve_m`

### 7.3 Target Variables

1. `risk_score`: derived from ratio of lateral acceleration to stability threshold with
   distance-based smoothing.
2. `stopping_dist`: computed from reaction and braking physics under friction/slope effects.

### 7.4 Training Data Strategy

Training data is synthetic, generated from physics equations to avoid dependence on rare
and ethically sensitive real crash labels.

Configuration in training script:

1. `n_samples = 5000`
2. Train/test split = 80/20 (`random_state=42`)
3. Feature ranges include realistic operational intervals:
   - speed 20-80 km/h
   - radius 10-200 m
   - gradient -5 to +5 degrees
   - distance to curve 0-150 m

### 7.5 Synthetic Label Generation Logic

For each sample:

1. Compute dynamic CoG and SSF.
2. Compute lateral acceleration and raw risk ratio.
3. Apply distance decay smoothing to create predictive risk behavior.
4. Compute stopping distance using friction and slope-adjusted braking model.

---

## 8. Weather, Friction, and Environmental Context

Weather is retrieved from Open-Meteo and mapped to wet/dry state:

1. Wet weather codes set `is_wet = 1`.
2. Dry codes set `is_wet = 0`.

Backend weather service applies location-grid caching and returns condition plus friction
context, allowing the safety pipeline to adapt to rainy road conditions.

---

## 9. Caching and Real-Time Optimization

### 9.1 GPS Cache

1. In-memory per bus license plate.
2. Data stale after 30 seconds.

### 9.2 Safety Throttle

1. Full safety computation every 5 seconds per bus.
2. Reuse latest safety output between runs.

### 9.3 Physics Cache

1. Key includes approximate location, speed bucket, and passenger bucket.
2. Location quantization approximately 50 m precision.
3. TTL = 30 seconds.

### 9.4 Weather Cache

1. Keyed to around 1 km geospatial grid.
2. TTL = 5 minutes.

These optimizations reduce compute and network load while preserving warning continuity.

---

## 10. How Rollover Risk is Identified in Live Operation

The project identifies rollover danger through the following mechanism:

1. Compute road severity ahead (`radius_m`, `dist_to_curve_m`).
2. Combine with load distribution (`n_standing` strongly affects CoG).
3. Adjust for weather (`is_wet`) and slope (`gradient_deg`).
4. Predict `risk_score` via ML safety service.
5. Trigger UX thresholds:
   - Warning if risk > 0.5
   - Critical if risk > 0.7

This design provides predictive pre-curve warning rather than only reactive detection.

---

## 11. Function-Level Reference Summary

### 11.1 Physics Functions

1. `compute_total_mass(...)`
2. `compute_cog_height(...)`
3. `rollover_threshold_g(...)`
4. `check_safety_with_radius(...)`
5. `calculate_stopping_distance(...)`

### 11.2 Road Geometry Functions

1. `calculate_curvature_radius(...)`
2. `compute_curvature_three_point(...)`
3. `get_road_data(...)`

### 11.3 Backend Safety Functions

1. `ingestIoTData(...)` orchestrates full live pipeline.
2. `getSafetyPrediction(...)` calls Flask safety endpoint.
3. `getPhysicsModelResult(...)` runs Python physics subprocess.
4. `getRoadWeather(...)` returns weather-based wetness/friction context.
5. `shouldRunSafety(...)`, `updateSafetyState(...)`, `getLastSafetyState(...)`
   implement per-bus throttling.

---

## 12. Assumptions Used in This Implementation

1. Bus geometry and mass constants are fixed representative values for common Sri Lankan
   long-distance buses.
2. Average passenger mass is constant in calculations.
3. Runtime seated/standing split is inferred from occupancy and seat capacity, not directly
   sensed as separate classes in backend ingestion.
4. GPS from conductor phone is treated as primary source when available.
5. Road wetness is simplified to binary wet/dry state.
6. Curvature and slope estimation quality depends on map/elevation API availability and GPS
   signal quality.
7. ML model is trained on physics-generated synthetic labels.

---

## 13. Limitations and Validity Considerations

1. Synthetic training data may not capture all rare real-world disturbances.
2. Vehicle dynamics are simplified; suspension transient behavior, tire wear dynamics, and
   lateral load transfer nuances are not explicitly modeled as full multibody dynamics.
3. Weather to friction mapping is simplified and not lane-surface specific.
4. API/network interruptions can trigger fallback behavior and reduce prediction fidelity.
5. Different code modules use slightly different calibration constants; harmonizing constants
   can improve calibration consistency.

---

## 14. Reproducibility Notes for Research Reporting

To reproduce the safety model from source:

1. Generate synthetic training set by running the safety training script.
2. Train multi-output Random Forest with fixed random seed.
3. Save `safety_model.joblib`.
4. Launch Flask service and verify `/predict-safety` endpoint.
5. Run backend and feed live telemetry through IoT ingestion endpoint.

For experiment tables in the paper, report:

1. Feature ranges used during synthetic generation.
2. Train/test split and random seed.
3. MSE and R2 from the current trained model run.
4. Latency and throughput with and without cache/throttle enabled.

---

## 15. Research-Paper-Ready Methodology Paragraph

The proposed rollover prediction module uses a hybrid physics-informed machine learning
architecture for real-time long-distance bus safety assessment. Live telemetry from IoT and
mobile sources is enriched with road-ahead geometric features extracted from OpenStreetMap,
including sharpest upcoming curve radius, distance to curve, and slope. A multi-output
Random Forest model, trained on synthetic labels generated from physically grounded equations,
predicts rollover risk score and stopping distance. The backend executes this pipeline under
strict real-time constraints using per-bus throttling and multi-layer geospatial-temporal
caching. Warning and critical conditions are issued using risk thresholds to provide
pre-curve intervention opportunities to the driver and conductor dashboards.

---

## Mathematical Model (Compact One-Page Subsection)

This subsection formalizes the implemented rollover prediction model with sequential
equation numbering.

### A. Core Equations

**(Eq. 1) Total Mass**

$$
M_{total} = M_{bus} + (N_{seated} + N_{standing}) \cdot M_{pax}
$$

**(Eq. 2) Dynamic Center of Gravity Height**

$$
h_{CoG} = \frac{M_{bus}h_{empty} + (N_{seated}M_{pax})h_{seat} + (N_{standing}M_{pax})h_{stand}}{M_{total}}
$$

**(Eq. 3) Static Stability Factor (Rollover Threshold Proxy)**

$$
SSF = \frac{T}{2h_{CoG}}
$$

**(Eq. 4) Speed Conversion**

$$
v_{m/s} = \frac{v_{km/h}}{3.6}
$$

**(Eq. 5) Lateral Acceleration**

$$
a_{lat} = \frac{v_{m/s}^2}{r}
$$

**(Eq. 6) Lateral Acceleration in g-units**

$$
a_{lat,g} = \frac{a_{lat}}{g}
$$

**(Eq. 7) Raw Rollover Risk Ratio**

$$
Risk_{raw} = \frac{a_{lat,g}}{SSF}
$$

**(Eq. 8) Distance-Aware Risk Smoothing**

$$
Risk_{smooth} = Risk_{raw} \cdot \frac{1}{1 + k_d \cdot d_{curve}}
$$

where `k_d = 0.05` in the current training implementation.

**(Eq. 9) Effective Friction for Stopping Label Generation**

$$
\mu_{eff} = \max(0.1, \mu + \tan(\theta))
$$

**(Eq. 10) Reaction Distance**

$$
d_{reaction} = v_{m/s} \cdot t_r
$$

**(Eq. 11) Braking Distance**

$$
d_{brake} = \frac{v_{m/s}^2}{2g\mu_{eff}}
$$

**(Eq. 12) Total Stopping Distance**

$$
d_{stop} = d_{reaction} + d_{brake}
$$

**(Eq. 13) Warning/Critical Decision Rule**

$$
Decision =
\begin{cases}
\operatorname{Critical}, & Risk > 0.7 \\
\operatorname{Warning}, & 0.5 < Risk \leq 0.7 \\
\operatorname{Safe}, & Risk \leq 0.5
\end{cases}
$$

### B. Curve Geometry Equations

For three sampled road points with side lengths `a`, `b`, `c`:

**(Eq. 14) Semi-perimeter**

$$
s = \frac{a+b+c}{2}
$$

**(Eq. 15) Triangle Area (Heron)**

$$
A = \sqrt{s(s-a)(s-b)(s-c)}
$$

**(Eq. 16) Circumradius (Curve Radius Estimate)**

$$
R = \frac{abc}{4A}
$$

The smallest finite `R` within lookahead samples is used as the sharpest upcoming radius.

### C. Variable Definitions

| Symbol        | Definition                                 | Unit               |
| ------------- | ------------------------------------------ | ------------------ |
| `M_total`     | Total vehicle mass                         | kg                 |
| `M_bus`       | Empty bus mass constant                    | kg                 |
| `M_pax`       | Per-passenger mass constant                | kg                 |
| `N_seated`    | Number of seated passengers                | count              |
| `N_standing`  | Number of standing passengers              | count              |
| `h_CoG`       | Center of gravity height                   | m                  |
| `h_empty`     | Empty-bus CoG height                       | m                  |
| `h_seat`      | Seated-passenger CoG reference height      | m                  |
| `h_stand`     | Standing-passenger CoG reference height    | m                  |
| `T`           | Track width                                | m                  |
| `SSF`         | Static stability factor                    | g-equivalent ratio |
| `v_km/h`      | Vehicle speed                              | km/h               |
| `v_m/s`       | Vehicle speed                              | m/s                |
| `r`           | Curve radius                               | m                  |
| `a_lat`       | Lateral acceleration                       | m/s^2              |
| `a_lat,g`     | Lateral acceleration normalized by gravity | g                  |
| `g`           | Gravitational acceleration                 | m/s^2              |
| `Risk_raw`    | Unsmoothed rollover risk ratio             | ratio              |
| `Risk_smooth` | Distance-smoothed risk score               | ratio              |
| `d_curve`     | Distance to sharpest upcoming curve        | m                  |
| `k_d`         | Risk decay coefficient                     | 1/m                |
| `mu`          | Base road friction coefficient             | ratio              |
| `mu_eff`      | Effective friction after slope adjustment  | ratio              |
| `theta`       | Road slope angle                           | rad                |
| `t_r`         | Driver reaction time                       | s                  |
| `d_reaction`  | Reaction distance                          | m                  |
| `d_brake`     | Braking distance                           | m                  |
| `d_stop`      | Total stopping distance                    | m                  |

### D. Compact Interpretation

1. Risk increases when speed rises or radius decreases.
2. Risk increases when standing load raises CoG, reducing SSF.
3. Risk is reduced when curve is still far ahead (`d_curve` large), enabling early warning.
4. Stopping distance increases in wet/downhill conditions due to reduced effective friction.
5. Operational alerting uses the practical thresholds in Eq. 13.
