const { AdminService } = require('../services');

const AdminController = {
  // Get dashboard statistics
  async getDashboardStats(req, res, next) {
    try {
      const data = await AdminService.getDashboardData();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      next(error);
    }
  },

  // Get users list
  async getUsers(req, res, next) {
    try {
      const filters = {
        search: req.query.search,
        role: req.query.role,
        status: req.query.status,
        page: req.query.page,
        limit: req.query.limit,
      };

      const result = await AdminService.getUsers(filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error getting users:', error);
      next(error);
    }
  },

  // Get user detail by ID
  async getUserById(req, res, next) {
    try {
      const user = await AdminService.getUserById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      if (error.message === 'Invalid user ID') {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      console.error('Error getting user detail:', error);
      next(error);
    }
  },

  // Get credit logs
  async getCreditLogs(req, res, next) {
    try {
      const filters = {
        search: req.query.search,
        toolType: req.query.toolType,
        status: req.query.status,
        page: req.query.page,
        limit: req.query.limit,
      };

      const result = await AdminService.getCreditLogs(filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error getting credit logs:', error);
      next(error);
    }
  },

  // Get credit configuration
  async getCreditConfig(req, res, next) {
    try {
      const config = await AdminService.getCreditConfig();

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error('Error getting credit config:', error);
      next(error);
    }
  },

  // Update credit configuration
  async updateCreditConfig(req, res, next) {
    try {
      const result = await AdminService.updateCreditConfig(
        req.body
      );

      res.json({
        success: true,
        message: result.message,
        data: result.config,
      });
    } catch (error) {
      console.error('Error updating credit config:', error);
      next(error);
    }
  },

  // Get tool analytics
  async getToolAnalytics(req, res, next) {
    try {
      const analytics = await AdminService.getToolAnalytics();

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Error getting tool analytics:', error);
      next(error);
    }
  },

  // Get tool configurations
  async getToolConfigs(req, res, next) {
    try {
      const configs = await AdminService.getToolConfigs();

      res.json({
        success: true,
        data: configs,
      });
    } catch (error) {
      console.error('Error getting tool configs:', error);
      next(error);
    }
  },

  // Update tool configurations
  async updateToolConfigs(req, res, next) {
    try {
      const result = await AdminService.updateToolConfigs(
        req.body.configs
      );

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('Error updating tool configs:', error);
      next(error);
    }
  },

  // ==================== Security Logs ====================

  // Get security logs with filters and pagination
  async getSecurityLogs(req, res, next) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        eventType: req.query.eventType,
        riskLevel: req.query.riskLevel,
        search: req.query.search,
        resolved: req.query.resolved === 'true' ? true : 
                  req.query.resolved === 'false' ? false : null
      };

      const result = await AdminService.getSecurityLogs(options);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting security logs:', error);
      next(error);
    }
  },

  // Get security statistics
  async getSecurityStats(req, res, next) {
    try {
      const stats = await AdminService.getSecurityStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting security stats:', error);
      next(error);
    }
  },

  // Create a security log
  async createSecurityLog(req, res, next) {
    try {
      const logData = {
        eventType: req.body.eventType,
        riskLevel: req.body.riskLevel,
        description: req.body.description,
        userId: req.body.userId,
        userEmail: req.body.userEmail,
        ipAddress: req.body.ipAddress || req.ip,
        userAgent: req.body.userAgent || req.get('user-agent'),
        metadata: req.body.metadata
      };

      const logId = await AdminService.createSecurityLog(logData);

      res.status(201).json({
        success: true,
        data: { id: logId }
      });
    } catch (error) {
      console.error('Error creating security log:', error);
      next(error);
    }
  },

  // Resolve a security log
  async resolveSecurityLog(req, res, next) {
    try {
      const { logId } = req.params;
      const { notes } = req.body;
      const resolvedBy = req.user.id; // Admin user ID

      await AdminService.resolveSecurityLog(
        logId,
        resolvedBy,
        notes
      );

      res.json({
        success: true,
        message: 'Security log resolved successfully'
      });
    } catch (error) {
      console.error('Error resolving security log:', error);
      next(error);
    }
  },

  // Get security log by ID
  async getSecurityLogById(req, res, next) {
    try {
      const { logId } = req.params;
      const log = await AdminService.getSecurityLogById(logId);

      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Security log not found'
        });
      }

      res.json({
        success: true,
        data: log
      });
    } catch (error) {
      console.error('Error getting security log:', error);
      next(error);
    }
  },

  // Get system logs with pagination and filters
  async getSystemLogs(req, res, next) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        level: req.query.level,
        type: req.query.type,
        search: req.query.search,
      };

      const result = await AdminService.getSystemLogs(options);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting system logs:', error);
      next(error);
    }
  },

  // Get system log statistics
  async getSystemStats(req, res, next) {
    try {
      const stats = await AdminService.getSystemStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting system stats:', error);
      next(error);
    }
  },

  // Create a system log entry
  async createSystemLog(req, res, next) {
    try {
      const log = await AdminService.createSystemLog(req.body);

      res.status(201).json({
        success: true,
        data: log
      });
    } catch (error) {
      if (error.message.includes('Invalid')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      console.error('Error creating system log:', error);
      next(error);
    }
  },
};

module.exports = AdminController;
