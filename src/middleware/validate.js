const { validationResult } = require('express-validator');

/**
 * =========================
 * Validate request data (express-validator)
 * Must be used AFTER validation rules and BEFORE controller
 * =========================
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.isOperational = true;

    // Normalize validation errors
    error.details = errors.array().map(err => ({
      field: err.path || err.param, // compatible with multiple versions
      message: err.msg
    }));

    return next(error);
  }

  next();
};

module.exports = validate;
