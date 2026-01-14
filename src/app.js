const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const {
  apiLimiter,
  errorHandler,
  notFoundHandler
} = require('./middleware');

// Create Express app
const app = express();

/**
 * =========================
 * SECURITY & CORE MIDDLEWARE
 * =========================
 */
// Configure Helmet with relaxed resource policy so images served from
// `/uploads` can be embedded by the frontend on a different origin.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

/**
 * =========================
 * RATE LIMITING
 * =========================
 */
app.use('/api', apiLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/**
 * =========================
 * REQUEST LOGGING (DEV ONLY)
 * =========================
 */
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.originalUrl}`
    );
    next();
  });
}

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Hidn Backend API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * =========================
 * API ROUTES
 * =========================
 */
const routes = require('./routes');
app.use('/api', routes);

/**
 * =========================
 * ERROR HANDLING
 * =========================
 */
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
