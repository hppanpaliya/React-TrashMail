/**
 * Express 5 compatible MongoDB sanitization middleware
 * Replaces express-mongo-sanitize which is not compatible with Express 5
 */

// Stateless test regex (no /g so lastIndex never carries between .test calls)
const PROHIBITED_CHARACTERS = /[$.]/;
// Global variant for full replacement of every offending character
const PROHIBITED_GLOBAL = /[$.]/g;
// Keys that enable prototype pollution; always dropped
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively sanitizes an object by removing keys that contain MongoDB operators
 */
function sanitize(payload, replaceWith = '') {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map(item => sanitize(item, replaceWith));
  }

  const sanitized = {};
  
  for (const key in payload) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
    // Always drop prototype-pollution keys
    if (FORBIDDEN_KEYS.has(key)) continue;

    if (PROHIBITED_CHARACTERS.test(key)) {
      if (replaceWith) {
        // Strip ALL offending characters, and guard against the replacement
        // producing a forbidden key
        const sanitizedKey = key.replace(PROHIBITED_GLOBAL, replaceWith);
        if (FORBIDDEN_KEYS.has(sanitizedKey)) continue;
        sanitized[sanitizedKey] = sanitize(payload[key], replaceWith);
      }
      // If replaceWith is empty, skip this key (remove it)
    } else {
      // Recursively sanitize nested objects
      sanitized[key] = sanitize(payload[key], replaceWith);
    }
  }
  
  return sanitized;
}

/**
 * Express middleware to sanitize request data against NoSQL injection
 * @param {Object} options - Configuration options
 * @param {boolean} options.replaceWith - Character to replace prohibited chars with (default: '')
 * @param {boolean} options.onSanitize - Callback when sanitization occurs
 */
function mongoSanitize(options = {}) {
  const { replaceWith = '', onSanitize } = options;

  return function mongoSanitizeMiddleware(req, res, next) {
    // Sanitize req.body
    if (req.body && typeof req.body === 'object') {
      const originalBody = JSON.stringify(req.body);
      const sanitizedBody = sanitize(req.body, replaceWith);
      // Use Object.assign to update body without replacing the reference
      Object.keys(req.body).forEach(key => delete req.body[key]);
      Object.assign(req.body, sanitizedBody);

      if (onSanitize && originalBody !== JSON.stringify(sanitizedBody)) {
        onSanitize({ req, key: 'body' });
      }
    }

    // Sanitize req.params
    if (req.params && typeof req.params === 'object') {
      const sanitizedParams = sanitize(req.params, replaceWith);
      Object.keys(req.params).forEach(key => delete req.params[key]);
      Object.assign(req.params, sanitizedParams);
    }

    // Sanitize req.query - unified with the body/params path; Express 5 exposes
    // req.query via a getter, so fall back to redefining the whole property
    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = sanitize(req.query, replaceWith);
      try {
        Object.keys(req.query).forEach(key => delete req.query[key]);
        Object.assign(req.query, sanitizedQuery);
      } catch (e) {
        Object.defineProperty(req, 'query', {
          value: sanitizedQuery,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    }

    // Sanitize headers if needed
    if (req.headers && typeof req.headers === 'object') {
      const sanitizedHeaders = sanitize(req.headers, replaceWith);
      Object.keys(req.headers).forEach(key => delete req.headers[key]);
      Object.assign(req.headers, sanitizedHeaders);
    }

    next();
  };
}

module.exports = mongoSanitize;
