const { User, Wallet, AIRequest } = require('../repositories');

// User service: thin layer over repositories for controller use
const UserService = {
  async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) return null;

    // Get auth providers for this user
    const authProviders = await User.getAuthProviders(userId);
    user.authProviders = authProviders.map(ap => ({
      provider: ap.provider,
      linkedAt: ap.created_at
    }));

    return user;
  },

  async getCredits(userId) {
    return await Wallet.getTotalCredits(userId);
  },

  async getUsageHistory(userId, limit = 50) {
    return await AIRequest.getUserHistory(userId, limit);
  },

  async getUsageStats(userId, toolType = null) {
    return await AIRequest.getUsageStats(userId, toolType);
  }
};

module.exports = UserService;
