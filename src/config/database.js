const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Default CA path used when writing or loading a bundled CA file.
const defaultCaPath = path.join(__dirname, '..', '..', 'certs', 'ca.pem');

// Prefer explicit path from env. If not provided, support a base64
// PEM via `DB_SSL_BASE64` (recommended for secrets) or fall back to
// a local file when present.
let caPath = process.env.DB_SSL_CA;

// If DB_SSL_BASE64 is provided, write it to `defaultCaPath` and use it.
if (!caPath && process.env.DB_SSL_BASE64) {
  try {
    const buf = Buffer.from(process.env.DB_SSL_BASE64, 'base64');
    fs.mkdirSync(path.dirname(defaultCaPath), { recursive: true });
    fs.writeFileSync(defaultCaPath, buf);
    caPath = defaultCaPath;
    console.log('✅ Wrote DB CA from DB_SSL_BASE64 to', defaultCaPath);
  } catch (e) {
    console.error('❌ Failed to write DB CA from DB_SSL_BASE64:', e.message);
  }
} else if (!caPath && fs.existsSync(defaultCaPath)) {
  caPath = defaultCaPath;
}

// Build SSL config from environment or default file:
// - If `caPath` present, load it as `ca` (recommended)
// - Else if `DB_ALLOW_SELF_SIGNED=true` then disable cert verification
// - In production without CA, allow self-signed (common for managed DB)
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
  console.warn('⚠️ DB_ALLOW_SELF_SIGNED=true, SSL verification disabled');
  sslConfig = { rejectUnauthorized: false };
} else if (process.env.NODE_ENV === 'production' && !caPath) {
  console.warn('⚠️ Production mode without CA cert, allowing self-signed');
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
    return true;
  } catch (err) {
    console.error('❌ MySQL connect error:', err);
    return false;
  }
};

module.exports = {
  pool,
  testConnection,
};

// Convenience helper used by repositories: return `rows` directly
// so callers can work with query results or OkPacket for INSERT.
const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

module.exports.query = query;
