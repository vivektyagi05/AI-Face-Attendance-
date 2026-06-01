/**
 * src/models/AttendanceSession.js
 * Phase 2 – One document per class attendance session
 * Stores per-student presence, confidence scores, and AI metadata
 */

const mongoose = require('mongoose');

// ── Per-student attendance record ─────────────────────────────
const attendanceRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'Student',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref : 'User',
    },
    rollNumber: {
      type: String,
      trim: true,
    },
    studentName: {
      type: String,
      trim: true,
    },
    status: {
      type   : String,
      enum   : ['present', 'absent', 'unverified'],
      default: 'absent',
    },
    // Populated when status = 'present' via face recognition
    confidenceScore: {
      type   : Number,
      min    : 0,
      max    : 1,
      default: null,
    },
    // 'face_recognition' | 'manual_override' | 'default_absent'
    markedBy: {
      type   : String,
      enum   : ['face_recognition', 'manual_override', 'default_absent'],
      default: 'default_absent',
    },
    // If teacher manually corrected an AI decision
    overriddenBy: {
      type   : mongoose.Schema.Types.ObjectId,
      ref    : 'User',
      default: null,
    },
    overriddenAt: {
      type   : Date,
      default: null,
    },
    faceLocation: {
      // Bounding box in classroom image [top, right, bottom, left]
      type   : [Number],
      default: null,
    },
  },
  { _id: true }
);

// ── Session-level capture image metadata ─────────────────────
const captureImageSchema = new mongoose.Schema(
  {
    originalName : String,
    storedPath   : String,
    facesDetected: { type: Number, default: 0 },
    processedAt  : { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Main session schema ────────────────────────────────────────
const attendanceSessionSchema = new mongoose.Schema(
  {
    classId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'Class',
      required: [true, 'Class ID is required'],
      index   : true,
    },
    timetableId: {
      type   : mongoose.Schema.Types.ObjectId,
      ref    : 'Timetable',
      default: null,
    },
    subject: {
      type : String,
      trim : true,
    },
    date: {
      type    : Date,
      required: [true, 'Session date is required'],
      index   : true,
    },
    startTime: {
      type: String,
      trim: true,
    },
    endTime: {
      type: String,
      trim: true,
    },
    takenBy: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: [true, 'takenBy (teacher user ID) is required'],
    },
    // All students in class at session time
    records: [attendanceRecordSchema],

    // AI processing metadata
    captureImages: [captureImageSchema],
    aiProcessed  : { type: Boolean, default: false },
    aiProcessedAt: { type: Date,    default: null  },
    processingError: { type: String, default: null },

    // Confidence threshold used for this session
    confidenceThreshold: {
      type   : Number,
      default: 0.55,
    },

    // Status of the session
    status: {
      type   : String,
      enum   : ['draft', 'processing', 'completed', 'failed'],
      default: 'draft',
      index  : true,
    },

    // Denormalised counters (kept in sync on save)
    totalStudents : { type: Number, default: 0 },
    presentCount  : { type: Number, default: 0 },
    absentCount   : { type: Number, default: 0 },
    recognizedCount: { type: Number, default: 0 }, // matched by AI
    unknownFaces  : { type: Number, default: 0 },   // faces with no match

    notes: { type: String, trim: true },
    academicYear: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON    : { virtuals: true },
    toObject  : { virtuals: true },
  }
);

// ── Virtual: attendance percentage ────────────────────────────
attendanceSessionSchema.virtual('attendancePercentage').get(function () {
  if (!this.totalStudents) return 0;
  return Math.round((this.presentCount / this.totalStudents) * 100);
});

// ── Pre-save: sync counters ────────────────────────────────────
attendanceSessionSchema.pre('save', function (next) {
  this.totalStudents = this.records.length;
  this.presentCount  = this.records.filter(r => r.status === 'present').length;
  this.absentCount   = this.records.filter(r => r.status === 'absent').length;
  next();
});

// ── Compound indexes ───────────────────────────────────────────
attendanceSessionSchema.index({ classId: 1, date: -1 });
attendanceSessionSchema.index({ takenBy: 1, date: -1 });
// Prevent duplicate session for same class on same date + subject
attendanceSessionSchema.index(
  { classId: 1, date: 1, subject: 1 },
  { unique: true, name: 'unique_session_per_class_date_subject',
    partialFilterExpression: { status: { $ne: 'failed' } } }
);

const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);
module.exports = AttendanceSession;
