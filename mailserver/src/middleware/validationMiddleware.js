const { body, param, validationResult } = require('express-validator');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const config = require('../config');

// Enhanced email validation middleware
const validateEmailId = [
  param('emailId')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('Email too long')
    .custom((value) => {
      // Check if email domain is allowed
      const allowedDomains = config.allowedDomains;
      
      const domain = value.split('@')[1];
      if (!allowedDomains.includes(domain)) {
        throw new Error('Email domain not allowed');
      }
      return true;
    }),
];

const validateMongoId = [
  param('email_id')
    .isMongoId()
    .withMessage('Invalid email ID format'),
];

const validateSignup = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .isAlphanumeric()
    .withMessage('Username must be alphanumeric'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('inviteCode')
    .trim()
    .notEmpty()
    .withMessage('Invite code is required'),
];

const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize all string inputs
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return validator.escape(value.trim());
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      } else {
        obj[key] = sanitizeValue(obj[key]);
      }
    }
  };

  sanitizeObject(req.body);
  sanitizeObject(req.params);
  sanitizeObject(req.query);
  
  next();
};

// Rate limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const emailGenerationLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 requests per window
  'Too many email generation attempts. Try again later.'
);

const emailAccessLimit = createRateLimit(
  1 * 60 * 1000, // 1 minute
  60, // 60 requests per window
  'Too many email access attempts. Try again later.'
);

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

module.exports = {
  validateEmailId,
  validateMongoId,
  validateSignup,
  validateLogin,
  sanitizeInput,
  emailGenerationLimit,
  emailAccessLimit,
  handleValidationErrors
};