/**
 * src/controllers/timetableController.js
 * Timetable reads shared across roles
 */

const timetableService = require('../services/timetableService');
const Teacher          = require('../models/Teacher');
const ApiError         = require('../utils/ApiError');
const { sendSuccess }  = require('../utils/ApiResponse');

// GET /api/v1/timetables/teacher/:teacherId
exports.getTeacherTimetable = async (req, res, next) => {
  try {
    // Teachers can only view their own timetable unless they're admin
    if (req.user.role === 'teacher') {
      const profile = await Teacher.findOne({ userId: req.user._id });
      if (!profile || profile._id.toString() !== req.params.teacherId) {
        return next(ApiError.forbidden('You can only view your own timetable'));
      }
    }

    const entries = await timetableService.getTeacherTimetable(
      req.params.teacherId, req.query.day
    );
    return sendSuccess(res, 200, 'Teacher timetable retrieved', { entries });
  } catch (err) { next(err); }
};

// GET /api/v1/timetables/class/:classId
exports.getClassTimetable = async (req, res, next) => {
  try {
    const entries = await timetableService.getClassTimetable(
      req.params.classId, req.query.day
    );
    return sendSuccess(res, 200, 'Class timetable retrieved', { entries });
  } catch (err) { next(err); }
};

// GET /api/v1/timetables/:id
exports.getEntry = async (req, res, next) => {
  try {
    const entry = await timetableService.getEntry(req.params.id);
    return sendSuccess(res, 200, 'Timetable entry retrieved', { entry });
  } catch (err) { next(err); }
};
