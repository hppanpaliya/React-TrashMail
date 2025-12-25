const express = require("express");
const { emailController } = require("../controllers/emailController");
const { 
  validateEmailId, 
  validateMongoId, 
  sanitizeInput,
  emailAccessLimit,
  handleValidationErrors
} = require("../middleware/validationMiddleware");
const { authMiddleware, checkRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeInput);

// Protect all email routes
router.use(authMiddleware);

router.get(
  "/emails-list/:emailId", 
  emailAccessLimit,
  validateEmailId,
  handleValidationErrors,
  emailController.getEmailsList
);

// Admin only: Get all emails in the system
router.get(
  "/all-emails", 
  checkRole(['admin']),
  emailAccessLimit,
  emailController.getAllEmails
);

router.get(
  "/email/:emailId/:email_id", 
  emailAccessLimit,
  validateEmailId,
  validateMongoId,
  handleValidationErrors,
  emailController.getEmail
);

router.delete(
  "/email/:emailId/:email_id", 
  emailAccessLimit,
  validateEmailId,
  validateMongoId,
  handleValidationErrors,
  emailController.deleteEmail
);

module.exports = router;