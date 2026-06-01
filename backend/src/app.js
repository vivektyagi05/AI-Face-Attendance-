/**
 * src/app.js
 * Express application – all middleware + route wiring
 */

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const compression  = require('compression');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path         = require('path');

const connectDB             = require('./config/database');
const logger                = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ── Route imports ──────────────────────────────────────────────
const authRoutes       = require('./routes/authRoutes');
const adminRoutes      = require('./routes/adminRoutes');
const teacherRoutes    = require('./routes/teacherRoutes');
const studentRoutes    = require('./routes/studentRoutes');
const classRoutes      = require('./routes/classRoutes');
const timetableRoutes  = require('./routes/timetableRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');  // Phase 2

// ── Init ───────────────────────────────────────────────────────
connectDB();

const app = express();

// ── Trust proxy (for rate-limiter behind nginx/load-balancer) ──
app.set('trust proxy', 1);

// ── Security middleware ────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());           // prevent NoSQL injection

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// ── Rate limiting ──────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs       : parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max            : parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders: true,
  legacyHeaders  : false,
  message        : { success: false, message: 'Too many requests – please try again later.' },
});
app.use('/api/', globalLimiter);

// ── Auth route gets tighter limit ────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts – please wait 15 minutes.' },
});
app.use('/api/v1/auth', authLimiter);

// ── Body parsers ──────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── HTTP logging ──────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: msg => logger.http(msg.trim()) },
}));

// ── Static files (uploaded documents) ────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── API routes ────────────────────────────────────────────────
app.use('/api/v1/auth',       authRoutes);
app.use('/api/v1/admin',      adminRoutes);
app.use('/api/v1/teachers',   teacherRoutes);
app.use('/api/v1/students',   studentRoutes);
app.use('/api/v1/classes',    classRoutes);
app.use('/api/v1/timetables', timetableRoutes);
app.use('/api/v1/attendance', attendanceRoutes);  // Phase 2

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.status(200).json({
    success  : true,
    status   : 'healthy',
    timestamp: new Date().toISOString(),
    service  : 'smart-attendance-backend',
    version  : '1.0.0',
  })
);

// ── 404 + global error handler ────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
