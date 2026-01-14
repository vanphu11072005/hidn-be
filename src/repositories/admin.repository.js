const { query } = require('../config/database');

const AdminRepository = {
  // Get dashboard statistics
  async getDashboardStats() {
    // Total users
    const totalUsersResult = await query(
      'SELECT COUNT(*) as count FROM users'
    );
    const totalUsers = totalUsersResult[0].count;

    // New users today
    const newUsersTodayResult = await query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE DATE(created_at) = CURDATE()
    `);
    const newUsersToday = newUsersTodayResult[0].count;

    // Total credits used (from ai_requests table)
    const creditsUsedResult = await query(`
      SELECT COALESCE(SUM(credits_used), 0) as total 
      FROM ai_requests
    `);
    const totalCreditsUsed = creditsUsedResult[0].total;

    // Total credits remaining: sum of paid credits minus used credits
    // wallets table stores `paid_credits` per user
    const paidCreditsResult = await query(`
      SELECT COALESCE(SUM(paid_credits), 0) as total FROM wallets
    `);
    const paidCreditsTotal = paidCreditsResult[0].total;

    // Subtract total used credits from ai_requests to get remaining
    const creditsRemaining = Math.max(
      0,
      paidCreditsTotal - (totalCreditsUsed || 0)
    );

    // Most used tool
    const mostUsedToolResult = await query(`
      SELECT 
        tool_type,
        COUNT(*) as usage_count,
        ROUND((COUNT(*) * 100.0 / (
          SELECT COUNT(*) FROM ai_requests
        )), 2) as percentage
      FROM ai_requests
      GROUP BY tool_type
      ORDER BY usage_count DESC
      LIMIT 1
    `);

    const mostUsedTool = mostUsedToolResult[0] || {
      tool_type: 'N/A',
      usage_count: 0,
      percentage: 0,
    };

    // Map tool_type to display name
    const toolNames = {
      summarize: 'Tóm tắt văn bản',
      questions: 'Tạo câu hỏi',
      explain: 'Giải thích văn bản',
      rewrite: 'Viết lại văn bản',
    };

    return {
      totalUsers,
      newUsersToday,
      totalCreditsUsed,
      totalCreditsRemaining: creditsRemaining,
      mostUsedTool: {
        name: toolNames[mostUsedTool.tool_type] || 'N/A',
        usage: mostUsedTool.usage_count,
        percentage: parseFloat(mostUsedTool.percentage) || 0,
      },
    };
  },

  // Get usage chart data (last 7 days)
  async getUsageChartData() {
    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM ai_requests
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Get day labels in Vietnamese
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const chartData = [];

    // Fill in last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      const dataPoint = result.find((r) => {
        const rDate = new Date(r.date);
        return rDate.toISOString().split('T')[0] === dateStr;
      });

      chartData.push({
        label: dayLabels[dayOfWeek],
        value: dataPoint ? dataPoint.count : 0,
      });
    }

    return chartData;
  },

  // Get tool usage distribution
  async getToolUsageData() {
    const result = await query(`
      SELECT 
        tool_type,
        COUNT(*) as count
      FROM ai_requests
      GROUP BY tool_type
      ORDER BY count DESC
    `);

    const toolNames = {
      summarize: 'Tóm tắt văn bản',
      questions: 'Tạo câu hỏi',
      explain: 'Giải thích văn bản',
      rewrite: 'Viết lại văn bản',
    };

    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-yellow-500',
    ];

    return result.map((row, index) => ({
      name: toolNames[row.tool_type] || row.tool_type,
      value: row.count,
      color: colors[index] || 'bg-slate-500',
    }));
  },

  // Get recent activity
  async getRecentActivity(limit = 10) {
    const result = await query(
      `
      SELECT 
        u.email,
        ar.tool_type,
        ar.credits_used,
        ar.created_at,
        'ai_usage' as activity_type
      FROM ai_requests ar
      JOIN users u ON ar.user_id = u.id
      ORDER BY ar.created_at DESC
      LIMIT ?
    `,
      [limit]
    );

    const toolNames = {
      summarize: 'Tóm tắt văn bản',
      questions: 'Tạo câu hỏi',
      explain: 'Giải thích văn bản',
      rewrite: 'Viết lại văn bản',
    };

    return result.map((row) => {
      const now = new Date();
      const activityTime = new Date(row.created_at);
      const diffMinutes = Math.floor(
        (now - activityTime) / (1000 * 60)
      );

      let timeStr;
      if (diffMinutes < 1) {
        timeStr = 'Vừa xong';
      } else if (diffMinutes < 60) {
        timeStr = `${diffMinutes} phút trước`;
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
          timeStr = `${diffHours} giờ trước`;
        } else {
          const diffDays = Math.floor(diffHours / 24);
          timeStr = `${diffDays} ngày trước`;
        }
      }

      return {
        user: row.email,
        action: 'Sử dụng AI',
        tool: toolNames[row.tool_type] || row.tool_type,
        credits: -row.credits_used,
        time: timeStr,
      };
    });
  },

  // Get users list with filters and pagination
  async getUsers(filters = {}) {
    const {
      search = '',
      role = 'all',
      status = 'all',
      page = 1,
      limit = 10,
    } = filters;

    // Build WHERE conditions
    const conditions = [];
    const params = [];

    // Search by email
    if (search) {
      conditions.push('u.email LIKE ?');
      params.push(`%${search}%`);
    }

    // Filter by role
    if (role && role !== 'all') {
      conditions.push('r.name = ?');
      params.push(role);
    }

    // For status filtering, we'll check if user has email_verified_at
    // In the frontend, 'banned' users are those without email verification
    // (This is a simplified approach - you may need a dedicated status field)
    if (status === 'active') {
      conditions.push('u.email_verified_at IS NOT NULL');
    } else if (status === 'banned') {
      conditions.push('u.email_verified_at IS NULL');
    }

    const whereClause =
      conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Count total matching users
    const countSql = `
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ${whereClause}
    `;
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    // Get paginated users
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const usersSql = `
      SELECT 
        u.id,
        u.email,
        r.name as role,
        COALESCE(w.paid_credits, 0) as credits,
        u.email_verified_at,
        u.created_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN wallets w ON u.id = w.user_id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const users = await query(usersSql, params);

    // Format results
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      credits: user.credits,
      status: user.email_verified_at ? 'active' : 'banned',
      createdAt: user.created_at,
    }));

    return {
      users: formattedUsers,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  // Get user detail by ID
  async getUserById(userId) {
    // Get user basic info
    const userSql = `
      SELECT 
        u.id,
        u.email,
        r.name as role,
        COALESCE(w.paid_credits, 0) as credits,
        u.email_verified_at,
        u.created_at,
        u.last_login_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE u.id = ?
    `;
    
    const users = await query(userSql, [userId]);
    if (users.length === 0) {
      return null;
    }
    
    const user = users[0];

    // Get credit history from ai_requests (usage) and wallet transactions
    const creditHistorySql = `
      SELECT 
        ar.id,
        ar.credits_used as amount,
        'subtract' as type,
        CONCAT('Sử dụng AI Tool: ', 
          CASE ar.tool_type
            WHEN 'summary' THEN 'Tóm tắt văn bản'
            WHEN 'questions' THEN 'Tạo câu hỏi'
            WHEN 'explain' THEN 'Giải thích văn bản'
            WHEN 'rewrite' THEN 'Viết lại văn bản'
            ELSE ar.tool_type
          END
        ) as reason,
        ar.created_at as timestamp
      FROM ai_requests ar
      WHERE ar.user_id = ? AND ar.status = 'success'
      ORDER BY ar.created_at DESC
      LIMIT 20
    `;
    
    const creditHistory = await query(creditHistorySql, [userId]);

    // Format credit history
    const formattedHistory = creditHistory.map((row) => ({
      id: row.id,
      amount: -row.amount, // Negative for subtract
      type: row.type,
      reason: row.reason,
      timestamp: row.timestamp,
    }));

    // Get tool usage statistics
    const toolUsageSql = `
      SELECT 
        CASE ar.tool_type
          WHEN 'summary' THEN 'Tóm tắt văn bản'
          WHEN 'questions' THEN 'Tạo câu hỏi'
          WHEN 'explain' THEN 'Giải thích văn bản'
          WHEN 'rewrite' THEN 'Viết lại văn bản'
          ELSE ar.tool_type
        END as toolName,
        COUNT(*) as usageCount,
        SUM(ar.credits_used) as creditsSpent
      FROM ai_requests ar
      WHERE ar.user_id = ? AND ar.status = 'success'
      GROUP BY ar.tool_type
      ORDER BY usageCount DESC
    `;
    
    const toolUsage = await query(toolUsageSql, [userId]);

    return {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      credits: user.credits,
      status: user.email_verified_at ? 'active' : 'banned',
      createdAt: user.created_at,
      lastLogin: user.last_login_at || user.created_at,
      creditHistory: formattedHistory,
      toolUsage: toolUsage.map((row) => ({
        toolName: row.toolName,
        usageCount: row.usageCount,
        creditsSpent: row.creditsSpent,
      })),
    };
  },

  // Get credit logs with filters
  async getCreditLogs(filters = {}) {
    const {
      search = '',
      toolType = '',
      status = '',
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    
    // Build WHERE conditions
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('u.email LIKE ?');
      params.push(`%${search}%`);
    }

    if (toolType) {
      conditions.push('ar.tool_type = ?');
      params.push(toolType);
    }

    if (status) {
      conditions.push('ar.status = ?');
      params.push(status);
    }

    const whereClause = 
      conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM ai_requests ar
      INNER JOIN users u ON ar.user_id = u.id
      ${whereClause}
    `;
    
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    // Get logs with pagination
    const logsSql = `
      SELECT 
        ar.id,
        ar.user_id as userId,
        u.email as userEmail,
        CASE ar.tool_type
          WHEN 'summary' THEN 'Tóm tắt văn bản'
          WHEN 'questions' THEN 'Tạo câu hỏi'
          WHEN 'explain' THEN 'Giải thích văn bản'
          WHEN 'rewrite' THEN 'Viết lại văn bản'
          ELSE ar.tool_type
        END as toolName,
        ar.credits_used as creditsUsed,
        ar.status,
        ar.created_at as timestamp
      FROM ai_requests ar
      INNER JOIN users u ON ar.user_id = u.id
      ${whereClause}
      ORDER BY ar.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const logs = await query(logsSql, [...params, limit, offset]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // Get credit configuration
  async getCreditConfig() {
    // Get daily free credits from database
    const dailyCreditsResult = await query(
      'SELECT config_value FROM credit_config WHERE config_key = ?',
      ['daily_free_credits']
    );
    const dailyFreeCredits = dailyCreditsResult[0] 
      ? parseInt(dailyCreditsResult[0].config_value) 
      : 20;

    // Get tool pricing from database
    const toolPricingResult = await query(
      'SELECT config_value FROM credit_config WHERE config_key = ?',
      ['tool_pricing']
    );
    
    let toolPricingMap = { summary: 5, questions: 5, explain: 10, rewrite: 5 };
    if (toolPricingResult[0]) {
      try {
        toolPricingMap = JSON.parse(toolPricingResult[0].config_value);
      } catch (e) {
        console.error('Error parsing tool pricing:', e);
      }
    }

    // Convert to array format for frontend
    const toolPricing = [
      {
        toolId: 'summary',
        toolName: 'Tóm tắt văn bản',
        creditCost: toolPricingMap.summary || 5,
        description: 'Tạo bản tóm tắt ngắn gọn từ văn bản dài',
      },
      {
        toolId: 'questions',
        toolName: 'Tạo câu hỏi',
        creditCost: toolPricingMap.questions || 5,
        description: 'Sinh câu hỏi kiểm tra từ nội dung',
      },
      {
        toolId: 'explain',
        toolName: 'Giải thích văn bản',
        creditCost: toolPricingMap.explain || 10,
        description: 'Giải thích chi tiết nội dung phức tạp',
      },
      {
        toolId: 'rewrite',
        toolName: 'Viết lại văn bản',
        creditCost: toolPricingMap.rewrite || 5,
        description: 'Paraphrase và cải thiện văn bản',
      },
    ];

    // Get bonus config from database
    const bonusResult = await query(
      'SELECT config_value FROM credit_config WHERE config_key = ?',
      ['bonus_config']
    );
    
    let bonusConfig = {
      enabled: false,
      amount: 0,
      reason: '',
      validUntil: '',
    };
    
    if (bonusResult[0]) {
      try {
        bonusConfig = JSON.parse(bonusResult[0].config_value);
      } catch (e) {
        console.error('Error parsing bonus config:', e);
      }
    }

    return {
      toolPricing,
      dailyFreeCredits,
      bonusConfig,
    };
  },

  // Update credit configuration
  async updateCreditConfig(config) {
    // Validate config
    if (!config.toolPricing || !Array.isArray(config.toolPricing)) {
      throw new Error('Invalid tool pricing configuration');
    }

    if (typeof config.dailyFreeCredits !== 'number' || config.dailyFreeCredits < 0) {
      throw new Error('Invalid daily free credits');
    }

    try {
      // Update daily free credits
      await query(
        `UPDATE credit_config 
         SET config_value = ?, updated_at = NOW() 
         WHERE config_key = ?`,
        [config.dailyFreeCredits.toString(), 'daily_free_credits']
      );

      // Convert tool pricing array to object
      const toolPricingMap = {};
      config.toolPricing.forEach((tool) => {
        toolPricingMap[tool.toolId] = tool.creditCost;
      });

      // Update tool pricing
      await query(
        `UPDATE credit_config 
         SET config_value = ?, updated_at = NOW() 
         WHERE config_key = ?`,
        [JSON.stringify(toolPricingMap), 'tool_pricing']
      );

      // Update bonus config
      await query(
        `UPDATE credit_config 
         SET config_value = ?, updated_at = NOW() 
         WHERE config_key = ?`,
        [JSON.stringify(config.bonusConfig), 'bonus_config']
      );

      return {
        success: true,
        message: 'Credit configuration updated successfully',
        config,
      };
    } catch (error) {
      console.error('Error updating credit config:', error);
      throw new Error('Failed to update credit configuration');
    }
  },

  // Get tool analytics
  async getToolAnalytics() {
    // Get tool usage and credits stats
    const toolStatsSql = `
      SELECT 
        tool_type,
        COUNT(*) as totalUsage,
        SUM(credits_used) as totalCreditsSpent,
        AVG(credits_used) as avgCreditsPerUse,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as successRate
      FROM ai_requests
      GROUP BY tool_type
      ORDER BY totalUsage DESC
    `;
    
    const toolStats = await query(toolStatsSql);

    // Map tool_type to display names
    const toolNames = {
      summary: 'Tóm tắt văn bản',
      questions: 'Tạo câu hỏi',
      explain: 'Giải thích văn bản',
      rewrite: 'Viết lại văn bản',
    };

    // Format results with popularity rank
    const analytics = toolStats.map((row, index) => {
      const avgCredits = Number(row.avgCreditsPerUse) || 0;
      const successRateNum = Number(row.successRate) || 0;

      return {
        toolId: row.tool_type,
        toolName: toolNames[row.tool_type] || row.tool_type,
        totalUsage: Number(row.totalUsage) || 0,
        totalCreditsSpent: Number(row.totalCreditsSpent) || 0,
        avgCreditsPerUse: Math.round(avgCredits),
        successRate: parseFloat(successRateNum.toFixed(1)),
        popularityRank: index + 1,
        trend: 'stable', // Can be calculated with historical data
        trendPercentage: 0,
      };
    });

    return analytics;
  },

  // Get tool configurations
  async getToolConfigs() {
    // Safer approach: check information_schema for existence first
    try {
      const dbName = process.env.DB_NAME || 'hidn_db';

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
          return configs;
        }
      }

      // Fallback: try reading JSON from credit_config (key: tool_configs)
      const jsonRes = await query(
        'SELECT config_value FROM credit_config WHERE config_key = ?',
        ['tool_configs']
      );

      if (jsonRes && jsonRes[0] && jsonRes[0].config_value) {
        try {
          const parsed = JSON.parse(jsonRes[0].config_value);
          // If parsed is an array of objects in UI format, convert to DB-like rows
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Failed to parse tool_configs JSON:', e);
        }
      }

      // Default configs
      return [
        {
          tool_id: 'summary',
          tool_name: 'Tóm tắt văn bản',
          description: 'Tóm tắt nội dung văn bản dài thành các ý chính',
          enabled: 1,
          min_chars: 100,
          max_chars: 10000,
          cooldown_seconds: 5,
          cost_multiplier: 1.0,
          model_provider: 'gemini',
          model_name: 'gemini-pro',
        },
        {
          tool_id: 'questions',
          tool_name: 'Tạo câu hỏi',
          description: 'Tạo câu hỏi từ nội dung văn bản',
          enabled: 1,
          min_chars: 100,
          max_chars: 8000,
          cooldown_seconds: 5,
          cost_multiplier: 1.0,
          model_provider: 'gemini',
          model_name: 'gemini-pro',
        },
        {
          tool_id: 'explain',
          tool_name: 'Giải thích văn bản',
          description: 'Giải thích chi tiết nội dung văn bản',
          enabled: 1,
          min_chars: 50,
          max_chars: 5000,
          cooldown_seconds: 3,
          cost_multiplier: 2.0,
          model_provider: 'gemini',
          model_name: 'gemini-pro',
        },
        {
          tool_id: 'rewrite',
          tool_name: 'Viết lại văn bản',
          description: 'Viết lại văn bản với phong cách khác',
          enabled: 1,
          min_chars: 50,
          max_chars: 5000,
          cooldown_seconds: 3,
          cost_multiplier: 1.0,
          model_provider: 'gemini',
          model_name: 'gemini-pro',
        },
      ];
    } catch (error) {
      console.error('Error getting tool configs (safe fallback):', error);
      return [
        {
          tool_id: 'summary',
          tool_name: 'Tóm tắt văn bản',
          description: 'Tóm tắt nội dung văn bản dài thành các ý chính',
          enabled: 1,
          min_chars: 100,
          max_chars: 10000,
          cooldown_seconds: 5,
          cost_multiplier: 1.0,
          model_provider: 'gemini',
          model_name: 'gemini-pro',
        },
        {
          tool_id: 'questions',
          tool_name: 'Tạo câu hỏi',
          description: 'Tạo câu hỏi từ nội dung văn bản',
          enabled: 1,
          min_chars: 100,
          max_chars: 8000,
          cooldown_seconds: 5,
          cost_multiplier: 1.0,
          model_provider: 'gemini',
          model_name: 'gemini-pro',
        },
        {
          tool_id: 'explain',
          tool_name: 'Giải thích văn bản',
          description: 'Giải thích chi tiết nội dung văn bản',
          enabled: 1,
          min_chars: 50,
          max_chars: 5000,
          cooldown_seconds: 3,
          cost_multiplier: 2.0,
          model_provider: 'gemini',
          model_name: 'gemini-pro',
        },
        {
          tool_id: 'rewrite',
          tool_name: 'Viết lại văn bản',
          description: 'Viết lại văn bản với phong cách khác',
          enabled: 1,
          min_chars: 50,
          max_chars: 5000,
          cooldown_seconds: 3,
          cost_multiplier: 1.0,
          model_provider: 'gemini',
          model_name: 'gemini-pro',
        },
      ];
    }
  },

  // Update tool configurations
  async updateToolConfigs(configs) {
    try {
      const dbName = process.env.DB_NAME || 'hidn_db';

      // Check if tool_configs table exists
      const existsSql = `
        SELECT COUNT(*) as cnt
        FROM information_schema.tables
        WHERE table_schema = ? AND table_name = ?
      `;

      const existsRes = await query(existsSql, [dbName, 'tool_configs']);
      const tableExists = 
        existsRes && existsRes[0] && existsRes[0].cnt > 0;

      if (tableExists) {
        // Delete all existing configs and insert new ones
        // (simpler and more reliable than UPDATE)
        await query('DELETE FROM tool_configs');

        // Insert all configs
        for (const config of configs) {
          const insertSql = `
            INSERT INTO tool_configs (
              tool_id, tool_name, description, enabled,
              min_chars, max_chars, cooldown_seconds,
              cost_multiplier, model_provider, model_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          await query(insertSql, [
            config.tool_id,
            config.tool_name,
            config.description,
            config.enabled,
            config.min_chars,
            config.max_chars,
            config.cooldown_seconds,
            config.cost_multiplier,
            config.model_provider,
            config.model_name,
          ]);
        }
      } else {
        // Fallback: store as JSON in credit_config table
        const configJson = JSON.stringify(configs);
        const updateSql = `
          INSERT INTO credit_config (config_key, config_value)
          VALUES ('tool_configs', ?)
          ON DUPLICATE KEY UPDATE config_value = ?
        `;
        await query(updateSql, [configJson, configJson]);
      }

      return {
        success: true,
        message: 'Tool configurations updated successfully',
      };
    } catch (error) {
      console.error('Error updating tool configs:', error);
      throw new Error('Failed to update tool configurations');
    }
  },

  // ==================== Security Logs ====================
  
  // Get security logs with pagination and filters
  async getSecurityLogs(options = {}) {
    const {
      page = 1,
      limit = 20,
      eventType = null,
      riskLevel = null,
      search = '',
      resolved = null
    } = options;

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    // Event type filter
    if (eventType && eventType !== 'all') {
      conditions.push('event_type = ?');
      params.push(eventType);
    }

    // Risk level filter
    if (riskLevel && riskLevel !== 'all') {
      conditions.push('risk_level = ?');
      params.push(riskLevel);
    }

    // Resolved status filter
    if (resolved !== null) {
      conditions.push('resolved = ?');
      params.push(resolved ? 1 : 0);
    }

    // Search filter (email, IP, description)
    if (search) {
      conditions.push('(user_email LIKE ? OR ip_address LIKE ? OR description LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM security_logs ${whereClause}`;
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    // Get paginated logs
    const logsSql = `
      SELECT * FROM security_logs 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const logs = await query(logsSql, [...params, limit, offset]);

    // Parse metadata JSON
    const parsedLogs = logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      resolved: log.resolved === 1
    }));

    return {
      logs: parsedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // Get security logs statistics
  async getSecurityStats() {
    // Total events
    const totalResult = await query('SELECT COUNT(*) as count FROM security_logs');
    const total = totalResult[0].count;

    // Unresolved events
    const unresolvedResult = await query(
      'SELECT COUNT(*) as count FROM security_logs WHERE resolved = 0'
    );
    const unresolved = unresolvedResult[0].count;

    // High risk events
    const highRiskResult = await query(
      'SELECT COUNT(*) as count FROM security_logs WHERE risk_level = ?',
      ['high']
    );
    const high = highRiskResult[0].count;

    // Medium risk events
    const mediumRiskResult = await query(
      'SELECT COUNT(*) as count FROM security_logs WHERE risk_level = ?',
      ['medium']
    );
    const medium = mediumRiskResult[0].count;

    // Events by type
    const byTypeResult = await query(`
      SELECT event_type, COUNT(*) as count 
      FROM security_logs 
      GROUP BY event_type
    `);

    const byType = {};
    byTypeResult.forEach(row => {
      byType[row.event_type] = row.count;
    });

    return {
      total,
      unresolved,
      high,
      medium,
      byType
    };
  },

  // Create a security log entry
  async createSecurityLog(logData) {
    const {
      eventType,
      riskLevel,
      description,
      userId = null,
      userEmail = null,
      ipAddress,
      userAgent = null,
      metadata = null
    } = logData;

    const sql = `
      INSERT INTO security_logs 
      (event_type, risk_level, description, user_id, user_email, 
       ip_address, user_agent, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    const result = await query(sql, [
      eventType,
      riskLevel,
      description,
      userId,
      userEmail,
      ipAddress,
      userAgent,
      metadataJson
    ]);

    return result.insertId;
  },

  // Mark security log as resolved
  async resolveSecurityLog(logId, resolvedBy, notes = null) {
    const sql = `
      UPDATE security_logs 
      SET resolved = 1, 
          resolved_at = NOW(),
          resolved_by = ?,
          notes = ?
      WHERE id = ?
    `;

    await query(sql, [resolvedBy, notes, logId]);
    return true;
  },

  // Get security log by ID
  async getSecurityLogById(logId) {
    const sql = 'SELECT * FROM security_logs WHERE id = ?';
    const result = await query(sql, [logId]);
    
    if (result.length === 0) {
      return null;
    }

    const log = result[0];
    return {
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      resolved: log.resolved === 1
    };
  },

  // Get system logs with pagination and filters
  async getSystemLogs(options = {}) {
    const {
      page = 1,
      limit = 20,
      level = null,
      type = null,
      search = null,
    } = options;

    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams = [];

    // Filter by log level
    if (level && ['error', 'warning', 'info'].includes(level)) {
      whereConditions.push('level = ?');
      queryParams.push(level);
    }

    // Filter by log type
    if (type && ['ai', 'system', 'email', 'auth', 'database', 
                 'payment'].includes(type)) {
      whereConditions.push('type = ?');
      queryParams.push(type);
    }

    // Search in message or error_code
    if (search) {
      whereConditions.push(
        '(message LIKE ? OR error_code LIKE ? OR user_email LIKE ?)'
      );
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM system_logs
      ${whereClause}
    `;
    const countResult = await query(countSql, queryParams);
    const total = countResult[0].total;

    // Get logs
    const logsSql = `
      SELECT 
        id,
        level,
        type,
        message,
        error_code,
        user_id,
        user_email,
        tool_type,
        metadata,
        created_at
      FROM system_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const logs = await query(logsSql, [...queryParams, limit, offset]);

    return {
      logs: logs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // Get system log statistics
  async getSystemStats() {
    const sql = `
      SELECT 
        COUNT(*) as total_logs,
        SUM(CASE WHEN level = 'error' THEN 1 ELSE 0 END) as total_errors,
        SUM(CASE WHEN level = 'warning' THEN 1 ELSE 0 END) as total_warnings,
        SUM(CASE WHEN level = 'info' THEN 1 ELSE 0 END) as total_info,
        SUM(CASE WHEN type = 'ai' THEN 1 ELSE 0 END) as type_ai,
        SUM(CASE WHEN type = 'system' THEN 1 ELSE 0 END) as type_system,
        SUM(CASE WHEN type = 'email' THEN 1 ELSE 0 END) as type_email,
        SUM(CASE WHEN type = 'auth' THEN 1 ELSE 0 END) as type_auth,
        SUM(CASE WHEN type = 'database' THEN 1 ELSE 0 END) as type_database,
        SUM(CASE WHEN type = 'payment' THEN 1 ELSE 0 END) as type_payment
      FROM system_logs
    `;

    const result = await query(sql);
    const stats = result[0];

    return {
      totalLogs: stats.total_logs,
      totalErrors: stats.total_errors,
      totalWarnings: stats.total_warnings,
      totalInfo: stats.total_info,
      byType: {
        ai: stats.type_ai,
        system: stats.type_system,
        email: stats.type_email,
        auth: stats.type_auth,
        database: stats.type_database,
        payment: stats.type_payment
      }
    };
  },

  // Create a system log entry
  async createSystemLog(logData) {
    const {
      level,
      type,
      message,
      errorCode = null,
      userId = null,
      userEmail = null,
      toolType = null,
      metadata = null
    } = logData;

    const sql = `
      INSERT INTO system_logs (
        level,
        type,
        message,
        error_code,
        user_id,
        user_email,
        tool_type,
        metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      level,
      type,
      message,
      errorCode,
      userId,
      userEmail,
      toolType,
      metadata ? JSON.stringify(metadata) : null
    ]);

    return {
      id: result.insertId,
      level,
      type,
      message,
      errorCode,
      userId,
      userEmail,
      toolType,
      metadata,
      createdAt: new Date()
    };
  },
};

module.exports = AdminRepository;
