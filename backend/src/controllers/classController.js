/**
 * src/controllers/classController.js
 * Public-ish class reads accessible to all authenticated roles
 */

const timetableService = require('../services/timetableService');
const classService     = require('../services/classService');
const { sendSuccess }  = require('../utils/ApiResponse');

// GET /api/v1/classes/:id/timetable
exports.getClassTimetable = async (req, res, next) => {
  try {
    const entries = await timetableService.getClassTimetable(
      req.params.id,
      req.query.day
    );
    return sendSuccess(res, 200, 'Class timetable retrieved', { entries });
  } catch (err) { next(err); }
};

// GET /api/v1/classes/:id
exports.getClass = async (req, res, next) => {
  try {
    const cls = await classService.getClass(req.params.id);
    return sendSuccess(res, 200, 'Class retrieved', { class: cls });
  } catch (err) { next(err); }
};
