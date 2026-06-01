/**
 * src/models/Timetable.js
 * Weekly timetable entry – one slot per class/teacher/day/time
 * Business rules enforced via schema validators + service-layer checks:
 *   1. No teacher double-booking  (same teacher, same day, overlapping time)
 *   2. No class double-booking    (same class, same day, overlapping time)
 */

const mongoose = require('mongoose');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper: "09:30" → minutes since midnight
const toMinutes = timeStr => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const timetableSchema = new mongoose.Schema(
  {
    classId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'Class',
      required: [true, 'Class ID is required'],
      index   : true,
    },
    teacherId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'Teacher',
      required: [true, 'Teacher ID is required'],
      index   : true,
    },
    subject: {
      type    : String,
      required: [true, 'Subject is required'],
      trim    : true,
      maxlength: [100, 'Subject name too long'],
    },
    day: {
      type    : String,
      required: [true, 'Day is required'],
      enum    : {
        values : DAYS,
        message: `Day must be one of: ${DAYS.join(', ')}`,
      },
      index: true,
    },
    startTime: {
      type    : String,
      required: [true, 'Start time is required'],
      match   : [/^([01]\d|2[0-3]):([0-5]\d)$/, 'startTime must be HH:MM format'],
    },
    endTime: {
      type    : String,
      required: [true, 'End time is required'],
      match   : [/^([01]\d|2[0-3]):([0-5]\d)$/, 'endTime must be HH:MM format'],
    },
    room: {
      type: String,
      trim: true,
    },
    isActive: {
      type   : Boolean,
      default: true,
    },
    academicYear: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref : 'User',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: duration in minutes ──────────────────────────────
timetableSchema.virtual('durationMinutes').get(function () {
  return toMinutes(this.endTime) - toMinutes(this.startTime);
});

// ── Schema-level validation: endTime > startTime ───────────────
timetableSchema.pre('validate', function (next) {
  if (this.startTime && this.endTime) {
    if (toMinutes(this.endTime) <= toMinutes(this.startTime)) {
      this.invalidate('endTime', 'endTime must be after startTime');
    }
  }
  next();
});

// ── Indexes ───────────────────────────────────────────────────
timetableSchema.index({ classId: 1, day: 1, startTime: 1 });
timetableSchema.index({ teacherId: 1, day: 1, startTime: 1 });
timetableSchema.index({ classId: 1, teacherId: 1, day: 1 });

const Timetable = mongoose.model('Timetable', timetableSchema);

// Export the helper so the service layer can reuse it
Timetable.toMinutes = toMinutes;

module.exports = Timetable;
