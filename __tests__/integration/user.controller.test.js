const request = require('supertest');
const express = require('express');
const userController = require('../../src/controllers/user.controller');
const { UserService, WalletService } = require('../../src/services');

// Mock dependencies
jest.mock('../../src/services');

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
  app.get('/me', userController.getMe);
  app.get('/credits', userController.getCredits);
  app.get('/usage-history', userController.getUsageHistory);
  app.get('/usage-stats', userController.getUsageStats);

  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  });

  return app;
};

describe('UserController', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /me', () => {
    it('should get current user info successfully', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role_name: 'user',
        email_verified_at: new Date(),
        authProviders: [
          { provider: 'local', linkedAt: new Date() }
        ],
        created_at: new Date()
      };
      const mockWallet = {
        freeCredits: 10,
        paidCredits: 90,
        totalCredits: 100
      };

      UserService.getMe = jest.fn().mockResolvedValue(mockUser);
      WalletService.getWallet = jest.fn()
        .mockResolvedValue(mockWallet);

      // Act
      const response = await request(app)
        .get('/me')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 1,
        email: 'test@example.com',
        role: 'user',
        emailVerified: true
      });
      expect(response.body.data.credits).toMatchObject({
        freeCredits: 10,
        paidCredits: 90,
        totalCredits: 100
      });
      expect(UserService.getMe).toHaveBeenCalledWith(1);
      expect(WalletService.getWallet).toHaveBeenCalledWith(1);
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      UserService.getMe = jest.fn().mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get('/me')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should include auth providers in response', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role_name: 'user',
        email_verified_at: new Date(),
        authProviders: [
          { provider: 'local', linkedAt: new Date() },
          { provider: 'google', linkedAt: new Date() }
        ],
        created_at: new Date()
      };
      const mockWallet = {
        freeCredits: 0,
        paidCredits: 0,
        totalCredits: 0
      };

      UserService.getMe = jest.fn().mockResolvedValue(mockUser);
      WalletService.getWallet = jest.fn()
        .mockResolvedValue(mockWallet);

      // Act
      const response = await request(app)
        .get('/me')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.body.data.authProviders).toHaveLength(2);
      expect(response.body.data.authProviders[0].provider)
        .toBe('local');
      expect(response.body.data.authProviders[1].provider)
        .toBe('google');
    });
  });

  describe('GET /credits', () => {
    it('should get user credits successfully', async () => {
      // Arrange
      const mockCredits = 150;

      UserService.getCredits = jest.fn()
        .mockResolvedValue(mockCredits);

      // Act
      const response = await request(app)
        .get('/credits')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(150);
      expect(UserService.getCredits).toHaveBeenCalledWith(1);
    });

    it('should return 0 if user has no credits', async () => {
      // Arrange
      UserService.getCredits = jest.fn().mockResolvedValue(0);

      // Act
      const response = await request(app)
        .get('/credits')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toBe(0);
    });
  });

  describe('GET /usage-history', () => {
    it('should get usage history with default limit', async () => {
      // Arrange
      const mockHistory = [
        {
          id: 1,
          tool_type: 'summarize',
          created_at: new Date(),
          status: 'completed'
        },
        {
          id: 2,
          tool_type: 'translate',
          created_at: new Date(),
          status: 'completed'
        }
      ];

      UserService.getUsageHistory = jest.fn()
        .mockResolvedValue(mockHistory);

      // Act
      const response = await request(app)
        .get('/usage-history')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.history).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
      expect(UserService.getUsageHistory)
        .toHaveBeenCalledWith(1, 50);
    });

    it('should get usage history with custom limit', async () => {
      // Arrange
      const mockHistory = [
        { id: 1, tool_type: 'summarize' }
      ];

      UserService.getUsageHistory = jest.fn()
        .mockResolvedValue(mockHistory);

      // Act
      const response = await request(app)
        .get('/usage-history?limit=10')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.history).toHaveLength(1);
      expect(UserService.getUsageHistory)
        .toHaveBeenCalledWith(1, 10);
    });

    it('should return empty array if no history', async () => {
      // Arrange
      UserService.getUsageHistory = jest.fn()
        .mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/usage-history')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.history).toEqual([]);
      expect(response.body.data.count).toBe(0);
    });
  });

  describe('GET /usage-stats', () => {
    it('should get usage stats for all tools', async () => {
      // Arrange
      const mockStats = {
        totalRequests: 100,
        totalCreditsUsed: 500,
        byToolType: {
          summarize: { count: 50, credits: 250 },
          translate: { count: 50, credits: 250 }
        }
      };

      UserService.getUsageStats = jest.fn()
        .mockResolvedValue(mockStats);

      // Act
      const response = await request(app)
        .get('/usage-stats')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRequests).toBe(100);
      expect(response.body.data.totalCreditsUsed).toBe(500);
      expect(UserService.getUsageStats)
        .toHaveBeenCalledWith(1, null);
    });

    it('should get usage stats for specific tool', async () => {
      // Arrange
      const mockStats = {
        totalRequests: 50,
        totalCreditsUsed: 250,
        toolType: 'summarize'
      };

      UserService.getUsageStats = jest.fn()
        .mockResolvedValue(mockStats);

      // Act
      const response = await request(app)
        .get('/usage-stats?toolType=summarize')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.toolType).toBe('summarize');
      expect(UserService.getUsageStats)
        .toHaveBeenCalledWith(1, 'summarize');
    });

    it('should return zero stats if no usage', async () => {
      // Arrange
      const mockStats = {
        totalRequests: 0,
        totalCreditsUsed: 0,
        byToolType: {}
      };

      UserService.getUsageStats = jest.fn()
        .mockResolvedValue(mockStats);

      // Act
      const response = await request(app)
        .get('/usage-stats')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.totalRequests).toBe(0);
      expect(response.body.data.totalCreditsUsed).toBe(0);
    });
  });
});
