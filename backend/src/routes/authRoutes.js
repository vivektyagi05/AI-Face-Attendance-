/**
 * src/routes/authRoutes.js
 * POST /api/v1/auth/login
 * POST /api/v1/auth/change-password  (protected)
 * GET  /api/v1/auth/me               (protected)
 */

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate    = require('../middleware/validate');
const {
  loginRules,
  changePasswordRules,
} = require('../utils/validators');

router.post(
  '/login',
  loginRules,
  validate,
  ctrl.login
);

router.post(
  '/change-password',
  protect,
  changePasswordRules,
  validate,
  ctrl.changePassword
);

router.get(
  '/me',
  protect,
  ctrl.getMe
);

module.exports = router;
