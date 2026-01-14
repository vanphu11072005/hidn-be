const AdminRepository = require('../repositories/admin.repository');

/**
 * Admin Service
 * Business logic layer for admin operations
 */
const AdminService = {
  /**
   * Get comprehensive dashboard statistics
   * @returns {Object} Dashboard data including stats, 
   * usage, tools, and activity
   */
  async getDashboardData() {
    try {
      const [stats, usageData, toolUsage, recentActivity] = 
        await Promise.all([
          AdminRepository.getDashboardStats(),
          AdminRepository.getUsageChartData(),
          AdminRepository.getToolUsageData(),
          AdminRepository.getRecentActivity(10),
        ]);

      return {
        stats,
        usageData,
        toolUsage,
        recentActivity,
      };
    } catch (error) {
      console.error('Error in getDashboardData:', error);
      throw new Error('Failed to fetch dashboard data');
    }
  },

  /**
   * Get users list with filtering and pagination
   * @param {Object} filters - Filter options
   * @returns {Object} Users list with pagination info
   */
  async getUsers(filters = {}) {
    try {
      const sanitizedFilters = {
        search: filters.search || '',
        role: filters.role || 'all',
        status: filters.status || 'all',
        page: parseInt(filters.page) || 1,
        limit: parseInt(filters.limit) || 10,
      };

      // Validate page and limit
      if (sanitizedFilters.page < 1) {
        sanitizedFilters.page = 1;
      }
      if (sanitizedFilters.limit < 1 || 
          sanitizedFilters.limit > 100) {
        sanitizedFilters.limit = 10;
      }

      return await AdminRepository.getUsers(sanitizedFilters);
    } catch (error) {
      console.error('Error in getUsers:', error);
      throw new Error('Failed to fetch users list');
    }
  },

  /**
   * Get detailed user information by ID
   * @param {number} userId - User ID
   * @returns {Object|null} User details or null if not found
   */
  async getUserById(userId) {
    try {
      const parsedId = parseInt(userId, 10);

      if (!parsedId || isNaN(parsedId)) {
        throw new Error('Invalid user ID');
      }

      const user = await AdminRepository.getUserById(parsedId);

      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  },

  /**
   * Get credit usage logs with filtering
   * @param {Object} filters - Filter options
   * @returns {Object} Credit logs with pagination
   */
  async getCreditLogs(filters = {}) {
    try {
      const sanitizedFilters = {
        search: filters.search || '',
        toolType: filters.toolType || '',
        status: filters.status || '',
        page: parseInt(filters.page) || 1,
        limit: parseInt(filters.limit) || 20,
      };

      // Validate pagination
      if (sanitizedFilters.page < 1) {
        sanitizedFilters.page = 1;
      }
      if (sanitizedFilters.limit < 1 || 
          sanitizedFilters.limit > 100) {
        sanitizedFilters.limit = 20;
      }

      return await AdminRepository.getCreditLogs(
        sanitizedFilters
      );
    } catch (error) {
      console.error('Error in getCreditLogs:', error);
      throw new Error('Failed to fetch credit logs');
    }
  },

  /**
   * Get credit system configuration
   * @returns {Object} Credit configuration
   */
  async getCreditConfig() {
    try {
      return await AdminRepository.getCreditConfig();
    } catch (error) {
      console.error('Error in getCreditConfig:', error);
      throw new Error('Failed to fetch credit configuration');
    }
  },

  /**
   * Update credit system configuration
   * @param {Object} config - New credit configuration
   * @returns {Object} Update result
   */
  async updateCreditConfig(config) {
    try {
      // Validate config structure
      if (!config.toolPricing || 
          !Array.isArray(config.toolPricing)) {
        throw new Error(
          'Invalid tool pricing configuration'
        );
      }

      if (typeof config.dailyFreeCredits !== 'number' || 
          config.dailyFreeCredits < 0) {
        throw new Error('Invalid daily free credits value');
      }

      // Validate each tool pricing entry
      for (const tool of config.toolPricing) {
        if (!tool.toolId || !tool.toolName || 
            typeof tool.creditCost !== 'number' || 
            tool.creditCost < 0) {
          throw new Error(
            `Invalid pricing for tool: ${tool.toolId}`
          );
        }
      }

      // Validate bonus config if present
      if (config.bonusConfig) {
        if (typeof config.bonusConfig.enabled !== 'boolean') {
          throw new Error('Invalid bonus config enabled flag');
        }
        if (config.bonusConfig.enabled && 
            typeof config.bonusConfig.amount !== 'number') {
          throw new Error('Invalid bonus config amount');
        }
      }

      return await AdminRepository.updateCreditConfig(config);
    } catch (error) {
      console.error('Error in updateCreditConfig:', error);
      throw error;
    }
  },

  /**
   * Get tool usage analytics
   * @returns {Array} Tool analytics data
   */
  async getToolAnalytics() {
    try {
      return await AdminRepository.getToolAnalytics();
    } catch (error) {
      console.error('Error in getToolAnalytics:', error);
      throw new Error('Failed to fetch tool analytics');
    }
  },

  /**
   * Get tool configurations
   * @returns {Array} Tool configurations
   */
  async getToolConfigs() {
    try {
      return await AdminRepository.getToolConfigs();
    } catch (error) {
      console.error('Error in getToolConfigs:', error);
      throw new Error('Failed to fetch tool configurations');
    }
  },

  /**
   * Update tool configurations
   * @param {Array} configs - Array of tool configurations
   * @returns {Object} Update result
   */
  async updateToolConfigs(configs) {
    try {
      if (!configs || !Array.isArray(configs)) {
        throw new Error(
          'Invalid configs format. Must be an array'
        );
      }

      // Validate each config
      const requiredFields = [
        'tool_id',
        'tool_name',
        'enabled',
        'min_chars',
        'max_chars',
        'cooldown_seconds',
        'cost_multiplier',
      ];

      for (const config of configs) {
        for (const field of requiredFields) {
          if (config[field] === undefined) {
            throw new Error(
              `Missing required field: ${field} in config ` +
              `for tool ${config.tool_id || 'unknown'}`
            );
          }
        }

        // Validate numeric fields
        if (config.min_chars < 0 || config.max_chars < 0) {
          throw new Error(
            `Invalid character limits for tool ${config.tool_id}`
          );
        }
        if (config.min_chars > config.max_chars) {
          throw new Error(
            `min_chars cannot be greater than max_chars ` +
            `for tool ${config.tool_id}`
          );
        }
        if (config.cooldown_seconds < 0) {
          throw new Error(
            `Invalid cooldown for tool ${config.tool_id}`
          );
        }
        if (config.cost_multiplier < 0) {
          throw new Error(
            `Invalid cost multiplier for tool ${config.tool_id}`
          );
        }
      }

      return await AdminRepository.updateToolConfigs(configs);
    } catch (error) {
      console.error('Error in updateToolConfigs:', error);
      throw error;
    }
  },

  // ==================== Security Logs ====================

  /**
   * Get security logs with filtering and pagination
   * @param {Object} options - Filter and pagination options
   * @returns {Object} Security logs with pagination
   */
  async getSecurityLogs(options = {}) {
    try {
      const sanitizedOptions = {
        page: parseInt(options.page) || 1,
        limit: parseInt(options.limit) || 20,
        eventType: options.eventType || null,
        riskLevel: options.riskLevel || null,
        search: options.search || '',
        resolved: options.resolved,
      };

      // Validate pagination
      if (sanitizedOptions.page < 1) {
        sanitizedOptions.page = 1;
      }
      if (sanitizedOptions.limit < 1 || 
          sanitizedOptions.limit > 100) {
        sanitizedOptions.limit = 20;
      }

      return await AdminRepository.getSecurityLogs(
        sanitizedOptions
      );
    } catch (error) {
      console.error('Error in getSecurityLogs:', error);
      throw new Error('Failed to fetch security logs');
    }
  },

  /**
   * Get security statistics
   * @returns {Object} Security statistics
   */
  async getSecurityStats() {
    try {
      return await AdminRepository.getSecurityStats();
    } catch (error) {
      console.error('Error in getSecurityStats:', error);
      throw new Error('Failed to fetch security statistics');
    }
  },

  /**
   * Create a new security log entry
   * @param {Object} logData - Security log data
   * @returns {number} Created log ID
   */
  async createSecurityLog(logData) {
    try {
      // Validate required fields
      if (!logData.eventType || !logData.riskLevel || 
          !logData.description) {
        throw new Error('Missing required fields');
      }

      // Validate risk level
      const validRiskLevels = ['low', 'medium', 'high', 
        'critical'];
      if (!validRiskLevels.includes(logData.riskLevel)) {
        throw new Error('Invalid risk level');
      }

      const sanitizedData = {
        eventType: logData.eventType,
        riskLevel: logData.riskLevel,
        description: logData.description,
        userId: logData.userId || null,
        userEmail: logData.userEmail || null,
        ipAddress: logData.ipAddress || 'unknown',
        userAgent: logData.userAgent || null,
        metadata: logData.metadata || null,
      };

      return await AdminRepository.createSecurityLog(
        sanitizedData
      );
    } catch (error) {
      console.error('Error in createSecurityLog:', error);
      throw error;
    }
  },

  /**
   * Mark a security log as resolved
   * @param {number} logId - Security log ID
   * @param {number} resolvedBy - Admin user ID
   * @param {string} notes - Resolution notes
   * @returns {boolean} Success status
   */
  async resolveSecurityLog(logId, resolvedBy, notes = null) {
    try {
      if (!logId || !resolvedBy) {
        throw new Error('Log ID and resolver ID are required');
      }

      // Verify log exists
      const log = await AdminRepository.getSecurityLogById(
        logId
      );
      if (!log) {
        throw new Error('Security log not found');
      }

      if (log.resolved) {
        throw new Error('Security log already resolved');
      }

      return await AdminRepository.resolveSecurityLog(
        logId,
        resolvedBy,
        notes
      );
    } catch (error) {
      console.error('Error in resolveSecurityLog:', error);
      throw error;
    }
  },

  /**
   * Get security log by ID
   * @param {number} logId - Security log ID
   * @returns {Object|null} Security log or null if not found
   */
  async getSecurityLogById(logId) {
    try {
      if (!logId) {
        throw new Error('Log ID is required');
      }

      return await AdminRepository.getSecurityLogById(logId);
    } catch (error) {
      console.error('Error in getSecurityLogById:', error);
      throw error;
    }
  },

  // ==================== System Logs ====================

  /**
   * Get system logs with filtering and pagination
   * @param {Object} options - Filter and pagination options
   * @returns {Object} System logs with pagination
   */
  async getSystemLogs(options = {}) {
    try {
      const sanitizedOptions = {
        page: parseInt(options.page) || 1,
        limit: parseInt(options.limit) || 20,
        level: options.level || null,
        type: options.type || null,
        search: options.search || null,
      };

      // Validate pagination
      if (sanitizedOptions.page < 1) {
        sanitizedOptions.page = 1;
      }
      if (sanitizedOptions.limit < 1 || 
          sanitizedOptions.limit > 100) {
        sanitizedOptions.limit = 20;
      }

      // Validate level if provided
      if (sanitizedOptions.level && 
          !['error', 'warning', 'info'].includes(
            sanitizedOptions.level
          )) {
        throw new Error('Invalid log level');
      }

      // Validate type if provided
      if (sanitizedOptions.type && 
          !['ai', 'system', 'email', 'auth', 'database', 
            'payment'].includes(sanitizedOptions.type)) {
        throw new Error('Invalid log type');
      }

      return await AdminRepository.getSystemLogs(
        sanitizedOptions
      );
    } catch (error) {
      console.error('Error in getSystemLogs:', error);
      throw error;
    }
  },

  /**
   * Get system log statistics
   * @returns {Object} System log statistics
   */
  async getSystemStats() {
    try {
      return await AdminRepository.getSystemStats();
    } catch (error) {
      console.error('Error in getSystemStats:', error);
      throw new Error('Failed to fetch system statistics');
    }
  },

  /**
   * Create a new system log entry
   * @param {Object} logData - System log data
   * @returns {Object} Created log object
   */
  async createSystemLog(logData) {
    try {
      // Validate required fields
      if (!logData.level || !logData.type || !logData.message) {
        throw new Error(
          'Missing required fields: level, type, message'
        );
      }

      // Validate level
      if (!['error', 'warning', 'info'].includes(
        logData.level
      )) {
        throw new Error(
          'Invalid log level. Must be error, warning, or info'
        );
      }

      // Validate type
      if (!['ai', 'system', 'email', 'auth', 'database', 
            'payment'].includes(logData.type)) {
        throw new Error('Invalid log type');
      }

      const sanitizedData = {
        level: logData.level,
        type: logData.type,
        message: logData.message,
        errorCode: logData.errorCode || null,
        userId: logData.userId || null,
        userEmail: logData.userEmail || null,
        toolType: logData.toolType || null,
        metadata: logData.metadata || null,
      };

      return await AdminRepository.createSystemLog(
        sanitizedData
      );
    } catch (error) {
      console.error('Error in createSystemLog:', error);
      throw error;
    }
  },
};

module.exports = AdminService;
