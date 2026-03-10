"""
verify_driver.py — Verify a face against the Face_Recognition.pickle database.

Loads the pickle, extracts encoding from the input image, compares against
all stored encodings using majority voting, and returns the matched driver.

Usage:
    python verify_driver.py <image_path>

Example:
    python verify_driver.py test_photo.jpg

Output:
    Driver Verified: John Silva
    -- or --
    Driver Not Recognized
"""

import sys
import os
import pickle
from collections import Counter
import face_recognition

PICKLE_PATH = os.path.join(os.path.dirname(__file__), "Face_Recognition.pickle")
TOLERANCE = 0.45


def load_pickle():
    if not os.path.exists(PICKLE_PATH):
        print("Error: Pickle file not found at", PICKLE_PATH)
        sys.exit(1)
    with open(PICKLE_PATH, "rb") as f:
        data = pickle.load(f)
    return data.get("encodings", []), data.get("names", [])


def verify(image_path):
    if not os.path.isfile(image_path):
        print(f"Error: Image not found: {image_path}")
        sys.exit(1)

    known_encodings, known_names = load_pickle()
    if len(known_encodings) == 0:
        print("Error: No face encodings in the pickle database.")
        sys.exit(1)

    # Extract encoding from input image
    img = face_recognition.load_image_file(image_path)
    face_encs = face_recognition.face_encodings(img)
    if len(face_encs) == 0:
        print("No face detected in the image.")
        return None

    unknown_encoding = face_encs[0]

    # Compare with all stored encodings
    matches = face_recognition.compare_faces(known_encodings, unknown_encoding, tolerance=TOLERANCE)
    distances = face_recognition.face_distance(known_encodings, unknown_encoding)

    # Majority voting — count matched names
    matched_names = [name for name, match in zip(known_names, matches) if match]

    if not matched_names:
        print("Driver Not Recognized")
        return None

    # Pick the most common matched name
    name_counts = Counter(matched_names)
    best_name, count = name_counts.most_common(1)[0]

    # Confidence: average distance for matched encodings of the best name
    matched_distances = [
        d for d, name, match in zip(distances, known_names, matches)
        if match and name == best_name
    ]
    avg_distance = sum(matched_distances) / len(matched_distances)
    confidence = round((1 - avg_distance) * 100, 1)

    print(f"Driver Verified: {best_name}")
    print(f"Confidence: {confidence}%")
    print(f"Matched encodings: {count}/{len(known_encodings)}")
    return {"driverName": best_name, "verified": True, "confidence": confidence}


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python verify_driver.py <image_path>")
        sys.exit(1)

    verify(sys.argv[1])
