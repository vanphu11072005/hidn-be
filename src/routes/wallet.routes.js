const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authenticate } = require('../middleware/auth');

// All wallet routes require authentication
router.use(authenticate);

// Get current user's wallet
router.get('/', walletController.getWallet);

// Get credit costs
router.get('/costs', walletController.getCreditCosts);

module.exports = router;
