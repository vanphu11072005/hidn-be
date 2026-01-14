const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const aiRoutes = require('./ai.routes');
const walletRoutes = require('./wallet.routes');
const historyRoutes = require('./history.routes');
const adminRoutes = require('./admin.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
// Also expose singular `/user` for backward compatibility
router.use('/user', userRoutes);
router.use('/ai', aiRoutes);
router.use('/wallet', walletRoutes);
router.use('/history', historyRoutes);
router.use('/admin', adminRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Hidn API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      user: '/api/user',
      ai: '/api/ai',
      wallet: '/api/wallet',
      history: '/api/history',
      admin: '/api/admin'
    }
  });
});

module.exports = router;
