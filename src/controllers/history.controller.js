const { History } = require('../repositories');
const { asyncHandler } = require('../middleware');

/**
 * Get user's history (paginated)
 * GET /api/history?page=1&limit=20
 */
exports.getHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const [items, total] = await Promise.all([
    History.findByUserId(userId, { limit, offset }),
    History.countByUserId(userId)
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get a single history item with full content
 * GET /api/history/:id
 */
exports.getHistoryItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const item = await History.findById(id, userId);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy lịch sử này'
    });
  }

  res.json({
    success: true,
    data: item
  });
});

/**
 * Delete a history item
 * DELETE /api/history/:id
 */
exports.deleteHistoryItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const deleted = await History.deleteById(id, userId);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy lịch sử này'
    });
  }

  res.json({
    success: true,
    message: 'Đã xoá lịch sử'
  });
});

/**
 * Delete all history for user
 * DELETE /api/history
 */
exports.deleteAllHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const count = await History.deleteAllByUserId(userId);

  res.json({
    success: true,
    message: `Đã xoá ${count} lịch sử`
  });
});

/**
 * Manually save AI result to history
 * POST /api/history/save
 */
exports.saveToHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { toolType, inputText, outputText, settings, creditsUsed } = req.body;

  // Validate required fields
  if (!toolType || !inputText || !outputText) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu thông tin bắt buộc'
    });
  }

  // Save to history
  const historyItem = await History.create({
    userId,
    toolType,
    inputText,
    outputText,
    settings: settings || {},
    creditsUsed: creditsUsed || 0
  });

  res.json({
    success: true,
    message: 'Đã lưu vào lịch sử',
    data: historyItem
  });
});
