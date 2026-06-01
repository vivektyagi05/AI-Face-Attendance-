"""
ai-service/app/routes/face_routes.py

Flask blueprint exposing two endpoints:

POST /api/face/extract-embeddings
    • Accepts 3-5 registration images (multipart/form-data, field: "images")
    • Returns 128-d embedding vectors

POST /api/face/recognize
    • Accepts 1 classroom image (field: "classroom_image")
    • Accepts student_embeddings as JSON string (field: "student_embeddings")
    • Returns matched students + confidence scores

GET  /health   (registered at app level but checked here too)
"""

import os
import json
import logging
import tempfile
from functools import wraps

from flask import Blueprint, request, jsonify, current_app

from app.services.face_service import (
    extract_embeddings_from_images,
    recognize_faces_in_image,
)
from app.utils.image_utils import cleanup_files

logger     = logging.getLogger(__name__)
face_bp    = Blueprint("face", __name__)

ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_FILE_SIZE_MB   = 10


# ── Auth decorator ────────────────────────────────────────────
def require_api_key(f):
    """Validate shared secret sent by the Node.js backend."""
    @wraps(f)
    def decorated(*args, **kwargs):
        expected = os.getenv("AI_SERVICE_API_KEY", "")
        if expected:  # skip check if no key configured (dev mode)
            received = request.headers.get("X-AI-Service-Key", "")
            if received != expected:
                logger.warning(
                    f"Unauthorised AI request from {request.remote_addr}"
                )
                return jsonify({"success": False, "message": "Unauthorised"}), 401
        return f(*args, **kwargs)
    return decorated


# ── Helper: save uploaded FileStorage to a temp file ─────────
def _save_temp(file_storage) -> str | None:
    """Save a Flask FileStorage object to a temp file, return the path."""
    if file_storage.mimetype not in ALLOWED_MIME_TYPES:
        return None
    suffix = os.path.splitext(file_storage.filename or ".jpg")[1].lower() or ".jpg"
    fd, tmp_path = tempfile.mkstemp(suffix=suffix, dir="uploads/temp")
    os.close(fd)
    file_storage.save(tmp_path)
    return tmp_path


# ── Helper: uniform error response ────────────────────────────
def _error(message: str, status: int = 400, **extra):
    body = {"success": False, "message": message, **extra}
    return jsonify(body), status


# ─────────────────────────────────────────────────────────────
# POST /api/face/extract-embeddings
# ─────────────────────────────────────────────────────────────
@face_bp.route("/extract-embeddings", methods=["POST"])
@require_api_key
def extract_embeddings():
    """
    Receive 3–5 face images for a student and return 128-d embeddings.

    Form fields:
        images      : one or more image files (field name repeated)
        student_id  : str  (for logging)

    Response 200:
        {
            "success"   : true,
            "count"     : 4,
            "embeddings": [[float*128], ...],
            "warnings"  : []
        }

    Response 422:
        {
            "success" : false,
            "message" : "..."
        }
    """
    student_id  = request.form.get("student_id", "unknown")
    image_files = request.files.getlist("images")

    # ── Validation ────────────────────────────────────────────
    if not image_files:
        return _error("No images received. Send images under the field name 'images'.")

    if len(image_files) < 3:
        return _error(
            f"At least 3 images required for reliable registration. "
            f"Received: {len(image_files)}."
        )

    if len(image_files) > 5:
        return _error(
            f"Maximum 5 images allowed. Received: {len(image_files)}."
        )

    # ── Save images to temp storage ───────────────────────────
    temp_paths: list[str] = []
    for idx, f in enumerate(image_files):
        if f.mimetype not in ALLOWED_MIME_TYPES:
            cleanup_files(temp_paths)
            return _error(
                f"File {idx + 1} has unsupported type '{f.mimetype}'. "
                "Allowed: JPEG, PNG, WebP."
            )
        tmp = _save_temp(f)
        if tmp is None:
            cleanup_files(temp_paths)
            return _error(f"Could not save file {idx + 1}")
        temp_paths.append(tmp)

    # ── Call face service ─────────────────────────────────────
    try:
        result = extract_embeddings_from_images(temp_paths, student_id)
    except Exception as exc:
        logger.exception(f"Unexpected error during embedding extraction: {exc}")
        cleanup_files(temp_paths)
        return _error("Internal AI processing error", 500)
    finally:
        cleanup_files(temp_paths)

    if not result["success"]:
        return jsonify(result), 422

    return jsonify(result), 200


# ─────────────────────────────────────────────────────────────
# POST /api/face/recognize
# ─────────────────────────────────────────────────────────────
@face_bp.route("/recognize", methods=["POST"])
@require_api_key
def recognize():
    """
    Detect and match all faces in a classroom photo.

    Form fields:
        classroom_image    : single image file
        student_embeddings : JSON string (array of student embedding objects)
        threshold          : float 0.3–0.95 (optional, default 0.55)

    Response 200:
        {
            "success"     : true,
            "totalFaces"  : 5,
            "matches"     : [
                {
                    "studentId"   : "...",
                    "rollNumber"  : "CS001",
                    "studentName" : "Rahul Verma",
                    "confidence"  : 0.87,
                    "distance"    : 0.23,
                    "faceLocation": [top, right, bottom, left]
                },
                ...
            ],
            "unknownFaces": 1,
            "processingMs": 412
        }
    """
    # ── Classroom image ───────────────────────────────────────
    classroom_file = request.files.get("classroom_image")
    if classroom_file is None:
        return _error(
            "No classroom image received. "
            "Send the image under the field name 'classroom_image'."
        )

    if classroom_file.mimetype not in ALLOWED_MIME_TYPES:
        return _error(
            f"Unsupported image type '{classroom_file.mimetype}'. "
            "Allowed: JPEG, PNG, WebP."
        )

    # ── Student embeddings ────────────────────────────────────
    embeddings_raw = request.form.get("student_embeddings", "")
    if not embeddings_raw:
        return _error(
            "Missing 'student_embeddings' field. "
            "Send a JSON string containing the list of student embeddings."
        )

    try:
        student_embeddings = json.loads(embeddings_raw)
    except json.JSONDecodeError as exc:
        return _error(f"Invalid JSON in 'student_embeddings': {exc}")

    if not isinstance(student_embeddings, list) or len(student_embeddings) == 0:
        return _error("'student_embeddings' must be a non-empty array.")

    # Validate structure of first entry as a sanity check
    first = student_embeddings[0]
    for required_key in ("studentId", "embeddings"):
        if required_key not in first:
            return _error(
                f"Each student embedding object must have '{required_key}' field."
            )

    # ── Threshold ─────────────────────────────────────────────
    try:
        threshold = float(request.form.get("threshold", "0.55"))
        if not (0.3 <= threshold <= 0.95):
            raise ValueError("out of range")
    except ValueError:
        return _error("'threshold' must be a float between 0.3 and 0.95.")

    # ── Save classroom image to temp ──────────────────────────
    classroom_path = _save_temp(classroom_file)
    if classroom_path is None:
        return _error("Could not save classroom image")

    # ── Call face service ─────────────────────────────────────
    try:
        result = recognize_faces_in_image(
            classroom_image_path=classroom_path,
            student_embeddings=student_embeddings,
            threshold=threshold,
        )
    except Exception as exc:
        logger.exception(f"Unexpected error during recognition: {exc}")
        cleanup_files([classroom_path])
        return _error("Internal AI processing error", 500)
    finally:
        cleanup_files([classroom_path])

    if not result.get("success"):
        return jsonify(result), 422

    return jsonify(result), 200
