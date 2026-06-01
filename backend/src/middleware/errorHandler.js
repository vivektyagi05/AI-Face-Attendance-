/**
 * src/middleware/errorHandler.js
 * Global 404 + error handler middleware
 */

const ApiError = require('../utils/ApiError');
const logger   = require('../utils/logger');

// ── 404 not found ─────────────────────────────────────────────
const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

// ── Handle specific Mongoose + JWT errors ─────────────────────
const normalizeError = err => {
  // Mongoose validation
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field  : e.path,
      message: e.message,
    }));
    return ApiError.unprocessable('Validation failed', errors);
  }

  // Duplicate key (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiError.conflict(`${field} already exists`);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return ApiError.badRequest(`Invalid value for field: ${err.path}`);
  }

  // JWT errors (already converted in auth middleware, but just in case)
  if (err.name === 'JsonWebTokenError') {
    return ApiError.unauthorized('Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Token expired');
  }

  return err;
};

// ── Global error handler ──────────────────────────────────────
const errorHandler = (err, req, res, _next) => {
  const normalized = normalizeError(err);

  const statusCode = normalized.statusCode || 500;
  const status     = normalized.status     || 'error';
  const message    = normalized.message    || 'Internal server error';
  const errors     = normalized.errors     || [];

  // Log 5xx errors
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} → ${statusCode}: ${message}`);
    if (err.stack) logger.error(err.stack);
  }

  const response = {
    success: false,
    status,
    message,
    ...(errors.length > 0 && { errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      raw  : err.message,
    }),
  };

  return res.status(statusCode).json(response);
};

module.exports = { notFound, errorHandler };
