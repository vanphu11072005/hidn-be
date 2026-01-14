const rateLimit = require('express-rate-limit');

/**
 * =========================
 * GENERAL API RATE LIMITER
 * =========================
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});

/**
 * =========================
 * AUTH RATE LIMITER
 * =========================
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  }
});

/**
 * =========================
 * AI TOOLS RATE LIMITER
 * =========================
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    // Ưu tiên userId
    if (req.user && req.user.id) {
      return `user-${req.user.id}`;
    }
    // Fallback IP – ĐÚNG CHUẨN IPv6
    return rateLimit.ipKeyGenerator(req);
  },

  message: {
    success: false,
    message: 'Too many AI requests, please slow down'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  aiLimiter
};
