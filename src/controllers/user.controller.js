const { UserService, WalletService } = require('../services');
const userService = UserService;
const walletService = WalletService;
const { asyncHandler } = require('../middleware');

// Get current user info
exports.getMe = asyncHandler(async (req, res) => {
  const user = await userService.getMe(req.user.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get wallet info
  const wallet = await walletService.getWallet(req.user.id);

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      role: user.role_name,
      emailVerified: !!user.email_verified_at,
      authProviders: user.authProviders || [],
      createdAt: user.created_at,
      credits: {
        freeCredits: wallet.freeCredits,
        paidCredits: wallet.paidCredits,
        totalCredits: wallet.totalCredits,
      }
    }
  });
});

// Get user's credit balance
exports.getCredits = asyncHandler(async (req, res) => {
  const credits = await userService.getCredits(req.user.id);

  res.json({
    success: true,
    data: credits
  });
});

// Get user's AI usage history
exports.getUsageHistory = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const history = await userService.getUsageHistory(req.user.id, limit);

  res.json({
    success: true,
    data: {
      history,
      count: history.length
    }
  });
});

// Get user's usage statistics
exports.getUsageStats = asyncHandler(async (req, res) => {
  const toolType = req.query.toolType || null;
  const stats = await userService.getUsageStats(req.user.id, toolType);

  res.json({
    success: true,
    data: stats
  });
});
