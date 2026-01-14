const WalletService = require('../../src/services/wallet.service');
const db = require('../../src/config/database');
const toolConfigService = require('../../src/services/toolConfig.service');

// Mock dependencies
jest.mock('../../src/config/database');
jest.mock('../../src/services/toolConfig.service');

describe('WalletService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWallet', () => {
    it('should get wallet with free and paid credits', async () => {
      // Arrange
      const userId = 1;
      const mockWallet = [{ user_id: userId, paid_credits: 100 }];
      const mockDailyUsage = [{ used_credits: 5 }];
      const mockCreditConfig = [{ config_value: '20' }];

      db.query
        .mockResolvedValueOnce(mockWallet)
        .mockResolvedValueOnce(mockDailyUsage)
        .mockResolvedValueOnce(mockCreditConfig);

      // Act
      const result = await WalletService.getWallet(userId);

      // Assert
      expect(result).toMatchObject({
        userId: 1,
        freeCredits: 15,
        paidCredits: 100,
        totalCredits: 115,
        usedToday: 5
      });
    });

    it('should return 0 free credits if daily limit exceeded', 
      async () => {
      const userId = 1;
      const mockWallet = [{ user_id: userId, paid_credits: 50 }];
      const mockDailyUsage = [{ used_credits: 25 }];
      const mockCreditConfig = [{ config_value: '20' }];

      db.query
        .mockResolvedValueOnce(mockWallet)
        .mockResolvedValueOnce(mockDailyUsage)
        .mockResolvedValueOnce(mockCreditConfig);

      const result = await WalletService.getWallet(userId);

      expect(result.freeCredits).toBe(0);
      expect(result.totalCredits).toBe(50);
    });

    it('should throw error if wallet not found', async () => {
      db.query.mockResolvedValueOnce([]);

      await expect(WalletService.getWallet(1))
        .rejects
        .toThrow('Không tìm thấy ví');
    });

    it('should handle no daily usage', async () => {
      const mockWallet = [{ user_id: 1, paid_credits: 100 }];
      const mockCreditConfig = [{ config_value: '20' }];

      db.query
        .mockResolvedValueOnce(mockWallet)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockCreditConfig);

      const result = await WalletService.getWallet(1);

      expect(result.freeCredits).toBe(20);
      expect(result.usedToday).toBe(0);
    });
  });

  describe('hasEnoughCredits', () => {
    it('should return true if user has enough credits', 
      async () => {
      const userId = 1;
      const toolType = 'summarize';
      
      const mockCreditConfig = [
        { config_value: '{"summarize": 5}' }
      ];
      db.query.mockResolvedValueOnce(mockCreditConfig);
      toolConfigService.getCostMultiplier.mockResolvedValue(1);

      const mockWallet = [{ user_id: 1, paid_credits: 100 }];
      const mockDailyUsage = [{ used_credits: 0 }];
      const mockDailyFreeConfig = [{ config_value: '20' }];
      
      db.query
        .mockResolvedValueOnce(mockWallet)
        .mockResolvedValueOnce(mockDailyUsage)
        .mockResolvedValueOnce(mockDailyFreeConfig);

      const result = await WalletService.hasEnoughCredits(
        userId, 
        toolType
      );

      expect(result).toBe(true);
    });

    it('should return false if user has insufficient credits', 
      async () => {
      const userId = 1;
      const toolType = 'summarize';
      
      const mockCreditConfig = [
        { config_value: '{"summarize": 5}' }
      ];
      db.query.mockResolvedValueOnce(mockCreditConfig);
      toolConfigService.getCostMultiplier.mockResolvedValue(1);

      const mockWallet = [{ user_id: 1, paid_credits: 0 }];
      const mockDailyUsage = [{ used_credits: 17 }];
      const mockDailyFreeConfig = [{ config_value: '20' }];
      
      db.query
        .mockResolvedValueOnce(mockWallet)
        .mockResolvedValueOnce(mockDailyUsage)
        .mockResolvedValueOnce(mockDailyFreeConfig);

      const result = await WalletService.hasEnoughCredits(
        userId, 
        toolType
      );

      expect(result).toBe(false);
    });

    it('should throw error for invalid tool type', async () => {
      const mockCreditConfig = [{ config_value: '{}' }];
      db.query.mockResolvedValueOnce(mockCreditConfig);
      toolConfigService.getCostMultiplier.mockResolvedValue(1);

      await expect(
        WalletService.hasEnoughCredits(1, 'invalid_tool')
      )
        .rejects
        .toThrow('Loại công cụ không hợp lệ');
    });
  });

  describe('getCreditCost', () => {
    it('should get credit cost with multiplier', async () => {
      const toolType = 'summarize';
      const mockCreditConfig = [
        { config_value: '{"summarize": 5}' }
      ];
      
      db.query.mockResolvedValueOnce(mockCreditConfig);
      toolConfigService.getCostMultiplier.mockResolvedValue(2);

      const result = await WalletService.getCreditCost(toolType);

      expect(result).toBe(10);
    });

    it('should return 0 for unknown tool', async () => {
      const mockCreditConfig = [
        { config_value: '{"summarize": 5}' }
      ];
      
      db.query.mockResolvedValueOnce(mockCreditConfig);
      toolConfigService.getCostMultiplier.mockResolvedValue(1);

      const result = await WalletService.getCreditCost(
        'unknown_tool'
      );

      expect(result).toBe(0);
    });

    it('should ceil the final cost', async () => {
      const mockCreditConfig = [
        { config_value: '{"summarize": 5}' }
      ];
      
      db.query.mockResolvedValueOnce(mockCreditConfig);
      toolConfigService.getCostMultiplier.mockResolvedValue(1.5);

      const result = await WalletService.getCreditCost('summarize');

      expect(result).toBe(8);
    });
  });
});
