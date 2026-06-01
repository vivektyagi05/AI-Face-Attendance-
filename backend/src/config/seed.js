/**
 * src/config/seed.js
 * Creates the initial admin account.
 * Run once: node src/config/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const logger   = require('../utils/logger');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_attendance';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB for seeding');

    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      logger.info(`Admin already exists: ${existingAdmin.email}`);
      process.exit(0);
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const password   = await bcrypt.hash('Admin@123456', saltRounds);

    const admin = await User.create({
      name    : 'System Administrator',
      email   : 'admin@smartattendance.com',
      password,
      role    : 'admin',
      isActive: true,
      mustChangePassword: false,
    });

    logger.info('✅  Admin account created');
    logger.info(`    Email   : ${admin.email}`);
    logger.info(`    Password: Admin@123456`);
    logger.info('    ⚠️  Change this password immediately after first login!');

    process.exit(0);
  } catch (err) {
    logger.error(`Seed failed: ${err.message}`);
    process.exit(1);
  }
}

seed();
