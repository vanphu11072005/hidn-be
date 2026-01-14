const { body } = require('express-validator');

/**
 * =========================
 * COMMON TEXT INPUT VALIDATION (CORE)
 * =========================
 */
const textInputValidation = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Text input is required')
    .bail()
    .isLength({ max: 10000 })
    .withMessage('Text must not exceed 10000 characters')
];

/**
 * =========================
 * SUMMARY TOOL
 * =========================
 */
const summaryValidation = [
  ...textInputValidation,
  body('mode')
    .optional()
    .isIn(['normal', 'exam_focused'])
    .withMessage('Invalid mode')
];

/**
 * =========================
 * QUESTIONS TOOL
 * =========================
 */
const questionsValidation = [
  ...textInputValidation,
  body('questionType')
    .isIn(['mcq', 'short', 'true_false', 'fill_blank'])
    .withMessage('Invalid question type'),
  body('count')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Count must be between 1 and 10')
];

/**
 * =========================
 * EXPLAIN TOOL
 * =========================
 */
const explainValidation = [
  ...textInputValidation,
  body('mode')
    .optional()
    .default('easy')
    .isIn(['easy', 'exam', 'friend', 'deep_analysis'])
    .withMessage('Invalid explanation mode')
];

/**
 * =========================
 * REWRITE TOOL
 * =========================
 */
const rewriteValidation = [
  ...textInputValidation,
  body('style')
    .optional()
    .default('simple')
    .isIn(['simple', 'academic', 'student', 'practical'])
    .withMessage('Invalid writing style')
];

/**
 * =========================
 * ESTIMATE TOOL (NO FULL TEXT)
 * =========================
 */
const estimateValidation = [
  body('toolType')
    .isIn(['summary', 'questions', 'explain', 'rewrite'])
    .withMessage('Invalid tool type'),
  body('textLength')
    .isInt({ min: 1 })
    .withMessage('Text length must be a positive integer')
];

module.exports = {
  textInputValidation,
  summaryValidation,
  questionsValidation,
  explainValidation,
  rewriteValidation,
  estimateValidation
};
