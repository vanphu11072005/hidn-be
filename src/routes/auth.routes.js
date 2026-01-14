const express = require('express');
const router = express.Router();
const {
  authenticate,
  validate,
  authLimiter,
  apiLimiter
} = require('../middleware');

const authController = require('../controllers/auth.controller');
const upload = require('../config/multer');
const { profile } = require('../validators');
const {
  registerValidation,
  loginValidation,
  checkEmailValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../validators').auth;

// Register
router.post(
  '/register',
  authLimiter,
  registerValidation,
  validate,
  authController.register
);

// Login
router.post(
  '/login',
  authLimiter,
  loginValidation,
  validate,
  authController.login
);

// Refresh access token
router.post(
  '/refresh',
  authLimiter,
  authController.refreshToken
);

// Logout (revoke refresh token)
router.post(
  '/logout',
  authenticate,
  authController.logout
);

// Get profile
router.get(
  '/profile',
  authenticate,
  authController.getProfile
);

// Update profile (display name, avatar)
router.put(
  '/profile',
  authenticate,
  upload.single('avatar'),
  profile.updateProfileValidation,
  validate,
  authController.updateProfile
);

// (profile route removed)

// Check email exists (for FE UX)
router.post(
  '/check-email',
  apiLimiter,
  checkEmailValidation,
  validate,
  authController.checkEmail
);

// Verify email with code
router.post(
  '/verify-email',
  authenticate,
  authLimiter,
  authController.verifyEmail
);

// Resend verification code
router.post(
  '/resend-verification',
  authenticate,
  authLimiter,
  authController.resendVerificationCode
);

// Forgot password - send reset link
router.post(
  '/forgot-password',
  authLimiter,
  forgotPasswordValidation,
  validate,
  authController.forgotPassword
);

// Reset password with token
router.post(
  '/reset-password',
  authLimiter,
  resetPasswordValidation,
  validate,
  authController.resetPassword
);

// Google OAuth
router.post(
  '/google',
  authLimiter,
  authController.googleAuth
);

module.exports = router;
