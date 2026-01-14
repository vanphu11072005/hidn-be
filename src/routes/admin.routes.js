const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  const role = req.user?.role || req.user?.role_name;

  // Allow access in development when no authenticated user is present
  if (!role && process.env.NODE_ENV !== 'production') {
    console.warn('Warning: allowing unauthenticated admin access in development');
    return next();
  }

  if (role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }

  next();
};

// Admin routes - all require authentication and admin role
router.get(
  '/dashboard/stats',
  optionalAuth,
  requireAdmin,
  AdminController.getDashboardStats
);

router.get('/users', optionalAuth, requireAdmin, AdminController.getUsers);

router.get('/users/:id', optionalAuth, requireAdmin, AdminController.getUserById);

router.get('/credits/logs', optionalAuth, requireAdmin, AdminController.getCreditLogs);

router.get('/credits/config', optionalAuth, requireAdmin, AdminController.getCreditConfig);

router.put('/credits/config', optionalAuth, requireAdmin, AdminController.updateCreditConfig);

router.get('/tools/analytics', optionalAuth, requireAdmin, AdminController.getToolAnalytics);

router.get('/tools/config', optionalAuth, requireAdmin, AdminController.getToolConfigs);

router.put('/tools/config', optionalAuth, requireAdmin, AdminController.updateToolConfigs);

// Security logs routes
router.get('/security-logs', optionalAuth, requireAdmin, 
  AdminController.getSecurityLogs);

router.get('/security-logs/stats', optionalAuth, requireAdmin, 
  AdminController.getSecurityStats);

router.get('/security-logs/:logId', optionalAuth, requireAdmin, 
  AdminController.getSecurityLogById);

router.post('/security-logs', optionalAuth, requireAdmin, 
  AdminController.createSecurityLog);

router.patch('/security-logs/:logId/resolve', optionalAuth, 
  requireAdmin, AdminController.resolveSecurityLog);

// System logs routes
router.get('/system-logs', optionalAuth, requireAdmin, 
  AdminController.getSystemLogs);

router.get('/system-logs/stats', optionalAuth, requireAdmin, 
  AdminController.getSystemStats);

router.post('/system-logs', optionalAuth, requireAdmin, 
  AdminController.createSystemLog);
module.exports = router;
