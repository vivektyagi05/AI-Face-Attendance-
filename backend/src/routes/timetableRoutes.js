/**
 * src/routes/timetableRoutes.js
 * Shared timetable reads for all authenticated users
 */

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/timetableController');
const { protect, requirePasswordChange } = require('../middleware/auth');
const { mongoIdParam } = require('../utils/validators');
const validate = require('../middleware/validate');

router.use(protect, requirePasswordChange);

router.get('/teacher/:teacherId', mongoIdParam('teacherId'), validate, ctrl.getTeacherTimetable);
router.get('/class/:classId',     mongoIdParam('classId'),   validate, ctrl.getClassTimetable);
router.get('/:id',                mongoIdParam('id'),         validate, ctrl.getEntry);

module.exports = router;
