const request = require('supertest');
const express = require('express');
const authController = require('../../src/controllers/auth.controller');
const { AuthService } = require('../../src/services');
const { 
  User, 
  Wallet, 
  Profile 
} = require('../../src/repositories');

// Mock dependencies
jest.mock('../../src/services');
jest.mock('../../src/repositories');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock auth middleware
  app.use((req, res, next) => {
    if (req.headers.authorization) {
      req.user = { id: 1 };
    }
    next();
  });

  // Routes
  app.post('/register', authController.register);
  app.post('/login', authController.login);
  app.post('/refresh-token', authController.refreshToken);
  app.get('/profile', authController.getProfile);
  app.put('/profile', authController.updateProfile);
  app.post('/check-email', authController.checkEmail);
  app.post('/logout', authController.logout);
  app.post('/verify-email', authController.verifyEmail);
  app.post('/resend-verification', 
    authController.resendVerificationCode);
  app.post('/forgot-password', authController.forgotPassword);
  app.post('/reset-password', authController.resetPassword);
  app.post('/google-auth', authController.googleAuth);

  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  });

  return app;
};

describe('AuthController', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('POST /register', () => {
    it('should register new user successfully', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };
      const mockResult = {
        userId: 1,
        email: userData.email,
        role: 'user',
        accessToken: 'token',
        refreshToken: 'refresh',
        emailVerified: false
      };

      AuthService.register = jest.fn()
        .mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .post('/register')
        .send(userData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message)
        .toBe('User registered successfully');
      expect(response.body.data).toEqual(mockResult);
      expect(AuthService.register).toHaveBeenCalledWith(
        userData.email,
        userData.password
      );
    });
  });

  describe('POST /login', () => {
    it('should login successfully', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true
      };
      const mockResult = {
        userId: 1,
        email: credentials.email,
        role: 'user',
        accessToken: 'token',
        refreshToken: 'refresh'
      };

      AuthService.login = jest.fn().mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .post('/login')
        .send(credentials);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toEqual(mockResult);
      expect(AuthService.login).toHaveBeenCalledWith(
        credentials.email,
        credentials.password,
        true
      );
    });

    it('should handle login without rememberMe', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      const mockResult = {
        userId: 1,
        email: credentials.email,
        accessToken: 'token',
        refreshToken: 'refresh'
      };

      AuthService.login = jest.fn().mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .post('/login')
        .send(credentials);

      // Assert
      expect(AuthService.login).toHaveBeenCalledWith(
        credentials.email,
        credentials.password,
        false
      );
    });
  });

  describe('POST /refresh-token', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const mockResult = {
        accessToken: 'new_token',
        refreshToken: 'new_refresh'
      };

      AuthService.refresh = jest.fn().mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .post('/refresh-token')
        .send({ refreshToken: 'old_refresh' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(AuthService.refresh)
        .toHaveBeenCalledWith('old_refresh');
    });

    it('should return 401 when refresh token is missing', 
      async () => {
      // Act
      const response = await request(app)
        .post('/refresh-token')
        .send({});

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message)
        .toBe('Refresh token required');
    });
  });

  describe('GET /profile', () => {
    it('should get user profile successfully', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        email_verified_at: new Date(),
        role_name: 'user',
        created_at: new Date()
      };
      const mockCredits = 100;
      const mockProfile = {
        display_name: 'Test User',
        avatar_url: '/uploads/avatar.jpg'
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      Wallet.getTotalCredits = jest.fn().mockResolvedValue(mockCredits);
      Profile.findByUserId = jest.fn().mockResolvedValue(mockProfile);

      // Act
      const response = await request(app)
        .get('/profile')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 1,
        email: 'test@example.com',
        emailVerified: true,
        role: 'user',
        credits: 100,
        displayName: 'Test User',
        avatarUrl: '/uploads/avatar.jpg'
      });
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      User.findById = jest.fn().mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get('/profile')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('PUT /profile', () => {
    it('should update profile successfully', async () => {
      // Arrange
      const updateData = {
        display_name: 'Updated Name'
      };
      const mockProfile = {
        display_name: 'Updated Name',
        avatar_url: '/uploads/avatar.jpg'
      };

      Profile.upsert = jest.fn().mockResolvedValue(mockProfile);

      // Act
      const response = await request(app)
        .put('/profile')
        .set('Authorization', 'Bearer token')
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile updated');
      expect(response.body.data).toMatchObject({
        displayName: 'Updated Name',
        avatarUrl: '/uploads/avatar.jpg'
      });
    });
  });

  describe('POST /check-email', () => {
    it('should return true if email exists', async () => {
      // Arrange
      User.findByEmail = jest.fn().mockResolvedValue({ 
        id: 1, 
        email: 'test@example.com' 
      });

      // Act
      const response = await request(app)
        .post('/check-email')
        .send({ email: 'test@example.com' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.exists).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      // Arrange
      User.findByEmail = jest.fn().mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/check-email')
        .send({ email: 'nonexistent@example.com' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.exists).toBe(false);
    });
  });

  describe('POST /logout', () => {
    it('should logout successfully', async () => {
      // Act
      const response = await request(app)
        .post('/logout');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('POST /verify-email', () => {
    it('should verify email successfully', async () => {
      // Arrange
      AuthService.verifyEmail = jest.fn().mockResolvedValue({
        success: true
      });

      // Act
      const response = await request(app)
        .post('/verify-email')
        .set('Authorization', 'Bearer token')
        .send({ code: '123456' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message)
        .toBe('Email verified successfully');
      expect(AuthService.verifyEmail)
        .toHaveBeenCalledWith(1, '123456');
    });
  });

  describe('POST /resend-verification', () => {
    it('should resend verification code successfully', async () => {
      // Arrange
      AuthService.resendVerificationCode = jest.fn()
        .mockResolvedValue({ success: true });

      // Act
      const response = await request(app)
        .post('/resend-verification')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Verification code sent');
      expect(AuthService.resendVerificationCode)
        .toHaveBeenCalledWith(1);
    });
  });

  describe('POST /forgot-password', () => {
    it('should send password reset email', async () => {
      // Arrange
      AuthService.forgotPassword = jest.fn()
        .mockResolvedValue({ success: true });

      // Act
      const response = await request(app)
        .post('/forgot-password')
        .send({ email: 'test@example.com' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message)
        .toContain('password reset link has been sent');
      expect(AuthService.forgotPassword)
        .toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('POST /reset-password', () => {
    it('should reset password successfully', async () => {
      // Arrange
      AuthService.resetPassword = jest.fn()
        .mockResolvedValue({ success: true });

      // Act
      const response = await request(app)
        .post('/reset-password')
        .send({ 
          token: 'reset_token', 
          password: 'newpassword123' 
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message)
        .toBe('Password reset successfully');
      expect(AuthService.resetPassword)
        .toHaveBeenCalledWith('reset_token', 'newpassword123');
    });
  });

  describe('POST /google-auth', () => {
    it('should authenticate with Google successfully', async () => {
      // Arrange
      const googleData = {
        googleId: 'google_id_123',
        email: 'google@example.com',
        name: 'Google User'
      };
      const mockResult = {
        userId: 1,
        email: googleData.email,
        role: 'user',
        accessToken: 'token',
        refreshToken: 'refresh',
        emailVerified: true
      };

      AuthService.googleAuth = jest.fn()
        .mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .post('/google-auth')
        .send(googleData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message)
        .toBe('Google authentication successful');
      expect(response.body.data).toEqual(mockResult);
      expect(AuthService.googleAuth).toHaveBeenCalledWith(
        googleData.googleId,
        googleData.email,
        googleData.name
      );
    });

    it('should return 400 when googleId is missing', async () => {
      // Act
      const response = await request(app)
        .post('/google-auth')
        .send({ email: 'google@example.com' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message)
        .toBe('Google ID and email are required');
    });

    it('should return 400 when email is missing', async () => {
      // Act
      const response = await request(app)
        .post('/google-auth')
        .send({ googleId: 'google_id_123' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message)
        .toBe('Google ID and email are required');
    });
  });
});
