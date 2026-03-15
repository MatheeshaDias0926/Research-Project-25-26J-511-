# Smart Bus Safety System: Rollover Prediction Methodology

This document outlines the theoretical foundation, physical calculations, variables, and machine learning architecture used in the Smart Bus Safety System for predicting impending bus rollovers and calculating safe stopping distances.

## 1. System Architecture Overview

Because collecting real-world vehicle rollover data is exceedingly dangerous, this system utilizes a **Digital Twin Methodology**.
Instead of learning from real-world crashes, a pure physics engine simulates thousands of different driving scenarios to calculate exact safety thresholds ("Ground Truth"). A Machine Learning (ML) model is then trained on this synthetic dataset. In production, this ML model acts as a low-latency approximation of the complex physics calculations, allowing the system to run in real-time on edge devices or fast backend services.

---

## 2. Variables and Assumptions

The system assumes a standard commercial bus profile common in South Asia (e.g., Ashok Leyland Viking). The constants used in all calculations are:

### Fixed Assumptions (Constants)
| Constant | Value | Description |
| :--- | :--- | :--- |
| `MASS_BUS` | 9,500 kg | Mass of the empty bus chassis + body |
| `MASS_PAX` | 62 kg | Average weight of an adult passenger |
| `H_EMPTY` | 1.15 m | Center of Gravity (CoG) height of an empty bus |
| `H_SEAT` | 1.35 m | Center of Gravity height of a seated passenger |
| `H_STAND` | 2.15 m | Center of Gravity height of a standing passenger |
| `TRACK_WIDTH` | 1.95 m | Effective track width (distance between left and right wheels) |
| `G` | 9.81 m/s² | Acceleration due to gravity |
| `FRICTION_DRY`| 0.65 | Tire-road friction coefficient on dry asphalt |
| `FRICTION_WET`| 0.35 | Tire-road friction coefficient on wet roads |
| `REACTION_TIME`| 1.8 s | Expected driver reaction time to an alert |

### Dynamic Variables (Real-time Inputs)
*   **$n_{seated}$**: Number of seated passengers (derived from total occupancy).
*   **$n_{standing}$**: Number of standing passengers (derived from total occupancy).
*   **$v$**: Vehicle speed in km/h (converted to m/s internally).
*   **$r$**: Curve radius ahead in meters (fetched via OSMnx path lookahead).
*   **$d$**: Distance to the upcoming curve in meters.
*   **$is\_wet$**: Weather state (1 for Wet, 0 for Dry), fetched from Open-Meteo APIs.
*   **$\theta$**: Road slope / gradient in degrees.

---

## 3. Core Physics Calculations (The "Digital Twin")

The core metric used to determine rollover risk is the ratio between **Lateral Acceleration** and the **Static Stability Factor (SSF)**.

### A. Center of Gravity (CoG) Calculation
The vertical Center of Gravity ($h_{cog}$) shifts significantly based on how many people are standing versus sitting.

$$ Total Mass (M) = MASS\_BUS + (n_{seated} \times MASS\_PAX) + (n_{standing} \times MASS\_PAX) $$

$$ h_{cog} = \frac{(MASS\_BUS \times H\_EMPTY) + (m_{seated} \times H\_SEAT) + (m_{standing} \times H\_STAND)}{Total Mass (M)} $$

### B. Static Stability Factor (SSF)
SSF is the geometric rollover threshold of the vehicle. A lower SSF means the vehicle is more top-heavy and prone to rolling over.

$$ SSF = \frac{TRACK\_WIDTH}{2 \times h_{cog}} $$

### C. Lateral Acceleration
When taking a curve, centrifugal force pushes the bus outward laterally.
*Speed is first converted to meters per second ($v_{ms} = v / 3.6$).*

$$ a_{lateral} = \frac{v_{ms}^2}{radius} $$
$$ a_{lateral\_g} = \frac{a_{lateral}}{G} $$

### D. Raw Risk Score
The risk of rolling over is the relationship between the lateral acceleration acting on the bus and its inherent SSF threshold:

$$ Risk_{raw} = \frac{a_{lateral\_g}}{SSF} $$

*If $Risk_{raw}$ > 1.0, a rollover is physically guaranteed.*

### E. Smoothed Risk Score (Distance Decay)
To prevent sudden alarms exactly as the bus enters the curve, the warning must be given *in advance*. The raw risk is "smoothed" using a decay function based on the distance ($d$) to the curve. This ensures the risk score gradually ramps up as the bus approaches the danger zone.

$$ Risk_{smoothed} = \frac{Risk_{raw}}{1 + 0.05 \times d} $$

### F. Stopping Distance
The system also calculates if the bus has enough space to brake before the curve:

$$ Effective Friction (\mu_{eff}) = \max(0.1, \mu_{weather} + \tan(\theta_{slope})) $$
$$ Distance_{reaction} = v_{ms} \times REACTION\_TIME $$
$$ Distance_{braking} = \frac{v_{ms}^2}{2 \times G \times \mu_{eff}} $$
$$ Total Stopping Distance = Distance_{reaction} + Distance_{braking} $$

---

## 4. Machine Learning Implementation

While the physics equations provide the ground truth, computing OSMnx path graphs and strict differential physics on edge devices in real-time can be computationally expensive or require internet connectivity.

To solve this, the system uses Machine Learning:
1.  **Synthetic Dataset Generation**: `datasetGen.py` / `train_safety_model.py` generates 5,000 random but physically possible driving scenarios (random speeds, weights, curve radii, distances, and slopes). The physics equations compute the exact `$Risk_{smoothed}$` and `$Total Stopping Distance$` for each.
2.  **Algorithm**: A **Multi-Output Random Forest Regressor** (`sklearn.ensemble.RandomForestRegressor`) is trained on this dataset.
    *   **Inputs (Features)**: `[n_seated, n_standing, speed_kmh, radius_m, is_wet, gradient_deg, dist_to_curve_m]`
    *   **Outputs (Targets)**: `[risk_score, stopping_dist]`
3.  **Why Random Forest?**: Random Forests are excellent at capturing non-linear relationships (like the $v^2$ in the acceleration formula and the $1/r$ relationship) without requiring complex neural network architectures. They are highly performant, robust to overfitting the synthetic data, and have millisecond inference times.
4.  **Feature Importance**: Model analysis confirms that the top 3 dominant features driving the Risk Score are exactly what fluid dynamics / physics imply:
    1.  Speed
    2.  Curve Radius
    3.  Distance to Curve
    *Passenger weight (CoG shift) acts as a secondary modifier that pushes the risk score over the edge in marginal scenarios.*

## 5. Decision Logic (Thresholds)
During real-time integration (in the IoT Controller):
*   **Risk > 0.50**: Triggers an `Unstable on Curve` **WARNING** (Yellow/Orange state).
*   **Risk > 0.70**: Triggers a `SLOW DOWN` **CRITICAL ALERT** (Red state + Voice prompt).
