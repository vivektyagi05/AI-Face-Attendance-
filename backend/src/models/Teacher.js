/**
 * src/models/Teacher.js
 * Teacher profile – linked 1-to-1 with a User document
 */

const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: [true, 'User reference is required'],
      unique  : true,
      index   : true,
    },
    employeeId: {
      type  : String,
      trim  : true,
      sparse: true,   // allow multiple nulls but enforce uniqueness when present
      index : true,
    },
    department: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    subjects: {
      type   : [String],
      default: [],
    },
    assignedClasses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'Class',
      },
    ],
    qualification: {
      type: String,
      trim: true,
    },
    phone: {
      type : String,
      trim : true,
      match: [/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number'],
    },
    address: {
      type: String,
      trim: true,
    },
    profileImage: {
      type   : String,
      default: null,
    },
    joiningDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: full profile (populated on demand) ────────────────
teacherSchema.virtual('user', {
  ref        : 'User',
  localField : 'userId',
  foreignField: '_id',
  justOne    : true,
});

// ── Indexes ────────────────────────────────────────────────────
teacherSchema.index({ department: 1 });
teacherSchema.index({ subjects: 1 });

const Teacher = mongoose.model('Teacher', teacherSchema);
module.exports = Teacher;
