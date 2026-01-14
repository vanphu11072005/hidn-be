const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// AI Request Model
const AIRequest = {
  
  // Create AI request log
  async create(requestData) {
    const sql = `
      INSERT INTO ai_requests (
        request_id,
        user_id,
        tool_type,
        credits_used,
        status,
        processing_time_ms
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      requestData.request_id || uuidv4(),
      requestData.user_id,
      requestData.tool_type,
      requestData.credits_used || 1,
      requestData.status || 'pending',
      requestData.processing_time_ms || 0
    ];
    
    const result = await query(sql, params);
    return result.insertId;
  },

  // Check last request time for cooldown
  async getLastRequestTime(userId, toolType) {
    const sql = `
      SELECT created_at
      FROM ai_requests
      WHERE user_id = ? AND tool_type = ? AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await query(sql, [userId, toolType]);
    
    if (result && result.length > 0) {
      return new Date(result[0].created_at);
    }
    
    return null;
  },

  // Update request status
  async updateStatus(requestId, status, processingTimeMs = null) {
    let sql = `
      UPDATE ai_requests 
      SET status = ?
    `;
    const params = [status];
    
    if (processingTimeMs !== null) {
      sql += ', processing_time_ms = ?';
      params.push(processingTimeMs);
    }
    
    sql += ' WHERE request_id = ?';
    params.push(requestId);
    
    await query(sql, params);
  },

  // Get user's AI request history
  async getUserHistory(userId, limit = 50) {
    const sql = `
      SELECT 
        request_id,
        tool_type,
        credits_used,
        status,
        processing_time_ms,
        created_at
      FROM ai_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    
    return await query(sql, [userId, limit]);
  },

  // Get usage stats by tool type
  async getUsageStats(userId, toolType = null) {
    let sql = `
      SELECT 
        tool_type,
        COUNT(*) as total_requests,
        SUM(credits_used) as total_credits,
        AVG(processing_time_ms) as avg_processing_time
      FROM ai_requests
      WHERE user_id = ?
    `;
    
    const params = [userId];
    
    if (toolType) {
      sql += ' AND tool_type = ?';
      params.push(toolType);
    }
    
    sql += ' GROUP BY tool_type';
    
    return await query(sql, params);
  }
};

module.exports = AIRequest;
