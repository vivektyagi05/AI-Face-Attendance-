/**
 * src/models/Student.js
 * Student profile – linked 1-to-1 with a User document
 */

const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: [true, 'User reference is required'],
      unique  : true,
      index   : true,
    },
    classId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'Class',
      required: [true, 'Class reference is required'],
      index   : true,
    },
    section: {
      type     : String,
      trim     : true,
      uppercase: true,
      enum     : {
        values : ['A', 'B', 'C', 'D', 'E'],
        message: 'Section must be A–E',
      },
    },
    rollNumber: {
      type    : String,
      required: [true, 'Roll number is required'],
      trim    : true,
    },
    admissionNumber: {
      type  : String,
      trim  : true,
      sparse: true,
      index : true,
    },
    // Face recognition embeddings (128-dim vectors) – stored for Phase 2
    faceEmbeddings: {
      type   : [[Number]],
      default: [],
      select : false,   // never returned unless explicitly projected
    },
    faceRegistered: {
      type   : Boolean,
      default: false,
    },
    phone: {
      type : String,
      trim : true,
    },
    address: {
      type: String,
      trim: true,
    },
    guardianName: {
      type: String,
      trim: true,
    },
    guardianPhone: {
      type: String,
      trim: true,
    },
    subjects: {
      type: [String],
      default: [],
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    profileImage: {
      type   : String,
      default: null,
    },
    isActive: {
      type   : Boolean,
      default: true,
      index  : true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref : 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Unique rollNumber per class ──────────────────────────────
studentSchema.index(
  { classId: 1, rollNumber: 1 },
  { unique: true, name: 'student_roll_class_unique' }
);
studentSchema.index({ classId: 1, section: 1 });

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;
