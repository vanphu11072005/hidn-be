const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Wallet, EmailVerification, PasswordReset } = require('../repositories');
// Avoid circular require: import EmailService directly
const emailService = require('./email.service');

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

const generateAccessToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error('JWT secret is not configured');
    err.statusCode = 500;
    err.isOperational = true;
    throw err;
  }

  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });
};

const generateRefreshToken = (userId, rememberMe = false) => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET ||
    process.env.REFRESH_TOKEN_SECRET;
  if (!refreshSecret) {
    const err = new Error('JWT refresh secret is not configured');
    err.statusCode = 500;
    err.isOperational = true;
    throw err;
  }

  // If remember me: 30 days, else: 1 day (session-like)
  const expiresIn = rememberMe ? '30d' : '1d';

  return jwt.sign({ userId }, refreshSecret, { expiresIn });
};

exports.register = async (email, password) => {
  const existing = await User.findByEmail(email);
  
  if (existing) {
    // Check if this is an OAuth account without password
    const hasLocalAuth = await User.hasAuthProvider(existing.id, 'local');
    
    if (!hasLocalAuth && !existing.password_hash) {
      // OAuth account without password → Add password and local provider
      const hash = await bcrypt.hash(password, saltRounds);
      await User.addPasswordToAccount(existing.id, hash);
      await User.addAuthProvider(existing.id, 'local', null);
      
      return {
        userId: existing.id,
        email: existing.email,
        role: existing.role_name || 'user',
        accessToken: generateAccessToken(existing.id),
        refreshToken: generateRefreshToken(existing.id, false),
        emailVerified: !!existing.email_verified_at,
        message: 'Đã liên kết mật khẩu với tài khoản của bạn'
      };
    }
    
    // Account already has password
    throw Object.assign(
      new Error('Email đã được đăng ký'), 
      { status: 409 }
    );
  }

  const hash = await bcrypt.hash(password, saltRounds);
  const userId = await User.create({
    email,
    password_hash: hash,
    role_id: 1,
    provider: 'local'
  });

  await Wallet.create(userId);

  // Generate and send verification code
  const code = generateVerificationCode();
  await EmailVerification.create(userId, code, 10); // 10 minutes
  try {
    await emailService.sendVerificationEmail(email, code);
  } catch (err) {
    // Log but do not fail registration if email sending fails
    console.error('Failed to send verification email for', email, err.message || err);
  }

  return {
    userId,
    email,
    role: 'user', // New users always get 'user' role
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId, false),
    emailVerified: false
  };
};

exports.login = async (email, password, rememberMe = false) => {
  const user = await User.findByEmail(email);
  
  // Check user exists and has a password (local or linked account)
  if (!user || !user.password_hash) {
    throw Object.assign(
      new Error('Invalid email or password'), 
      { status: 401 }
    );
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw Object.assign(
      new Error('Invalid email or password'), 
      { status: 401 }
    );
  }

  await User.updateLastLogin(user.id);

  return {
    userId: user.id,
    email: user.email,
    role: user.role_name,
    accessToken: generateAccessToken(user.id),
    refreshToken: generateRefreshToken(user.id, rememberMe)
  };
};

exports.refresh = async (refreshToken) => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET ||
    process.env.REFRESH_TOKEN_SECRET;
  const decoded = jwt.verify(refreshToken, refreshSecret);
  const accessToken = generateAccessToken(decoded.userId);
  // Also generate a new refresh token for token rotation
  const newRefreshToken = generateRefreshToken(decoded.userId, false);
  return { 
    accessToken,
    refreshToken: newRefreshToken
  };
};

// Generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Verify email with code
exports.verifyEmail = async (userId, code) => {
  const verification = await EmailVerification.findValidCode(userId, code);
  
  if (!verification) {
    throw Object.assign(
      new Error('Mã xác thực không hợp lệ hoặc đã hết hạn'), 
      { status: 400 }
    );
  }

  // Mark verification as used
  await EmailVerification.markAsVerified(verification.id);
  
  // Update user email_verified_at
  await User.verifyEmail(userId);
  
  // Cleanup old codes
  await EmailVerification.cleanupUserCodes(userId);

  return { success: true };
};

// Resend verification code
exports.resendVerificationCode = async (userId) => {
  const user = await User.findById(userId);
  
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  if (user.email_verified_at) {
    throw Object.assign(
      new Error('Email đã được xác thực'), 
      { status: 400 }
    );
  }

  // Check rate limiting (60 seconds)
  const hasRecent = await EmailVerification.hasRecentCode(userId, 60);
  if (hasRecent) {
    throw Object.assign(
      new Error('Vui lòng đợi 60 giây trước khi gửi lại mã'), 
      { status: 429 }
    );
  }

  // Generate and send new code
  const code = generateVerificationCode();
  await EmailVerification.create(userId, code, 10);
  await emailService.sendVerificationEmail(user.email, code);

  return { success: true };
};

// Forgot Password - Send reset link
exports.forgotPassword = async (email) => {
  const user = await User.findByEmail(email);
  
  // Always return success to prevent email enumeration
  if (!user) {
    return { success: true };
  }

  // Only allow password reset for users with local auth
  const hasLocalAuth = await User.hasAuthProvider(user.id, 'local');
  if (!hasLocalAuth || !user.password_hash) {
    return { success: true };
  }

  // Check rate limiting (5 minutes)
  const hasRecent = await PasswordReset.hasRecentToken(user.id, 5);
  if (hasRecent) {
    throw Object.assign(
      new Error('Vui lòng đợi 5 phút trước khi yêu cầu lại'), 
      { status: 429 }
    );
  }

  // Cleanup old tokens
  await PasswordReset.cleanupUserTokens(user.id);

  // Create reset token (valid for 60 minutes)
  const { token } = await PasswordReset.create(user.id, 60);
  
  // Generate reset link
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  // Send reset email
  await emailService.sendPasswordResetEmail(user.email, resetLink);

  return { success: true };
};

// Reset Password with token
exports.resetPassword = async (token, newPassword) => {
  const resetToken = await PasswordReset.findValidToken(token);
  
  if (!resetToken) {
    throw Object.assign(
      new Error('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn'), 
      { status: 400 }
    );
  }

  const user = await User.findById(resetToken.user_id);
  
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  // Check if new password is same as old password
  const isSamePassword = await bcrypt.compare(
    newPassword, 
    user.password_hash
  );
  
  if (isSamePassword) {
    throw Object.assign(
      new Error(
        'Mật khẩu mới không được trùng với mật khẩu cũ'
      ), 
      { status: 400 }
    );
  }

  // Hash new password
  const hash = await bcrypt.hash(newPassword, saltRounds);
  
  // Update password
  await User.updatePassword(user.id, hash);
  
  // Mark token as used
  await PasswordReset.markAsUsed(token);
  
  // Cleanup old tokens
  await PasswordReset.cleanupUserTokens(user.id);

  return { success: true };
};

/**
 * =========================
 * GOOGLE OAUTH
 * =========================
 */
exports.googleAuth = async (googleId, email, name) => {
  // Check if user exists by Google provider
  let user = await User.findByProvider('google', googleId);
  
  if (!user) {
    // Check if email already exists with different provider
    const existingUser = await User.findByEmail(email);
    
    if (existingUser) {
      // Email exists - check if verified
      if (existingUser.email_verified_at) {
        // Email verified → Link Google to existing account
        await User.linkProvider(existingUser.id, 'google', googleId);
        await User.updateLastLogin(existingUser.id);
        user = existingUser;
      } else {
        // Email not verified → Block for security
        throw Object.assign(
          new Error(
            'Email đã được đăng ký nhưng chưa xác thực. ' +
            'Vui lòng đăng nhập bằng email/password và xác thực email trước.'
          ), 
          { status: 409 }
        );
      }
    } else {
      // New user → Create Google account
      const userId = await User.createWithProvider({
        email,
        provider: 'google',
        provider_user_id: googleId,
        role_id: 1,
        email_verified: true
      });

      // Create wallet (0 paid credits, uses daily free)
      await Wallet.create(userId);

      user = await User.findById(userId);
    }
  } else {
    // User exists by Google ID → Just login
    await User.updateLastLogin(user.id);
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id, true);

  return {
    userId: user.id,
    email: user.email,
    role: user.role_name || 'user',
    accessToken,
    refreshToken,
    emailVerified: true
  };
};

