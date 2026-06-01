/**
 * src/middleware/faceUpload.js
 * Phase 2 – Multer configuration for face registration images
 * and classroom attendance images.
 */

const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const ApiError = require('../utils/ApiError');

const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';
const MAX_SIZE    = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10 MB

// Ensure directories exist
['faces', 'classroom', 'temp'].forEach(dir =>
  fs.mkdirSync(path.join(UPLOAD_PATH, dir), { recursive: true })
);

// ── File filter: images only ──────────────────────────────────
const imageFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

// ── Face registration images (3–5 per student) ────────────────
const faceStorage = multer.diskStorage({
  destination: (_req, _file, cb) =>
    cb(null, path.join(UPLOAD_PATH, 'faces')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `face_${uuidv4()}${ext}`);
  },
});

const faceUploadMulter = multer({
  storage   : faceStorage,
  fileFilter: imageFilter,
  limits    : { fileSize: MAX_SIZE, files: 5 },
});

// ── Classroom image (1 image per attendance session) ──────────
const classroomStorage = multer.diskStorage({
  destination: (_req, _file, cb) =>
    cb(null, path.join(UPLOAD_PATH, 'classroom')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `classroom_${uuidv4()}${ext}`);
  },
});

const classroomUploadMulter = multer({
  storage   : classroomStorage,
  fileFilter: imageFilter,
  limits    : { fileSize: MAX_SIZE, files: 1 },
});

// ── Multer error wrapper ──────────────────────────────────────
const wrapMulter = uploadFn => (req, res, next) =>
  uploadFn(req, res, err => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE')
        return next(new ApiError(400, `File too large – max ${MAX_SIZE / 1024 / 1024} MB`));
      if (err.code === 'LIMIT_FILE_COUNT')
        return next(new ApiError(400, 'Too many files uploaded'));
      return next(new ApiError(400, err.message));
    }
    next(err);
  });

// ── Exported middleware ───────────────────────────────────────

/** Accept up to 5 face images, field name: 'images' */
exports.uploadFaceImages = wrapMulter(faceUploadMulter.array('images', 5));

/** Accept 1 classroom image, field name: 'classroomImage' */
exports.uploadClassroomImage = wrapMulter(
  classroomUploadMulter.single('classroomImage')
);
