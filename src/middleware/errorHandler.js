// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log chi tiết cho dev
  console.error('❌ Error:', {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });

  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';

  /**
   * =========================
   * OPERATIONAL / BUSINESS ERRORS
   * =========================
   */
  if (err.isOperational) {
    return res.status(statusCode).json({
      success: false,
      message
    });
  }

  /**
   * =========================
   * COMMON SYSTEM ERRORS
   * =========================
   */

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'This resource already exists';
  }

  // Validation errors (custom / future-proof)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid input data';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Unauthorized';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired';
  }

  /**
   * =========================
   * FALLBACK RESPONSE
   * =========================
   */
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack
    })
  });
};

// 404 Not Found handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
};

// Async error wrapper (BẮT BUỘC dùng cho controller)
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
