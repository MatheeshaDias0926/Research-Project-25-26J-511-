# Bus Rollover Prediction

## Overview

This project implements a physics-based safety system ("Digital Twin") for buses. It computes the bus's center of gravity (CoG) and the rollover threshold, reads curvature from GPS points, computes expected lateral acceleration for the current speed, and issues warnings if the bus is at risk of rollover.

## 📚 Documentation

| Document                                                   | Description                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md) | Complete theory, equations, architecture, and API reference |
| [System Diagrams](docs/DIAGRAMS.md)                        | Visual diagrams of data flow, physics, hardware wiring      |
| [Quick Reference](docs/QUICK_REFERENCE.md)                 | One-page cheat sheet with equations and commands            |

## Features

- `physics_engine.py`: mass, CoG, rollover threshold, and safety check logic.
- `road_reader.py`: curvature radius calculation (3-point / circumcircle) using `geopy`, plus OSMnx-based lookahead.
- `map_road_ahead.py`: **full OSMnx pipeline** — builds a driving graph, samples the road ahead, computes curvature via 3-point circumcircle, fetches elevation, and computes slope.
- `main.py`: CLI to run a demo or supply live inputs (passenger counts, speed, GPS triplet or OSMnx lookahead).
- `tests/test_physics.py`: pytest tests for basic physics validations.

## Installation

Create a Python 3.10+ virtualenv and install requirements:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Quick Demo

Run the bundled demo scenario (reproduces the example in the spec):

```bash
python main.py --demo
```

### OSMnx-based Demo (real road geometry)

```bash
python main.py --demo --use-osm
```

## Custom Input

### Simple 3-point GPS mode

Supply passenger counts, speed, and three GPS points (lat,lon):

```bash
python main.py --seated 10 --standing 20 --speed 40 --gps "6.9270,79.8615" "6.9269,79.8619" "6.9266,79.8624"
```

### OSMnx lookahead mode (recommended for production)

```bash
python main.py --seated 10 --standing 60 --speed 50 --use-osm --lat 6.9271 --lon 79.8612 --lookahead 150
```

This fetches actual road geometry from OpenStreetMap and computes the sharpest curve within the next 150 m.

## Standalone Road Reader CLI

You can also run `map_road_ahead.py` directly to inspect curvature and slope for any location:

```bash
python map_road_ahead.py --lat 6.9271 --lon 79.8612 --lookahead 120 --output road_data.json
```

## Notes for Deployment

- Camera-based passenger counting should feed `n_seated` / `n_standing` into the running script.
- GPS receiver should supply recent points; keep a queue of last N locations and pass the last three to the physics check, **or** use OSMnx mode with live lat/lon.
- For real-time deployment on Raspberry Pi/Jetson Nano, `osmnx` and `rasterio` require extra system libs—see notes below.

### Raspberry Pi / Jetson Nano notes

```bash
# Install system deps for GDAL/rasterio (optional, needed for local DEM)
sudo apt-get install libgdal-dev

# Install python packages
pip install -r requirements.txt
```

If `osmnx` is too heavy, the simple 3-point GPS mode in `road_reader.py` works standalone with only `numpy` + `geopy`.

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

## Next Steps / Ideas

- Integrate a live camera inference module (TensorFlow/PyTorch) to supply passenger counts.
- Add MQTT interface to publish alerts to driver display or fleet server.
- Optionally cache OSM graphs for frequently traveled routes to reduce network calls.

## References

- Menger curvature / circumcircle formulas (3-point curvature)
- Static Stability Factor (SSF) = TrackWidth / (2 × CoG height)
- NHTSA vehicle rollover resistance rating methodology
- Boeing, G. (2017). OSMnx: Python for Street Networks

## License

MIT License — See LICENSE file for details.

---

_Developed for Sri Lankan bus safety — December 2025_
