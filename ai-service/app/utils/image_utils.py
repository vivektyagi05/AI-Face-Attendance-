"""
ai-service/app/utils/image_utils.py
Image preprocessing utilities for face recognition.
Handles orientation, lighting, sharpness, and resizing.
"""

import os
import logging
import numpy as np
import cv2
from PIL import Image, ExifTags

logger = logging.getLogger(__name__)

# Maximum dimension for any image (larger images are downscaled for speed)
MAX_IMAGE_DIM = 1920


def load_and_preprocess(image_path: str) -> np.ndarray | None:
    """
    Load an image from disk and apply preprocessing:
      1. Fix EXIF orientation
      2. Convert to RGB (face_recognition expects RGB)
      3. Downscale if too large
      4. Basic exposure correction for dark images

    Returns:
        numpy RGB array ready for face_recognition, or None on failure.
    """
    if not os.path.exists(image_path):
        logger.error(f"Image not found: {image_path}")
        return None

    try:
        # 1. Load via PIL to handle EXIF
        pil_image = Image.open(image_path)
        pil_image = _fix_exif_orientation(pil_image)

        # Convert to RGB (drop alpha channel if present, handle palette images)
        pil_image = pil_image.convert("RGB")

        # 2. Downscale large images
        w, h = pil_image.size
        max_dim = max(w, h)
        if max_dim > MAX_IMAGE_DIM:
            scale   = MAX_IMAGE_DIM / max_dim
            new_w   = int(w * scale)
            new_h   = int(h * scale)
            pil_image = pil_image.resize((new_w, new_h), Image.LANCZOS)
            logger.debug(f"Downscaled {w}x{h} → {new_w}x{new_h}")

        # 3. To numpy array (RGB)
        img_rgb = np.array(pil_image)

        # 4. Brightness correction for very dark images
        img_rgb = _auto_exposure(img_rgb)

        return img_rgb

    except Exception as exc:
        logger.error(f"Failed to load/preprocess {image_path}: {exc}")
        return None


def _fix_exif_orientation(pil_image: Image.Image) -> Image.Image:
    """Rotate image to match EXIF orientation tag."""
    try:
        exif_data = pil_image._getexif()
        if exif_data is None:
            return pil_image

        # Build tag-name → tag-id map
        orientation_tag = None
        for tag_id, tag_name in ExifTags.TAGS.items():
            if tag_name == "Orientation":
                orientation_tag = tag_id
                break

        if orientation_tag is None or orientation_tag not in exif_data:
            return pil_image

        orientation = exif_data[orientation_tag]
        rotation_map = {
            3: Image.ROTATE_180,
            6: Image.ROTATE_270,
            8: Image.ROTATE_90,
        }
        if orientation in rotation_map:
            pil_image = pil_image.transpose(rotation_map[orientation])

    except (AttributeError, Exception):
        pass  # No EXIF or unsupported format — return as-is

    return pil_image


def _auto_exposure(img_rgb: np.ndarray) -> np.ndarray:
    """
    Apply CLAHE (Contrast Limited Adaptive Histogram Equalisation) to the
    luminance channel when the image is under-exposed.
    Returns the corrected RGB image.
    """
    mean_brightness = np.mean(img_rgb)

    # Only apply correction for dark images (mean < 80/255)
    if mean_brightness >= 80:
        return img_rgb

    logger.debug(f"Dark image detected (mean={mean_brightness:.1f}), applying CLAHE")

    # Convert RGB → LAB, apply CLAHE to L channel, convert back
    img_bgr  = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    img_lab  = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b  = cv2.split(img_lab)

    clahe    = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_eq     = clahe.apply(l)

    img_lab  = cv2.merge([l_eq, a, b])
    img_bgr  = cv2.cvtColor(img_lab, cv2.COLOR_LAB2BGR)
    img_rgb  = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    return img_rgb


def cleanup_files(file_paths: list[str]) -> None:
    """Delete temporary image files, ignoring errors."""
    for fp in file_paths:
        try:
            if fp and os.path.exists(fp):
                os.remove(fp)
        except OSError as exc:
            logger.warning(f"Could not delete temp file {fp}: {exc}")
