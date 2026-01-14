const { query } = require('../config/database');

// Cache for tool configs (5 minutes)
let configCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch tool configs from database
 */
async function fetchToolConfigs() {
  try {
    const dbName = process.env.DB_NAME || 'hidn_db';

    // Check if tool_configs table exists
    const existsSql = `
      SELECT COUNT(*) as cnt
      FROM information_schema.tables
      WHERE table_schema = ? AND table_name = ?
    `;

    const existsRes = await query(existsSql, [dbName, 'tool_configs']);
    const exists = existsRes && existsRes[0] && existsRes[0].cnt > 0;

    if (exists) {
      const configsSql = `SELECT * FROM tool_configs ORDER BY tool_id`;
      const configs = await query(configsSql);

      if (configs && configs.length > 0) {
        // Convert array to map for easy lookup
        const configMap = {};
        configs.forEach((config) => {
          configMap[config.tool_id] = config;
        });
        return configMap;
      }
    }

    // Return empty map if no configs
    return {};
  } catch (error) {
    console.error('Error fetching tool configs:', error);
    return {};
  }
}

/**
 * Get cached tool configs or fetch if cache expired
 */
async function getToolConfigs() {
  const now = Date.now();

  if (configCache && (now - lastFetchTime) < CACHE_DURATION) {
    return configCache;
  }

  configCache = await fetchToolConfigs();
  lastFetchTime = now;

  return configCache;
}

/**
 * Get specific tool config
 */
async function getToolConfig(toolId) {
  const configs = await getToolConfigs();
  return configs[toolId] || null;
}

/**
 * Get cost multiplier for a tool (default 1.0)
 */
async function getCostMultiplier(toolId) {
  const config = await getToolConfig(toolId);
  if (!config || config.cost_multiplier == null) {
    return 1.0;
  }
  // Parse to float to handle Decimal/string from MySQL
  const multiplier = parseFloat(config.cost_multiplier);
  return isNaN(multiplier) ? 1.0 : multiplier;
}

/**
 * Get cooldown seconds for a tool (default 0)
 */
async function getCooldownSeconds(toolId) {
  const config = await getToolConfig(toolId);
  if (!config || config.cooldown_seconds == null) {
    return 0;
  }
  // Parse to int to handle string from MySQL
  const cooldown = parseInt(config.cooldown_seconds, 10);
  return isNaN(cooldown) ? 0 : cooldown;
}

/**
 * Check if tool is enabled (default true)
 */
async function isToolEnabled(toolId) {
  const config = await getToolConfig(toolId);
  return config ? config.enabled === 1 : true;
}

module.exports = {
  getToolConfigs,
  getToolConfig,
  getCostMultiplier,
  getCooldownSeconds,
  isToolEnabled,
};
