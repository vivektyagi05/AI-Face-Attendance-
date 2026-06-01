/**
 * src/middleware/validate.js
 * Runs after express-validator chains and throws on errors
 */

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Middleware: reads validationResult, formats errors, throws ApiError if any.
 */
const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map(err => ({
    field  : err.type === 'field' ? err.path : err.type,
    message: err.msg,
    value  : err.type === 'field' ? err.value : undefined,
  }));

  next(ApiError.badRequest('Validation failed', errors));
};

module.exports = validate;
