# Edge Agent Simulator

This directory contains a Python edge-device simulator used for development and testing.

Files
- `edge_agent.py` — main simulator. Captures webcam images, compares against `known_drivers/`, mocks fatigue/distraction, and posts results to the backend.
- `requirements.txt` — Python dependencies.

Quick start

1. Create a Python virtual environment and install dependencies (dlib may require system packages):

```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

2. Prepare a `known_drivers/` directory alongside `edge_agent.py` and add driver images named like `alice.jpg`.

3. Run the agent (example):

```bash
DEVICE_ID=mydevice DEVICE_SECRET=mysecret API_URL=http://localhost:4000/api INTERVAL_MIN=1 python edge_agent.py
```

Notes
- The script authenticates with the backend `POST /api/edge/auth` and then uses the returned device JWT for subsequent requests.
- If the backend is unreachable, the agent saves verification payloads and images to `outbox/` and retries each loop.
- For production on Raspberry Pi, `dlib` and `face_recognition` can be difficult to build. The agent includes a Haar-cascade OpenCV fallback so you can run with only `opencv-python` and `numpy`.

Secure image downloads & retry

- The agent now prefers a secure backend proxy for driver images (requests to `/api/edge/driver-image/:publicId`) when the backend provides a `public_id`. This keeps Cloudinary image access behind device authentication.
- Downloads use exponential backoff with jitter and multiple attempts before giving up; failures are logged and retried later.

Raspberry Pi notes

- If you want to use `face_recognition` (best accuracy), install system deps first (Debian example):

```bash
sudo apt update
sudo apt install -y build-essential cmake libopenblas-dev liblapack-dev libx11-dev libgtk-3-dev libboost-all-dev
sudo apt install -y libjpeg-dev libpng-dev python3-dev
python3 -m pip install --upgrade pip
python3 -m pip install dlib
python3 -m pip install face_recognition
```

- Alternatively, use the lightweight path:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install numpy opencv-python requests
```

- The fallback detector will use Haar cascades and template matching; it's faster but less accurate than `face_recognition`.

Performance tips

- On Pi, prefer lower-resolution captures (e.g., 320x240) to speed processing — change capture settings in the script if needed.
- Consider using a Coral or NPU to run ML models if you later add a neural detector.
