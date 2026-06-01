/**
 * src/utils/validators.js
 * Reusable express-validator rule-sets
 */

const { body, param, query } = require('express-validator');

// ── Auth ──────────────────────────────────────────────────────

exports.loginRules = [
  body('email')
    .isEmail().withMessage('Valid email required')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'teacher', 'student']).withMessage('Invalid role'),
];

exports.changePasswordRules = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase and a number'),
  body('confirmPassword')
    .custom((val, { req }) => {
      if (val !== req.body.newPassword) throw new Error('Passwords do not match');
      return true;
    }),
];

// ── User (shared) ─────────────────────────────────────────────

exports.createUserBaseRules = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name too long'),
  body('email')
    .isEmail().withMessage('Valid email required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

// ── Teacher ───────────────────────────────────────────────────

exports.createTeacherRules = [
  body('name')
    .trim().notEmpty().withMessage('Name is required'),
  body('email')
    .isEmail().withMessage('Valid email required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('subjects')
    .optional()
    .isArray().withMessage('subjects must be an array'),
];

exports.updateTeacherRules = [
  body('name')
    .optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email')
    .optional().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('subjects')
    .optional().isArray().withMessage('subjects must be an array'),
];

// ── Student ───────────────────────────────────────────────────

exports.createStudentRules = [
  body('name')
    .trim().notEmpty().withMessage('Name is required'),
  body('email')
    .isEmail().withMessage('Valid email required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('rollNumber')
    .trim().notEmpty().withMessage('Roll number is required'),
  body('classId')
    .notEmpty().withMessage('Class ID is required')
    .isMongoId().withMessage('Invalid class ID'),
  body('section')
    .optional().trim()
    .isIn(['A', 'B', 'C', 'D', 'E']).withMessage('Section must be A–E'),
];

exports.updateStudentRules = [
  body('name')
    .optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email')
    .optional().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('rollNumber')
    .optional().trim().notEmpty().withMessage('Roll number cannot be empty'),
  body('section')
    .optional().trim()
    .isIn(['A', 'B', 'C', 'D', 'E']).withMessage('Section must be A–E'),
];

// ── Class ─────────────────────────────────────────────────────

exports.createClassRules = [
  body('name')
    .trim().notEmpty().withMessage('Class name is required')
    .isLength({ max: 100 }).withMessage('Class name too long'),
  body('section')
    .trim().notEmpty().withMessage('Section is required')
    .isIn(['A', 'B', 'C', 'D', 'E']).withMessage('Section must be A–E'),
  body('academicYear')
    .trim().notEmpty().withMessage('Academic year is required')
    .matches(/^\d{4}-\d{4}$/).withMessage('Academic year format: 2024-2025'),
];

exports.updateClassRules = [
  body('name')
    .optional().trim().notEmpty().withMessage('Class name cannot be empty'),
  body('section')
    .optional().isIn(['A', 'B', 'C', 'D', 'E']).withMessage('Section must be A–E'),
];

exports.assignTeacherRules = [
  body('teacherId')
    .notEmpty().withMessage('Teacher ID is required')
    .isMongoId().withMessage('Invalid teacher ID'),
];

exports.assignStudentsRules = [
  body('studentIds')
    .isArray({ min: 1 }).withMessage('studentIds must be a non-empty array'),
  body('studentIds.*')
    .isMongoId().withMessage('Each student ID must be a valid MongoDB ID'),
];

// ── Timetable ─────────────────────────────────────────────────

exports.createTimetableRules = [
  body('classId')
    .notEmpty().withMessage('Class ID is required')
    .isMongoId().withMessage('Invalid class ID'),
  body('teacherId')
    .notEmpty().withMessage('Teacher ID is required')
    .isMongoId().withMessage('Invalid teacher ID'),
  body('subject')
    .trim().notEmpty().withMessage('Subject is required')
    .isLength({ max: 100 }).withMessage('Subject name too long'),
  body('day')
    .isIn(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])
    .withMessage('Day must be Mon–Sat'),
  body('startTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('startTime must be HH:MM (24-hr)'),
  body('endTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('endTime must be HH:MM (24-hr)')
    .custom((endTime, { req }) => {
      if (endTime <= req.body.startTime)
        throw new Error('endTime must be after startTime');
      return true;
    }),
];

exports.updateTimetableRules = [
  body('subject')
    .optional().trim().notEmpty().withMessage('Subject cannot be empty'),
  body('day')
    .optional()
    .isIn(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])
    .withMessage('Day must be Mon–Sat'),
  body('startTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('startTime must be HH:MM (24-hr)'),
  body('endTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('endTime must be HH:MM (24-hr)'),
];

// ── Common param ──────────────────────────────────────────────

exports.mongoIdParam = (paramName = 'id') => [
  param(paramName)
    .isMongoId().withMessage(`${paramName} must be a valid MongoDB ID`),
];
