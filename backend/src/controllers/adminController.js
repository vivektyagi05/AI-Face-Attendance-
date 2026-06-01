/**
 * src/controllers/adminController.js
 * Admin CRUD for teachers, students, classes, timetable entries
 */

const userService      = require('../services/userService');
const classService     = require('../services/classService');
const timetableService = require('../services/timetableService');
const { sendSuccess, sendPaginated } = require('../utils/ApiResponse');
const { buildQuery, applyActiveFilter } = require('../utils/pagination');

// ═══════════════════════════════════════════════════════════════
// TEACHER
// ═══════════════════════════════════════════════════════════════

// POST /api/v1/admin/teachers
exports.createTeacher = async (req, res, next) => {
  try {
    const result = await userService.createTeacher(req.body, req.user._id);
    return sendSuccess(res, 201, 'Teacher account created successfully', result);
  } catch (err) { next(err); }
};

// GET /api/v1/admin/teachers
exports.listTeachers = async (req, res, next) => {
  try {
    const { skip, limit, page, sort, filter } = buildQuery(req.query, ['employeeId', 'department']);
    applyActiveFilter(filter, req.query);
    if (req.query.department) filter.department = req.query.department;

    const { teachers, total } = await userService.listTeachers({
      filter, sort, skip, limit, page,
    });
    return sendPaginated(res, teachers, { page, limit, total });
  } catch (err) { next(err); }
};

// GET /api/v1/admin/teachers/:id
exports.getTeacher = async (req, res, next) => {
  try {
    const teacher = await userService.getTeacher(req.params.id);
    return sendSuccess(res, 200, 'Teacher retrieved', { teacher });
  } catch (err) { next(err); }
};

// PUT /api/v1/admin/teachers/:id
exports.updateTeacher = async (req, res, next) => {
  try {
    const teacher = await userService.updateTeacher(req.params.id, req.body);
    return sendSuccess(res, 200, 'Teacher updated successfully', { teacher });
  } catch (err) { next(err); }
};

// DELETE /api/v1/admin/teachers/:id
exports.deleteTeacher = async (req, res, next) => {
  try {
    await userService.deleteTeacher(req.params.id);
    return sendSuccess(res, 200, 'Teacher deactivated successfully');
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// STUDENT
// ═══════════════════════════════════════════════════════════════

// POST /api/v1/admin/students
exports.createStudent = async (req, res, next) => {
  try {
    const result = await userService.createStudent(req.body, req.user._id);
    return sendSuccess(res, 201, 'Student account created successfully', result);
  } catch (err) { next(err); }
};

// GET /api/v1/admin/students
exports.listStudents = async (req, res, next) => {
  try {
    const { skip, limit, page, sort, filter } = buildQuery(req.query, ['rollNumber']);
    applyActiveFilter(filter, req.query);
    if (req.query.classId) filter.classId  = req.query.classId;
    if (req.query.section)  filter.section  = req.query.section.toUpperCase();

    const { students, total } = await userService.listStudents({
      filter, sort, skip, limit, page,
    });
    return sendPaginated(res, students, { page, limit, total });
  } catch (err) { next(err); }
};

// GET /api/v1/admin/students/:id
exports.getStudent = async (req, res, next) => {
  try {
    const student = await userService.getStudent(req.params.id);
    return sendSuccess(res, 200, 'Student retrieved', { student });
  } catch (err) { next(err); }
};

// PUT /api/v1/admin/students/:id
exports.updateStudent = async (req, res, next) => {
  try {
    const student = await userService.updateStudent(req.params.id, req.body);
    return sendSuccess(res, 200, 'Student updated successfully', { student });
  } catch (err) { next(err); }
};

// DELETE /api/v1/admin/students/:id
exports.deleteStudent = async (req, res, next) => {
  try {
    await userService.deleteStudent(req.params.id);
    return sendSuccess(res, 200, 'Student deactivated successfully');
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// CLASS
// ═══════════════════════════════════════════════════════════════

// POST /api/v1/admin/classes
exports.createClass = async (req, res, next) => {
  try {
    const cls = await classService.createClass(req.body, req.user._id);
    return sendSuccess(res, 201, 'Class created successfully', { class: cls });
  } catch (err) { next(err); }
};

// GET /api/v1/admin/classes
exports.listClasses = async (req, res, next) => {
  try {
    const { skip, limit, page, sort, filter } = buildQuery(
      req.query, ['name']
    );
    applyActiveFilter(filter, req.query);
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;
    if (req.query.section)       filter.section      = req.query.section.toUpperCase();

    const { classes, total } = await classService.listClasses({
      filter, sort, skip, limit,
    });
    return sendPaginated(res, classes, { page, limit, total });
  } catch (err) { next(err); }
};

// GET /api/v1/admin/classes/:id
exports.getClass = async (req, res, next) => {
  try {
    const cls = await classService.getClass(req.params.id);
    return sendSuccess(res, 200, 'Class retrieved', { class: cls });
  } catch (err) { next(err); }
};

// PUT /api/v1/admin/classes/:id
exports.updateClass = async (req, res, next) => {
  try {
    const cls = await classService.updateClass(req.params.id, req.body);
    return sendSuccess(res, 200, 'Class updated successfully', { class: cls });
  } catch (err) { next(err); }
};

// DELETE /api/v1/admin/classes/:id
exports.deleteClass = async (req, res, next) => {
  try {
    await classService.deleteClass(req.params.id);
    return sendSuccess(res, 200, 'Class deactivated successfully');
  } catch (err) { next(err); }
};

// PATCH /api/v1/admin/classes/:id/assign-teacher
exports.assignTeacherToClass = async (req, res, next) => {
  try {
    const cls = await classService.assignClassTeacher(
      req.params.id, req.body.teacherId
    );
    return sendSuccess(res, 200, 'Class teacher assigned successfully', { class: cls });
  } catch (err) { next(err); }
};

// PATCH /api/v1/admin/classes/:id/assign-students
exports.assignStudentsToClass = async (req, res, next) => {
  try {
    const cls = await classService.assignStudentsToClass(
      req.params.id, req.body.studentIds
    );
    return sendSuccess(res, 200, 'Students assigned to class successfully', { class: cls });
  } catch (err) { next(err); }
};

// DELETE /api/v1/admin/classes/:id/students/:studentId
exports.removeStudentFromClass = async (req, res, next) => {
  try {
    await classService.removeStudentFromClass(req.params.id, req.params.studentId);
    return sendSuccess(res, 200, 'Student removed from class successfully');
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════
// TIMETABLE
// ═══════════════════════════════════════════════════════════════

// POST /api/v1/admin/timetables
exports.createTimetable = async (req, res, next) => {
  try {
    const entry = await timetableService.createEntry(req.body, req.user._id);
    return sendSuccess(res, 201, 'Timetable entry created successfully', { entry });
  } catch (err) { next(err); }
};

// GET /api/v1/admin/timetables
exports.listTimetables = async (req, res, next) => {
  try {
    const { skip, limit, page, sort, filter } = buildQuery(req.query, ['subject']);
    if (req.query.classId)   filter.classId   = req.query.classId;
    if (req.query.teacherId) filter.teacherId = req.query.teacherId;
    if (req.query.day)       filter.day       = req.query.day;
    filter.isActive = req.query.isActive !== 'false';

    const { entries, total } = await timetableService.listEntries({
      filter, sort, skip, limit,
    });
    return sendPaginated(res, entries, { page, limit, total });
  } catch (err) { next(err); }
};

// GET /api/v1/admin/timetables/:id
exports.getTimetable = async (req, res, next) => {
  try {
    const entry = await timetableService.getEntry(req.params.id);
    return sendSuccess(res, 200, 'Timetable entry retrieved', { entry });
  } catch (err) { next(err); }
};

// PUT /api/v1/admin/timetables/:id
exports.updateTimetable = async (req, res, next) => {
  try {
    const entry = await timetableService.updateEntry(req.params.id, req.body);
    return sendSuccess(res, 200, 'Timetable entry updated successfully', { entry });
  } catch (err) { next(err); }
};

// DELETE /api/v1/admin/timetables/:id
exports.deleteTimetable = async (req, res, next) => {
  try {
    await timetableService.deleteEntry(req.params.id);
    return sendSuccess(res, 200, 'Timetable entry deleted successfully');
  } catch (err) { next(err); }
};
