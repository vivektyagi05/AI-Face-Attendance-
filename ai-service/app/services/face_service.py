"""
ai-service/app/services/face_service.py

Real face recognition engine using the face_recognition library (dlib-based).

ALGORITHMS USED
───────────────
• Detection  : Histogram of Oriented Gradients (HOG) or CNN (configurable)
• Encoding   : ResNet-based 128-dimension face embeddings (dlib)
• Matching   : Euclidean distance (L2) with configurable threshold
               face_recognition uses L2 distance; threshold ≤ 0.6 is a good default.
               We also accept cosine similarity mode for compatibility.

WORKFLOW
────────
Registration
  images[] → preprocess → detect face → encode 128-d vector → return list[list[float]]

Recognition
  classroom_image + student_embeddings[]
   → preprocess → detect all faces → encode each
   → for every detected face: compare L2 to all stored embeddings
   → keep closest match if distance ≤ threshold
   → deduplicate: highest-confidence match wins per student
   → return matches + unknown_faces count
"""

import os
import logging
import time
from typing import Optional

import numpy as np
import face_recognition
from scipy.spatial.distance import euclidean, cosine
from sklearn.preprocessing import normalize

from app.utils.image_utils import load_and_preprocess, cleanup_files

logger = logging.getLogger(__name__)

# ── Configuration (from env, with defaults) ───────────────────
DETECTION_MODEL  = os.getenv("FACE_DETECTION_MODEL", "hog")   # "hog" | "cnn"
NUM_JITTERS      = int(os.getenv("NUM_JITTERS", "1"))
DEFAULT_THRESHOLD = float(os.getenv("DEFAULT_THRESHOLD", "0.55"))


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def extract_embeddings_from_images(
    image_paths: list[str],
    student_id: str,
) -> dict:
    """
    Extract one 128-d face embedding from each registration image.

    Args:
        image_paths : list of absolute file paths (3–5 images)
        student_id  : used for logging only

    Returns:
        {
            "success"   : bool,
            "embeddings": list[list[float]],   # each is 128-d
            "count"     : int,
            "message"   : str,                 # on failure
            "warnings"  : list[str]            # per-image issues
        }
    """
    embeddings: list[list[float]] = []
    warnings:   list[str]         = []

    for idx, img_path in enumerate(image_paths):
        img_label = f"Image {idx + 1} ({os.path.basename(img_path)})"
        logger.debug(f"Processing registration {img_label} for student {student_id}")

        # 1. Load + preprocess
        img_rgb = load_and_preprocess(img_path)
        if img_rgb is None:
            warnings.append(f"{img_label}: could not load or preprocess")
            continue

        # 2. Detect face locations
        face_locations = face_recognition.face_locations(
            img_rgb, model=DETECTION_MODEL
        )

        if len(face_locations) == 0:
            warnings.append(f"{img_label}: no face detected")
            continue

        if len(face_locations) > 1:
            warnings.append(
                f"{img_label}: {len(face_locations)} faces detected – "
                "using the largest face only"
            )
            # Use the largest bounding box (most prominent face in frame)
            face_locations = [_largest_face(face_locations)]

        # 3. Encode the detected face
        encodings = face_recognition.face_encodings(
            img_rgb,
            known_face_locations=face_locations,
            num_jitters=NUM_JITTERS,
        )

        if not encodings:
            warnings.append(f"{img_label}: face detected but encoding failed")
            continue

        # 4. L2-normalise the 128-d vector before storage
        raw_vec       = encodings[0]  # numpy array shape (128,)
        normalised    = _l2_normalise(raw_vec)
        embeddings.append(normalised.tolist())
        logger.debug(f"{img_label}: embedding extracted successfully")

    # ── Result ────────────────────────────────────────────────
    if len(embeddings) == 0:
        return {
            "success" : False,
            "count"   : 0,
            "embeddings": [],
            "message" : (
                "No usable faces found in any of the provided images. "
                "Ensure each image has a clear, front-facing face with good lighting."
            ),
            "warnings": warnings,
        }

    if len(embeddings) < 3:
        return {
            "success" : False,
            "count"   : len(embeddings),
            "embeddings": embeddings,
            "message" : (
                f"Only {len(embeddings)} usable face(s) extracted. "
                "Minimum 3 required. "
                "Check that the images are well-lit and front-facing."
            ),
            "warnings": warnings,
        }

    logger.info(
        f"Registration complete: student={student_id}, "
        f"embeddings={len(embeddings)}, skipped={len(warnings)}"
    )
    return {
        "success"   : True,
        "count"     : len(embeddings),
        "embeddings": embeddings,
        "message"   : "Embeddings extracted successfully",
        "warnings"  : warnings,
    }


def recognize_faces_in_image(
    classroom_image_path: str,
    student_embeddings: list[dict],
    threshold: float = DEFAULT_THRESHOLD,
) -> dict:
    """
    Detect all faces in a classroom image and match them against registered students.

    Args:
        classroom_image_path : absolute path to the classroom photo
        student_embeddings   : list of dicts:
            {
                "studentId"   : str,
                "rollNumber"  : str,
                "studentName" : str,
                "embeddings"  : list[list[float]]   # multiple 128-d vectors
            }
        threshold : max L2 distance to consider a match (lower = stricter)
                    Typical range: 0.45 (strict) – 0.65 (lenient)

    Returns:
        {
            "success"     : bool,
            "totalFaces"  : int,
            "matches"     : list[{
                "studentId"   : str,
                "rollNumber"  : str,
                "studentName" : str,
                "confidence"  : float,   # 0–1  (higher = more certain)
                "distance"    : float,   # raw L2 distance (lower = closer)
                "faceLocation": [top, right, bottom, left]
            }],
            "unknownFaces": int,
            "processingMs": int
        }
    """
    start_ms = int(time.time() * 1000)

    if not student_embeddings:
        return {
            "success"      : False,
            "message"      : "No student embeddings provided",
            "totalFaces"   : 0,
            "matches"      : [],
            "unknownFaces" : 0,
            "processingMs" : 0,
        }

    # 1. Load and preprocess classroom image
    img_rgb = load_and_preprocess(classroom_image_path)
    if img_rgb is None:
        return {
            "success"     : False,
            "message"     : "Could not load or preprocess the classroom image",
            "totalFaces"  : 0,
            "matches"     : [],
            "unknownFaces": 0,
            "processingMs": 0,
        }

    # 2. Detect all faces in classroom image
    logger.info(f"Detecting faces in classroom image: {os.path.basename(classroom_image_path)}")
    face_locations = face_recognition.face_locations(img_rgb, model=DETECTION_MODEL)
    total_faces    = len(face_locations)

    logger.info(f"Detected {total_faces} face(s) in classroom image")

    if total_faces == 0:
        return {
            "success"     : True,
            "message"     : "No faces detected in the classroom image",
            "totalFaces"  : 0,
            "matches"     : [],
            "unknownFaces": 0,
            "processingMs": int(time.time() * 1000) - start_ms,
        }

    # 3. Encode all detected faces
    detected_encodings = face_recognition.face_encodings(
        img_rgb,
        known_face_locations=face_locations,
        num_jitters=NUM_JITTERS,
    )

    if not detected_encodings:
        return {
            "success"     : True,
            "message"     : "Faces detected but could not be encoded",
            "totalFaces"  : total_faces,
            "matches"     : [],
            "unknownFaces": total_faces,
            "processingMs": int(time.time() * 1000) - start_ms,
        }

    # 4. Build flat reference list: [(studentId, rollNumber, name, 128-d-vector), ...]
    known_encodings: list[tuple] = []
    for s in student_embeddings:
        for emb in s.get("embeddings", []):
            vec = np.array(emb, dtype=np.float64)
            known_encodings.append((
                s["studentId"],
                s.get("rollNumber",  ""),
                s.get("studentName", ""),
                vec,
            ))

    if not known_encodings:
        return {
            "success"     : False,
            "message"     : "No valid embeddings found in the provided student list",
            "totalFaces"  : total_faces,
            "matches"     : [],
            "unknownFaces": total_faces,
            "processingMs": int(time.time() * 1000) - start_ms,
        }

    # 5. Match each detected face against all stored embeddings
    #    Use {studentId → best_match_dict} to deduplicate automatically
    best_per_student: dict[str, dict] = {}
    unknown_count = 0

    for face_idx, (detected_enc, face_loc) in enumerate(
        zip(detected_encodings, face_locations)
    ):
        detected_norm = _l2_normalise(detected_enc)
        best_match    = _find_best_match(
            detected_norm, known_encodings, threshold
        )

        if best_match is None:
            unknown_count += 1
            logger.debug(f"Face {face_idx}: no match found (unknown person)")
            continue

        sid, roll, name, distance = best_match
        confidence = _distance_to_confidence(distance, threshold)

        logger.debug(
            f"Face {face_idx}: matched student={name} ({sid}), "
            f"dist={distance:.4f}, conf={confidence:.4f}"
        )

        # Deduplication: keep the match with the HIGHER confidence for this student
        if sid not in best_per_student or confidence > best_per_student[sid]["confidence"]:
            best_per_student[sid] = {
                "studentId"   : sid,
                "rollNumber"  : roll,
                "studentName" : name,
                "confidence"  : round(confidence, 4),
                "distance"    : round(distance, 4),
                "faceLocation": list(face_loc),  # [top, right, bottom, left]
            }

    matches = list(best_per_student.values())

    processing_ms = int(time.time() * 1000) - start_ms
    logger.info(
        f"Recognition complete: total={total_faces}, "
        f"matched={len(matches)}, unknown={unknown_count}, "
        f"time={processing_ms}ms"
    )

    return {
        "success"     : True,
        "totalFaces"  : total_faces,
        "matches"     : matches,
        "unknownFaces": unknown_count,
        "processingMs": processing_ms,
    }


# ─────────────────────────────────────────────────────────────────────────────
# PRIVATE HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _l2_normalise(vec: np.ndarray) -> np.ndarray:
    """L2-normalise a vector so that dot product = cosine similarity."""
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm


def _find_best_match(
    detected_enc: np.ndarray,
    known_encodings: list[tuple],
    threshold: float,
) -> Optional[tuple]:
    """
    Find the closest known student embedding to the detected face using
    Euclidean (L2) distance on normalised vectors.

    face_recognition's standard threshold is 0.6 for raw (unnormalised) vectors.
    After L2 normalisation: distance in [0, 2] where 0 = identical, 2 = opposite.

    Returns (studentId, rollNumber, studentName, distance) or None if no match.
    """
    best_distance = float("inf")
    best_meta: Optional[tuple] = None

    for sid, roll, name, known_enc in known_encodings:
        # L2 distance between two normalised 128-d vectors
        dist = float(np.linalg.norm(detected_enc - known_enc))

        if dist < best_distance:
            best_distance = dist
            best_meta     = (sid, roll, name)

    if best_meta is None or best_distance > threshold:
        return None

    return (*best_meta, best_distance)


def _distance_to_confidence(distance: float, threshold: float) -> float:
    """
    Convert L2 distance to a 0–1 confidence score.
    distance = 0.0  → confidence = 1.0  (perfect match)
    distance = threshold → confidence ≈ 0.0 (minimum acceptable match)
    """
    if distance <= 0:
        return 1.0
    confidence = max(0.0, 1.0 - (distance / threshold))
    return round(confidence, 4)


def _largest_face(face_locations: list[tuple]) -> tuple:
    """Return the face location with the largest area."""
    def area(loc):
        top, right, bottom, left = loc
        return (bottom - top) * (right - left)
    return max(face_locations, key=area)
