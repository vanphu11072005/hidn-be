const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AuthService = require('../../src/services/auth.service');
const { 
  User, 
  Wallet, 
  EmailVerification, 
  PasswordReset 
} = require('../../src/repositories');
const EmailService = require('../../src/services/email.service');

// Mock dependencies
jest.mock('../../src/repositories');
jest.mock('../../src/services/email.service');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  // Setup environment variables
  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.BCRYPT_SALT_ROUNDS = '10';
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = 'hashed_password';
      const userId = 1;
      const verificationCode = '123456';

      User.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue(hashedPassword);
      User.create.mockResolvedValue(userId);
      Wallet.create.mockResolvedValue();
      EmailVerification.create.mockResolvedValue();
      EmailService.sendVerificationEmail.mockResolvedValue();
      jwt.sign.mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      // Act
      const result = await AuthService.register(email, password);

      // Assert
      expect(User.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(User.create).toHaveBeenCalledWith({
        email,
        password_hash: hashedPassword,
        role_id: 1,
        provider: 'local'
      });
      expect(Wallet.create).toHaveBeenCalledWith(userId);
      expect(result).toMatchObject({
        userId,
        email,
        role: 'user',
        emailVerified: false
      });
      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refresh_token');
    });

    it('should throw error if email already exists with password', 
      async () => {
      // Arrange
      const email = 'existing@example.com';
      const password = 'password123';
      const existingUser = {
        id: 1,
        email,
        password_hash: 'existing_hash'
      };

      User.findByEmail.mockResolvedValue(existingUser);
      User.hasAuthProvider.mockResolvedValue(true);

      // Act & Assert
      await expect(AuthService.register(email, password))
        .rejects
        .toThrow('Email đã được đăng ký');
    });

    it('should link password to OAuth account without password', 
      async () => {
      // Arrange
      const email = 'oauth@example.com';
      const password = 'newpassword123';
      const hashedPassword = 'hashed_password';
      const existingUser = {
        id: 1,
        email,
        password_hash: null,
        role_name: 'user',
        email_verified_at: new Date()
      };

      User.findByEmail.mockResolvedValue(existingUser);
      User.hasAuthProvider.mockResolvedValue(false);
      bcrypt.hash.mockResolvedValue(hashedPassword);
      User.addPasswordToAccount.mockResolvedValue();
      User.addAuthProvider.mockResolvedValue();
      jwt.sign.mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      // Act
      const result = await AuthService.register(email, password);

      // Assert
      expect(User.addPasswordToAccount)
        .toHaveBeenCalledWith(1, hashedPassword);
      expect(User.addAuthProvider)
        .toHaveBeenCalledWith(1, 'local', null);
      expect(result.userId).toBe(1);
      expect(result.message)
        .toBe('Đã liên kết mật khẩu với tài khoản của bạn');
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', 
      async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const user = {
        id: 1,
        email,
        password_hash: 'hashed_password',
        role_name: 'user'
      };

      User.findByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      User.updateLastLogin.mockResolvedValue();
      jwt.sign.mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      // Act
      const result = await AuthService.login(email, password, false);

      // Assert
      expect(User.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare)
        .toHaveBeenCalledWith(password, 'hashed_password');
      expect(User.updateLastLogin).toHaveBeenCalledWith(1);
      expect(result).toMatchObject({
        userId: 1,
        email,
        role: 'user'
      });
      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refresh_token');
    });

    it('should throw error with invalid email', async () => {
      // Arrange
      User.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(
        AuthService.login('invalid@example.com', 'password', false)
      )
        .rejects
        .toThrow('Invalid email or password');
    });

    it('should throw error with invalid password', async () => {
      // Arrange
      const user = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password'
      };

      User.findByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(
        AuthService.login('test@example.com', 'wrong_password', false)
      )
        .rejects
        .toThrow('Invalid email or password');
    });

    it('should generate longer refresh token with rememberMe', 
      async () => {
      // Arrange
      const user = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role_name: 'user'
      };

      User.findByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      User.updateLastLogin.mockResolvedValue();
      
      // Mock jwt.sign to capture expiresIn option
      const mockSign = jest.fn()
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');
      jwt.sign = mockSign;

      // Act
      await AuthService.login('test@example.com', 'password', true);

      // Assert - check refresh token has 30d expiry
      expect(mockSign).toHaveBeenCalledWith(
        { userId: 1 },
        'test_refresh_secret',
        { expiresIn: '30d' }
      );
    });
  });

  describe('refresh', () => {
    it('should generate new tokens from valid refresh token', 
      async () => {
      // Arrange
      const refreshToken = 'valid_refresh_token';
      const decoded = { userId: 1 };

      jwt.verify.mockReturnValue(decoded);
      jwt.sign.mockReturnValueOnce('new_access_token')
        .mockReturnValueOnce('new_refresh_token');

      // Act
      const result = await AuthService.refresh(refreshToken);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(
        refreshToken, 
        'test_refresh_secret'
      );
      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
    });

    it('should throw error with invalid refresh token', async () => {
      // Arrange
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(AuthService.refresh('invalid_token'))
        .rejects
        .toThrow('Invalid token');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid code', async () => {
      // Arrange
      const userId = 1;
      const code = '123456';
      const verification = {
        id: 1,
        user_id: userId,
        code
      };

      EmailVerification.findValidCode
        .mockResolvedValue(verification);
      EmailVerification.markAsVerified.mockResolvedValue();
      User.verifyEmail.mockResolvedValue();
      EmailVerification.cleanupUserCodes.mockResolvedValue();

      // Act
      const result = await AuthService.verifyEmail(userId, code);

      // Assert
      expect(EmailVerification.findValidCode)
        .toHaveBeenCalledWith(userId, code);
      expect(EmailVerification.markAsVerified)
        .toHaveBeenCalledWith(1);
      expect(User.verifyEmail).toHaveBeenCalledWith(userId);
      expect(result.success).toBe(true);
    });

    it('should throw error with invalid code', async () => {
      // Arrange
      EmailVerification.findValidCode.mockResolvedValue(null);

      // Act & Assert
      await expect(AuthService.verifyEmail(1, 'invalid'))
        .rejects
        .toThrow('Mã xác thực không hợp lệ hoặc đã hết hạn');
    });
  });

  describe('resendVerificationCode', () => {
    it('should resend verification code', async () => {
      // Arrange
      const userId = 1;
      const user = {
        id: userId,
        email: 'test@example.com',
        email_verified_at: null
      };

      User.findById.mockResolvedValue(user);
      EmailVerification.hasRecentCode.mockResolvedValue(false);
      EmailVerification.create.mockResolvedValue();
      EmailService.sendVerificationEmail.mockResolvedValue();

      // Act
      const result = await AuthService.resendVerificationCode(userId);

      // Assert
      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(EmailVerification.hasRecentCode)
        .toHaveBeenCalledWith(userId, 60);
      expect(result.success).toBe(true);
    });

    it('should throw error if email already verified', async () => {
      // Arrange
      const user = {
        id: 1,
        email: 'test@example.com',
        email_verified_at: new Date()
      };

      User.findById.mockResolvedValue(user);

      // Act & Assert
      await expect(AuthService.resendVerificationCode(1))
        .rejects
        .toThrow('Email đã được xác thực');
    });

    it('should throw error if recent code exists (rate limit)', 
      async () => {
      // Arrange
      const user = {
        id: 1,
        email: 'test@example.com',
        email_verified_at: null
      };

      User.findById.mockResolvedValue(user);
      EmailVerification.hasRecentCode.mockResolvedValue(true);

      // Act & Assert
      await expect(AuthService.resendVerificationCode(1))
        .rejects
        .toThrow('Vui lòng đợi 60 giây trước khi gửi lại mã');
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      // Arrange
      const email = 'test@example.com';
      const user = {
        id: 1,
        email,
        password_hash: 'hashed_password'
      };
      const resetToken = 'reset_token_123';

      User.findByEmail.mockResolvedValue(user);
      User.hasAuthProvider.mockResolvedValue(true);
      PasswordReset.hasRecentToken.mockResolvedValue(false);
      PasswordReset.cleanupUserTokens.mockResolvedValue();
      PasswordReset.create.mockResolvedValue({ token: resetToken });
      EmailService.sendPasswordResetEmail.mockResolvedValue();

      // Act
      const result = await AuthService.forgotPassword(email);

      // Assert
      expect(User.findByEmail).toHaveBeenCalledWith(email);
      expect(PasswordReset.create).toHaveBeenCalledWith(1, 60);
      expect(EmailService.sendPasswordResetEmail)
        .toHaveBeenCalledWith(
          email,
          expect.stringContaining(resetToken)
        );
      expect(result.success).toBe(true);
    });

    it('should return success for non-existent email (security)', 
      async () => {
      // Arrange
      User.findByEmail.mockResolvedValue(null);

      // Act
      const result = await AuthService.forgotPassword(
        'nonexistent@example.com'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(PasswordReset.create).not.toHaveBeenCalled();
    });

    it('should throw error if recent token exists (rate limit)', 
      async () => {
      // Arrange
      const user = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password'
      };

      User.findByEmail.mockResolvedValue(user);
      User.hasAuthProvider.mockResolvedValue(true);
      PasswordReset.hasRecentToken.mockResolvedValue(true);

      // Act & Assert
      await expect(AuthService.forgotPassword('test@example.com'))
        .rejects
        .toThrow('Vui lòng đợi 5 phút trước khi yêu cầu lại');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      // Arrange
      const token = 'valid_token';
      const newPassword = 'newpassword123';
      const userId = 1;
      const resetToken = {
        user_id: userId,
        token
      };
      const user = {
        id: userId,
        password_hash: 'old_hashed_password'
      };

      PasswordReset.findValidToken.mockResolvedValue(resetToken);
      User.findById.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false); // Not same password
      bcrypt.hash.mockResolvedValue('new_hashed_password');
      User.updatePassword.mockResolvedValue();
      PasswordReset.markAsUsed.mockResolvedValue();
      PasswordReset.cleanupUserTokens.mockResolvedValue();

      // Act
      const result = await AuthService.resetPassword(
        token, 
        newPassword
      );

      // Assert
      expect(PasswordReset.findValidToken)
        .toHaveBeenCalledWith(token);
      expect(User.updatePassword).toHaveBeenCalledWith(
        userId, 
        'new_hashed_password'
      );
      expect(PasswordReset.markAsUsed).toHaveBeenCalledWith(token);
      expect(result.success).toBe(true);
    });

    it('should throw error with invalid token', async () => {
      // Arrange
      PasswordReset.findValidToken.mockResolvedValue(null);

      // Act & Assert
      await expect(
        AuthService.resetPassword('invalid_token', 'newpassword')
      )
        .rejects
        .toThrow(
          'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn'
        );
    });

    it('should throw error if new password is same as old', 
      async () => {
      // Arrange
      const resetToken = {
        user_id: 1,
        token: 'valid_token'
      };
      const user = {
        id: 1,
        password_hash: 'hashed_password'
      };

      PasswordReset.findValidToken.mockResolvedValue(resetToken);
      User.findById.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true); // Same password

      // Act & Assert
      await expect(
        AuthService.resetPassword('valid_token', 'samepassword')
      )
        .rejects
        .toThrow('Mật khẩu mới không được trùng với mật khẩu cũ');
    });
  });

  describe('googleAuth', () => {
    it('should create new user with Google OAuth', async () => {
      // Arrange
      const googleId = 'google_id_123';
      const email = 'google@example.com';
      const name = 'Google User';
      const userId = 1;

      User.findByProvider.mockResolvedValue(null);
      User.findByEmail.mockResolvedValue(null);
      User.createWithProvider.mockResolvedValue(userId);
      Wallet.create.mockResolvedValue();
      User.findById.mockResolvedValue({
        id: userId,
        email,
        role_name: 'user'
      });
      jwt.sign.mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      // Act
      const result = await AuthService.googleAuth(
        googleId, 
        email, 
        name
      );

      // Assert
      expect(User.createWithProvider).toHaveBeenCalledWith({
        email,
        provider: 'google',
        provider_user_id: googleId,
        role_id: 1,
        email_verified: true
      });
      expect(Wallet.create).toHaveBeenCalledWith(userId);
      expect(result.emailVerified).toBe(true);
    });

    it('should link Google to existing verified account', 
      async () => {
      // Arrange
      const googleId = 'google_id_123';
      const email = 'existing@example.com';
      const existingUser = {
        id: 1,
        email,
        email_verified_at: new Date(),
        role_name: 'user'
      };

      User.findByProvider.mockResolvedValue(null);
      User.findByEmail.mockResolvedValue(existingUser);
      User.linkProvider.mockResolvedValue();
      User.updateLastLogin.mockResolvedValue();
      jwt.sign.mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      // Act
      const result = await AuthService.googleAuth(
        googleId, 
        email, 
        'name'
      );

      // Assert
      expect(User.linkProvider).toHaveBeenCalledWith(
        1, 
        'google', 
        googleId
      );
      expect(result.userId).toBe(1);
    });

    it('should throw error for unverified existing account', 
      async () => {
      // Arrange
      const existingUser = {
        id: 1,
        email: 'unverified@example.com',
        email_verified_at: null
      };

      User.findByProvider.mockResolvedValue(null);
      User.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(
        AuthService.googleAuth(
          'google_id', 
          'unverified@example.com', 
          'name'
        )
      )
        .rejects
        .toThrow('Email đã được đăng ký nhưng chưa xác thực');
    });

    it('should login existing Google user', async () => {
      // Arrange
      const googleUser = {
        id: 1,
        email: 'google@example.com',
        role_name: 'user'
      };

      User.findByProvider.mockResolvedValue(googleUser);
      User.updateLastLogin.mockResolvedValue();
      jwt.sign.mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      // Act
      const result = await AuthService.googleAuth(
        'google_id', 
        'google@example.com', 
        'name'
      );

      // Assert
      expect(User.updateLastLogin).toHaveBeenCalledWith(1);
      expect(result.userId).toBe(1);
    });
  });
});
