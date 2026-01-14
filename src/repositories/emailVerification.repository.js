const { query } = require('../config/database');

const EmailVerification = {
  // Create verification code
  async create(userId, code, expiresInMinutes = 10) {
    const sql = `
      INSERT INTO email_verification_tokens 
      (user_id, token, expires_at) 
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))
    `;
    
    const result = await query(sql, [userId, code, expiresInMinutes]);
    return result.insertId;
  },

  // Find valid verification code
  async findValidCode(userId, code) {
    const sql = `
      SELECT * FROM email_verification_tokens 
      WHERE user_id = ? 
        AND token = ? 
        AND expires_at > NOW() 
        AND verified_at IS NULL
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const results = await query(sql, [userId, code]);
    return results.length > 0 ? results[0] : null;
  },

  // Mark code as verified
  async markAsVerified(id) {
    const sql = `
      UPDATE email_verification_tokens 
      SET verified_at = NOW() 
      WHERE id = ?
    `;
    
    await query(sql, [id]);
  },

  // Delete expired or used codes for a user
  async cleanupUserCodes(userId) {
    const sql = `
      DELETE FROM email_verification_tokens 
      WHERE user_id = ? 
        AND (expires_at < NOW() OR verified_at IS NOT NULL)
    `;
    
    await query(sql, [userId]);
  },

  // Check if user has recent code (prevent spam)
  async hasRecentCode(userId, withinSeconds = 60) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM email_verification_tokens 
      WHERE user_id = ? 
        AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
    `;
    
    const result = await query(sql, [userId, withinSeconds]);
    return result[0].count > 0;
  },

  // Get latest code creation time
  async getLatestCodeTime(userId) {
    const sql = `
      SELECT created_at 
      FROM email_verification_tokens 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await query(sql, [userId]);
    return result.length > 0 ? result[0].created_at : null;
  }
};

module.exports = EmailVerification;
