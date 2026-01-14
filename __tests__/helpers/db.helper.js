const { pool } = require('../src/config/database');

// Test database helper functions
const setupTestDatabase = async () => {
  // Create test database tables if needed
  // This should match your actual database schema
};

const cleanupTestDatabase = async () => {
  // Clean up test data after each test
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE users');
    await connection.query('TRUNCATE TABLE wallets');
    await connection.query('TRUNCATE TABLE transactions');
    await connection.query('TRUNCATE TABLE ai_requests');
    await connection.query('TRUNCATE TABLE email_verification');
    await connection.query('TRUNCATE TABLE password_reset');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    connection.release();
  }
};

const closeDatabase = async () => {
  await pool.end();
};

module.exports = {
  setupTestDatabase,
  cleanupTestDatabase,
  closeDatabase
};
