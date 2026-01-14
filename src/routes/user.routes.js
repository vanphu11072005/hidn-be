const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware');
const userController = require('../controllers/user.controller');

// All user routes require authentication
router.use(authenticate);

// Get current user info
router.get('/me', userController.getMe);

// Profile endpoints removed

// Get user's credit balance
router.get('/credits', userController.getCredits);

// Get user's usage history
router.get('/usage', userController.getUsageHistory);

// Get usage statistics
router.get('/stats', userController.getUsageStats);

module.exports = router;
