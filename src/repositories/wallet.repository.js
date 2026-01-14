const { query, transaction } = require('../config/database');

// Wallet Model
const Wallet = {
  
  // Create wallet for user
  async create(userId) {
    const sql = `
      INSERT INTO wallets (user_id, paid_credits)
      VALUES (?, 0)
    `;
    
    const result = await query(sql, [userId]);
    return result.insertId;
  },

  // Get wallet by user ID
  async findByUserId(userId) {
    const sql = `
      SELECT id, user_id, paid_credits, created_at, updated_at
      FROM wallets
      WHERE user_id = ?
    `;
    
    const wallets = await query(sql, [userId]);
    return wallets.length > 0 ? wallets[0] : null;
  },

  // Get total credits (free + paid)
  async getTotalCredits(userId) {
    // Get paid credits
    const wallet = await this.findByUserId(userId);
    const paidCredits = wallet ? wallet.paid_credits : 0;

    // Get free credits for today
    const today = new Date().toISOString().split('T')[0];
    const freeSql = `
      SELECT used_credits
      FROM daily_free_credits
      WHERE user_id = ? AND date = ?
    `;
    
    const freeResult = await query(freeSql, [userId, today]);
    const usedToday = freeResult.length > 0 ? 
      freeResult[0].used_credits : 0;
    
    const dailyLimit = parseInt(
      process.env.DAILY_FREE_CREDITS || '3'
    );
    const freeCredits = Math.max(0, dailyLimit - usedToday);

    return {
      freeCredits,
      paidCredits,
      totalCredits: freeCredits + paidCredits
    };
  },

  // Add paid credits
  async addCredits(userId, amount) {
    const sql = `
      UPDATE wallets
      SET paid_credits = paid_credits + ?,
          updated_at = NOW()
      WHERE user_id = ?
    `;
    
    await query(sql, [amount, userId]);
  },

  // Deduct credits (free first, then paid)
  async deductCredits(userId, amount) {
    return await transaction(async (connection) => {
      const today = new Date().toISOString().split('T')[0];
      const dailyLimit = parseInt(
        process.env.DAILY_FREE_CREDITS || '3'
      );

      // Get current free credits usage
      const [freeRows] = await connection.execute(
        `SELECT used_credits FROM daily_free_credits 
         WHERE user_id = ? AND date = ?`,
        [userId, today]
      );

      let usedToday = freeRows.length > 0 ? 
        freeRows[0].used_credits : 0;
      let remainingFree = Math.max(0, dailyLimit - usedToday);
      let remainingToDeduct = amount;

      // Use free credits first
      if (remainingFree > 0) {
        const freeToUse = Math.min(remainingFree, remainingToDeduct);
        
        if (freeRows.length === 0) {
          await connection.execute(
            `INSERT INTO daily_free_credits 
             (user_id, date, used_credits) VALUES (?, ?, ?)`,
            [userId, today, freeToUse]
          );
        } else {
          await connection.execute(
            `UPDATE daily_free_credits 
             SET used_credits = used_credits + ?, updated_at = NOW()
             WHERE user_id = ? AND date = ?`,
            [freeToUse, userId, today]
          );
        }
        
        remainingToDeduct -= freeToUse;
      }

      // Use paid credits if needed
      if (remainingToDeduct > 0) {
        const [walletRows] = await connection.execute(
          `SELECT paid_credits FROM wallets WHERE user_id = ?`,
          [userId]
        );

        if (walletRows.length === 0 || 
            walletRows[0].paid_credits < remainingToDeduct) {
          throw new Error('Insufficient credits');
        }

        await connection.execute(
          `UPDATE wallets 
           SET paid_credits = paid_credits - ?, updated_at = NOW()
           WHERE user_id = ?`,
          [remainingToDeduct, userId]
        );
      }

      return true;
    });
  }
};

module.exports = Wallet;
