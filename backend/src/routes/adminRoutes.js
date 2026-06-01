/**
 * src/routes/adminRoutes.js
 * All admin-only management routes under /api/v1/admin
 */

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/adminController');
const { protect, restrictTo, requirePasswordChange } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createTeacherRules, updateTeacherRules,
  createStudentRules, updateStudentRules,
  createClassRules,   updateClassRules,
  assignTeacherRules, assignStudentsRules,
  createTimetableRules, updateTimetableRules,
  mongoIdParam,
} = require('../utils/validators');

// ── Apply auth + role guard to all admin routes ────────────────
router.use(protect, requirePasswordChange, restrictTo('admin'));

// ══════════════════════════════════════════════
// TEACHERS
// ══════════════════════════════════════════════

router
  .route('/teachers')
  .post(createTeacherRules, validate, ctrl.createTeacher)
  .get(ctrl.listTeachers);

router
  .route('/teachers/:id')
  .get(mongoIdParam('id'), validate, ctrl.getTeacher)
  .put(mongoIdParam('id'), updateTeacherRules, validate, ctrl.updateTeacher)
  .delete(mongoIdParam('id'), validate, ctrl.deleteTeacher);

// ══════════════════════════════════════════════
// STUDENTS
// ══════════════════════════════════════════════

router
  .route('/students')
  .post(createStudentRules, validate, ctrl.createStudent)
  .get(ctrl.listStudents);

router
  .route('/students/:id')
  .get(mongoIdParam('id'), validate, ctrl.getStudent)
  .put(mongoIdParam('id'), updateStudentRules, validate, ctrl.updateStudent)
  .delete(mongoIdParam('id'), validate, ctrl.deleteStudent);

// ══════════════════════════════════════════════
// CLASSES
// ══════════════════════════════════════════════

router
  .route('/classes')
  .post(createClassRules, validate, ctrl.createClass)
  .get(ctrl.listClasses);

router
  .route('/classes/:id')
  .get(mongoIdParam('id'), validate, ctrl.getClass)
  .put(mongoIdParam('id'), updateClassRules, validate, ctrl.updateClass)
  .delete(mongoIdParam('id'), validate, ctrl.deleteClass);

router.patch(
  '/classes/:id/assign-teacher',
  mongoIdParam('id'),
  assignTeacherRules,
  validate,
  ctrl.assignTeacherToClass
);

router.patch(
  '/classes/:id/assign-students',
  mongoIdParam('id'),
  assignStudentsRules,
  validate,
  ctrl.assignStudentsToClass
);

router.delete(
  '/classes/:id/students/:studentId',
  mongoIdParam('id'),
  mongoIdParam('studentId'),
  validate,
  ctrl.removeStudentFromClass
);

// ══════════════════════════════════════════════
// TIMETABLE
// ══════════════════════════════════════════════

router
  .route('/timetables')
  .post(createTimetableRules, validate, ctrl.createTimetable)
  .get(ctrl.listTimetables);

router
  .route('/timetables/:id')
  .get(mongoIdParam('id'), validate, ctrl.getTimetable)
  .put(mongoIdParam('id'), updateTimetableRules, validate, ctrl.updateTimetable)
  .delete(mongoIdParam('id'), validate, ctrl.deleteTimetable);

module.exports = router;
