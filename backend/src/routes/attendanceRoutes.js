/**
 * src/routes/attendanceRoutes.js
 * Phase 2 – Attendance routes under /api/v1/attendance
 */

const express = require('express');
const router  = express.Router();

const ctrl    = require('../controllers/attendanceController');
const { protect, restrictTo, requirePasswordChange } = require('../middleware/auth');
const { uploadFaceImages, uploadClassroomImage } = require('../middleware/faceUpload');
const validate = require('../middleware/validate');
const { mongoIdParam } = require('../utils/validators');

// All attendance routes require authentication and password change
router.use(protect, requirePasswordChange);

// ── Face Registration ─────────────────────────────────────────
// Admin and teacher can register student faces
router.post(
  '/register-face/:studentId',
  restrictTo('admin', 'teacher'),
  mongoIdParam('studentId'),
  validate,
  uploadFaceImages,
  ctrl.registerFace
);

// ── Take Attendance ───────────────────────────────────────────
// Only teachers take attendance
router.post(
  '/take',
  restrictTo('admin', 'teacher'),
  uploadClassroomImage,
  ctrl.takeAttendance
);

// ── Session CRUD ──────────────────────────────────────────────
router.get(
  '/sessions',
  restrictTo('admin', 'teacher'),
  ctrl.listSessions
);

router.get(
  '/sessions/:sessionId',
  restrictTo('admin', 'teacher'),
  mongoIdParam('sessionId'),
  validate,
  ctrl.getSession
);

router.patch(
  '/sessions/:sessionId/override',
  restrictTo('admin', 'teacher'),
  mongoIdParam('sessionId'),
  validate,
  ctrl.overrideRecord
);

// ── Reports ───────────────────────────────────────────────────
// Students can view their own; teacher/admin can view any
router.get(
  '/student/:studentId/report',
  restrictTo('admin', 'teacher', 'student'),
  mongoIdParam('studentId'),
  validate,
  ctrl.getStudentReport
);

router.get(
  '/class/:classId/report',
  restrictTo('admin', 'teacher'),
  mongoIdParam('classId'),
  validate,
  ctrl.getClassReport
);

// ── AI Service Health ─────────────────────────────────────────
router.get(
  '/ai-health',
  restrictTo('admin'),
  ctrl.aiHealthCheck
);

module.exports = router;
