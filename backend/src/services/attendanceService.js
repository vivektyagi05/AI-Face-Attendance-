/**
 * src/services/attendanceService.js
 * Phase 2 – Attendance business logic:
 *   - registerStudentFace   : extract & store embeddings
 *   - processClassroomImage : run AI recognition, build session records
 *   - getSession            : fetch a session with populated records
 *   - listSessions          : paginated session list
 *   - overrideRecord        : teacher manually corrects AI decision
 *   - getStudentAttendance  : aggregated student attendance report
 *   - getClassReport        : class-level attendance analytics
 */

const fs     = require('fs').promises;
const path   = require('path');
const mongoose = require('mongoose');

const AttendanceSession = require('../models/AttendanceSession');
const Student    = require('../models/Student');
const Class      = require('../models/Class');
const User       = require('../models/User');
const aiService  = require('./aiService');
const ApiError   = require('../utils/ApiError');
const logger     = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// 1. REGISTER STUDENT FACE
// ─────────────────────────────────────────────────────────────
/**
 * Accepts 3–5 face images for a student, calls AI service to extract
 * 128-d embeddings, and persists them in the Student document.
 *
 * @param {string}   studentId   – Student._id
 * @param {string[]} imagePaths  – Absolute paths to uploaded images
 * @returns {Promise<{ student, embeddingCount }>}
 */
const registerStudentFace = async (studentId, imagePaths) => {
  if (!imagePaths || imagePaths.length < 3) {
    throw ApiError.badRequest('At least 3 face images are required for registration');
  }
  if (imagePaths.length > 5) {
    throw ApiError.badRequest('Maximum 5 face images allowed for registration');
  }

  const student = await Student.findById(studentId).populate('userId', 'name email');
  if (!student)          throw ApiError.notFound('Student not found');
  if (!student.isActive) throw ApiError.badRequest('Cannot register face for an inactive student');

  // Call AI service
  const aiResult = await aiService.extractEmbeddings(imagePaths, studentId);

  if (!aiResult.success || !aiResult.embeddings || aiResult.embeddings.length === 0) {
    throw ApiError.unprocessable(
      aiResult.message || 'AI service could not extract face embeddings. ' +
      'Ensure the images contain a clearly visible front-facing face.'
    );
  }

  // Persist embeddings in Student document
  // faceEmbeddings is [[number]*128, ...] – one 128-d vector per source image
  await Student.findByIdAndUpdate(
    studentId,
    {
      $set: {
        faceEmbeddings : aiResult.embeddings,
        faceRegistered : true,
      },
    },
    { runValidators: false }
  );

  // Clean up uploaded temp files after storing embeddings
  await Promise.allSettled(imagePaths.map(p => fs.unlink(p)));

  logger.info(
    `Face registered: studentId=${studentId}, ` +
    `embeddings=${aiResult.embeddings.length}`
  );

  return {
    student      : student.userId?.name || studentId,
    embeddingCount: aiResult.embeddings.length,
    message      : 'Face registered successfully',
  };
};

// ─────────────────────────────────────────────────────────────
// 2. PROCESS CLASSROOM IMAGE → CREATE ATTENDANCE SESSION
// ─────────────────────────────────────────────────────────────
/**
 * Main attendance-taking flow:
 *  1. Validate class, ensure students have face embeddings
 *  2. Call AI service with classroom image + all embeddings
 *  3. Build attendance records (present / absent)
 *  4. Deduplicate: if the same student matched twice, keep highest confidence
 *  5. Persist AttendanceSession
 *
 * @param {{
 *   classId            : string,
 *   takenBy            : string,   User._id of teacher
 *   imagePath          : string,   absolute path to uploaded classroom image
 *   originalImageName  : string,
 *   subject            : string,
 *   date               : string|Date,
 *   startTime          : string,
 *   endTime            : string,
 *   timetableId?       : string,
 *   confidenceThreshold: number,
 *   academicYear?      : string,
 *   notes?             : string,
 * }} params
 */
const processClassroomImage = async (params) => {
  const {
    classId, takenBy, imagePath, originalImageName,
    subject, date, startTime, endTime,
    timetableId, confidenceThreshold = 0.55,
    academicYear, notes,
  } = params;

  // ── 1. Validate class ─────────────────────────────────────
  const classDoc = await Class.findById(classId).populate({
    path   : 'students',
    match  : { isActive: true },
    select : 'userId rollNumber section faceEmbeddings faceRegistered',
    populate: { path: 'userId', select: 'name' },
  });

  if (!classDoc) throw ApiError.notFound('Class not found');
  if (!classDoc.isActive) throw ApiError.badRequest('Class is deactivated');

  const allStudents = classDoc.students || [];
  if (allStudents.length === 0) {
    throw ApiError.badRequest('No active students found in this class');
  }

  const sessionDate = new Date(date);
  sessionDate.setHours(0, 0, 0, 0);

  // ── 2. Check for existing session (same class / date / subject) ─
  const existingSession = await AttendanceSession.findOne({
    classId,
    date   : sessionDate,
    subject: subject || '',
    status : { $ne: 'failed' },
  });
  if (existingSession) {
    throw ApiError.conflict(
      `An attendance session for "${subject}" on ` +
      `${sessionDate.toDateString()} already exists. ` +
      `Session ID: ${existingSession._id}`
    );
  }

  // ── 3. Build per-student embedding payload for AI ─────────
  const registeredStudents = allStudents.filter(
    s => s.faceRegistered && s.faceEmbeddings && s.faceEmbeddings.length > 0
  );

  if (registeredStudents.length === 0) {
    throw ApiError.badRequest(
      'No students in this class have registered face data. ' +
      'Please register student faces before taking attendance.'
    );
  }

  const studentEmbeddings = registeredStudents.map(s => ({
    studentId  : s._id.toString(),
    rollNumber : s.rollNumber,
    studentName: s.userId?.name || s.rollNumber,
    embeddings : s.faceEmbeddings,   // [[float * 128], ...]
  }));

  // ── 4. Create session as 'processing' ────────────────────
  const session = await AttendanceSession.create({
    classId,
    timetableId: timetableId || null,
    subject    : subject || 'General',
    date       : sessionDate,
    startTime, endTime,
    takenBy,
    captureImages: [{
      originalName  : originalImageName,
      storedPath    : imagePath,
      facesDetected : 0,
      processedAt   : new Date(),
    }],
    confidenceThreshold,
    academicYear: academicYear || '',
    notes       : notes || '',
    status      : 'processing',
    // Pre-fill all students as absent
    records: allStudents.map(s => ({
      studentId  : s._id,
      userId     : s.userId?._id || null,
      rollNumber : s.rollNumber,
      studentName: s.userId?.name || s.rollNumber,
      status     : 'absent',
      markedBy   : 'default_absent',
    })),
  });

  // ── 5. Call AI recognition service ───────────────────────
  let aiResult;
  try {
    aiResult = await aiService.recognizeFaces(
      imagePath, studentEmbeddings, confidenceThreshold
    );
  } catch (aiErr) {
    // Mark session as failed so it doesn't block a retry
    await AttendanceSession.findByIdAndUpdate(session._id, {
      status        : 'failed',
      processingError: aiErr.message,
    });
    // Clean up uploaded image
    await fs.unlink(imagePath).catch(() => {});
    throw aiErr;
  }

  // ── 6. Apply AI matches to session records ────────────────
  // Deduplicate: same student recognised multiple times → keep highest confidence
  const bestMatchMap = new Map();
  // key: studentId string, value: { confidence, match }

  for (const match of (aiResult.matches || [])) {
    const existing = bestMatchMap.get(match.studentId);
    if (!existing || match.confidence > existing.confidence) {
      bestMatchMap.set(match.studentId, match);
    }
  }

  let recognizedCount = 0;
  for (const [matchedStudentId, match] of bestMatchMap) {
    const recordIdx = session.records.findIndex(
      r => r.studentId.toString() === matchedStudentId
    );
    if (recordIdx === -1) continue; // AI matched someone not in this class — skip

    if (match.confidence >= confidenceThreshold) {
      session.records[recordIdx].status          = 'present';
      session.records[recordIdx].markedBy        = 'face_recognition';
      session.records[recordIdx].confidenceScore = match.confidence;
      session.records[recordIdx].faceLocation   = match.faceLocation || null;
      recognizedCount++;
    }
  }

  // Update capture image stats
  if (session.captureImages.length > 0) {
    session.captureImages[0].facesDetected = aiResult.totalFaces || 0;
  }

  session.aiProcessed    = true;
  session.aiProcessedAt  = new Date();
  session.recognizedCount = recognizedCount;
  session.unknownFaces   = aiResult.unknownFaces || 0;
  session.status         = 'completed';

  await session.save();

  // ── 7. Clean up classroom image after processing ──────────
  await fs.unlink(imagePath).catch(() => {});

  logger.info(
    `Attendance processed: sessionId=${session._id}, ` +
    `class=${classId}, present=${session.presentCount}/${session.totalStudents}`
  );

  return populateSession(session._id);
};

// ─────────────────────────────────────────────────────────────
// 3. MANUALLY OVERRIDE A RECORD
// ─────────────────────────────────────────────────────────────
const overrideRecord = async (sessionId, studentId, newStatus, overriddenBy) => {
  const validStatuses = ['present', 'absent'];
  if (!validStatuses.includes(newStatus)) {
    throw ApiError.badRequest(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  const session = await AttendanceSession.findById(sessionId);
  if (!session) throw ApiError.notFound('Attendance session not found');
  if (session.status !== 'completed') {
    throw ApiError.badRequest('Can only override records on a completed session');
  }

  const record = session.records.find(
    r => r.studentId.toString() === studentId.toString()
  );
  if (!record) {
    throw ApiError.notFound('Student record not found in this session');
  }

  record.status       = newStatus;
  record.markedBy     = 'manual_override';
  record.overriddenBy = overriddenBy;
  record.overriddenAt = new Date();

  await session.save();
  logger.info(`Override: session=${sessionId}, student=${studentId}, status=${newStatus}`);
  return populateSession(session._id);
};

// ─────────────────────────────────────────────────────────────
// 4. GET SINGLE SESSION
// ─────────────────────────────────────────────────────────────
const getSession = async sessionId => {
  const session = await populateSession(sessionId);
  if (!session) throw ApiError.notFound('Attendance session not found');
  return session;
};

// ─────────────────────────────────────────────────────────────
// 5. LIST SESSIONS (paginated)
// ─────────────────────────────────────────────────────────────
const listSessions = async ({ filter, sort, skip, limit }) => {
  const [sessions, total] = await Promise.all([
    AttendanceSession.find(filter)
      .populate('classId', 'name section')
      .populate('takenBy', 'name email')
      .select('-records -captureImages')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    AttendanceSession.countDocuments(filter),
  ]);
  return { sessions, total };
};

// ─────────────────────────────────────────────────────────────
// 6. STUDENT ATTENDANCE REPORT
// ─────────────────────────────────────────────────────────────
/**
 * Aggregated attendance stats for a single student across all sessions.
 * Returns per-session details + summary.
 */
const getStudentAttendance = async (studentId, { classId, startDate, endDate }) => {
  const student = await Student.findById(studentId)
    .populate('userId', 'name email')
    .populate('classId', 'name section');
  if (!student) throw ApiError.notFound('Student not found');

  const filter = {
    classId: student.classId._id,
    status : 'completed',
    'records.studentId': student._id,
  };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate)   filter.date.$lte = new Date(endDate);
  }
  if (classId) filter.classId = classId;

  const sessions = await AttendanceSession.find(filter)
    .populate('classId', 'name section')
    .sort({ date: -1 });

  const records = sessions.map(session => {
    const rec = session.records.find(
      r => r.studentId.toString() === studentId.toString()
    );
    return {
      sessionId      : session._id,
      date           : session.date,
      subject        : session.subject,
      class          : session.classId,
      status         : rec?.status        || 'absent',
      confidenceScore: rec?.confidenceScore || null,
      markedBy       : rec?.markedBy      || 'default_absent',
    };
  });

  const totalSessions  = records.length;
  const presentSessions = records.filter(r => r.status === 'present').length;
  const attendancePct  = totalSessions
    ? Math.round((presentSessions / totalSessions) * 100)
    : 0;

  return {
    student: {
      _id       : student._id,
      name      : student.userId?.name,
      rollNumber: student.rollNumber,
      class     : student.classId,
    },
    summary: {
      totalSessions,
      presentSessions,
      absentSessions: totalSessions - presentSessions,
      attendancePercentage: attendancePct,
    },
    records,
  };
};

// ─────────────────────────────────────────────────────────────
// 7. CLASS ATTENDANCE REPORT
// ─────────────────────────────────────────────────────────────
const getClassReport = async (classId, { startDate, endDate }) => {
  const filter = { classId, status: 'completed' };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate)   filter.date.$lte = new Date(endDate);
  }

  const sessions = await AttendanceSession.find(filter).sort({ date: 1 });

  const totalSessions = sessions.length;
  if (totalSessions === 0) {
    return { totalSessions: 0, sessions: [], studentSummaries: [] };
  }

  // Build per-student attendance count
  const studentMap = new Map(); // studentId → { name, rollNumber, presentCount }
  for (const session of sessions) {
    for (const rec of session.records) {
      const key = rec.studentId.toString();
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          studentId   : rec.studentId,
          studentName : rec.studentName,
          rollNumber  : rec.rollNumber,
          presentCount: 0,
        });
      }
      if (rec.status === 'present') {
        studentMap.get(key).presentCount++;
      }
    }
  }

  const studentSummaries = [...studentMap.values()].map(s => ({
    ...s,
    absentCount: totalSessions - s.presentCount,
    percentage : Math.round((s.presentCount / totalSessions) * 100),
  })).sort((a, b) => a.rollNumber?.localeCompare(b.rollNumber));

  const overallAvg = studentSummaries.length
    ? Math.round(
        studentSummaries.reduce((acc, s) => acc + s.percentage, 0) /
        studentSummaries.length
      )
    : 0;

  return {
    totalSessions,
    overallAverageAttendance: overallAvg,
    sessions: sessions.map(s => ({
      sessionId     : s._id,
      date          : s.date,
      subject       : s.subject,
      presentCount  : s.presentCount,
      absentCount   : s.absentCount,
      totalStudents : s.totalStudents,
      percentage    : s.attendancePercentage,
    })),
    studentSummaries,
  };
};

// ─────────────────────────────────────────────────────────────
// Internal: populate session with full references
// ─────────────────────────────────────────────────────────────
const populateSession = sessionId =>
  AttendanceSession.findById(sessionId)
    .populate('classId',  'name section academicYear')
    .populate('takenBy',  'name email role')
    .populate('timetableId', 'subject day startTime endTime')
    .populate('records.studentId', 'rollNumber section')
    .populate('records.userId',    'name email')
    .populate('records.overriddenBy', 'name email');

module.exports = {
  registerStudentFace,
  processClassroomImage,
  overrideRecord,
  getSession,
  listSessions,
  getStudentAttendance,
  getClassReport,
};
