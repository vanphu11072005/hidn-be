const { query } = require('../config/database');

const Profile = {
  // Find profile by user id
  async findByUserId(userId) {
    const sql = `
      SELECT id, user_id, display_name, avatar_url, created_at, updated_at
      FROM profiles
      WHERE user_id = ?
    `;

    const rows = await query(sql, [userId]);
    return rows.length > 0 ? rows[0] : null;
  },

  // Create a new profile
  async create(userId, data) {
    const sql = `
      INSERT INTO profiles (user_id, display_name, avatar_url)
      VALUES (?, ?, ?)
    `;

    const params = [userId, data.display_name || null, data.avatar_url || null];
    const result = await query(sql, params);
    return result.insertId;
  },

  // Update existing profile
  async updateByUserId(userId, data) {
    const sets = [];
    const params = [];

    if (Object.prototype.hasOwnProperty.call(data, 'display_name')) {
      sets.push('display_name = ?');
      params.push(data.display_name || null);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'avatar_url')) {
      sets.push('avatar_url = ?');
      params.push(data.avatar_url || null);
    }

    if (sets.length === 0) return;

    const sql = `
      UPDATE profiles
      SET ${sets.join(', ')}, updated_at = NOW()
      WHERE user_id = ?
    `;

    params.push(userId);
    await query(sql, params);
  },

  // Upsert profile (create or update)
  async upsert(userId, data) {
    const existing = await this.findByUserId(userId);
    if (existing) {
      await this.updateByUserId(userId, data);
      return await this.findByUserId(userId);
    } else {
      await this.create(userId, data);
      return await this.findByUserId(userId);
    }
  }
};

module.exports = Profile;
