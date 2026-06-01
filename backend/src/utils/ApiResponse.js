/**
 * src/utils/ApiResponse.js
 * Standardised JSON response helpers
 */

/**
 * Send a successful response
 * @param {Response} res
 * @param {number}   statusCode
 * @param {string}   message
 * @param {*}        data
 */
const sendSuccess = (res, statusCode, message, data = null) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
};

/**
 * Send a paginated list response
 * @param {Response} res
 * @param {Array}    items
 * @param {object}   meta  – { page, limit, total }
 */
const sendPaginated = (res, items, { page, limit, total }) => {
  return res.status(200).json({
    success: true,
    data   : items,
    pagination: {
      page    : parseInt(page,  10),
      limit   : parseInt(limit, 10),
      total,
      pages   : Math.ceil(total / limit),
      hasNext : page * limit < total,
      hasPrev : page > 1,
    },
  });
};

/**
 * Send an error response (used outside the global handler)
 */
const sendError = (res, statusCode, message, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { sendSuccess, sendPaginated, sendError };
