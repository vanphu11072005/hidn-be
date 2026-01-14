const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware');
const historyController = require('../controllers/history.controller');

// All history routes require authentication
router.use(authenticate);

// Manually save to history
router.post('/save', historyController.saveToHistory);

// Get user's history (paginated)
router.get('/', historyController.getHistory);

// Get single history item with full content
router.get('/:id', historyController.getHistoryItem);

// Delete a history item
router.delete('/:id', historyController.deleteHistoryItem);

// Delete all history
router.delete('/', historyController.deleteAllHistory);

module.exports = router;
