# Quick Reference Card — Bus Rollover Prediction System

## Key Equations

| Equation            | Formula                                                                              | Units |
| ------------------- | ------------------------------------------------------------------------------------ | ----- |
| **Total Mass**      | $M = m_{bus} + (N_{seated} + N_{standing}) \times 65$                                | kg    |
| **CoG Height**      | $h = \frac{m_{bus} \cdot 1.2 + M_{seat} \cdot 1.4 + M_{stand} \cdot 2.2}{M_{total}}$ | m     |
| **SSF (Threshold)** | $SSF = \frac{T}{2 \cdot h_{CoG}} = \frac{2.0}{2 \cdot h}$                            | g     |
| **Lateral Accel**   | $a_{lat} = \frac{v^2}{r \cdot g}$ where $v$ in m/s, $r$ in m                         | g     |
| **Circumradius**    | $R = \frac{a \cdot b \cdot c}{4 \cdot \sqrt{s(s-a)(s-b)(s-c)}}$                      | m     |

## Default Constants (Ashok Leyland Viking)

| Parameter      | Value     |
| -------------- | --------- |
| Bus Mass       | 10,000 kg |
| Passenger Mass | 65 kg     |
| Track Width    | 2.0 m     |
| Empty CoG      | 1.2 m     |
| Seated CoG     | 1.4 m     |
| Standing CoG   | 2.2 m     |

## Alert Thresholds

| Condition       | Trigger                        | Action           |
| --------------- | ------------------------------ | ---------------- |
| 🟢 **SAFE**     | $a_{lat} \leq 0.50 \times SSF$ | Normal operation |
| 🟡 **WARNING**  | $a_{lat} > 0.50 \times SSF$    | Reduce speed     |
| 🔴 **CRITICAL** | $a_{lat} > 0.70 \times SSF$    | SLOW DOWN NOW!   |

## Quick CLI Commands

```bash
# Demo
python main.py --demo

# Demo with real road data
python main.py --demo --use-osm

# Custom check (GPS triplet)
python main.py --standing 60 --speed 45 \
  --gps "6.9270,79.8610" "6.9268,79.8615" "6.9264,79.8618"

# Custom check (OSMnx lookahead)
python main.py --standing 60 --speed 45 \
  --use-osm --lat 7.2906 --lon 80.6337 --lookahead 150

# Standalone road analysis
python map_road_ahead.py --lat 7.2906 --lon 80.6337 --output road.json
```

## Sample Scenarios

| Scenario                | Standing | Speed | Radius | CoG   | SSF   | a_lat | Result       |
| ----------------------- | -------- | ----- | ------ | ----- | ----- | ----- | ------------ |
| Empty, gentle curve     | 0        | 40    | 100m   | 1.2m  | 0.83g | 0.13g | ✅ Safe      |
| Loaded, gentle curve    | 50       | 40    | 100m   | 1.5m  | 0.67g | 0.13g | ✅ Safe      |
| Overloaded, sharp curve | 75       | 50    | 30m    | 1.53m | 0.65g | 0.66g | 🔴 Critical  |
| Overloaded, very sharp  | 75       | 50    | 16m    | 1.53m | 0.65g | 1.21g | 🔴 ROLLOVER! |

## File Structure

```
Physics model/
├── main.py              # CLI entry point
├── physics_engine.py    # Mass, CoG, SSF calculations
├── road_reader.py       # Curvature (simple + OSMnx)
├── map_road_ahead.py    # Full OSMnx pipeline
├── requirements.txt     # Dependencies
├── docs/
│   ├── TECHNICAL_DOCUMENTATION.md
│   ├── DIAGRAMS.md
│   └── QUICK_REFERENCE.md
└── tests/
    └── test_physics.py
```

## Python API (One-liner)

```python
from physics_engine import check_safety_with_radius, BusConstants
result = check_safety_with_radius(0, 75, 50, 30, BusConstants())
print(result["decision"])  # "CRITICAL ALERT: SLOW DOWN!"
```

## Output Fields

| Field                  | Description                           |
| ---------------------- | ------------------------------------- |
| `total_mass_kg`        | Bus + passengers (kg)                 |
| `cog_height_m`         | Center of gravity height (m)          |
| `rollover_threshold_g` | SSF in g-force units                  |
| `radius_m`             | Curve radius (m)                      |
| `lateral_accel_g`      | Current lateral acceleration (g)      |
| `decision`             | "Safe" / "WARNING" / "CRITICAL ALERT" |

---

_Version 1.0 | December 2025_
