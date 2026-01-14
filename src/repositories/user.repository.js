const { query } = require('../config/database');

// User Model
const User = {
  
  // Create new user
  async create(userData) {
    const sql = `
      INSERT INTO users (
        email, 
        password_hash, 
        role_id
      )
      VALUES (?, ?, ?)
    `;
    
    const params = [
      userData.email,
      userData.password_hash,
      userData.role_id || 1 // Default to 'user' role
    ];
    
    const result = await query(sql, params);
    const userId = result.insertId;

    // Add auth provider entry
    if (userData.provider) {
      await this.addAuthProvider(
        userId, 
        userData.provider, 
        userData.provider_user_id || null
      );
    } else {
      // Default to local provider
      await this.addAuthProvider(userId, 'local', null);
    }

    return userId;
  },

  // Find user by ID
  async findById(userId) {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.password_hash,
        u.email_verified_at,
        u.last_login_at,
        u.created_at,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `;
    
    const users = await query(sql, [userId]);
    return users.length > 0 ? users[0] : null;
  },

  // Find user by email
  async findByEmail(email) {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.password_hash,
        u.email_verified_at,
        u.last_login_at,
        u.created_at,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `;
    
    const users = await query(sql, [email]);
    return users.length > 0 ? users[0] : null;
  },

  // Update last login
  async updateLastLogin(userId) {
    const sql = `
      UPDATE users 
      SET last_login_at = NOW() 
      WHERE id = ?
    `;
    
    await query(sql, [userId]);
  },

  // Update email verification
  async verifyEmail(userId) {
    const sql = `
      UPDATE users 
      SET email_verified_at = NOW() 
      WHERE id = ?
    `;
    
    await query(sql, [userId]);
  },

  // Update password
  async updatePassword(userId, newPasswordHash) {
    const sql = `
      UPDATE users 
      SET password_hash = ?, updated_at = NOW() 
      WHERE id = ?
    `;
    
    await query(sql, [newPasswordHash, userId]);
  },

  // Check if email exists
  async emailExists(email) {
    const sql = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
    const result = await query(sql, [email]);
    return result[0].count > 0;
  },

  // ==========================================
  // AUTH PROVIDERS METHODS
  // ==========================================

  // Add auth provider for user
  async addAuthProvider(userId, provider, providerUserId = null) {
    const sql = `
      INSERT INTO user_auth_providers (
        user_id, 
        provider, 
        provider_user_id
      )
      VALUES (?, ?, ?)
    `;
    
    await query(sql, [userId, provider, providerUserId]);
  },

  // Find user by provider and provider user ID
  async findByProvider(provider, providerUserId) {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.password_hash,
        u.email_verified_at,
        u.last_login_at,
        u.created_at,
        r.name as role_name
      FROM users u
      INNER JOIN user_auth_providers uap ON u.id = uap.user_id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE uap.provider = ? AND uap.provider_user_id = ?
    `;
    
    const users = await query(sql, [provider, providerUserId]);
    return users.length > 0 ? users[0] : null;
  },

  // Check if user has specific auth provider
  async hasAuthProvider(userId, provider) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM user_auth_providers 
      WHERE user_id = ? AND provider = ?
    `;
    
    const result = await query(sql, [userId, provider]);
    return result[0].count > 0;
  },

  // Get all auth providers for user
  async getAuthProviders(userId) {
    const sql = `
      SELECT provider, provider_user_id, created_at
      FROM user_auth_providers
      WHERE user_id = ?
    `;
    
    return await query(sql, [userId]);
  },

  // Link new provider to existing user
  async linkProvider(userId, provider, providerUserId) {
    // Check if provider already linked
    const hasProvider = await this.hasAuthProvider(userId, provider);
    
    if (hasProvider) {
      throw Object.assign(
        new Error('Provider already linked to this account'),
        { status: 409 }
      );
    }

    await this.addAuthProvider(userId, provider, providerUserId);
  },

  // Create user with specific auth provider
  async createWithProvider(userData) {
    const sql = `
      INSERT INTO users (
        email, 
        password_hash,
        role_id,
        email_verified_at
      )
      VALUES (?, ?, ?, ?)
    `;
    
    const params = [
      userData.email,
      userData.password_hash || null,
      userData.role_id || 1,
      userData.email_verified ? new Date() : null
    ];
    
    const result = await query(sql, params);
    const userId = result.insertId;

    // Add auth provider
    await this.addAuthProvider(
      userId, 
      userData.provider, 
      userData.provider_user_id
    );

    return userId;
  },

  // Add password to account (for linking email/password to OAuth)
  async addPasswordToAccount(userId, passwordHash) {
    const sql = `
      UPDATE users 
      SET password_hash = ?, updated_at = NOW() 
      WHERE id = ?
    `;
    
    await query(sql, [passwordHash, userId]);
  }
};

module.exports = User;
