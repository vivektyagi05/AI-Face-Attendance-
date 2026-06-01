/**
 * src/services/classService.js
 * Class management: create, update, assign teacher/students
 */

const Class    = require('../models/Class');
const Teacher  = require('../models/Teacher');
const Student  = require('../models/Student');
const ApiError = require('../utils/ApiError');
const logger   = require('../utils/logger');

// ── Create ────────────────────────────────────────────────────
const createClass = async (data, createdBy) => {
  const { name, section, academicYear, description, subjects } = data;

  // Unique constraint: name + section + academicYear
  const exists = await Class.findOne({ name, section: section.toUpperCase(), academicYear });
  if (exists) {
    throw ApiError.conflict(
      `Class "${name}" – Section ${section} (${academicYear}) already exists`
    );
  }

  const cls = await Class.create({
    name,
    section : section.toUpperCase(),
    academicYear,
    description,
    subjects : subjects || [],
    createdBy,
  });

  logger.info(`Class created: ${name} ${section} (${academicYear})`);
  return cls;
};

// ── Update ────────────────────────────────────────────────────
const updateClass = async (classId, data) => {
  const cls = await Class.findById(classId);
  if (!cls) throw ApiError.notFound('Class not found');

  const { name, section, academicYear, description, subjects, isActive } = data;

  // Check uniqueness if renaming
  if ((name || section || academicYear) &&
      (name !== cls.name || section !== cls.section || academicYear !== cls.academicYear)) {
    const n  = name         || cls.name;
    const s  = (section     || cls.section).toUpperCase();
    const ay = academicYear || cls.academicYear;
    const dup = await Class.findOne({ name: n, section: s, academicYear: ay, _id: { $ne: classId } });
    if (dup) throw ApiError.conflict(`Class "${n}" – Section ${s} (${ay}) already exists`);
  }

  const update = {};
  if (name        !== undefined) update.name        = name;
  if (section     !== undefined) update.section     = section.toUpperCase();
  if (academicYear !== undefined) update.academicYear = academicYear;
  if (description !== undefined) update.description = description;
  if (subjects    !== undefined) update.subjects    = subjects;
  if (isActive    !== undefined) update.isActive    = isActive;

  const updated = await Class.findByIdAndUpdate(
    classId, { $set: update }, { new: true, runValidators: true }
  ).populate('classTeacher').populate('students', 'userId rollNumber section');

  logger.info(`Class updated: ${classId}`);
  return updated;
};

// ── Assign class teacher ──────────────────────────────────────
const assignClassTeacher = async (classId, teacherId) => {
  const [cls, teacher] = await Promise.all([
    Class.findById(classId),
    Teacher.findById(teacherId),
  ]);
  if (!cls)     throw ApiError.notFound('Class not found');
  if (!teacher) throw ApiError.notFound('Teacher not found');

  // Remove this class from previous teacher's assignedClasses if different
  if (cls.classTeacher && cls.classTeacher.toString() !== teacherId) {
    await Teacher.findByIdAndUpdate(cls.classTeacher, {
      $pull: { assignedClasses: classId },
    });
  }

  // Assign
  await Class.findByIdAndUpdate(classId, { classTeacher: teacherId });
  await Teacher.findByIdAndUpdate(teacherId, {
    $addToSet: { assignedClasses: classId },
  });

  logger.info(`Teacher ${teacherId} assigned as class teacher to class ${classId}`);
  return Class.findById(classId)
    .populate({ path: 'classTeacher', populate: { path: 'userId', select: 'name email' } });
};

// ── Assign students to class ──────────────────────────────────
const assignStudentsToClass = async (classId, studentIds) => {
  const cls = await Class.findById(classId);
  if (!cls) throw ApiError.notFound('Class not found');

  // Validate all student IDs exist
  const students = await Student.find({ _id: { $in: studentIds } });
  if (students.length !== studentIds.length) {
    const found    = students.map(s => s._id.toString());
    const missing  = studentIds.filter(id => !found.includes(id));
    throw ApiError.notFound(`Students not found: ${missing.join(', ')}`);
  }

  // Move students from old class if they belong to one
  for (const student of students) {
    if (student.classId && student.classId.toString() !== classId) {
      await Class.findByIdAndUpdate(student.classId, { $pull: { students: student._id } });
    }
    await Student.findByIdAndUpdate(student._id, { classId });
  }

  // Add all to this class
  await Class.findByIdAndUpdate(classId, {
    $addToSet: { students: { $each: studentIds } },
  });

  logger.info(`${studentIds.length} students assigned to class ${classId}`);
  return Class.findById(classId).populate('students');
};

// ── Remove student from class ─────────────────────────────────
const removeStudentFromClass = async (classId, studentId) => {
  const [cls, student] = await Promise.all([
    Class.findById(classId),
    Student.findById(studentId),
  ]);
  if (!cls)     throw ApiError.notFound('Class not found');
  if (!student) throw ApiError.notFound('Student not found');
  if (student.classId.toString() !== classId) {
    throw ApiError.badRequest('Student does not belong to this class');
  }

  await Class.findByIdAndUpdate(classId, { $pull: { students: studentId } });
  logger.info(`Student ${studentId} removed from class ${classId}`);
};

// ── Get class ─────────────────────────────────────────────────
const getClass = async classId => {
  const cls = await Class.findById(classId)
    .populate({ path: 'classTeacher', populate: { path: 'userId', select: 'name email' } })
    .populate({ path: 'students', populate: { path: 'userId', select: 'name email' } });
  if (!cls) throw ApiError.notFound('Class not found');
  return cls;
};

// ── List classes ──────────────────────────────────────────────
const listClasses = async ({ filter, sort, skip, limit }) => {
  const [classes, total] = await Promise.all([
    Class.find(filter)
      .populate({
        path: 'classTeacher',
        populate: {
          path: 'userId',
          select: 'name email',
        },
      })
      .populate({
        path: 'students',
        populate: {
          path: 'userId',
          select: 'name email',
        },
      })
      .sort(sort)
      .skip(skip)
      .limit(limit),

    Class.countDocuments(filter),
  ]);

  return { classes, total };
};

// ── Delete class (soft) ───────────────────────────────────────
const deleteClass = async classId => {
  const cls = await Class.findById(classId);
  if (!cls) throw ApiError.notFound('Class not found');
  await Class.findByIdAndUpdate(classId, { isActive: false });
  logger.info(`Class deactivated: ${classId}`);
};

module.exports = {
  createClass, updateClass, assignClassTeacher,
  assignStudentsToClass, removeStudentFromClass,
  getClass, listClasses, deleteClass,
};
