/**
 * src/services/timetableService.js
 * Timetable business logic with strict overlap detection
 *
 * Overlap rule: two slots conflict if they share the same
 * (teacher OR class) AND same day AND their time ranges intersect.
 *
 * Ranges [s1,e1) and [s2,e2) overlap when: s1 < e2 && s2 < e1
 */

const Timetable = require('../models/Timetable');
const Class     = require('../models/Class');
const Teacher   = require('../models/Teacher');
const ApiError  = require('../utils/ApiError');
const logger    = require('../utils/logger');

const toMin = Timetable.toMinutes;

// ── Internal: find overlapping slots ─────────────────────────
const findOverlap = async ({
  day, startTime, endTime, teacherId, classId, excludeId = null,
}) => {
  const s = toMin(startTime);
  const e = toMin(endTime);

  const baseQuery = {
    day,
    isActive: true,
    ...(excludeId && { _id: { $ne: excludeId } }),
  };

  // All slots for this teacher on this day
  const teacherSlots = await Timetable.find({ ...baseQuery, teacherId });
  // All slots for this class on this day
  const classSlots   = await Timetable.find({ ...baseQuery, classId });

  const overlapping = [...teacherSlots, ...classSlots].filter(slot => {
    const ss = toMin(slot.startTime);
    const se = toMin(slot.endTime);
    return s < se && ss < e;   // intervals overlap
  });

  return overlapping;
};

// ── Create ────────────────────────────────────────────────────
const createEntry = async (data, createdBy) => {
  const { classId, teacherId, subject, day, startTime, endTime, room,
          academicYear, notes } = data;

  // Validate class and teacher exist
  const [cls, teacher] = await Promise.all([
    Class.findById(classId),
    Teacher.findById(teacherId),
  ]);
  if (!cls)     throw ApiError.notFound('Class not found');
  if (!teacher) throw ApiError.notFound('Teacher not found');

  // Conflict check
  const conflicts = await findOverlap({ day, startTime, endTime, teacherId, classId });
  if (conflicts.length > 0) {
    const detail = conflicts.map(c =>
      `[${c.subject} ${c.startTime}–${c.endTime} for ${
        c.teacherId.toString() === teacherId ? 'this teacher' : 'this class'
      }]`
    ).join(', ');
    throw ApiError.conflict(
      `Timetable conflict detected on ${day}: ${detail}`
    );
  }

  const entry = await Timetable.create({
    classId, teacherId, subject, day, startTime, endTime,
    room, academicYear, notes, createdBy,
  });

  // Add class to teacher's assignedClasses if not already there
  await Teacher.findByIdAndUpdate(teacherId, {
    $addToSet: { assignedClasses: classId },
  });

  logger.info(`Timetable entry created: ${day} ${startTime}–${endTime} [class ${classId}]`);
  return entry;
};

// ── Update ────────────────────────────────────────────────────
const updateEntry = async (entryId, data) => {
  const entry = await Timetable.findById(entryId);
  if (!entry) throw ApiError.notFound('Timetable entry not found');

  // Merge incoming with existing
  const day       = data.day       || entry.day;
  const startTime = data.startTime || entry.startTime;
  const endTime   = data.endTime   || entry.endTime;
  const teacherId = data.teacherId || entry.teacherId.toString();
  const classId   = data.classId   || entry.classId.toString();

  const conflicts = await findOverlap({
    day, startTime, endTime, teacherId, classId, excludeId: entryId,
  });
  if (conflicts.length > 0) {
    const detail = conflicts.map(c => `[${c.subject} ${c.startTime}–${c.endTime}]`).join(', ');
    throw ApiError.conflict(`Timetable conflict on ${day}: ${detail}`);
  }

  const allowed = ['subject','day','startTime','endTime','room','notes','isActive'];
  const update  = {};
  allowed.forEach(k => { if (data[k] !== undefined) update[k] = data[k]; });

  const updated = await Timetable.findByIdAndUpdate(
    entryId, { $set: update }, { new: true, runValidators: true }
  ).populate('classId', 'name section')
   .populate('teacherId');

  logger.info(`Timetable entry updated: ${entryId}`);
  return updated;
};

// ── Delete ────────────────────────────────────────────────────
const deleteEntry = async entryId => {
  const entry = await Timetable.findById(entryId);
  if (!entry) throw ApiError.notFound('Timetable entry not found');
  await Timetable.findByIdAndUpdate(entryId, { isActive: false });
  logger.info(`Timetable entry deactivated: ${entryId}`);
};

// ── Get by class ──────────────────────────────────────────────
const getClassTimetable = async (classId, day) => {
  const filter = { classId, isActive: true };
  if (day) filter.day = day;

  const entries = await Timetable.find(filter)
    .populate({
      path  : 'teacherId',
      populate: { path: 'userId', select: 'name email' },
    })
    .sort({ day: 1, startTime: 1 });

  return entries;
};

// ── Get by teacher ────────────────────────────────────────────
const getTeacherTimetable = async (teacherId, day) => {
  const filter = { teacherId, isActive: true };
  if (day) filter.day = day;

  const entries = await Timetable.find(filter)
    .populate('classId', 'name section academicYear')
    .sort({ day: 1, startTime: 1 });

  return entries;
};

// ── Get single entry ──────────────────────────────────────────
const getEntry = async entryId => {
  const entry = await Timetable.findById(entryId)
    .populate('classId', 'name section academicYear')
    .populate({
      path    : 'teacherId',
      populate: { path: 'userId', select: 'name email' },
    });
  if (!entry) throw ApiError.notFound('Timetable entry not found');
  return entry;
};

// ── List all (admin) ──────────────────────────────────────────
const listEntries = async ({ filter, sort, skip, limit }) => {
  const [entries, total] = await Promise.all([
    Timetable.find(filter)
      .populate('classId', 'name section')
      .populate({ path: 'teacherId', populate: { path: 'userId', select: 'name' } })
      .sort(sort).skip(skip).limit(limit),
    Timetable.countDocuments(filter),
  ]);
  return { entries, total };
};

module.exports = {
  createEntry, updateEntry, deleteEntry,
  getClassTimetable, getTeacherTimetable,
  getEntry, listEntries,
};
