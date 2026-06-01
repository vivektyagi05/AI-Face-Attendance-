/**
 * src/services/authService.js
 * Business logic for authentication – token generation, login, password change
 */

const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const Student  = require('../models/Student');
const Teacher  = require('../models/Teacher');
const ApiError = require('../utils/ApiError');
const logger   = require('../utils/logger');

// ── Generate signed JWT ────────────────────────────────────────
const generateToken = userId =>
  jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ── Build safe user payload to send to client ─────────────────
const buildUserPayload = async user => {
  const payload = {
    _id             : user._id,
    name            : user.name,
    email           : user.email,
    role            : user.role,
    isActive        : user.isActive,
    mustChangePassword: user.mustChangePassword,
    lastLogin       : user.lastLogin,
  };

  // Attach profile ID so frontend can navigate directly
  if (user.role === 'teacher') {
    const profile = await Teacher.findOne({ userId: user._id }).select('_id employeeId');
    if (profile) { payload.teacherId = profile._id; payload.employeeId = profile.employeeId; }
  }
  if (user.role === 'student') {
    const profile = await Student.findOne({ userId: user._id }).select('_id rollNumber classId');
    if (profile) {
      payload.studentId  = profile._id;
      payload.rollNumber = profile.rollNumber;
      payload.classId    = profile.classId;
    }
  }

  return payload;
};

// ── Login ──────────────────────────────────────────────────────
// ── Login ──────────────────────────────────────────────────────
const login = async ({ email, password, role }) => {

  // Fetch user including hashed password
  const query = { email, isActive: true };

  if (role) {
    query.role = role;
  }

  const user = await User.findOne(query).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Update last login
  user.lastLogin = new Date();

  await user.save({ validateBeforeSave: false });

  // Generate JWT
  const token = generateToken(user._id);

  // Build frontend-safe payload
  const payload = await buildUserPayload(user);

  logger.info(`Login successful: ${email} [${user.role}]`);

  return {
    token,
    user: payload,
  };
};

// ── Change password ────────────────────────────────────────────
const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from the current password');
  }

  user.password          = newPassword;
  user.mustChangePassword = false;
  await user.save();

  const token = generateToken(user._id);
  logger.info(`Password changed: userId=${userId}`);
  return { token };
};

// ── Get current user ──────────────────────────────────────────
const getMe = async userId => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return buildUserPayload(user);
};

module.exports = { generateToken, login, changePassword, getMe };
