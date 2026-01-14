const db = require('../config/database');
const toolConfigService = require('./toolConfig.service');
const { 
  CREDIT_COSTS, 
  DAILY_FREE_CREDITS, 
  CREDIT_ERRORS 
} = require('../config/credits');

// Cache for credit costs (refresh every 5 minutes)
let creditCostsCache = null;
let dailyFreeCreditsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to get credit costs from database
async function getCreditCostsFromDB() {
  const now = Date.now();
  
  // Return cached value if still valid
  if (creditCostsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return creditCostsCache;
  }

  try {
    const result = await db.query(
      'SELECT config_value FROM credit_config WHERE config_key = ?',
      ['tool_pricing']
    );
    
    if (result[0]) {
      creditCostsCache = JSON.parse(result[0].config_value);
      cacheTimestamp = now;
      return creditCostsCache;
    }
  } catch (error) {
    console.error('Error loading credit costs from database:', error);
  }

  // Fallback to hardcoded costs
  return CREDIT_COSTS;
}

// Helper function to get daily free credits from database
async function getDailyFreeCreditsFromDB() {
  const now = Date.now();
  
  // Return cached value if still valid
  if (dailyFreeCreditsCache !== null && (now - cacheTimestamp) < CACHE_TTL) {
    return dailyFreeCreditsCache;
  }

  try {
    const result = await db.query(
      'SELECT config_value FROM credit_config WHERE config_key = ?',
      ['daily_free_credits']
    );
    
    if (result[0]) {
      dailyFreeCreditsCache = parseInt(result[0].config_value);
      cacheTimestamp = now;
      return dailyFreeCreditsCache;
    }
  } catch (error) {
    console.error('Error loading daily free credits from database:', error);
  }

  // Fallback to hardcoded value
  return DAILY_FREE_CREDITS;
}

class WalletService {
  // Get wallet info with total credits
  async getWallet(userId) {
    const wallet = await db.query(
      'SELECT * FROM wallets WHERE user_id = ?',
      [userId]
    );

    if (wallet.length === 0) {
      throw new Error(CREDIT_ERRORS.NOT_FOUND);
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Get today's free credits usage
    const dailyUsage = await db.query(
      `SELECT used_credits FROM daily_free_credits 
       WHERE user_id = ? AND date = ?`,
      [userId, today]
    );

    const dailyFreeCreditsLimit = await getDailyFreeCreditsFromDB();
    const usedToday = dailyUsage[0]?.used_credits || 0;
    const freeCredits = Math.max(0, dailyFreeCreditsLimit - usedToday);
    const paidCredits = wallet[0].paid_credits;

    return {
      userId,
      freeCredits,
      paidCredits,
      totalCredits: freeCredits + paidCredits,
      usedToday,
    };
  }

  // Check if user has enough credits
  async hasEnoughCredits(userId, toolType) {
    // Use computed final cost (includes tool multiplier)
    const required = await this.getCreditCost(toolType);

    if (!required || required <= 0) {
      throw new Error(CREDIT_ERRORS.INVALID_TOOL);
    }

    const wallet = await this.getWallet(userId);
    return wallet.totalCredits >= required;
  }

  // Deduct credits (free first, then paid)
  async deductCredits(userId, toolType) {
    // Compute final cost using multiplier
    const cost = await this.getCreditCost(toolType);

    if (!cost || cost <= 0) {
      throw new Error(CREDIT_ERRORS.INVALID_TOOL);
    }

    const wallet = await this.getWallet(userId);

    if (wallet.totalCredits < cost) {
      throw new Error(CREDIT_ERRORS.INSUFFICIENT);
    }

    const today = new Date().toISOString().split('T')[0];
    let remaining = cost;

    // Deduct from free credits first
    if (wallet.freeCredits > 0) {
      const deductFromFree = Math.min(
        remaining, 
        wallet.freeCredits
      );
      
      // Update daily free credits usage
      await db.query(
        `INSERT INTO daily_free_credits 
         (user_id, date, used_credits) 
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         used_credits = used_credits + ?`,
        [userId, today, deductFromFree, deductFromFree]
      );

      remaining -= deductFromFree;
    }

    // Deduct remaining from paid credits
    if (remaining > 0) {
      await db.query(
        `UPDATE wallets 
         SET paid_credits = paid_credits - ? 
         WHERE user_id = ?`,
        [remaining, userId]
      );
    }

    // Return updated wallet
    return this.getWallet(userId);
  }

  // Create wallet for new user
  async createWallet(userId) {
    await db.query(
      'INSERT INTO wallets (user_id, paid_credits) VALUES (?, 0)',
      [userId]
    );
    return this.getWallet(userId);
  }

  // Add paid credits
  async addPaidCredits(userId, amount) {
    await db.query(
      `UPDATE wallets 
       SET paid_credits = paid_credits + ? 
       WHERE user_id = ?`,
      [amount, userId]
    );
    return this.getWallet(userId);
  }

  // Get credit cost for tool (with multiplier applied)
  async getCreditCost(toolType) {
    const costs = await getCreditCostsFromDB();
    const baseCost = costs[toolType] || 0;
    
    // Apply cost multiplier from tool config
    const multiplier = await toolConfigService.getCostMultiplier(toolType);
    const finalCost = Math.ceil(baseCost * multiplier);
    
    return finalCost;
  }
}

module.exports = new WalletService();
