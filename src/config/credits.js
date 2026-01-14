// Credit costs for AI tools (in credits)
const CREDIT_COSTS = {
  summary: 1,
  questions: 2,
  explain: 1,
  rewrite: 1,
};

// Daily free credits limit
const DAILY_FREE_CREDITS = 10;

// Credit error messages
const CREDIT_ERRORS = {
  INSUFFICIENT: 'Không đủ credits để thực hiện',
  NOT_FOUND: 'Không tìm thấy ví',
  INVALID_TOOL: 'Loại công cụ không hợp lệ',
};

module.exports = {
  CREDIT_COSTS,
  DAILY_FREE_CREDITS,
  CREDIT_ERRORS,
};
