/**
 * src/middleware/upload.js
 * Multer configuration for profile image uploads
 */

const multer = require('multer');
const path   = require('path');
const { v4: uuidv4 } = require('uuid');
const fs     = require('fs');
const ApiError = require('../utils/ApiError');

const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';
const MAX_SIZE    = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5 MB

// Ensure upload folders exist
['profiles', 'documents'].forEach(dir =>
  fs.mkdirSync(path.join(UPLOAD_PATH, dir), { recursive: true })
);

// ── Storage ────────────────────────────────────────────────────
const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) =>
    cb(null, path.join(UPLOAD_PATH, 'profiles')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `profile_${uuidv4()}${ext}`);
  },
});

// ── File filter ────────────────────────────────────────────────
const imageFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new ApiError(400, 'Only JPEG, PNG and WebP images are allowed'), false);
};

// ── Multer instance ────────────────────────────────────────────
const uploadProfile = multer({
  storage   : profileStorage,
  fileFilter: imageFilter,
  limits    : { fileSize: MAX_SIZE },
}).single('profileImage');

// ── Middleware wrapper ─────────────────────────────────────────
exports.uploadProfileImage = (req, res, next) => {
  uploadProfile(req, res, err => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE')
        return next(new ApiError(400, `File too large – max ${MAX_SIZE / 1024 / 1024} MB`));
      return next(new ApiError(400, err.message));
    }
    next(err);
  });
};
