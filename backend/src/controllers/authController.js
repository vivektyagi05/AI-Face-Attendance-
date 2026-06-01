/**
 * src/controllers/authController.js
 * Auth endpoints: login, change-password, get-me
 */

const authService = require('../services/authService');
const { sendSuccess } = require('../utils/ApiResponse');

// POST /api/v1/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const result = await authService.login({ email, password, role });
    return sendSuccess(res, 200, 'Login successful', result);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/change-password  (protected)
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user._id, {
      currentPassword, newPassword,
    });
    return sendSuccess(res, 200, 'Password changed successfully', result);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/auth/me  (protected)
exports.getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id);
    return sendSuccess(res, 200, 'User profile retrieved', { user });
  } catch (err) {
    next(err);
  }
};
