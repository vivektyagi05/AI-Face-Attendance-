/**
 * src/controllers/attendanceController.js
 * Phase 2 – Attendance endpoints
 *
 * POST /api/v1/attendance/register-face/:studentId  (admin/teacher)
 * POST /api/v1/attendance/take                      (teacher)
 * GET  /api/v1/attendance/sessions/:sessionId       (admin/teacher)
 * GET  /api/v1/attendance/sessions                  (admin/teacher – paginated)
 * PATCH /api/v1/attendance/sessions/:sessionId/override  (teacher)
 * GET  /api/v1/attendance/student/:studentId/report (admin/teacher/student-self)
 * GET  /api/v1/attendance/class/:classId/report     (admin/teacher)
 * GET  /api/v1/attendance/ai-health                 (admin)
 */

const attendanceService = require('../services/attendanceService');
const aiService         = require('../services/aiService');
const { sendSuccess, sendPaginated } = require('../utils/ApiResponse');
const { buildQuery }    = require('../utils/pagination');
const ApiError          = require('../utils/ApiError');
const Student           = require('../models/Student');

// ── POST /api/v1/attendance/register-face/:studentId ──────────
exports.registerFace = async (req, res, next) => {
  try {
    if (!req.files || req.files.length < 3) {
      return next(ApiError.badRequest(
        `At least 3 face images required. You uploaded ${req.files?.length || 0}.`
      ));
    }

    const imagePaths = req.files.map(f => f.path);
    const result = await attendanceService.registerStudentFace(
      req.params.studentId,
      imagePaths
    );

    return sendSuccess(res, 200, result.message, {
      studentName   : result.student,
      embeddingCount: result.embeddingCount,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/attendance/take ──────────────────────────────
exports.takeAttendance = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(ApiError.badRequest('Classroom image is required (field: classroomImage)'));
    }

    const {
      classId, subject, date, startTime, endTime,
      timetableId, confidenceThreshold, academicYear, notes,
    } = req.body;

    if (!classId) return next(ApiError.badRequest('classId is required'));
    if (!date)    return next(ApiError.badRequest('date is required'));

    const threshold = confidenceThreshold
      ? parseFloat(confidenceThreshold)
      : 0.55;

    if (isNaN(threshold) || threshold < 0.3 || threshold > 0.95) {
      return next(ApiError.badRequest('confidenceThreshold must be between 0.3 and 0.95'));
    }

    const session = await attendanceService.processClassroomImage({
      classId,
      takenBy           : req.user._id,
      imagePath         : req.file.path,
      originalImageName : req.file.originalname,
      subject           : subject || 'General',
      date,
      startTime         : startTime || '',
      endTime           : endTime   || '',
      timetableId       : timetableId   || null,
      confidenceThreshold: threshold,
      academicYear      : academicYear  || '',
      notes             : notes         || '',
    });

    return sendSuccess(res, 201, 'Attendance session created and processed', { session });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/attendance/sessions ───────────────────────────
exports.listSessions = async (req, res, next) => {
  try {
    const { skip, limit, page, sort, filter } = buildQuery(
      req.query, ['subject']
    );

    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.takenBy) filter.takenBy  = req.query.takenBy;
    if (req.query.status)  filter.status   = req.query.status;
    if (req.query.subject) filter.subject  = { $regex: req.query.subject, $options: 'i' };

    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate)   filter.date.$lte = new Date(req.query.endDate);
    }

    // Teachers only see sessions they created
    if (req.user.role === 'teacher') {
      filter.takenBy = req.user._id;
    }

    const { sessions, total } = await attendanceService.listSessions({
      filter, sort, skip, limit,
    });

    return sendPaginated(res, sessions, { page, limit, total });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/attendance/sessions/:sessionId ────────────────
exports.getSession = async (req, res, next) => {
  try {
    const session = await attendanceService.getSession(req.params.sessionId);
    return sendSuccess(res, 200, 'Session retrieved', { session });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/v1/attendance/sessions/:sessionId/override ─────
exports.overrideRecord = async (req, res, next) => {
  try {
    const { studentId, status } = req.body;
    if (!studentId) return next(ApiError.badRequest('studentId is required'));
    if (!status)    return next(ApiError.badRequest('status is required'));

    const session = await attendanceService.overrideRecord(
      req.params.sessionId,
      studentId,
      status,
      req.user._id
    );

    return sendSuccess(res, 200, 'Attendance record updated', { session });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/attendance/student/:studentId/report ──────────
exports.getStudentReport = async (req, res, next) => {
  try {
    // Students can only view their own report
    if (req.user.role === 'student') {
      const profile = await Student.findOne({ userId: req.user._id });
      if (!profile || profile._id.toString() !== req.params.studentId) {
        return next(ApiError.forbidden('You can only view your own attendance report'));
      }
    }

    const report = await attendanceService.getStudentAttendance(
      req.params.studentId,
      {
        classId   : req.query.classId,
        startDate : req.query.startDate,
        endDate   : req.query.endDate,
      }
    );

    return sendSuccess(res, 200, 'Student attendance report retrieved', { report });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/attendance/class/:classId/report ──────────────
exports.getClassReport = async (req, res, next) => {
  try {
    const report = await attendanceService.getClassReport(
      req.params.classId,
      {
        startDate: req.query.startDate,
        endDate  : req.query.endDate,
      }
    );
    return sendSuccess(res, 200, 'Class attendance report retrieved', { report });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/attendance/ai-health ──────────────────────────
exports.aiHealthCheck = async (req, res, next) => {
  try {
    const health = await aiService.healthCheck();
    const statusCode = health.available ? 200 : 503;
    return res.status(statusCode).json({
      success: health.available,
      message: health.available ? 'AI service is healthy' : 'AI service unavailable',
      data   : health,
    });
  } catch (err) {
    next(err);
  }
};
