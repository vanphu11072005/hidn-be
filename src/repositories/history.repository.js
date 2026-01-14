const { query } = require('../config/database');

/**
 * History Repository - CRUD operations for user history
 */

// Create a new history entry
exports.create = async ({
  userId,
  toolType,
  inputText,
  outputText,
  settings = {},
  creditsUsed = 1
}) => {
  const result = await query(
    `INSERT INTO history 
      (user_id, tool_type, input_text, output_text, settings, credits_used)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      toolType,
      inputText,
      outputText,
      JSON.stringify(settings),
      creditsUsed
    ]
  );
  return result.insertId;
};

// Get all history for a user (paginated)
exports.findByUserId = async (userId, { limit = 20, offset = 0 } = {}) => {
  const rows = await query(
    `SELECT 
      id,
      tool_type,
      SUBSTRING(input_text, 1, 100) as input_preview,
      SUBSTRING(output_text, 1, 150) as output_preview,
      credits_used,
      created_at
     FROM history
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  return rows;
};

// Count total history for a user
exports.countByUserId = async (userId) => {
  const rows = await query(
    'SELECT COUNT(*) as total FROM history WHERE user_id = ?',
    [userId]
  );
  return rows[0].total;
};

// Get a single history entry by ID (with full content)
exports.findById = async (id, userId) => {
  const rows = await query(
    `SELECT 
      id,
      tool_type,
      input_text,
      output_text,
      settings,
      credits_used,
      created_at
     FROM history
     WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  // Parse settings JSON
  if (row.settings) {
    try {
      row.settings = JSON.parse(row.settings);
    } catch {
      row.settings = {};
    }
  }
  
  return row;
};

// Delete a history entry
exports.deleteById = async (id, userId) => {
  const result = await query(
    'DELETE FROM history WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
};

// Delete all history for a user
exports.deleteAllByUserId = async (userId) => {
  const result = await query(
    'DELETE FROM history WHERE user_id = ?',
    [userId]
  );
  return result.affectedRows;
};
