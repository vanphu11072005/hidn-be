// Export all middleware
module.exports = {
  ...require('./auth'),
  validate: require('./validate'),
  ...require('./rateLimiter'),
  ...require('./errorHandler')
};
