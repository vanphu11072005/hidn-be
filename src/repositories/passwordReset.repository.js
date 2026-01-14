/**
 * Password Reset Repository
 * Handles password_reset_tokens table operations
 */

const { query } = require('../config/database');
const crypto = require('crypto');

const PasswordReset = {
  /**
   * Create a password reset token
   */
  async create(userId, expiresInMinutes = 60) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + expiresInMinutes * 60 * 1000
    );

    const result = await query(
      `INSERT INTO password_reset_tokens 
        (user_id, token, expires_at) 
       VALUES (?, ?, ?)`,
      [userId, token, expiresAt]
    );

    return { token, expiresAt, id: result.insertId };
  },

  /**
   * Find valid reset token
   */
  async findValidToken(token) {
    const rows = await query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = ? 
         AND expires_at > NOW() 
         AND used_at IS NULL
       ORDER BY created_at DESC 
       LIMIT 1`,
      [token]
    );

    return rows[0] || null;
  },

  /**
   * Mark token as used
   */
  async markAsUsed(token) {
    const result = await query(
      `UPDATE password_reset_tokens 
       SET used_at = NOW() 
       WHERE token = ?`,
      [token]
    );

    return result.affectedRows > 0;
  },

  /**
   * Clean up old/used tokens for a user
   */
  async cleanupUserTokens(userId) {
    await query(
      `DELETE FROM password_reset_tokens 
       WHERE user_id = ? 
         AND (expires_at < NOW() OR used_at IS NOT NULL)`,
      [userId]
    );
  },

  /**
   * Check if user has recent unused reset token (rate limiting)
   */
  async hasRecentToken(userId, minutesAgo = 5) {
    const rows = await query(
      `SELECT id FROM password_reset_tokens 
       WHERE user_id = ? 
         AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)
         AND used_at IS NULL
       LIMIT 1`,
      [userId, minutesAgo]
    );

    return rows.length > 0;
  },

  /**
   * Get latest token creation time for user
   */
  async getLatestTokenTime(userId) {
    const rows = await query(
      `SELECT created_at FROM password_reset_tokens 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );

    return rows[0]?.created_at || null;
  }
};

module.exports = PasswordReset;
