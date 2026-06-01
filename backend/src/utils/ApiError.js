/**
 * src/utils/ApiError.js
 * Custom operational error class with HTTP status codes
 */

class ApiError extends Error {
  /**
   * @param {number} statusCode  HTTP status code
   * @param {string} message     Human-readable message
   * @param {Array}  errors      Optional field-level validation errors
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode  = statusCode;
    this.status      = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true;   // distinguishes from programming errors
    this.errors      = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Convenience factory methods ──────────────────────────────

  static badRequest(message, errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized – please log in') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }

  static unprocessable(message, errors = []) {
    return new ApiError(422, message, errors);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
