/**
 * server.js
 * Process entry point – loads env, starts HTTP server, handles signals
 */

require('dotenv').config();
const app    = require('./src/app');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`🚀  Server running on http://localhost:${PORT}  [${process.env.NODE_ENV || 'development'}]`);
});

// ── Graceful shutdown ──────────────────────────────────────────
const shutdown = signal => {
  logger.info(`${signal} received – shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled rejections ───────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', err => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = server;
