/**
 * src/config/database.js
 * MongoDB connection with auto-reconnect
 */

const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_attendance';

const options = {
  maxPoolSize             : 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS         : 45000,
};

const connectDB = async () => {
  const attempt = async () => {
    try {
      const conn = await mongoose.connect(MONGODB_URI, options);
      logger.info(`✅  MongoDB connected → ${conn.connection.host}/${conn.connection.name}`);
    } catch (err) {
      logger.error(`❌  MongoDB connection failed: ${err.message} – retrying in 5 s`);
      setTimeout(attempt, 5000);
    }
  };

  await attempt();

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected – attempting reconnect…');
    setTimeout(attempt, 5000);
  });

  mongoose.connection.on('error', err =>
    logger.error(`MongoDB runtime error: ${err.message}`)
  );
};

module.exports = connectDB;
