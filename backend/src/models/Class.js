/**
 * src/models/Class.js
 * Academic class / batch model
 */

const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: {
      type    : String,
      required: [true, 'Class name is required'],
      trim    : true,
      maxlength: [100, 'Class name cannot exceed 100 characters'],
    },
    section: {
      type    : String,
      required: [true, 'Section is required'],
      trim    : true,
      uppercase: true,
      enum    : {
        values : ['A', 'B', 'C', 'D', 'E'],
        message: 'Section must be A, B, C, D, or E',
      },
    },
    academicYear: {
      type    : String,
      required: [true, 'Academic year is required'],
      trim    : true,
      match   : [/^\d{4}-\d{4}$/, 'Academic year format: 2024-2025'],
    },
    classTeacher: {
      type   : mongoose.Schema.Types.ObjectId,
      ref    : 'Teacher',
      default: null,
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'Student',
      },
    ],
    subjects: {
      type   : [String],
      default: [],
    },
    isActive: {
      type   : Boolean,
      default: true,
      index  : true,
    },
    description: {
      type: String,
      trim: true,
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

// ── Virtual: student count ──────────────────────────────────────
classSchema.virtual('studentCount').get(function () {
  return this.students ? this.students.length : 0;
});

// ── Unique constraint: name + section + academicYear ───────────
classSchema.index(
  { name: 1, section: 1, academicYear: 1 },
  { unique: true, name: 'class_unique_constraint' }
);
classSchema.index({ classTeacher: 1 });
classSchema.index({ academicYear: 1, isActive: 1 });

const Class = mongoose.model('Class', classSchema);
module.exports = Class;
