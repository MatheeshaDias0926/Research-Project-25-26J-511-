# Bus Rollover Prediction

## Overview

This project implements a physics-based safety system ("Digital Twin") for buses. It computes the bus's center of gravity (CoG) and the rollover threshold, analyzes the road curvature ahead using real map data (OSMnx), computes expected lateral acceleration for the current speed, and issues warnings if the bus is at risk of rollover.

### Two Operating Modes

1. **OSMnx Lookahead Mode (Default/Recommended)**: Uses a single GPS coordinate to fetch actual road geometry from OpenStreetMap and analyzes curves **ahead** on the road. This is more accurate and predictive.

2. **Legacy 3-Point GPS Mode**: Estimates curve radius from three consecutive GPS readings (where the vehicle has been). Useful for offline deployments without internet access.

## 📚 Documentation

| Document                                                   | Description                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md) | Complete theory, equations, architecture, and API reference |
| [System Diagrams](docs/DIAGRAMS.md)                        | Visual diagrams of data flow, physics, hardware wiring      |
| [Quick Reference](docs/QUICK_REFERENCE.md)                 | One-page cheat sheet with equations and commands            |
| [Stopping Distance Guide](STOPPING_DISTANCE.md)            | Braking distance calculation with slope and friction        |

## Features

- **`physics_engine.py`**: Mass, CoG, rollover threshold (SSF), safety check logic, and **stopping distance calculator** considering slope, friction, and road curvature.
- **`road_reader.py`**: Unified curvature interface supporting both OSMnx lookahead and legacy 3-point GPS calculation.
- **`map_road_ahead.py`**: Full OSMnx pipeline — builds driving graph, projects road ahead, computes curvature via 3-point circumcircle on sampled points, fetches elevation, and calculates slope.
- **`main.py`**: CLI with flexible input modes — single GPS coordinate (default) or 3-point GPS queue (legacy). Now includes automatic stopping distance analysis.
- **`tests/test_physics.py`**: pytest tests for physics calculations and edge cases.

## Installation

Create a Python 3.10+ virtualenv and install requirements:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Quick Demo

Run the bundled demo scenario (uses OSMnx lookahead by default):

```bash
python main.py --demo
```

### Legacy 3-point GPS Demo (without OSMnx)

```bash
python main.py --demo --no-osm
```

## Custom Input

### Single GPS coordinate mode (recommended - default)

Supply passenger counts, speed, and current location:

```bash
python main.py --seated 10 --standing 60 --speed 50 --lat 6.9271 --lon 79.8612 --lookahead 150
```

This fetches actual road geometry from OpenStreetMap and computes the sharpest curve within the next 150 m.

### Legacy 3-point GPS mode (for offline/lightweight deployments)

Supply passenger counts, speed, and three GPS points (lat,lon):

```bash
python main.py --seated 10 --standing 20 --speed 40 --gps "6.9270,79.8615" "6.9269,79.8619" "6.9266,79.8624"
```

Note: This mode estimates the curve radius from past positions (where you've been), not the road ahead.

## Standalone Road Reader CLI

You can also run `map_road_ahead.py` directly to inspect curvature and slope for any location:

```bash
python map_road_ahead.py --lat 6.9271 --lon 79.8612 --lookahead 120 --output road_data.json
```

## Notes for Deployment

- **Passenger Counting**: Camera-based passenger counting should feed `n_seated` / `n_standing` into the running script in real-time.
- **GPS Input**:
  - **Recommended**: Feed current GPS coordinates (lat, lon) for OSMnx lookahead mode.
  - **Alternative**: Maintain a queue of recent GPS positions and use the last 3 points for legacy mode (offline deployments).
- **Hardware Requirements**: For real-time deployment on Raspberry Pi/Jetson Nano, `osmnx` and `rasterio` require extra system libs—see installation notes below.
- **Network**: OSMnx mode requires internet connectivity to fetch map data. Consider caching frequently-traveled routes.

### Raspberry Pi / Jetson Nano Installation

```bash
# Install system deps for GDAL/rasterio (optional, needed for local DEM)
sudo apt-get update
sudo apt-get install libgdal-dev python3-dev

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install python packages
pip install -r requirements.txt
```

**Lightweight Mode**: If `osmnx` is too heavy for your hardware or you need offline operation, use the legacy 3-point GPS mode which only requires `numpy` + `geopy`:

```bash
pip install numpy geopy
```

## Project Structure

```
Physics model/
├── main.py                    # CLI entry point
├── physics_engine.py          # Mass, CoG, SSF, safety logic
├── road_reader.py             # Unified curvature interface
├── map_road_ahead.py          # Full OSMnx lookahead pipeline
├── requirements.txt           # Python dependencies
├── README.md                  # This file
├── docs/
│   ├── TECHNICAL_DOCUMENTATION.md   # Full theory & API docs
│   ├── DIAGRAMS.md                   # System diagrams
│   └── QUICK_REFERENCE.md            # Cheat sheet
├── tests/
│   └── test_physics.py        # Unit tests
└── examples/
    └── demo.py                # Demo utilities
```

## Future Enhancements

- **Passenger Detection**: Integrate live camera inference module (YOLO, TensorFlow, PyTorch) to automatically count seated/standing passengers.
- **Real-time Alerts**: Add MQTT or WebSocket interface to publish alerts to driver display or fleet management server.
- **Route Caching**: Cache OSM graphs for frequently traveled routes to reduce network calls and latency.
- **Predictive Warnings**: Use vehicle speed trends and upcoming curve severity to provide earlier warnings.
- **Historical Analysis**: Log trips and analyze rollover risk patterns for route optimization.

## References

- Menger curvature / circumcircle formulas (3-point curvature)
- Static Stability Factor (SSF) = TrackWidth / (2 × CoG height)
- NHTSA vehicle rollover resistance rating methodology
- Boeing, G. (2017). OSMnx: Python for Street Networks

## License

MIT License — See LICENSE file for details.

---

_Developed for Sri Lankan bus safety — December 2025_

//unsafe cordinate (udugama junction) - 6.208944, 80.335067
