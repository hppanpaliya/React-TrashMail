const { body, param, validationResult } = require('express-validator');
const validator = require('validator');
const rateLimit = require('express-rate-limit');

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
      const allowedDomains = process.env.ALLOWED_DOMAINS ? 
        JSON.parse(process.env.ALLOWED_DOMAINS) : 
        ['example.com'];
      
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
  sanitizeInput,
  emailGenerationLimit,
  emailAccessLimit,
  handleValidationErrors
};