const jwt = require('jsonwebtoken');
const config = require('../config');
const { getDB } = require('../db');
const { ObjectId } = require('mongodb');

const authMiddleware = async (req, res, next) => {
  // Get token from header or query parameter (for SSE)
  // Support both 'Authorization: Bearer TOKEN' and 'x-auth-token: TOKEN' formats
  let token = req.header('x-auth-token') || req.query.token;
  
  // Check for Bearer token in Authorization header
  const authHeader = req.header('Authorization');
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  // Check if not token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Fetch full user from DB to get latest roles and allowedDomains
    const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.id || decoded.user?.id) });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role || 'user',
      allowedDomains: user.allowedDomains // Array of strings or undefined
    };
    
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authMiddleware, checkRole };
