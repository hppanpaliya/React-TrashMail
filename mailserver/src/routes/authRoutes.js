const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { validateSignup, validateLogin, handleValidationErrors, sanitizeInput } = require('../middleware/validationMiddleware');

// Apply sanitization
router.use(sanitizeInput);

// @route   POST api/auth/signup
// @desc    Register user
// @access  Public
router.post(
  '/signup',
  validateSignup,
  handleValidationErrors,
  authController.signup
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  validateLogin,
  handleValidationErrors,
  authController.login
);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, authController.getMe);

// @route   GET api/auth/admin
// @desc    Test admin access
// @access  Private/Admin
router.get('/admin', authMiddleware, checkRole(['admin']), (req, res) => {
  res.json({ message: 'Welcome Admin' });
});

// @route   GET api/auth/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', authMiddleware, checkRole(['admin']), authController.getAllUsers);

module.exports = router;
