const { body } = require('express-validator');

const updateProfileValidation = [
  body('display_name')
    .optional()
    .isString()
    .isLength({ max: 150 })
    .withMessage('display_name must be a string up to 150 chars')
];

module.exports = {
  updateProfileValidation
};
