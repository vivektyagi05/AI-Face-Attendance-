/**
 * src/middleware/auth.js
 * JWT authentication and role-based access control
 */

const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger  = require('../utils/logger');

// ── protect ──────────────────────────────────────────────────
/**
 * Verify Bearer JWT and attach req.user.
 * Also rejects tokens issued before a password change.
 */
const protect = async (req, _res, next) => {
  try {
    // 1. Extract token
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return next(ApiError.unauthorized('Authentication required – please log in.'));
    }

    // 2. Verify signature + expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(ApiError.unauthorized('Your session has expired – please log in again.'));
      }
      return next(ApiError.unauthorized('Invalid token – please log in again.'));
    }

    // 3. User still exists and is active
    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      return next(ApiError.unauthorized('The user belonging to this token no longer exists.'));
    }
    if (!user.isActive) {
      return next(ApiError.unauthorized('Your account has been deactivated. Contact an administrator.'));
    }

    // 4. Password not changed after token was issued
    if (user.passwordChangedAfter(decoded.iat)) {
      return next(ApiError.unauthorized('Password was recently changed – please log in again.'));
    }

    // 5. Attach to request
    req.user = user;
    next();
  } catch (err) {
    logger.error(`protect middleware error: ${err.message}`);
    next(ApiError.internal());
  }
};

// ── restrictTo ────────────────────────────────────────────────
/**
 * Factory returning middleware that allows only specified roles.
 * @param  {...string} roles
 */
const restrictTo = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(
      ApiError.forbidden(
        `Your role (${req.user.role}) does not have access to this resource.`
      )
    );
  }
  next();
};

// ── mustChangePassword gate ───────────────────────────────────
/**
 * Forces users with mustChangePassword=true to change password
 * before accessing any other route.
 */
const requirePasswordChange = (req, _res, next) => {
  if (req.user.mustChangePassword) {
    return next(
      ApiError.forbidden(
        'You must change your temporary password before proceeding. ' +
        'Use POST /api/v1/auth/change-password'
      )
    );
  }
  next();
};

module.exports = { protect, restrictTo, requirePasswordChange };
