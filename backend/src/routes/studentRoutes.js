/**
 * src/routes/studentRoutes.js
 * Student-scoped routes under /api/v1/students
 */

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/studentController');
const { protect, restrictTo, requirePasswordChange } = require('../middleware/auth');

router.use(protect, requirePasswordChange);

router
  .route('/me')
  .get(restrictTo('student'), ctrl.getMyProfile)
  .put(restrictTo('student'), ctrl.updateMyProfile);

router.get(
  '/my-timetable',
  restrictTo('student'),
  ctrl.getMyTimetable
);

router.get(
  '/my-class',
  restrictTo('student'),
  ctrl.getMyClass
);

module.exports = router;
