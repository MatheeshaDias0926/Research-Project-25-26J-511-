#!/usr/bin/env python3
"""
Edge device simulator for development and testing.

Features:
- Authenticate device with backend (/api/edge/auth) using `deviceId` + `secret`.
- Capture webcam image, compare faces against local `known_drivers` images using `face_recognition`.
- Mock fatigue/distraction detection.
- Send verification results and image to backend (/api/edge/verification) with device token.
- Send periodic status updates to (/api/edge/status).
- Offline-safe: when network fails, store JSON + image in `outbox/` and retry.

Usage:
  - Create a folder `known_drivers/` next to this script and place JPEG/PNG images named like
    `drivername.jpg` (one image per driver is enough for testing).
  - Install dependencies: `pip install -r requirements.txt` (face_recognition requires dlib).
  - Run: `DEVICE_ID=mydevice DEVICE_SECRET=secret API_URL=http://localhost:4000 python edge_agent.py`
"""

import os
import sys
import time
import json
import uuid
import logging
import random
import shutil
from datetime import datetime

import requests
import cv2
import numpy as np
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except Exception:
    FACE_RECOGNITION_AVAILABLE = False
    logging.warning('face_recognition not available; falling back to Haar-cascade methods')

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')

# Configuration from env
API_URL = os.environ.get('API_URL', 'http://localhost:4000/api')
DEVICE_ID = os.environ.get('DEVICE_ID', 'test-device-001')
DEVICE_SECRET = os.environ.get('DEVICE_SECRET', 'password')
KNOWN_DIR = os.environ.get('KNOWN_DIR', os.path.join(os.path.dirname(__file__), 'known_drivers'))
INTERVAL_MIN = int(os.environ.get('INTERVAL_MIN', '1'))  # default 1 minute for quicker testing
OUTBOX_DIR = os.environ.get('OUTBOX_DIR', os.path.join(os.path.dirname(__file__), 'outbox'))

if not os.path.exists(OUTBOX_DIR):
    os.makedirs(OUTBOX_DIR, exist_ok=True)


def authenticate(device_id: str, secret: str):
    url = f"{API_URL}/edge/auth"
    logging.info('Authenticating device %s', device_id)
    r = requests.post(url, json={'deviceId': device_id, 'secret': secret}, timeout=10)
    r.raise_for_status()
    return r.json().get('token')


def load_known_encodings(known_dir: str):
    encodings = []
    names = []
    if not os.path.exists(known_dir):
        logging.warning('Known drivers directory does not exist: %s', known_dir)
        return encodings, names

    for fn in os.listdir(known_dir):
        path = os.path.join(known_dir, fn)
        if not os.path.isfile(path):
            continue
        lower = fn.lower()
        if not (lower.endswith('.jpg') or lower.endswith('.jpeg') or lower.endswith('.png')):
            continue
        try:
            if FACE_RECOGNITION_AVAILABLE:
                img = face_recognition.load_image_file(path)
                faces = face_recognition.face_encodings(img)
                if len(faces) == 0:
                    logging.warning('No face found in %s; skipping', path)
                    continue
                encodings.append(faces[0])
                names.append(os.path.splitext(fn)[0])
                logging.info('Loaded encoding for %s', fn)
            else:
                # Fallback: store file paths and names; matching will use template matching / simple methods
                encodings.append(path)
                names.append(os.path.splitext(fn)[0])
                logging.info('Registered fallback driver image %s', fn)
        except Exception as e:
            logging.exception('Failed loading %s: %s', path, e)

    return encodings, names


def fetch_drivers_from_backend(token: str, known_dir: str):
    """Fetch drivers via device endpoint and save their images into known_dir."""
    if not token:
        logging.info('No device token, skipping remote driver fetch')
        return [], []
    url = f"{API_URL}/edge/drivers"
    headers = {'Authorization': f'Bearer {token}'}
    max_attempts = 5
    backoff_base = 1.0
    for attempt in range(1, max_attempts + 1):
        try:
            r = requests.get(url, headers=headers, timeout=15)
            r.raise_for_status()
            data = r.json()
            drivers = data.get('drivers', [])
            break
        except Exception as e:
            wait = backoff_base * (2 ** (attempt - 1))
            wait = wait + random.uniform(0, 0.5 * wait)
            logging.info('Fetch drivers attempt %d failed: %s. Retrying in %.1f sec', attempt, e, wait)
            time.sleep(wait)
    else:
        logging.info('Failed to fetch drivers after %d attempts', max_attempts)
        return [], []
        # Prepare directory
        if not os.path.exists(known_dir):
            os.makedirs(known_dir, exist_ok=True)
        # Clean existing files to avoid stale encodings
        for fn in os.listdir(known_dir):
            path = os.path.join(known_dir, fn)
            try:
                if os.path.isfile(path):
                    os.remove(path)
            except Exception:
                pass

        for d in drivers:
            name = d.get('name') or str(d.get('id'))
            images = d.get('images') or []
                for idx, img in enumerate(images):
                    # Prefer backend proxy via public_id if available (secure channel)
                    url_img = None
                    public_id = None
                    if isinstance(img, dict):
                        public_id = img.get('public_id')
                        url_img = img.get('url')
                    else:
                        url_img = img
                        public_id = None
                    if public_id and token:
                        # use backend proxy endpoint
                        url_img = f"{API_URL}/edge/driver-image/{public_id}"
                if not url_img:
                    continue
                # Download with retry/backoff
                for attempt in range(1, max_attempts + 1):
                    try:
                        headers_dl = {}
                        if url_img.startswith(API_URL):
                            headers_dl['Authorization'] = f'Bearer {token}'
                        resp = requests.get(url_img, stream=True, timeout=15, headers=headers_dl)
                        resp.raise_for_status()
                        ext = '.jpg'
                        fname = f"{name.replace(' ', '_')}_{idx}{ext}"
                        dest = os.path.join(known_dir, fname)
                        with open(dest, 'wb') as f:
                            for chunk in resp.iter_content(1024):
                                f.write(chunk)
                        logging.info('Downloaded driver image %s', dest)
                        break
                    except Exception as e:
                        wait = backoff_base * (2 ** (attempt - 1))
                        wait = wait + random.uniform(0, 0.5 * wait)
                        logging.info('Download attempt %d failed for %s: %s. Retrying in %.1f sec', attempt, url_img, e, wait)
                        time.sleep(wait)
                else:
                    logging.info('Failed to download %s after %d attempts', url_img, max_attempts)

        return load_known_encodings(known_dir)
    except Exception as e:
        logging.info('Failed to fetch drivers from backend: %s', e)
        return [], []


def capture_image(frame_path: str):
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError('Webcam not available')
    ret, frame = cap.read()
    cap.release()
    if not ret:
        raise RuntimeError('Failed to capture frame')
    # Save as JPEG
    cv2.imwrite(frame_path, frame)
    return frame_path


def analyze_face(frame_path: str, known_encodings, known_names):
    if FACE_RECOGNITION_AVAILABLE:
        img = face_recognition.load_image_file(frame_path)
        face_locations = face_recognition.face_locations(img)
        face_encs = face_recognition.face_encodings(img, face_locations)
        if len(face_encs) == 0:
            return {'result': 'no_face', 'driver': None, 'landmarks': None}

        enc = face_encs[0]
        matches = face_recognition.compare_faces(known_encodings, enc, tolerance=0.5)
        if True in matches:
            idx = matches.index(True)
            # also return landmarks for EAR detection
            landmarks = face_recognition.face_landmarks(img, [face_locations[0]])
            return {'result': 'verified', 'driver': known_names[idx], 'landmarks': landmarks[0] if landmarks else None}
        landmarks = face_recognition.face_landmarks(img)
        return {'result': 'unverified', 'driver': None, 'landmarks': landmarks[0] if landmarks else None}
    else:
        # Fallback: simple template matching / comparison using OpenCV
        frame = cv2.imread(frame_path)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # Use Haar cascades to detect faces
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
        if len(faces) == 0:
            return {'result': 'no_face', 'driver': None, 'landmarks': None}
        x, y, w, h = faces[0]
        face_roi = gray[y:y+h, x:x+w]
        # Compare against known images using structural similarity or simple histogram comparison
        best_score = 0
        best_name = None
        for idx, k in enumerate(known_encodings):
            try:
                kimg = cv2.imread(k, cv2.IMREAD_GRAYSCALE)
                kimg = cv2.resize(kimg, (w, h))
                # normalized cross-correlation
                res = cv2.matchTemplate(face_roi, kimg, cv2.TM_CCOEFF_NORMED)
                _, maxv, _, _ = cv2.minMaxLoc(res)
                if maxv > best_score:
                    best_score = maxv
                    best_name = known_names[idx]
            except Exception:
                continue
        if best_score > 0.5:
            return {'result': 'verified', 'driver': best_name, 'landmarks': None}
        return {'result': 'unverified', 'driver': None, 'landmarks': None}



def mock_fatigue_distraction():
    # Randomized lightweight mock detector for testing.
    fatigue_roll = random.random()
    if fatigue_roll < 0.8:
        fatigue = 'none'
    elif fatigue_roll < 0.95:
        fatigue = 'low'
    elif fatigue_roll < 0.995:
        fatigue = 'medium'
    else:
        fatigue = 'high'

    distraction = None
    d_roll = random.random()
    if d_roll < 0.02:
        distraction = 'phone'
    elif d_roll < 0.06:
        distraction = 'looking_away'
    elif d_roll < 0.08:
        distraction = 'eyes_closed'

    return fatigue, distraction


def eye_aspect_ratio(eye):
    # eye: list of (x,y) points (6 points)
    # compute euclidean distances
    def dist(a, b):
        return np.linalg.norm(np.array(a) - np.array(b))

    A = dist(eye[1], eye[5])
    B = dist(eye[2], eye[4])
    C = dist(eye[0], eye[3])
    ear = (A + B) / (2.0 * C) if C != 0 else 0
    return ear


def compute_fatigue_from_landmarks(landmarks):
    # landmarks: dict from face_recognition.face_landmarks
    # use EAR on left and right eye
    try:
        left = landmarks.get('left_eye')
        right = landmarks.get('right_eye')
        if not left or not right:
            return 'none'
        left_ear = eye_aspect_ratio(left)
        right_ear = eye_aspect_ratio(right)
        ear = (left_ear + right_ear) / 2.0
        # thresholds: typical blink EAR ~ 0.2
        if ear < 0.15:
            return 'high'
        if ear < 0.2:
            return 'medium'
        if ear < 0.25:
            return 'low'
        return 'none'
    except Exception:
        return 'none'


def send_verification(token: str, frame_path: str, driver_name: str, result: str, details: dict):
    url = f"{API_URL}/edge/verification"
    headers = {'Authorization': f'Bearer {token}'}
    files = {'image': ('capture.jpg', open(frame_path, 'rb'), 'image/jpeg')}
    data = {'driverId': driver_name or '', 'result': result, 'details': json.dumps(details)}
    logging.info('Sending verification to backend: result=%s driver=%s', result, driver_name)
    r = requests.post(url, headers=headers, files=files, data=data, timeout=15)
    r.raise_for_status()
    return r.json()


def send_status(token: str, status: dict):
    url = f"{API_URL}/edge/status"
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    r = requests.post(url, headers=headers, json=status, timeout=10)
    r.raise_for_status()
    return r.json()


def save_offline(frame_path: str, payload: dict):
    # Copy image and JSON to outbox - uniquely named
    nid = uuid.uuid4().hex
    dest_img = os.path.join(OUTBOX_DIR, f'{nid}.jpg')
    dest_json = os.path.join(OUTBOX_DIR, f'{nid}.json')
    shutil.copyfile(frame_path, dest_img)
    with open(dest_json, 'w') as f:
        json.dump(payload, f)
    logging.info('Saved offline payload to %s and %s', dest_img, dest_json)


def retry_outbox(token: str):
    items = [f for f in os.listdir(OUTBOX_DIR) if f.endswith('.json')]
    for jfile in items:
        path_json = os.path.join(OUTBOX_DIR, jfile)
        try:
            with open(path_json, 'r') as f:
                payload = json.load(f)
            nid = os.path.splitext(jfile)[0]
            img_path = os.path.join(OUTBOX_DIR, f'{nid}.jpg')
            if not os.path.exists(img_path):
                logging.warning('Outbox image missing for %s, deleting json', jfile)
                os.remove(path_json)
                continue
            # Attempt to send
            send_verification(token, img_path, payload.get('driverId'), payload.get('result'), payload.get('details', {}))
            # On success remove both files
            os.remove(path_json)
            os.remove(img_path)
            logging.info('Retried and sent outbox item %s', nid)
        except Exception as e:
            logging.info('Retry failed for %s: %s', jfile, e)
            # keep for later


def main():
    try:
        token = authenticate(DEVICE_ID, DEVICE_SECRET)
    except Exception as e:
        logging.error('Authentication failed: %s', e)
        logging.info('You may still run in offline mode, captured events will be saved to outbox')
        token = None

    # Initial fetch of drivers from backend (if available)
    known_encodings, known_names = fetch_drivers_from_backend(token, KNOWN_DIR)
    # fallback to local known dir if no remote drivers
    if not known_encodings:
        known_encodings, known_names = load_known_encodings(KNOWN_DIR)
    logging.info('Starting main loop. interval=%d minute(s)', INTERVAL_MIN)

    # Main loop
    loop_count = 0
    while True:
        start = time.time()
        try:
            # Retry any queued outbox items first (if token available)
            if token:
                retry_outbox(token)

            # Periodically refresh driver images/encodings from backend every 10 loops
            if token and loop_count % 10 == 0:
                encs, names = fetch_drivers_from_backend(token, KNOWN_DIR)
                if encs:
                    known_encodings, known_names = encs, names

            # Capture
            ts = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
            tmp_img = os.path.join(OUTBOX_DIR, f'tmp_{ts}.jpg')
            capture_image(tmp_img)

            # Analyze
            face_res = analyze_face(tmp_img, known_encodings, known_names)
            # If landmarks are available, compute EAR-based fatigue; otherwise use mock
            landmarks = face_res.get('landmarks')
            if landmarks:
                fatigue = compute_fatigue_from_landmarks(landmarks)
            else:
                fatigue, _ = mock_fatigue_distraction()
            # distraction remains mocked
            _, distraction = mock_fatigue_distraction()
            details = {'fatigue': fatigue, 'distraction': distraction, 'timestamp': ts}

            # result mapping
            result = 'verified' if face_res['result'] == 'verified' else 'unverified'
            driver_name = face_res.get('driver')

            # Send verification
            if token:
                try:
                    send_verification(token, tmp_img, driver_name, result, details)
                except Exception as e:
                    logging.warning('Send failed, saving offline: %s', e)
                    payload = {'driverId': driver_name, 'result': result, 'details': details}
                    save_offline(tmp_img, payload)
            else:
                payload = {'driverId': driver_name, 'result': result, 'details': details}
                save_offline(tmp_img, payload)

            # Send status update
            if token:
                try:
                    send_status(token, {'isActive': True, 'verificationInterval': INTERVAL_MIN})
                except Exception as e:
                    logging.info('Status send failed: %s', e)

            # remove temp image (if saved to outbox we copied it already)
            try:
                if os.path.exists(tmp_img):
                    os.remove(tmp_img)
            except Exception:
                pass

        except Exception as e:
            logging.exception('Main loop error: %s', e)

        loop_count += 1
        # Sleep until next interval
        elapsed = time.time() - start
        sleep_for = max(1, INTERVAL_MIN * 60 - elapsed)
        logging.info('Sleeping for %.1f seconds', sleep_for)
        time.sleep(sleep_for)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        logging.info('Edge agent stopped by user')
        sys.exit(0)
