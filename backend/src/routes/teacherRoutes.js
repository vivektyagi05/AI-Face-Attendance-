/**
 * src/routes/teacherRoutes.js
 * Teacher-scoped routes under /api/v1/teachers
 */

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/teacherController');
const { protect, restrictTo, requirePasswordChange } = require('../middleware/auth');
const { mongoIdParam } = require('../utils/validators');
const validate = require('../middleware/validate');

router.use(protect, requirePasswordChange);

// Own profile
router
  .route('/me')
  .get(restrictTo('teacher'), ctrl.getMyProfile)
  .put(restrictTo('teacher'), ctrl.updateMyProfile);

// Own timetable
router.get(
  '/my-timetable',
  restrictTo('teacher'),
  ctrl.getMyTimetable
);

// Own assigned classes
router.get(
  '/my-classes',
  restrictTo('teacher'),
  ctrl.getMyClasses
);

// Students in a specific assigned class
router.get(
  '/class/:classId/students',
  restrictTo('teacher'),
  mongoIdParam('classId'),
  validate,
  ctrl.getClassStudents
);

module.exports = router;
