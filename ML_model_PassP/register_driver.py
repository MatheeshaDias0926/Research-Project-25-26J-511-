"""
register_driver.py — Register a driver's face from multiple image files.

Loads Face_Recognition.pickle, extracts 128-d face encodings from each
supplied image, stores them under the given driverId/name, and saves
the updated pickle.

Usage:
    python register_driver.py <driverId> <driverName> <img1> <img2> ... <imgN>

Example:
    python register_driver.py LIC-001 "John Silva" front.jpg left.jpg right.jpg up.jpg down.jpg
"""

import sys
import os
import pickle
import face_recognition

PICKLE_PATH = os.path.join(os.path.dirname(__file__), "Face_Recognition.pickle")
TOLERANCE = 0.45


def load_pickle():
    """Load the pickle DB, return (encodings, names, driver_ids) lists."""
    if not os.path.exists(PICKLE_PATH):
        return [], [], []
    with open(PICKLE_PATH, "rb") as f:
        data = pickle.load(f)
    encodings = data.get("encodings", [])
    names = data.get("names", [])
    driver_ids = data.get("driver_ids", [""] * len(names))
    return encodings, names, driver_ids


def save_pickle(encodings, names, driver_ids):
    with open(PICKLE_PATH, "wb") as f:
        pickle.dump({"encodings": encodings, "names": names, "driver_ids": driver_ids}, f)


def register(driver_id, name, image_paths):
    encodings, names, driver_ids = load_pickle()

    # Remove old entries for this driver (re-register)
    keep = [(e, n, d) for e, n, d in zip(encodings, names, driver_ids) if d != driver_id and n != name]
    if keep:
        encodings, names, driver_ids = zip(*keep)
        encodings, names, driver_ids = list(encodings), list(names), list(driver_ids)
    else:
        encodings, names, driver_ids = [], [], []

    added = 0
    failed = 0
    for path in image_paths:
        if not os.path.isfile(path):
            print(f"  [SKIP] File not found: {path}")
            failed += 1
            continue
        img = face_recognition.load_image_file(path)
        face_encs = face_recognition.face_encodings(img)
        if len(face_encs) == 0:
            print(f"  [SKIP] No face detected in: {path}")
            failed += 1
            continue
        encodings.append(face_encs[0])
        names.append(name)
        driver_ids.append(driver_id)
        added += 1
        print(f"  [OK] Encoding extracted from: {path}")

    save_pickle(encodings, names, driver_ids)
    print(f"\nDone — {added} encoding(s) added, {failed} failed.")
    print(f"Total encodings in pickle: {len(encodings)}")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python register_driver.py <driverId> <driverName> <img1> [img2] ...")
        sys.exit(1)

    drv_id = sys.argv[1]
    drv_name = sys.argv[2]
    images = sys.argv[3:]

    print(f"Registering driver: {drv_name} (ID: {drv_id})")
    print(f"Images: {len(images)}")
    register(drv_id, drv_name, images)
