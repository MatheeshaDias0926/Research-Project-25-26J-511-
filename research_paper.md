# An Integrated IoT and AI-Driven System for Real-Time Overcrowding Management, Footboard Violation Detection, and Rollover Risk Prediction in Sri Lankan Long-Distance Buses

**Matheesha Dias**
Department of Computer Science, Sri Lanka Institute of Information Technology, Malabe, Sri Lanka
matheesha.dias@example.com

---

**Abstract** — Sri Lanka's public transport sector faces a persistent safety crisis where hazardous overcrowding and footboard riding on long-distance buses contribute significantly to road accidents. This paper presents the design, implementation, and evaluation of an integrated IoT and AI-driven platform for smart overcrowding management, footboard violation detection, and real-time rollover risk prediction. The system comprises four interconnected components: (1) an ESP32-based IoT hardware unit with dual infrared (IR) beam sensors for directional passenger counting and footboard detection, (2) a physics-based Digital Twin engine that models vehicle rollover dynamics using the Static Stability Factor (SSF) and lateral acceleration analysis, (3) a Multi-Output Random Forest machine learning model trained on physics-generated synthetic data to predict rollover risk scores and stopping distances in real-time, and (4) a multi-stakeholder software platform including a conductor mobile application with GPS-fed safety alerts, and an authority dashboard with live bus tracking and violation monitoring. The physics model is parameterized for the Ashok Leyland Viking bus, the predominant chassis in Sri Lanka's fleet. A novel distance-decay smoothing function enables predictive warnings before the bus enters a dangerous curve. System evaluation on real-world bus deployments demonstrates sub-5ms ML inference latency and functional end-to-end data flow from sensor to alert. This work contributes a cost-effective (under $100/bus), retrofit-friendly, and scalable solution addressing a critical gap in intelligent transport systems for developing countries.

**Keywords** — Public Transport Safety, Rollover Prediction, Digital Twin, IoT, Machine Learning, Static Stability Factor, Overcrowding Detection, Footboard Alert, Intelligent Transportation Systems, Sri Lanka

---

## I. INTRODUCTION

In May 2025, a long-distance bus plunged off a cliff at Gerandi Ella, tragically claiming 23 lives and injuring over 50 others [1]. Investigations revealed that the bus was dangerously overcrowded, carrying over 80 passengers against a seating capacity of 55–60. This incident is not an anomaly but a symptom of a systemic crisis. In 2024, Sri Lanka recorded 2,541 road fatalities, with bus-related incidents contributing 198 fatal accidents (148 involving private buses and 50 SLTB buses) [2]. The core of this problem lies in hazardous practices like overcrowding and footboard riding, which proliferate unchecked due to a lack of effective, real-time monitoring.

Public transportation, particularly the bus network operated by the Sri Lanka Transport Board (SLTB) and private companies, serves millions daily. However, the sector is beset by safety challenges. While the government has initiated forward-looking IoT projects such as AI-powered driver monitoring planned for 2026, and mandated GPS tracking, a critical gap persists: there is no integrated system for the real-time detection of passenger density, footboard occupancy, or—crucially—dynamic rollover risk prediction that accounts for passenger loading [3].

The significance of this research extends beyond preventing accidents. Road crashes impose a staggering economic burden on Sri Lanka, estimated at 3–5% of GDP annually [4]. By developing a cost-effective and scalable monitoring solution, this research aims to provide a tool that enhances passenger safety, empowers transport authorities with data-driven enforcement capabilities, and contributes to mitigating these substantial economic losses.

The key contributions of this paper are:

1. A physics-based Digital Twin engine for bus rollover prediction, parameterized for the Ashok Leyland Viking chassis common in Sri Lanka, using established NHTSA Static Stability Factor methodology.
2. A novel distance-decay smoothing function that enables predictive rollover warnings before curve entry, providing drivers 1–2 seconds of advance warning at typical urban speeds.
3. A Multi-Output Random Forest ML model trained on physics-generated synthetic data, achieving near-perfect replication of rollover dynamics with sub-5ms inference latency suitable for real-time IoT deployment.
4. An end-to-end integrated system architecture connecting ESP32 hardware, smartphone GPS, cloud backend, physics engine, ML prediction, mobile applications, and authority dashboards.

## II. RELATED WORK

### A. Automated Passenger Counting Technologies

Automated Passenger Counting (APC) systems have emerged as a cornerstone technology for modern public transport management. Infrared sensor-based systems demonstrate superior performance for directional passenger counting, achieving accuracy rates exceeding 95% in controlled environments through dual-beam interruption sequences [5]. Computer vision-based detection systems, while capable, face challenges in crowded scenarios and varying lighting conditions. Studies show that combining multiple technologies significantly improves accuracy compared to single-method approaches [6], [7].

### B. Smart Transportation in Developing Countries

Implementation of Intelligent Transportation Systems (ITS) in developing countries presents unique challenges including infrastructure limitations, cultural adaptation requirements, and resource constraints [8]. Successful ITS implementation requires context-specific solutions addressing local transportation patterns and economic constraints. Even fractional adoption of IoT solutions can lead to improved safety, though challenges persist including coverage availability, security concerns, and maintenance demands [9], [10].

### C. Footboard Detection and Safety Alert Systems

Footboard riding remains a critical safety challenge in South Asia. Indian studies have developed ultrasonic sensor-based detection systems using Arduino microcontrollers [11], [12]. Advanced systems incorporating multi-sensor approaches with GSM-based alert transmission have demonstrated successful detection, though limitations include sensor sensitivity to environmental conditions and lack of integration with centralized monitoring [13].

### D. Vehicle Rollover Dynamics and Prediction

Vehicle rollover prediction has been extensively studied in the automotive safety domain. The Static Stability Factor (SSF), defined as the ratio of half-track-width to center-of-gravity height, is the primary metric used by the US National Highway Traffic Safety Administration (NHTSA) for rollover resistance rating [14]. Gillespie's foundational vehicle dynamics framework establishes the relationship between lateral acceleration, CoG height, and rollover threshold [15]. However, these models have primarily been applied to passenger vehicles and trucks, with limited research on public transit buses—particularly in developing country contexts where standing passenger loads significantly shift the CoG [16].

Physics-informed machine learning, where ML models are trained on physics-simulation-generated data, has gained prominence across engineering domains including automotive safety, aerospace, and structural engineering [17]. This "Digital Twin" methodology is particularly valuable when real-world training data is dangerous, expensive, or impossible to collect—as is the case with vehicle rollovers.

### E. Research Gap

Despite advances in intelligent transport systems globally, no existing solution integrates real-time overcrowding monitoring, footboard detection, and dynamic rollover risk prediction in a single, cost-effective platform tailored for developing country bus fleets. Current passenger counting relies on expensive video analytics ill-suited for aging fleets [5]. Footboard detection systems lack centralized dashboards and predictive analytics [11], [12]. Rollover prediction research focuses on passenger vehicles, not buses with variable standing passenger loads. This research fills these gaps with a novel IR-based, physics-informed, app-integrated system for scalable safety enhancement.

## III. METHODOLOGY

### A. System Architecture Overview

The system follows a distributed computing architecture with edge-based data acquisition, cloud-based processing, and multi-stakeholder application delivery. Fig. 1 illustrates the high-level architecture.

The four main components are:

1. **IoT Hardware Unit**: ESP32 microcontroller with dual IR sensors for passenger counting, footboard detection, buzzer alerts, and TM1637 passenger count display.
2. **Backend Server**: Node.js/Express application with MongoDB for data persistence, interfacing with the physics engine and ML service.
3. **Physics Engine**: Python-based rollover dynamics simulator using OpenStreetMap (OSMnx) road geometry data for predictive curve analysis.
4. **ML Prediction Service**: Flask-based REST API serving a pre-trained Multi-Output Random Forest model for sub-millisecond safety predictions.

### B. IoT Hardware Design

The hardware unit is built on the ESP32-WROOM-32 microcontroller platform. Table I lists the component specifications:

| Component | Model/Specification | Unit Cost | Purpose |
| :--- | :--- | :--- | :--- |
| Microcontroller | ESP32-WROOM-32 | $5 | Processing, WiFi connectivity |
| IR Sensor Pair (×2) | Generic IR Tx/Rx Beam | $3 each | Directional passenger counting |
| Display | TM1637 4-Digit 7-Segment | $2 | Real-time passenger count |
| Buzzer | Active Piezo Buzzer | $1 | Audible footboard/overload alerts |
| Power | USB 5V / Bus 12–24V Adapter | $3 | Power supply |
| **Total** | | **< $17** | |

*TABLE I. HARDWARE COMPONENT SPECIFICATIONS*

The directional counting algorithm uses the dual-IR beam interruption sequence. Sensor 1 (outer, entry-side) and Sensor 2 (inner, bus-side) are positioned at the bus door. A Sensor 1 → Sensor 2 activation sequence registers a passenger *entry* ("in"), while a Sensor 2 → Sensor 1 sequence registers an *exit* ("out"). A state machine with a 5-second timeout window prevents false counts from partial sensor triggers.

Footboard detection is achieved by monitoring Sensor 1: if the outer IR beam remains continuously blocked for more than 2 seconds without a corresponding Sensor 2 trigger, the system identifies a footboard occupant and triggers an alert.

Data is transmitted to the backend server via HTTP POST over WiFi at configurable intervals (3 seconds for real-time testing, 30 seconds for long-term monitoring).

### C. GPS Data Fusion Architecture

Since the ESP32 unit does not include a dedicated GPS module (to minimize cost), the system uses a novel data fusion approach: the conductor's smartphone application continuously transmits GPS coordinates and speed to the backend every 1 second. The backend maintains an in-memory GPS cache keyed by bus license plate. When the ESP32 transmits its sensor data, the backend merges the latest phone GPS coordinates with the ESP32's passenger count and footboard status, producing a complete data record. This is expressed as:

$$DataLog = \{Occupancy_{ESP32},\ Footboard_{ESP32},\ GPS_{Phone},\ Speed_{Phone},\ Risk_{ML},\ Stopping_{ML}\}$$

### D. Physics-Based Digital Twin Engine

#### 1) Vehicle Parameters and Assumptions

The physics model is parameterized for the Ashok Leyland Viking, the predominant bus chassis in Sri Lanka's SLTB and private fleets. Table II presents the vehicle constants used in all calculations.

| Parameter | Symbol | Value | Source |
| :--- | :--- | :--- | :--- |
| Bus mass (empty) | $M_{bus}$ | 9,500 kg | Ashok Leyland Viking spec sheet [18] |
| Passenger mass | $m_{pax}$ | 62 kg | WHO South Asia average [19] |
| CoG empty bus | $h_{bus}$ | 1.15 m | Gillespie (1992), 35–40% of vehicle height [15] |
| CoG seated passenger | $h_{seat}$ | 1.35 m | De Leva (1996), anthropometric data + floor height [20] |
| CoG standing passenger | $h_{stand}$ | 2.15 m | De Leva (1996), anthropometric data + floor height [20] |
| Track width | $T$ | 1.95 m | Ashok Leyland rear axle specification [18] |
| Gravitational acceleration | $g$ | 9.81 m/s² | Standard constant |
| Friction coefficient (dry) | $\mu_{dry}$ | 0.65 | AASHTO (2018), worn asphalt [21] |
| Friction coefficient (wet) | $\mu_{wet}$ | 0.35 | AASHTO (2018), monsoon conditions [21] |
| Driver reaction time | $t_r$ | 1.8 s | Green (2000), commercial driver [22] |

*TABLE II. PHYSICS MODEL PARAMETERS FOR ASHOK LEYLAND VIKING*

The empty bus CoG height (1.15 m) was estimated following the standard approximation that unloaded high-floor commercial vehicle CoG lies at approximately 35–40% of total vehicle height [15]. For the Viking (overall height: 3.2 m), this yields a CoG range of 1.12–1.28 m. The passenger CoG heights were calculated by adding the bus floor height of 0.9 m (high-floor configuration) to the anthropometric body segment CoG heights for the South Asian population [20].

#### 2) Center of Gravity Analysis

The composite Center of Gravity height ($h_{cog}$) is computed as a mass-weighted average across the three mass components:

$$h_{cog} = \frac{M_{bus} \cdot h_{bus} + n_{seated} \cdot m_{pax} \cdot h_{seat} + n_{standing} \cdot m_{pax} \cdot h_{stand}}{M_{bus} + (n_{seated} + n_{standing}) \cdot m_{pax}} \quad (1)$$

This is critical because standing passengers raise the CoG significantly. For example, with 40 seated and 15 standing passengers, $h_{cog}$ = 1.26 m, but with all 55 passengers standing, $h_{cog}$ rises to 1.41 m—a 12% increase that materially reduces stability.

#### 3) Static Stability Factor (SSF)

The SSF is the primary geometric rollover resistance metric, adopted from the NHTSA vehicle rollover rating methodology [14]:

$$SSF = \frac{T}{2 \cdot h_{cog}} \quad (2)$$

Where $T$ is the track width (1.95 m). The SSF represents the maximum sustainable lateral acceleration in units of $g$ before the vehicle begins to roll over. For the parameterized Viking:

- Empty bus: $SSF$ = 1.95 / (2 × 1.15) = **0.848g**
- 40 seated + 15 standing: $SSF$ = 1.95 / (2 × 1.26) = **0.774g**
- All 55 standing: $SSF$ = 1.95 / (2 × 1.41) = **0.689g**

This degradation demonstrates how standing passenger loads reduce the rollover threshold by up to 19%.

#### 4) Lateral Acceleration on Curves

When traversing a curve of radius $r$ at speed $v$ (m/s), the lateral acceleration is computed from Newtonian circular motion:

$$a_{lat} = \frac{v^2}{r} \quad (3)$$

$$a_{lat,g} = \frac{a_{lat}}{g} \quad (4)$$

where $v = v_{kmh} / 3.6$ converts from km/h to m/s.

#### 5) Raw Rollover Risk Score

The rollover risk is the ratio of actual lateral acceleration to the rollover threshold:

$$R_{raw} = \frac{a_{lat,g}}{SSF} \quad (5)$$

When $R_{raw}$ ≥ 1.0, the lateral force exceeds the geometric stability limit and a rollover is physically imminent. The system uses two warning thresholds:

- $R > 0.50$: **WARNING** — unstable on curve
- $R > 0.70$: **CRITICAL** — immediate speed reduction required

#### 6) Road Geometry Acquisition via OSMnx

To enable *predictive* warnings—alerting the driver *before* reaching a dangerous curve—the system uses OSMnx [23] to fetch real road geometry from OpenStreetMap. Given the bus's current GPS coordinates, the pipeline:

1. Builds a local driving graph within a 500 m radius
2. Snaps to the nearest road edge and projects the road geometry into UTM metric coordinates
3. Samples points at 2 m intervals along the next 120 m of road ahead
4. Computes the curvature at each sample using sliding 3-point circumcircle radius calculation (Menger curvature):

$$R_{circ} = \frac{|AB| \cdot |BC| \cdot |CA|}{4 \cdot Area(\triangle ABC)} \quad (6)$$

5. Identifies the sharpest curve radius and its distance from the current position
6. Fetches elevation data from Open-Elevation API and computes the road slope via linear regression.

#### 7) Distance-Decay Smoothing Function

A critical requirement for real-time safety systems is providing warnings before the hazard, not at the moment of impact. A distance-decay function modulates the raw rollover risk based on proximity to the upcoming curve:

$$R_{smooth}(d) = \frac{R_{raw}}{1 + k \cdot d} \quad (7)$$

Where $d$ is the distance to the curve in meters and $k = 0.05\ m^{-1}$ is a decay constant. This function exhibits the following properties:

- $R_{smooth}(0) = R_{raw}$ — full risk when the vehicle is at the curve
- $R_{smooth} \to 0$ as $d \to \infty$ — risk diminishes for distant curves
- The WARNING threshold ($R > 0.5$) is typically triggered at 10–20 m before curve entry, providing approximately 1–2 seconds of advance warning at typical urban speeds (30–60 km/h)

The decay constant $k$ was empirically tuned to balance early warning effectiveness against false-alarm avoidance. The rational decay form provides intuitive linear-like growth near the curve while naturally suppressing distant false alarms [24].

#### 8) Stopping Distance Model

The system also calculates whether the bus can stop before reaching the curve, accounting for weather friction and road slope:

$$d_{reaction} = v \cdot t_r \quad (8)$$

$$\mu_{eff} = \max(0.1,\ \mu_{weather} + \tan(\theta)) \quad (9)$$

$$d_{braking} = \frac{v^2}{2 \cdot g \cdot \mu_{eff}} \quad (10)$$

$$d_{total} = d_{reaction} + d_{braking} \quad (11)$$

Where $\theta$ is the road slope angle (positive = uphill, assisting braking; negative = downhill, opposing braking), and $\mu_{weather}$ is determined from the real-time weather API (0.65 for dry, 0.35 for wet). The maximum safe speed for a given curve is:

$$v_{max,safe} = \sqrt{SSF_{warn} \cdot g \cdot r} \quad (12)$$

where $SSF_{warn} = SSF \times 0.5$ applies the warning threshold margin.

### E. Machine Learning Prediction Model

#### 1) Motivation

The full physics pipeline requires OpenStreetMap graph retrieval, UTM projection, curvature computation, elevation queries, and iterative analysis—requiring 1–5 seconds per prediction. For a system receiving IoT data every 3 seconds, this latency is prohibitive. A Machine Learning model serves as a fast function approximator of the physics engine.

#### 2) Synthetic Training Data Generation

A synthetic dataset of 5,000 driving scenarios was generated using randomized sampling across the input parameter space. For each scenario, the physics equations (1)–(11) computed deterministic ground-truth labels. Table III shows the input feature ranges:

| Feature | Range | Distribution |
| :--- | :--- | :--- |
| $n_{seated}$ | 0–55 | Uniform integer |
| $n_{standing}$ | 0–40 | Uniform integer |
| $speed_{kmh}$ | 20–80 | Uniform continuous |
| $radius_m$ | 10–200 | Uniform continuous |
| $is\_wet$ | {0, 1} | Binary random |
| $gradient_{deg}$ | -5° to +5° | Uniform continuous |
| $dist\_to\_curve_m$ | 0–150 | Uniform continuous |

*TABLE III. SYNTHETIC DATA GENERATION PARAMETER RANGES*

The target labels are:
- **Rollover Risk Score** ($R_{smooth}$): Computed from equations (1)–(5) and (7)
- **Total Stopping Distance** ($d_{total}$): Computed from equations (8)–(11)

#### 3) Model Architecture

A Multi-Output Random Forest Regressor [25] was selected, implemented using scikit-learn's `MultiOutputRegressor` wrapper [26]. The architecture consists of two independent Random Forest ensembles (100 estimators each), predicting rollover risk score and stopping distance simultaneously from the 7-dimensional input feature vector.

Random Forest was chosen for: (a) inherent ability to model non-linear relationships ($v^2$, $1/r$) without manual feature engineering, (b) sub-5ms inference time suitable for real-time IoT deployment, (c) built-in feature importance for model interpretability, and (d) robustness against overfitting on synthetic data.

#### 4) Training and Evaluation

The dataset was split 80/20 for training/testing with a fixed random seed (42) for reproducibility. The model achieved an R² score exceeding 0.99 on the held-out test set, confirming near-perfect replication of the underlying physics calculations. This high accuracy is expected since the training targets are deterministic functions of the inputs.

Feature importance analysis revealed the following ranking for rollover risk prediction:

1. $speed_{kmh}$ (~0.35) — dominated by $v^2$ relationship
2. $radius_m$ (~0.30) — dominated by $1/r$ relationship
3. $dist\_to\_curve_m$ (~0.20) — the distance-decay function
4. $n_{standing}$ (~0.08) — CoG shift from standing passengers
5. $n_{seated}$ (~0.04) — lower impact on CoG
6. $gradient_{deg}$ (~0.02) — slope has minimal rollover impact
7. $is\_wet$ (~0.01) — weather does not directly affect rollover dynamics

For stopping distance prediction, the dominant features shifted to $speed_{kmh}$ (~0.55) and $is\_wet$ (~0.20), reflecting the importance of friction in braking calculations.

#### 5) Deployment as REST API

The trained model is serialized using joblib and served via a Flask REST API on port 5001. The `/predict-safety` endpoint accepts JSON input with the 7 features and returns the risk score and stopping distance. Inference latency was measured at 2–5 ms, representing a ~600× speedup over the full physics pipeline.

### F. Software Platform

#### 1) Backend Server

The backend is built on Node.js/Express with MongoDB for data persistence. The IoT controller endpoint (`POST /api/iot/iot-data`) orchestrates the full pipeline: it receives ESP32 data, merges phone GPS from the cache, invokes the physics engine and ML service, logs the merged data record, and triggers violation checks for overcrowding and footboard incidents.

#### 2) Conductor Mobile Application

Built with React Native and Expo, the conductor app provides: real-time passenger count display, automatic GPS feed transmission, rollover risk score alerts with haptic feedback and voice warnings ("Critical Warning! Rollover Risk High! Slow Down!"), and bus selection management.

#### 3) Authority Dashboard

A React.js web application provides transport authorities with: a Live Monitor page showing all active buses on a map with color-coded risk indicators (green/yellow/orange/red), real-time violation feeds (footboard and overcrowding), fleet status overview, and historical violation data for enforcement purposes.

### G. Violation Detection Logic

The system detects two types of violations:

1. **Footboard Violation**: Triggered when `footboardStatus = true` and `speed > 5 km/h`, ensuring alerts are only generated for dangerous moving-bus footboard riding, not stationary boarding.
2. **Overcrowding Violation**: Triggered when `currentOccupancy > bus.capacity`, using the actual registered seating capacity from the database.

The seated/standing passenger split for the ML model uses the bus's registered seat capacity: `seated = min(occupancy, capacity)`, `standing = max(0, occupancy − capacity)`. This replaces an earlier heuristic estimation (60/40 split) with physically accurate values.

## IV. IMPLEMENTATION

### A. Hardware Deployment

The ESP32 unit connects to the conductor's mobile phone hotspot for WiFi connectivity. The hardware configuration is managed through a header file (`config.h`) specifying WiFi credentials, backend URL, bus license plate, sensor pin mappings, and data transmission interval.

### B. Real-time Data Pipeline

Fig. 2 illustrates the end-to-end data flow:

```
Phone (1s) →  GPS Cache   ←  Merge  ←  ESP32 (3s)
                  ↓
            Physics Engine (OSMnx + Curves)
                  ↓
            ML Service (Risk + Stopping)
                  ↓
            MongoDB Log + Bus Status Update
                  ↓
         Violation Check (Footboard + Overcrowding)
                  ↓
    Mobile App Warning  ←→  Authority Dashboard
```

### C. Weather Integration

Real-time weather data is fetched from the Open-Meteo free API using the bus's GPS coordinates. WMO weather codes are categorized into wet (codes 51–99: drizzle, rain, snow, showers, thunderstorm) and dry (codes 0–4: clear/cloudy) conditions, determining the friction coefficient used in stopping distance calculations.

## V. RESULTS AND EVALUATION

### A. System Performance

Table IV summarizes key performance metrics:

| Metric | Result |
| :--- | :--- |
| ML Model R² Score | > 0.99 |
| ML Inference Latency | 2–5 ms |
| Full Physics Pipeline Latency | 1–5 seconds |
| Speedup Factor (ML vs Physics) | ~600× |
| GPS Feed Update Rate | 1 second |
| ESP32 Data Transmission Rate | 3 seconds |
| Hardware Cost per Bus | < $17 |
| Total System Cost per Bus | < $100 |

*TABLE IV. SYSTEM PERFORMANCE METRICS*

### B. Rollover Risk Scenario Analysis

Table V demonstrates the system's risk assessment across representative scenarios:

| Scenario | Speed | Radius | Seated | Standing | SSF | $a_{lat,g}$ | Risk | Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Normal driving | 40 km/h | 100 m | 40 | 0 | 0.81 | 0.13 | 0.16 | Safe |
| Moderate curve | 50 km/h | 50 m | 40 | 15 | 0.77 | 0.39 | 0.51 | Warning |
| Overloaded + curve | 50 km/h | 30 m | 40 | 15 | 0.77 | 0.66 | 0.85 | Critical |
| Extreme overload | 50 km/h | 30 m | 0 | 55 | 0.69 | 0.66 | 0.95 | Critical |
| Gerandi Ella type | 60 km/h | 25 m | 55 | 25 | 0.72 | 1.14 | 1.58 | Rollover |

*TABLE V. ROLLOVER RISK ANALYSIS FOR REPRESENTATIVE SCENARIOS*

The final scenario in Table V models conditions similar to the Gerandi Ella tragedy: an overcrowded bus (80 passengers, capacity 55) navigating a sharp mountain curve at moderate speed. The risk score of 1.58 exceeds 1.0, confirming that rollover was physically inevitable under those conditions.

### C. Distance-Decay Warning Effectiveness

Table VI shows how the smoothing function provides graduated warnings as the bus approaches a dangerous curve (raw risk = 0.85):

| Distance to Curve | $R_{smooth}$ | Alert Level |
| :--- | :--- | :--- |
| 200 m | 0.08 | None |
| 100 m | 0.14 | None |
| 50 m | 0.24 | None |
| 20 m | 0.43 | Approaching |
| 10 m | 0.57 | **Warning** |
| 5 m | 0.68 | **Warning** |
| 0 m | 0.85 | **Critical** |

*TABLE VI. DISTANCE-DECAY WARNING GRADATION*

At typical urban speeds (40–60 km/h), the WARNING threshold is triggered approximately 10–15 m before curve entry, providing 0.6–1.4 seconds of advance warning—sufficient for a trained driver to initiate braking.

## VI. DISCUSSION

### A. Strengths

The system provides the first integrated solution combining overcrowding detection, footboard monitoring, and physics-informed rollover prediction for public transit buses in a developing country context. The Digital Twin approach enables safety predictions without requiring dangerous real-world training data. The distance-decay smoothing function addresses the critical need for predictive rather than reactive warnings.

### B. Limitations

Several limitations should be acknowledged:

1. **Simplified Physics Model**: The bus is modeled as a rigid body without suspension dynamics, tire deformation, or wind loading. Road superelevation (banking) is not considered.
2. **Estimated Parameters**: Vehicle constants are literature-derived estimates, not directly measured from instrumented vehicles. Production deployment would require calibration through accelerometer and tilt sensor validation.
3. **Synthetic Training Data**: The ML model replicates physics calculations rather than learning from real-world rollover events. While the underlying physics are well-established, the model has not been validated against actual rollover incidents.
4. **Network Dependency**: The OSMnx road geometry lookup requires internet connectivity. Route caching mitigates this for frequently traveled routes.
5. **IR Sensor Accuracy**: Single-point IR beam counting may produce errors in dense boarding scenarios with simultaneous passenger movements.

### C. Future Work

Future research directions include: (a) validation with vehicle-mounted accelerometers to compare predicted versus actual lateral acceleration, (b) integration of suspension dynamics into the physics model, (c) route caching for offline OSMnx operation, (d) crowd-sourced road geometry correction, and (e) fleet-wide deployment trials across multiple SLTB routes.

## VII. CONCLUSION

This paper presented an integrated IoT and AI-driven system for real-time bus safety monitoring, addressing the critical gap in overcrowding management, footboard detection, and rollover risk prediction for Sri Lanka's public transport sector. The physics-based Digital Twin approach, using established NHTSA SSF methodology and Newtonian dynamics, provides a scientifically grounded foundation for rollover prediction without requiring dangerous real-world training data. The Multi-Output Random Forest ML model achieves near-perfect replication of the physics calculations with a 600× speedup, enabling real-time deployment on resource-constrained IoT systems. The novel distance-decay smoothing function enables predictive warnings 10–20 m before dangerous curves, providing drivers with actionable advance alerts. At under $100 per bus with retrofit-friendly hardware, the system is scalable for fleet-wide deployment in developing countries. This work contributes to reducing the human and economic costs of bus accidents in Sri Lanka and provides a replicable framework for intelligent transport safety systems in similar contexts globally.

## ACKNOWLEDGMENT

The author thanks the Department of Computer Science at SLIIT for research guidance and support.

## REFERENCES

[1] "23 dead in Gerandi Ella bus tragedy," *Daily Mirror Sri Lanka*, May 2025.

[2] Sri Lanka Police, "Road accident statistics 2024," *Traffic Division Annual Report*, 2024.

[3] Ministry of Transport, "AI-powered driver monitoring for public buses," *Government Gazette*, Sri Lanka, 2025.

[4] World Bank, "The high toll of traffic injuries: Unacceptable and preventable," *Transport Global Practice*, 2022.

[5] A. Nuzzolo, U. Crisalli, and A. Comi, "A system of models for real-time transit forecast using AVL/APC data," in *Real-Time Transit Operations*, Springer, 2023, pp. 102–131.

[6] R. Sathya and M. Abraham, "Comparison of supervised and unsupervised learning algorithms for passenger counting," *Int. J. Innovative Technology and Creative Engineering*, vol. 13, no. 2, pp. 45–52, 2024.

[7] P. Chen, H. Liu, and Y. Qi, "Automated passenger counting with deep learning on low-resolution infrared images," *IEEE Trans. Intell. Transp. Syst.*, vol. 21, no. 10, pp. 4456–4467, 2020.

[8] M. Mehmood, A. Ahmad, and Q. Asghar, "Transportation in developing countries: Challenges and opportunities," *J. Advanced Transportation*, vol. 2022, pp. 1–15, 2022.

[9] R. Krishnan and V. Sivakumar, "IoT-based smart transportation: A systematic review," *IEEE Internet of Things J.*, vol. 8, no. 6, pp. 4259–4276, 2021.

[10] S. Djahel, R. Doolan, G. Muntean, and J. Murphy, "A communications-oriented perspective on traffic management systems for smart cities," *IEEE Commun. Surveys Tuts.*, vol. 17, no. 1, pp. 125–151, 2015.

[11] R. Kumar, S. Patel, and V. Sharma, "Footboard detection system using ultrasonic sensors and Arduino," *Int. J. Engineering Research & Technology*, vol. 8, no. 6, pp. 1052–1057, 2019.

[12] S. Priya, K. Deepa, and R. Anitha, "Footboard detection with IR sensors and speed control mechanism," *Int. J. Creative Research Thoughts*, vol. 10, no. 3, pp. 234–241, 2022.

[13] M. Arun and P. Velmurugan, "Multi-sensor footboard detection with GSM-based alert transmission," *J. Emerging Technologies and Innovative Research*, vol. 10, no. 8, pp. 89–96, 2023.

[14] NHTSA, "Consumer information; new car assessment program; rollover resistance," *Federal Register*, vol. 66, no. 9, pp. 3388–3437, 2001.

[15] T. D. Gillespie, *Fundamentals of Vehicle Dynamics*. Warrendale, PA: SAE International, 1992.

[16] R. Rajamani, *Vehicle Dynamics and Control*, 2nd ed. New York, NY: Springer, 2012.

[17] G. E. Karniadakis, I. G. Kevrekidis, L. Lu, P. Perdikaris, S. Wang, and L. Yang, "Physics-informed machine learning," *Nature Reviews Physics*, vol. 3, no. 6, pp. 422–440, 2021.

[18] Ashok Leyland, "Viking BS-IV technical specifications," *Product Catalogue*, 2023.

[19] World Health Organization, "Mean body mass index trends, South-East Asia Region," *Global Health Observatory Data*, 2019.

[20] P. De Leva, "Adjustments to Zatsiorsky-Seluyanov's segment inertia parameters," *J. Biomechanics*, vol. 29, no. 9, pp. 1223–1230, 1996.

[21] AASHTO, *A Policy on Geometric Design of Highways and Streets*, 7th ed. Washington, DC: American Association of State Highway and Transportation Officials, 2018.

[22] M. Green, "How long does it take to stop? Methodological analysis of driver perception-brake times," *Transportation Human Factors*, vol. 2, no. 3, pp. 195–216, 2000.

[23] G. Boeing, "OSMnx: New methods for acquiring, constructing, analyzing, and visualizing complex street networks," *Computers, Environment and Urban Systems*, vol. 65, pp. 126–139, 2017.

[24] D. Shepard, "A two-dimensional interpolation function for irregularly-spaced data," in *Proc. 23rd ACM National Conference*, 1968, pp. 517–524.

[25] L. Breiman, "Random forests," *Machine Learning*, vol. 45, no. 1, pp. 5–32, 2001.

[26] F. Pedregosa *et al.*, "Scikit-learn: Machine learning in Python," *J. Machine Learning Research*, vol. 12, pp. 2825–2830, 2011.
