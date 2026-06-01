/**
 * src/controllers/studentController.js
 * Student-scoped views: own profile, class info, timetable
 */

const Student          = require('../models/Student');
const timetableService = require('../services/timetableService');
const ApiError         = require('../utils/ApiError');
const { sendSuccess }  = require('../utils/ApiResponse');

// GET /api/v1/students/me
exports.getMyProfile = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .populate('userId', '-password -__v')
      .populate('classId', 'name section academicYear classTeacher');
    if (!student) return next(ApiError.notFound('Student profile not found'));
    return sendSuccess(res, 200, 'Profile retrieved', { student });
  } catch (err) { next(err); }
};

// PUT /api/v1/students/me
exports.updateMyProfile = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return next(ApiError.notFound('Student profile not found'));

    // Students can only update phone, address, guardianPhone
    const allowed = ['phone', 'address', 'guardianPhone'];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const updated = await Student.findByIdAndUpdate(
      student._id, { $set: update }, { new: true, runValidators: true }
    ).populate('userId', '-password').populate('classId', 'name section');

    return sendSuccess(res, 200, 'Profile updated', { student: updated });
  } catch (err) { next(err); }
};

// GET /api/v1/students/my-timetable
exports.getMyTimetable = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return next(ApiError.notFound('Student profile not found'));

    const entries = await timetableService.getClassTimetable(
      student.classId, req.query.day
    );
    return sendSuccess(res, 200, 'Timetable retrieved', { entries });
  } catch (err) { next(err); }
};

// GET /api/v1/students/my-class
exports.getMyClass = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .populate({
        path    : 'classId',
        populate: [
          { path: 'classTeacher', populate: { path: 'userId', select: 'name email' } },
        ],
      });
    if (!student) return next(ApiError.notFound('Student profile not found'));
    return sendSuccess(res, 200, 'Class retrieved', { class: student.classId });
  } catch (err) { next(err); }
};
