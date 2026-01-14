const express = require('express');
const router = express.Router();
const { 
  authenticate, 
  validate, 
  aiLimiter 
} = require('../middleware');
const { ai: aiValidators } = require('../validators');
const aiController = require('../controllers/ai.controller');
const ocrController = require('../controllers/ocr.controller');
const upload = require('../config/multer');

// All AI routes require authentication and rate limiting
router.use(authenticate);
router.use(aiLimiter);

// AI Smart Summary
router.post(
  '/summary', 
  aiValidators.summaryValidation, 
  validate,
  aiController.generateSummary
);

// Question Generator
router.post(
  '/questions', 
  aiValidators.questionsValidation, 
  validate,
  aiController.generateQuestions
);

// AI Explanation
router.post(
  '/explain', 
  aiValidators.explainValidation, 
  validate,
  aiController.generateExplanation
);

// Academic Rewriting
router.post(
  '/rewrite', 
  aiValidators.rewriteValidation, 
  validate,
  aiController.rewriteText
);

// Estimate credits for a request
router.post(
  '/estimate', 
  aiValidators.estimateValidation, 
  validate,
  aiController.estimateCredits
);

// OCR - Extract text from image (no credits required)
router.post(
  '/extract-text',
  upload.single('image'),
  ocrController.extractTextFromImage
);

// Document - Extract text from PDF/DOCX (no credits required)
router.post(
  '/extract-document',
  upload.single('document'),
  ocrController.extractTextFromDocument
);

module.exports = router;
