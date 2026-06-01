/**
 * src/routes/classRoutes.js
 * Shared class reads for all authenticated users
 */

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/classController');
const { protect, requirePasswordChange } = require('../middleware/auth');
const { mongoIdParam } = require('../utils/validators');
const validate = require('../middleware/validate');

router.use(protect, requirePasswordChange);

router.get('/:id', mongoIdParam('id'), validate, ctrl.getClass);
router.get('/:id/timetable', mongoIdParam('id'), validate, ctrl.getClassTimetable);

module.exports = router;
