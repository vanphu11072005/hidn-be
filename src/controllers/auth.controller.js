const { AuthService } = require('../services');
const authService = AuthService;
const { asyncHandler } = require('../middleware');
const { User, Wallet, Profile } = require('../repositories');

/**
 * =========================
 * REGISTER
 * =========================
 */
exports.register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.register(email, password);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result
  });
});

/**
 * =========================
 * LOGIN
 * =========================
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const result = await authService.login(
    email, 
    password, 
    rememberMe || false
  );

  res.json({
    success: true,
    message: 'Login successful',
    data: result
  });
});

/**
 * =========================
 * REFRESH TOKEN
 * =========================
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  const result = await authService.refresh(refreshToken);
  res.json({ success: true, data: result });
});

/**
 * =========================
 * GET PROFILE
 * =========================
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const credits = await Wallet.getTotalCredits(user.id);

  const profile = await Profile.findByUserId(user.id);

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      emailVerified: !!user.email_verified_at,
      role: user.role_name,
      credits,
      createdAt: user.created_at,
      displayName: profile ? profile.display_name : null,
      avatarUrl: profile ? profile.avatar_url : null
    }
  });
});

/**
 * =========================
 * UPDATE PROFILE
 * Accepts `display_name` in body and optional
 * `avatar` file field (handled by multer)
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Build update data only for provided fields so we don't overwrite
  // existing avatar when user doesn't upload a new file.
  const data = {};
  if (typeof req.body.display_name !== 'undefined') {
    data.display_name = req.body.display_name || null;
  }

  if (req.file) {
    data.avatar_url = `/uploads/${req.file.filename}`;
  }

  const profile = await Profile.upsert(userId, data);

  res.json({
    success: true,
    message: 'Profile updated',
    data: {
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url
    }
  });
});

/**
 * =========================
 * CHECK EMAIL (FE UX)
 * =========================
 */
exports.checkEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const exists = await User.findByEmail(email);

  res.json({
    success: true,
    exists: !!exists
  });
});

/**
 * =========================
 * LOGOUT
 * =========================
 */
exports.logout = asyncHandler(async (req, res) => {
  // Stateless JWT → client removes tokens
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * =========================
 * VERIFY EMAIL
 * =========================
 */
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  await authService.verifyEmail(userId, code);

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
});

/**
 * =========================
 * RESEND VERIFICATION CODE
 * =========================
 */
exports.resendVerificationCode = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await authService.resendVerificationCode(userId);

  res.json({
    success: true,
    message: 'Verification code sent'
  });
});

/**
 * =========================
 * FORGOT PASSWORD
 * =========================
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  await authService.forgotPassword(email);

  res.json({
    success: true,
    message: 'If email exists, password reset link has been sent'
  });
});

/**
 * =========================
 * RESET PASSWORD
 * =========================
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  await authService.resetPassword(token, password);

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
});

/**
 * =========================
 * GOOGLE OAUTH
 * =========================
 */
exports.googleAuth = asyncHandler(async (req, res) => {
  const { googleId, email, name } = req.body;

  if (!googleId || !email) {
    return res.status(400).json({
      success: false,
      message: 'Google ID and email are required'
    });
  }

  const result = await authService.googleAuth(googleId, email, name);

  res.json({
    success: true,
    message: 'Google authentication successful',
    data: result
  });
});

