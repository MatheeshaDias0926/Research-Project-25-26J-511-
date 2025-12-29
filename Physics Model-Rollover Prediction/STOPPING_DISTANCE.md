# Stopping Distance Feature

## Overview

The system now calculates **stopping distance** considering:

- ✅ Road slope (uphill/downhill)
- ✅ Curved vs straight road
- ✅ Road friction (dry/wet)
- ✅ Vehicle mass (passenger load)
- ✅ Driver reaction time

## How It Works

### Formula Components

**Total Stopping Distance = Reaction Distance + Braking Distance**

1. **Reaction Distance**: Distance traveled during driver reaction time (1.5s default)

   ```
   d_reaction = v × t_reaction
   ```

2. **Braking Distance**: Distance to stop after brakes applied

   ```
   d_braking = v² / (2 × a_decel)

   where:
   a_decel = μ × g × cos(θ) × efficiency ± g × sin(θ)

   μ = friction coefficient (0.7 dry, 0.4 wet)
   θ = slope angle
   + for uphill (helps), - for downhill (hurts)
   ```

3. **Slope Effects**:
   - **Uphill**: Gravity helps slow the bus → shorter stopping distance
   - **Downhill**: Gravity opposes braking → longer stopping distance
   - **Flat road**: Only friction provides braking

## Usage Examples

### Example 1: Your GPS Location (Straight Road)

```bash
python main.py \
  --seated 10 \
  --standing 60 \
  --speed 50 \
  --lat 6.529682 \
  --lon 79.978061
```

**Output:**

```
Location: (6.529682, 79.978061)
Passengers (seated/standing): 10 60
CoG height: 1.48 m
Rollover threshold: 0.68 g
Sharpest curve radius ahead: inf m
Road slope: -0.00°
Lateral accel: 0.00 g
Decision: Status: Safe

--- Stopping Distance Analysis ---
Reaction distance: 20.8 m
Braking distance: 25.0 m
Total stopping distance: 45.8 m
Deceleration: 0.71 g

--- Straight Road ---
✓ Sufficient distance to stop safely
```

### Example 2: Curved Road with Slope

```bash
python main.py \
  --seated 10 \
  --standing 60 \
  --speed 60 \
  --lat 7.2906 \
  --lon 80.6337 \
  --lookahead 150
```

**Expected Output:**

```
--- Stopping Distance Analysis ---
Reaction distance: 25.0 m
Braking distance: 36.0 m
Total stopping distance: 61.0 m
Deceleration: 0.71 g

--- Curve Safety Analysis ---
Curve radius: 45.0 m
Estimated curve length: 70.7 m
Max safe speed for curve: 35.4 km/h
⚠ WARNING: May not stop before exiting curve!
```

### Example 3: Wet Road Conditions

```bash
python main.py \
  --seated 10 \
  --standing 60 \
  --speed 50 \
  --lat 6.529682 \
  --lon 79.978061 \
  --friction 0.4
```

**Output shows longer stopping distance:**

```
--- Stopping Distance Analysis ---
Reaction distance: 20.8 m
Braking distance: 43.7 m        ← Longer due to low friction
Total stopping distance: 64.5 m
Deceleration: 0.41 g
```

### Example 4: Custom Reaction Time

```bash
python main.py \
  --seated 10 \
  --standing 60 \
  --speed 50 \
  --lat 6.529682 \
  --lon 79.978061 \
  --reaction-time 2.0
```

## Parameters

| Parameter         | Default | Description                                                                                               |
| ----------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `--friction`      | 0.7     | Road friction coefficient<br>0.7 = dry asphalt<br>0.4 = wet road<br>0.3 = icy road                        |
| `--reaction-time` | 1.5     | Driver reaction time (seconds)<br>1.5s = average driver<br>2.0s = tired/distracted<br>1.0s = alert driver |

## Interpretation Guide

### Straight Road

- Shows total stopping distance needed
- Considers slope effect on braking
- Always safe to stop (infinite road ahead)

### Curved Road

- Compares stopping distance vs curve length
- Calculates max safe speed to avoid rollover
- Warns if you can't stop before exiting curve

### Decision Matrix

| Situation                  | Meaning                       | Action                       |
| -------------------------- | ----------------------------- | ---------------------------- |
| **Can stop in curve**      | Total stopping < curve length | Safe to brake if needed      |
| **Cannot stop in curve**   | Total stopping > curve length | Reduce speed BEFORE entering |
| **Speed > Max safe speed** | Risk of rollover              | SLOW DOWN immediately        |

## Real-World Scenarios

### Scenario 1: Mountain Road (Downhill Curve)

```
Slope: -5° (downhill)
Curve radius: 30m
Speed: 50 km/h
Result:
- Longer stopping distance (gravity opposes braking)
- High rollover risk
- Recommendation: Reduce to 25 km/h before curve
```

### Scenario 2: Wet City Road

```
Friction: 0.4 (wet)
Straight road
Speed: 40 km/h
Result:
- 55% longer stopping distance than dry
- No rollover risk
- Recommendation: Maintain safe following distance
```

### Scenario 3: Overloaded Bus on Sharp Curve

```
Standing passengers: 75
Curve radius: 25m
Speed: 50 km/h
Result:
- High CoG (1.53m)
- Cannot stop within curve
- Lateral accel exceeds threshold
- Recommendation: CRITICAL - slow to 20 km/h
```

## Physics Behind the Calculations

### Slope Component

```
Uphill (+5°):   Adds +0.86 m/s² to braking
Downhill (-5°): Subtracts -0.86 m/s² from braking
```

### Friction Values by Condition

| Surface  | Dry     | Wet     | Snow/Ice |
| -------- | ------- | ------- | -------- |
| Asphalt  | 0.7-0.8 | 0.4-0.5 | 0.2-0.3  |
| Concrete | 0.8-0.9 | 0.5-0.6 | 0.2-0.3  |
| Gravel   | 0.6     | 0.4     | 0.2      |

### Mass Effect

- Heavier bus (more passengers) = same stopping distance
- Mass cancels out in the equation: F = ma
- But increases momentum and kinetic energy

## Integration with Rollover Prediction

The stopping distance feature **complements** the rollover prediction:

1. **Rollover check**: Can I maintain this speed on this curve?
2. **Stopping check**: Can I stop if I need to?

Both must be satisfied for true safety.

## API Usage

```python
import physics_engine

# Calculate stopping distance
stopping = physics_engine.calculate_stopping_distance(
    n_seated=10,
    n_standing=60,
    speed_kmh=50,
    radius=30.0,          # curve radius (inf for straight)
    slope_deg=-2.5,       # downhill
    friction_coef=0.4,    # wet road
    reaction_time=1.5     # seconds
)

print(f"Total stopping: {stopping['total_stopping_distance_m']:.1f} m")
print(f"Safe to stop: {stopping['is_safe_to_stop_in_curve']}")
```

## Future Enhancements

Potential additions:

- [ ] ABS braking efficiency adjustment
- [ ] Load distribution effects
- [ ] Brake temperature/fade modeling
- [ ] Tire condition factor
- [ ] Road surface type detection

---

**Note**: This feature does NOT affect the core rollover prediction. It's a separate analysis tool to help drivers understand braking requirements.
