# System Flow Diagrams

## 1. High-Level Data Flow

```
                                    BUS ROLLOVER PREDICTION SYSTEM
    ┌──────────────────────────────────────────────────────────────────────────────────────┐
    │                                                                                      │
    │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                             │
    │   │   INPUTS    │    │  PROCESSING │    │   OUTPUTS   │                             │
    │   └─────────────┘    └─────────────┘    └─────────────┘                             │
    │                                                                                      │
    │   ┌───────────┐      ┌─────────────────────────────────┐      ┌───────────────┐     │
    │   │ Passengers│─────►│                                 │─────►│ Terminal      │     │
    │   │ (Camera)  │      │      PHYSICS ENGINE             │      │ Display       │     │
    │   └───────────┘      │                                 │      └───────────────┘     │
    │                      │  ┌─────────────────────────┐    │                            │
    │   ┌───────────┐      │  │ Mass = Bus + Passengers │    │      ┌───────────────┐     │
    │   │   Speed   │─────►│  │                         │    │─────►│ Audio Alert   │     │
    │   │ (OBD/GPS) │      │  │ CoG = Weighted Average  │    │      │ (Buzzer)      │     │
    │   └───────────┘      │  │                         │    │      └───────────────┘     │
    │                      │  │ SSF = T / (2 × CoG)     │    │                            │
    │   ┌───────────┐      │  │                         │    │      ┌───────────────┐     │
    │   │   GPS     │─────►│  │ a_lat = v² / r          │    │─────►│ Visual Alert  │     │
    │   │ Location  │      │  │                         │    │      │ (LED/LCD)     │     │
    │   └───────────┘      │  │ Decision Logic          │    │      └───────────────┘     │
    │                      │  └─────────────────────────┘    │                            │
    │                      │                                 │      ┌───────────────┐     │
    │                      │      ROAD READER                │─────►│ Fleet Server  │     │
    │                      │  ┌─────────────────────────┐    │      │ (MQTT)        │     │
    │                      │  │ 3-Point GPS Curvature   │    │      └───────────────┘     │
    │                      │  │        OR               │    │                            │
    │                      │  │ OSMnx Lookahead         │    │                            │
    │                      │  └─────────────────────────┘    │                            │
    │                      └─────────────────────────────────┘                            │
    │                                                                                      │
    └──────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Physics Calculation Flow

```
    INPUT                          CALCULATION                         OUTPUT
    ─────                          ───────────                         ──────

    N_seated ─────┐
                  │
    N_standing ───┼───► Total Mass ═══════════════════════════════►  total_mass_kg
                  │         │
    m_bus ────────┘         │
                            │
    h_empty ──────┐         │
                  │         ▼
    h_seat ───────┼───► CoG Height ═══════════════════════════════►  cog_height_m
                  │         │
    h_stand ──────┘         │
                            │
    Track Width ────────────┼───► SSF (Rollover Threshold) ═══════►  rollover_threshold_g
                            │         │
                            │         │
    Speed (km/h) ───────────┼─────────┼───► Lateral Acceleration ══►  lateral_accel_g
                            │         │              │
    Curve Radius ───────────┘         │              │
                                      │              │
                                      ▼              ▼
                                  ┌───────────────────────┐
                                  │   COMPARISON          │
                                  │                       │
                                  │  a_lat > 0.7 × SSF?  │───► CRITICAL ALERT
                                  │         │             │
                                  │         NO            │
                                  │         ▼             │
                                  │  a_lat > 0.5 × SSF?  │───► WARNING
                                  │         │             │
                                  │         NO            │
                                  │         ▼             │
                                  │       SAFE            │───► Status: Safe
                                  └───────────────────────┘
```

## 3. Road Reader Pipeline (OSMnx Mode)

```
    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                         OSMnx LOOKAHEAD PIPELINE                                │
    └─────────────────────────────────────────────────────────────────────────────────┘

    STEP 1                    STEP 2                    STEP 3
    ──────                    ──────                    ──────

    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
    │ GPS Input   │          │ Build Graph │          │ Find Nearest│
    │ (lat, lon)  │─────────►│ from OSM    │─────────►│ Road Edge   │
    │             │          │ (500m radius)│          │             │
    └─────────────┘          └─────────────┘          └─────────────┘
                                                              │
                                                              ▼
    STEP 6                    STEP 5                    STEP 4
    ──────                    ──────                    ──────

    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
    │ Sample      │◄─────────│ Project to  │◄─────────│ Slice       │
    │ Points      │          │ UTM (meters)│          │ Lookahead   │
    │ (every 2m)  │          │             │          │ Geometry    │
    └─────────────┘          └─────────────┘          └─────────────┘
          │
          ▼
    STEP 7                    STEP 8                    STEP 9
    ──────                    ──────                    ──────

    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
    │ Compute     │─────────►│ Smooth with │─────────►│ Find Min    │
    │ 3-Point     │          │ Savitzky-   │          │ (Sharpest)  │
    │ Radii       │          │ Golay       │          │ Radius      │
    └─────────────┘          └─────────────┘          └─────────────┘
          │                                                   │
          │                                                   │
          ▼                                                   ▼
    ┌─────────────┐                                    ┌─────────────┐
    │ Query       │                                    │ OUTPUT:     │
    │ Elevation   │───────────────────────────────────►│ radius,     │
    │ API         │                                    │ slope,      │
    └─────────────┘                                    │ elevations  │
                                                       └─────────────┘
```

## 4. Rollover Physics Diagram (Side View)

```
                            STABLE vs ROLLOVER CONDITION

    ════════════════════════════════════════════════════════════════════════════

                    STABLE                              UNSTABLE (ROLLOVER)

                      Bus                                    Bus
                   ┌───────┐                              ┌───────┐
                   │       │                              │       │╲
                   │   ●   │ ◄── CoG                      │   ●   │ ╲ ◄── CoG shifted
                   │       │                              │       │  ╲    outward
                   │       │                              │       │   ╲
                   └───┬───┘                              └───┬───┘    ╲
                   ────┴────                              ────┴────     ╲
                  ◯       ◯                              ◯       ◯      ╲
                  ▲       ▲                              ▲               ╲
                  │       │                              │                ▼
              Weight distributed                    All weight on        Tipping
              on both wheels                        outer wheel          point

    ────────────────────────────────────────────────────────────────────────────

                        FORCES ON A CURVE (Rear View)

                           Centrifugal Force
                               ─────────►
                          ┌───────────────┐
                          │               │
                          │       ●───────┼──► F_lateral = m × v²/r
                          │      CoG      │
                          │               │
                          └───────────────┘
                               │     │
                          ─────┴─────┴─────
                         ◯               ◯
                         ▲               ▲
                         │               │
                    R_inner         R_outer

                    As lateral force increases, R_inner decreases
                    Rollover occurs when R_inner = 0

    ════════════════════════════════════════════════════════════════════════════
```

## 5. Center of Gravity Shift with Passengers

```
                    CENTER OF GRAVITY vs PASSENGER LOAD

    ┌────────────────────────────────────────────────────────────────────────┐
    │                                                                        │
    │  Height                                                                │
    │  (m)                                                                   │
    │                                                                        │
    │  2.2 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ Standing passenger CoG        │
    │       │                                                                │
    │  2.0 ─┤                                    ╱                           │
    │       │                                  ╱                             │
    │  1.8 ─┤                               ╱          DANGER ZONE           │
    │       │                             ╱            (SSF < 0.56)          │
    │  1.6 ─┤                          ╱                                     │
    │       │                        ╱                                       │
    │  1.4 ─┤─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╱─ ─ ─ ─ ─ Seated passenger CoG           │
    │       │                  ╱                                             │
    │  1.2 ─┼────────────────●                    Empty bus CoG              │
    │       │                                                                │
    │  1.0 ─┤                                                                │
    │       │                                                                │
    │       └────────┬────────┬────────┬────────┬────────┬────────►          │
    │                0       20       40       60       80      100          │
    │                        Standing Passengers                             │
    │                                                                        │
    │  Note: More standing passengers → Higher CoG → Lower stability         │
    │                                                                        │
    └────────────────────────────────────────────────────────────────────────┘
```

## 6. Speed vs Curve Radius Safety Chart

```
                    SAFE OPERATING ENVELOPE

    ┌────────────────────────────────────────────────────────────────────────┐
    │                                                                        │
    │  Speed                                                                 │
    │  (km/h)                                                                │
    │                                                                        │
    │   80 ─┤                                                                │
    │       │                    ████████████████████                        │
    │   70 ─┤                 ███                    ███                     │
    │       │               ██   DANGER ZONE          ██                    │
    │   60 ─┤             ██     (ROLLOVER RISK)        ██                  │
    │       │            █                                █                  │
    │   50 ─┤          █─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ █                  │
    │       │         █         WARNING ZONE             █                  │
    │   40 ─┤        █   (Reduce Speed Recommended)       █                 │
    │       │       █                                      █                │
    │   30 ─┤      █ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ █                │
    │       │     █            SAFE ZONE                   █               │
    │   20 ─┤    █         (Normal Operation)               █              │
    │       │   █                                            █             │
    │   10 ─┤  █                                              █            │
    │       │ █                                                █           │
    │    0 ─┼─────────┬─────────┬─────────┬─────────┬─────────►           │
    │              20        40        60        80       100              │
    │                       Curve Radius (m)                               │
    │                                                                        │
    │  ████ = CRITICAL (a_lat > 0.7 × SSF)                                  │
    │  ─ ─ = WARNING  (a_lat > 0.5 × SSF)                                   │
    │       = SAFE    (a_lat ≤ 0.5 × SSF)                                   │
    │                                                                        │
    │  Note: Chart assumes 75 standing passengers (SSF ≈ 0.65g)             │
    │                                                                        │
    └────────────────────────────────────────────────────────────────────────┘
```

## 7. Hardware Connection Diagram

```
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                       HARDWARE WIRING DIAGRAM                           │
    └─────────────────────────────────────────────────────────────────────────┘


                    ┌─────────────────────────────────┐
                    │        RASPBERRY PI 4           │
                    │                                 │
                    │  GPIO  USB  UART  I2C  HDMI    │
                    └──┬─────┬────┬─────┬────┬───────┘
                       │     │    │     │    │
           ┌───────────┘     │    │     │    └──────────────┐
           │                 │    │     │                   │
           ▼                 ▼    ▼     ▼                   ▼
    ┌─────────────┐   ┌─────────┐ │  ┌────────┐     ┌─────────────┐
    │   BUZZER    │   │  USB    │ │  │  I2C   │     │   HDMI      │
    │   (Alert)   │   │ CAMERA  │ │  │ LCD    │     │  MONITOR    │
    │             │   │         │ │  │ DISPLAY│     │  (Optional) │
    │  GPIO 18 ◄──┤   │ For     │ │  │        │     │             │
    │             │   │ Passenger│ │  │ SDA◄───┤     │  For debug  │
    └─────────────┘   │ Counting│ │  │ SCL◄───┤     │  /dashboard │
                      └─────────┘ │  └────────┘     └─────────────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │  GPS MODULE │
                           │   NEO-6M    │
                           │             │
                           │  TX ────────┼───► UART RX (GPIO 15)
                           │  RX ◄───────┼──── UART TX (GPIO 14)
                           │  VCC ───────┼───► 3.3V
                           │  GND ───────┼───► GND
                           └─────────────┘


    ┌─────────────────────────────────────────────────────────────────────────┐
    │  POWER SUPPLY                                                           │
    │                                                                         │
    │    12V Bus Battery ───► DC-DC Converter ───► 5V 3A ───► Raspberry Pi   │
    │                              │                                          │
    │                              └───────────► 3.3V ───► GPS Module         │
    └─────────────────────────────────────────────────────────────────────────┘
```

## 8. Software State Machine

```
                    ┌─────────────────────────────────────────┐
                    │          SYSTEM STATE MACHINE           │
                    └─────────────────────────────────────────┘


                              ┌─────────────┐
                              │   STARTUP   │
                              │             │
                              │ Initialize  │
                              │ GPS, Camera │
                              └──────┬──────┘
                                     │
                                     ▼
                              ┌─────────────┐
                       ┌─────►│    IDLE     │◄─────┐
                       │      │             │      │
                       │      │ Waiting for │      │
                       │      │ GPS fix     │      │
                       │      └──────┬──────┘      │
                       │             │             │
                       │        GPS fix           │
                       │        acquired          │
                       │             │             │
                       │             ▼             │
                       │      ┌─────────────┐      │
                       │      │  MONITORING │      │
                       │      │             │      │
                       │      │ Reading:    │      │
                       │      │ - Passengers│      │
                       │      │ - Speed     │      │
    GPS lost ──────────┤      │ - Location  │      ├────── System error
                       │      └──────┬──────┘      │
                       │             │             │
                       │      Calculate safety     │
                       │             │             │
                       │             ▼             │
                       │      ┌─────────────┐      │
                       │      │  EVALUATE   │      │
                       │      │             │      │
                       │      │ Compare     │      │
                       │      │ a_lat vs SSF│      │
                       │      └──────┬──────┘      │
                       │             │             │
                       │    ┌────────┼────────┐    │
                       │    │        │        │    │
                       │    ▼        ▼        ▼    │
                       │ ┌─────┐ ┌───────┐ ┌──────┐│
                       │ │SAFE │ │WARNING│ │CRIT- ││
                       │ │     │ │       │ │ICAL  ││
                       │ │Green│ │Yellow │ │Red   ││
                       │ │LED  │ │LED +  │ │LED + ││
                       │ │     │ │Beep   │ │Alarm ││
                       │ └──┬──┘ └───┬───┘ └──┬───┘│
                       │    │        │        │    │
                       │    └────────┴────────┘    │
                       │             │             │
                       │             ▼             │
                       │      ┌─────────────┐      │
                       │      │    LOG      │      │
                       │      │             │      │
                       │      │ Store event │      │
                       │      │ to file/DB  │      │
                       │      └──────┬──────┘      │
                       │             │             │
                       └─────────────┴─────────────┘
                              (Loop every 100ms)
```
