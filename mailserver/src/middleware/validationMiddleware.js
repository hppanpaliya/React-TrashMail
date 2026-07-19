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
    .custom((value, { req }) => {
      // Check if email domain is allowed
      // Use user-specific allowed domains if available, otherwise global config
      const userAllowedDomains = req.user && req.user.allowedDomains;
      let allowedDomains = config.allowedDomains;
      
      if (userAllowedDomains === "*") {
        // Allow all domains
        return true;
      } else if (Array.isArray(userAllowedDomains)) {
        if (userAllowedDomains.length === 0) {
          // Empty array means no domains allowed
          throw new Error(`No email domains are allowed for your account.`);
        }
        allowedDomains = userAllowedDomains;
      } else if (userAllowedDomains) {
        // If it's a string but not "*", treat as single domain
        allowedDomains = [userAllowedDomains];
      }
      
      const domain = value.split('@')[1];
      if (!allowedDomains.includes(domain)) {
        // Never dump the account's allow-list at default log level — it is
        // configuration, and this failure is user-triggerable.
        if (process.env.LOG_LEVEL === 'debug') {
          console.log(`Validation failed: Domain '${domain}' not in allowed list:`, allowedDomains);
        } else {
          console.log('Validation failed: domain not in account allow-list');
        }
        throw new Error(`Email domain '${domain}' is not allowed for your account.`);
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
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter'),
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

// Fields whose bytes must be preserved verbatim (never HTML-escaped on input).
// Escaping these breaks password hashing/comparison and invite-code matching.
const SKIP_ESCAPE_KEYS = new Set(['password', 'inviteCode', 'token', 'secret']);
// MongoDB operator characters that must never appear in object keys.
const PROHIBITED_KEY_CHARS = /[$.]/;

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      // Defense-in-depth: strip keys carrying NoSQL operators.
      if (PROHIBITED_KEY_CHARS.test(key)) {
        delete obj[key];
        continue;
      }
      const value = obj[key];
      if (value && typeof value === 'object') {
        sanitizeObject(value);
      } else if (typeof value === 'string') {
        const trimmed = value.trim();
        obj[key] = SKIP_ESCAPE_KEYS.has(key) ? trimmed : validator.escape(trimmed);
      }
    }
  };

  sanitizeObject(req.body);
  sanitizeObject(req.params);
  // req.query is read-only in Express 5; mongoSanitizeMiddleware handles it.
  try {
    sanitizeObject(req.query);
  } catch (e) {
    // ignore — query sanitization is covered by mongoSanitize
  }

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

const loginLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 login attempts per window
  'Too many login attempts. Please try again after 15 minutes.'
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
  loginLimit,
  handleValidationErrors
};