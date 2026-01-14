const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// If a local default CA file exists at ./certs/ca.pem, use it when
// DB_SSL_CA is not explicitly set. This makes local dev easier.
const defaultCaPath = path.join(__dirname, '..', '..', 'certs', 'ca.pem');
const caPath = process.env.DB_SSL_CA || (fs.existsSync(defaultCaPath) ? defaultCaPath : undefined);

// Build SSL config from environment or default file:
// - If `caPath` present, load it as `ca` (recommended)
// - Else if `DB_ALLOW_SELF_SIGNED=true` then disable cert verification (dev only)
// - Otherwise keep strict verification
let sslConfig;
if (caPath) {
  try {
    sslConfig = { ca: fs.readFileSync(caPath) };
  } catch (e) {
    console.error('❌ Cannot read CA file at', caPath + ':', e.message);
    sslConfig = { rejectUnauthorized: true };
  }
} else if (process.env.DB_ALLOW_SELF_SIGNED === 'true') {
  console.warn('⚠️ DB_ALLOW_SELF_SIGNED=true, SSL certificate verification disabled');
  sslConfig = { rejectUnauthorized: false };
} else {
  sslConfig = { rejectUnauthorized: true };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'hidn-phuphanbdb.h.aivencloud.com',
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD, // BẮT BUỘC set env
  database: process.env.DB_NAME || 'defaultdb',
  port: Number(process.env.DB_PORT) || 20142,

  ssl: sslConfig,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// test connect
const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connected to Aiven MySQL');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connect error:', err);
  }
};

module.exports = {
  pool,
  testConnection,
};
