"""
ai-service/main.py

Flask application factory for the Face Recognition microservice.

Endpoints:
    GET  /health                        — liveness probe
    POST /api/face/extract-embeddings   — student face registration
    POST /api/face/recognize            — classroom attendance recognition

Run (development):
    python main.py

Run (production via gunicorn):
    gunicorn --bind 0.0.0.0:8000 --workers 2 --timeout 120 "main:create_app()"
"""

import os
import sys
import logging
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# ── Load .env before anything else ───────────────────────────
load_dotenv()

# ── Ensure upload directories exist ──────────────────────────
for d in ["uploads/temp", "uploads/faces", "logs"]:
    Path(d).mkdir(parents=True, exist_ok=True)


def create_app() -> Flask:
    """Application factory – creates and configures the Flask app."""

    app = Flask(__name__)

    # ── Configuration ─────────────────────────────────────────
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB total request
    app.config["UPLOAD_FOLDER"]      = os.getenv("UPLOAD_FOLDER", "uploads/temp")
    app.config["DEBUG"]              = os.getenv("FLASK_ENV", "production") == "development"

    # ── CORS (allow Node backend only in prod) ────────────────
    backend_url = os.getenv("NODE_BACKEND_URL", "*")
    CORS(app, resources={r"/api/*": {"origins": backend_url}})

    # ── Logging ───────────────────────────────────────────────
    _setup_logging(app.config["DEBUG"])

    # ── Blueprints ────────────────────────────────────────────
    from app.routes.face_routes import face_bp
    app.register_blueprint(face_bp, url_prefix="/api/face")

    # ── Health check ──────────────────────────────────────────
    @app.route("/health", methods=["GET"])
    def health():
        """Liveness probe – returns 200 when service is ready."""
        import face_recognition  # confirm library is loadable
        return jsonify({
            "status" : "healthy",
            "service": "face-recognition-ai",
            "version": "2.0.0",
            "model"  : os.getenv("FACE_DETECTION_MODEL", "hog"),
        }), 200

    # ── Global error handlers ─────────────────────────────────
    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"success": False, "message": "Endpoint not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_e):
        return jsonify({"success": False, "message": "Method not allowed"}), 405

    @app.errorhandler(413)
    def request_too_large(_e):
        return jsonify({
            "success": False,
            "message": "Request payload too large (max 50 MB)"
        }), 413

    @app.errorhandler(500)
    def internal_error(e):
        logging.getLogger(__name__).exception(f"Unhandled exception: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500

    return app


def _setup_logging(debug: bool) -> None:
    """Configure root logger with console + file handlers."""
    level = logging.DEBUG if debug else logging.INFO

    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(fmt)

    # File handler
    file_h = logging.FileHandler("logs/ai_service.log")
    file_h.setFormatter(fmt)

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(console)
    root.addHandler(file_h)

    # Quieten noisy third-party loggers
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    logging.getLogger("PIL").setLevel(logging.WARNING)


# ── Development entry point ───────────────────────────────────
if __name__ == "__main__":
    port  = int(os.getenv("AI_SERVICE_PORT", "8000"))
    app   = create_app()
    debug = os.getenv("FLASK_ENV", "production") == "development"

    print(f"🤖  Face Recognition AI Service  →  http://0.0.0.0:{port}")
    print(f"    Detection model : {os.getenv('FACE_DETECTION_MODEL', 'hog')}")
    print(f"    Environment     : {'development' if debug else 'production'}")

    app.run(host="0.0.0.0", port=port, debug=debug)
