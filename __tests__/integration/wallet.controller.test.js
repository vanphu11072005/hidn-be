const request = require('supertest');
const express = require('express');
const walletController = require('../../src/controllers/wallet.controller');
const { WalletService } = require('../../src/services');
const { query } = require('../../src/config/database');

// Mock dependencies
jest.mock('../../src/services');
jest.mock('../../src/config/database');

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
  app.get('/wallet', walletController.getWallet);
  app.get('/credit-costs', walletController.getCreditCosts);

  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  });

  return app;
};

describe('WalletController', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /wallet', () => {
    it('should get wallet info successfully', async () => {
      // Arrange
      const mockWallet = {
        userId: 1,
        freeCredits: 15,
        paidCredits: 100,
        totalCredits: 115,
        usedToday: 5
      };

      WalletService.getWallet = jest.fn()
        .mockResolvedValue(mockWallet);

      // Act
      const response = await request(app)
        .get('/wallet')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockWallet);
      expect(WalletService.getWallet).toHaveBeenCalledWith(1);
    });

    it('should handle wallet with no free credits', async () => {
      // Arrange
      const mockWallet = {
        userId: 1,
        freeCredits: 0,
        paidCredits: 50,
        totalCredits: 50,
        usedToday: 20
      };

      WalletService.getWallet = jest.fn()
        .mockResolvedValue(mockWallet);

      // Act
      const response = await request(app)
        .get('/wallet')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.freeCredits).toBe(0);
      expect(response.body.data.totalCredits).toBe(50);
    });

    it('should handle wallet with no paid credits', async () => {
      // Arrange
      const mockWallet = {
        userId: 1,
        freeCredits: 20,
        paidCredits: 0,
        totalCredits: 20,
        usedToday: 0
      };

      WalletService.getWallet = jest.fn()
        .mockResolvedValue(mockWallet);

      // Act
      const response = await request(app)
        .get('/wallet')
        .set('Authorization', 'Bearer token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.paidCredits).toBe(0);
      expect(response.body.data.freeCredits).toBe(20);
    });
  });

  describe('GET /credit-costs', () => {
    it('should get credit costs from database', async () => {
      // Arrange
      const mockToolPricing = {
        summary: 5,
        questions: 5,
        explain: 10,
        rewrite: 5
      };

      query.mockResolvedValue([
        { config_value: JSON.stringify(mockToolPricing) }
      ]);

      // Act
      const response = await request(app)
        .get('/credit-costs');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockToolPricing);
    });

    it('should return default costs if database query fails', 
      async () => {
      // Arrange
      query.mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app)
        .get('/credit-costs');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.summary).toBe('number');
    });

    it('should handle invalid JSON in database', async () => {
      // Arrange
      query.mockResolvedValue([
        { config_value: 'invalid json' }
      ]);

      // Act
      const response = await request(app)
        .get('/credit-costs');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should return default costs
      expect(response.body.data).toBeDefined();
    });

    it('should return default costs if no config found', 
      async () => {
      // Arrange
      query.mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/credit-costs');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        summary: 5,
        questions: 5,
        explain: 10,
        rewrite: 5
      });
    });

    it('should include all tool types in costs', async () => {
      // Arrange
      const mockToolPricing = {
        summary: 5,
        questions: 5,
        explain: 10,
        rewrite: 5,
        translate: 8
      };

      query.mockResolvedValue([
        { config_value: JSON.stringify(mockToolPricing) }
      ]);

      // Act
      const response = await request(app)
        .get('/credit-costs');

      // Assert
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('questions');
      expect(response.body.data).toHaveProperty('explain');
      expect(response.body.data).toHaveProperty('rewrite');
    });
  });
});
