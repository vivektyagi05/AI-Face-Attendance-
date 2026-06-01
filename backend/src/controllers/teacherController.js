/**
 * src/controllers/teacherController.js
 * Teacher-scoped read-only views of their own profile, classes, timetable
 */

const Teacher          = require('../models/Teacher');
const userService      = require('../services/userService');
const timetableService = require('../services/timetableService');
const classService     = require('../services/classService');
const ApiError         = require('../utils/ApiError');
const { sendSuccess }  = require('../utils/ApiResponse');

// GET /api/v1/teachers/me  – own profile
exports.getMyProfile = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user._id })
      .populate('userId', '-password -__v')
      .populate('assignedClasses', 'name section academicYear');
    if (!teacher) return next(ApiError.notFound('Teacher profile not found'));
    return sendSuccess(res, 200, 'Profile retrieved', { teacher });
  } catch (err) { next(err); }
};

// PUT /api/v1/teachers/me  – update own profile (limited fields)
exports.updateMyProfile = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) return next(ApiError.notFound('Teacher profile not found'));

    // Teachers can only update their own phone, address, qualification
    const allowed = ['phone', 'address', 'qualification'];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const updated = await Teacher.findByIdAndUpdate(
      teacher._id, { $set: update }, { new: true, runValidators: true }
    ).populate('userId', '-password');

    return sendSuccess(res, 200, 'Profile updated', { teacher: updated });
  } catch (err) { next(err); }
};

// GET /api/v1/teachers/my-timetable
exports.getMyTimetable = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) return next(ApiError.notFound('Teacher profile not found'));

    const entries = await timetableService.getTeacherTimetable(
      teacher._id, req.query.day
    );
    return sendSuccess(res, 200, 'Timetable retrieved', { entries });
  } catch (err) { next(err); }
};

// GET /api/v1/teachers/my-classes
exports.getMyClasses = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user._id })
      .populate({
        path    : 'assignedClasses',
        match   : { isActive: true },
        populate: { path: 'students', select: 'rollNumber section userId' },
      });
    if (!teacher) return next(ApiError.notFound('Teacher profile not found'));

    return sendSuccess(res, 200, 'Classes retrieved', {
      classes: teacher.assignedClasses,
    });
  } catch (err) { next(err); }
};

// GET /api/v1/teachers/class/:classId/students
exports.getClassStudents = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) return next(ApiError.notFound('Teacher profile not found'));

    // Verify teacher is assigned to this class
    const isAssigned = teacher.assignedClasses
      .some(c => c.toString() === req.params.classId);
    if (!isAssigned) {
      return next(ApiError.forbidden('You are not assigned to this class'));
    }

    const cls = await classService.getClass(req.params.classId);
    return sendSuccess(res, 200, 'Students retrieved', {
      class   : { _id: cls._id, name: cls.name, section: cls.section },
      students: cls.students,
    });
  } catch (err) { next(err); }
};
