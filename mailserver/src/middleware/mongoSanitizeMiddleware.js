/**
 * Express 5 compatible MongoDB sanitization middleware
 * Replaces express-mongo-sanitize which is not compatible with Express 5
 */

const PROHIBITED_CHARACTERS = /[$.]|^\$/;

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
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      // Check if key contains prohibited characters
      if (PROHIBITED_CHARACTERS.test(key)) {
        // Replace key with sanitized version or remove it
        if (replaceWith) {
          const sanitizedKey = key.replace(PROHIBITED_CHARACTERS, replaceWith);
          sanitized[sanitizedKey] = sanitize(payload[key], replaceWith);
        }
        // If replaceWith is empty, skip this key (remove it)
      } else {
        // Recursively sanitize nested objects
        sanitized[key] = sanitize(payload[key], replaceWith);
      }
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
      const sanitizedBody = sanitize(req.body, replaceWith);
      // Use Object.assign to update body without replacing the reference
      Object.keys(req.body).forEach(key => delete req.body[key]);
      Object.assign(req.body, sanitizedBody);
      
      if (onSanitize && JSON.stringify(req.body) !== JSON.stringify(sanitizedBody)) {
        onSanitize({ req, key: 'body' });
      }
    }

    // Sanitize req.params
    if (req.params && typeof req.params === 'object') {
      const sanitizedParams = sanitize(req.params, replaceWith);
      Object.keys(req.params).forEach(key => delete req.params[key]);
      Object.assign(req.params, sanitizedParams);
    }

    // Sanitize req.query - Express 5 has a getter, so we need to handle differently
    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = sanitize(req.query, replaceWith);
      // In Express 5, req.query is read-only, so we work with the sanitized copy
      // The query parser will need to be configured properly
      Object.keys(req.query).forEach(key => {
        if (PROHIBITED_CHARACTERS.test(key)) {
          delete req.query[key];
        }
      });
      // Merge sanitized values back
      Object.keys(sanitizedQuery).forEach(key => {
        if (!(key in req.query)) {
          // This handles renamed keys
          Object.defineProperty(req.query, key, {
            value: sanitizedQuery[key],
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      });
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
