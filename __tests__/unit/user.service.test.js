const UserService = require('../../src/services/user.service');
const { User, Wallet, AIRequest } = require('../../src/repositories');

// Mock dependencies
jest.mock('../../src/repositories');

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('should get user with auth providers', async () => {
      // Arrange
      const userId = 1;
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        role_name: 'user',
        email_verified_at: new Date(),
        created_at: new Date()
      };
      const mockAuthProviders = [
        { provider: 'local', created_at: new Date() },
        { provider: 'google', created_at: new Date() }
      ];

      User.findById = jest.fn().mockResolvedValue(mockUser);
      User.getAuthProviders = jest.fn()
        .mockResolvedValue(mockAuthProviders);

      // Act
      const result = await UserService.getMe(userId);

      // Assert
      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(User.getAuthProviders).toHaveBeenCalledWith(userId);
      expect(result.authProviders).toHaveLength(2);
      expect(result.authProviders[0].provider).toBe('local');
      expect(result.authProviders[1].provider).toBe('google');
    });

    it('should return null if user not found', async () => {
      // Arrange
      User.findById = jest.fn().mockResolvedValue(null);

      // Act
      const result = await UserService.getMe(999);

      // Assert
      expect(result).toBeNull();
      expect(User.getAuthProviders).not.toHaveBeenCalled();
    });

    it('should handle user with no auth providers', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role_name: 'user'
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      User.getAuthProviders = jest.fn().mockResolvedValue([]);

      // Act
      const result = await UserService.getMe(1);

      // Assert
      expect(result.authProviders).toEqual([]);
    });
  });

  describe('getCredits', () => {
    it('should get user credits', async () => {
      // Arrange
      const userId = 1;
      const mockCredits = 150;

      Wallet.getTotalCredits = jest.fn()
        .mockResolvedValue(mockCredits);

      // Act
      const result = await UserService.getCredits(userId);

      // Assert
      expect(Wallet.getTotalCredits).toHaveBeenCalledWith(userId);
      expect(result).toBe(150);
    });

    it('should return 0 if user has no credits', async () => {
      // Arrange
      Wallet.getTotalCredits = jest.fn().mockResolvedValue(0);

      // Act
      const result = await UserService.getCredits(1);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('getUsageHistory', () => {
    it('should get user usage history with default limit', 
      async () => {
      // Arrange
      const userId = 1;
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

      AIRequest.getUserHistory = jest.fn()
        .mockResolvedValue(mockHistory);

      // Act
      const result = await UserService.getUsageHistory(userId);

      // Assert
      expect(AIRequest.getUserHistory)
        .toHaveBeenCalledWith(userId, 50);
      expect(result).toHaveLength(2);
      expect(result[0].tool_type).toBe('summarize');
    });

    it('should get user usage history with custom limit', 
      async () => {
      // Arrange
      const userId = 1;
      const mockHistory = [
        { id: 1, tool_type: 'summarize' }
      ];

      AIRequest.getUserHistory = jest.fn()
        .mockResolvedValue(mockHistory);

      // Act
      const result = await UserService.getUsageHistory(userId, 10);

      // Assert
      expect(AIRequest.getUserHistory)
        .toHaveBeenCalledWith(userId, 10);
      expect(result).toHaveLength(1);
    });

    it('should return empty array if no history', async () => {
      // Arrange
      AIRequest.getUserHistory = jest.fn().mockResolvedValue([]);

      // Act
      const result = await UserService.getUsageHistory(1, 50);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getUsageStats', () => {
    it('should get usage stats for all tools', async () => {
      // Arrange
      const userId = 1;
      const mockStats = {
        totalRequests: 100,
        totalCreditsUsed: 500,
        byToolType: {
          summarize: { count: 50, credits: 250 },
          translate: { count: 50, credits: 250 }
        }
      };

      AIRequest.getUsageStats = jest.fn()
        .mockResolvedValue(mockStats);

      // Act
      const result = await UserService.getUsageStats(userId, null);

      // Assert
      expect(AIRequest.getUsageStats)
        .toHaveBeenCalledWith(userId, null);
      expect(result.totalRequests).toBe(100);
      expect(result.totalCreditsUsed).toBe(500);
    });

    it('should get usage stats for specific tool', async () => {
      // Arrange
      const userId = 1;
      const toolType = 'summarize';
      const mockStats = {
        totalRequests: 50,
        totalCreditsUsed: 250,
        toolType: 'summarize'
      };

      AIRequest.getUsageStats = jest.fn()
        .mockResolvedValue(mockStats);

      // Act
      const result = await UserService.getUsageStats(
        userId, 
        toolType
      );

      // Assert
      expect(AIRequest.getUsageStats)
        .toHaveBeenCalledWith(userId, toolType);
      expect(result.toolType).toBe('summarize');
      expect(result.totalRequests).toBe(50);
    });

    it('should return zero stats if no usage', async () => {
      // Arrange
      const mockStats = {
        totalRequests: 0,
        totalCreditsUsed: 0,
        byToolType: {}
      };

      AIRequest.getUsageStats = jest.fn()
        .mockResolvedValue(mockStats);

      // Act
      const result = await UserService.getUsageStats(1, null);

      // Assert
      expect(result.totalRequests).toBe(0);
      expect(result.totalCreditsUsed).toBe(0);
    });
  });
});
