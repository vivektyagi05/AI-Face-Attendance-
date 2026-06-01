/**
 * src/utils/pagination.js
 * Reusable pagination + sorting + search builder for Mongoose queries
 */

/**
 * Parse query params and return { skip, limit, page, sort, filter }
 * @param {object} query  req.query
 * @param {Array}  searchFields  fields to apply text search on (e.g. ['name','email'])
 */
const buildQuery = (query, searchFields = []) => {
  const page  = Math.max(parseInt(query.page,  10) || 1, 1);
  const limit = Math.min(parseInt(query.limit, 10) || 10, 100);
  const skip  = (page - 1) * limit;

  // ── Sort ──────────────────────────────────────────────────────
  let sort = { createdAt: -1 };
  if (query.sortBy) {
    const dir = query.order === 'asc' ? 1 : -1;
    sort = { [query.sortBy]: dir };
  }

  // ── Search ────────────────────────────────────────────────────
  const filter = {};
  if (query.search && searchFields.length > 0) {
    filter.$or = searchFields.map(field => ({
      [field]: { $regex: query.search.trim(), $options: 'i' },
    }));
  }

  return { skip, limit, page, sort, filter };
};

/**
 * Apply isActive filter if requested
 */
const applyActiveFilter = (filter, query) => {
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true';
  }
  return filter;
};

module.exports = { buildQuery, applyActiveFilter };
