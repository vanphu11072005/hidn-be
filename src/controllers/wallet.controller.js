const { WalletService } = require('../services');
const walletService = WalletService;
const { asyncHandler } = require('../middleware');
const { query } = require('../config/database');

// Get current user's wallet info
exports.getWallet = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const wallet = await walletService.getWallet(userId);

  res.json({
    success: true,
    data: wallet
  });
});

// Get credit costs for all tools (from database)
exports.getCreditCosts = asyncHandler(async (req, res) => {
  try {
    // Get tool pricing from database
    const toolPricingResult = await query(
      'SELECT config_value FROM credit_config WHERE config_key = ?',
      ['tool_pricing']
    );
    
    let creditCosts = { summary: 5, questions: 5, explain: 10, rewrite: 5 };
    
    if (toolPricingResult[0]) {
      try {
        creditCosts = JSON.parse(toolPricingResult[0].config_value);
      } catch (e) {
        console.error('Error parsing tool pricing from database:', e);
      }
    }

    res.json({
      success: true,
      data: creditCosts
    });
  } catch (error) {
    console.error('Error fetching credit costs:', error);
    // Fallback to default costs
    const { CREDIT_COSTS } = require('../config/credits');
    res.json({
      success: true,
      data: CREDIT_COSTS
    });
  }
});
