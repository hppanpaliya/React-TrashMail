const express = require("express");
const { emailController } = require("../controllers/emailController");
const { configController } = require("../controllers/configController");
const { validateEmailId, validateMongoId, sanitizeInput, emailAccessLimit, handleValidationErrors } = require("../middleware/validationMiddleware");
const { authMiddleware, checkRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeInput);

// Protect all email routes
router.use(authMiddleware);

// Client-facing runtime config (retention + effective domains for this user)
router.get("/config", configController.getConfig);

router.get("/emails-list/:emailId", emailAccessLimit, validateEmailId, handleValidationErrors, emailController.getEmailsList);

// Unread count for an inbox (used for tab badges)
router.get("/emails-list/:emailId/unread-count", emailAccessLimit, validateEmailId, handleValidationErrors, emailController.getUnreadCount);

// Delete ALL emails (and attachment folders) for an inbox
router.delete("/emails/:emailId", emailAccessLimit, validateEmailId, handleValidationErrors, emailController.deleteAllEmails);

// Admin only: Get all emails in the system
router.get("/all-emails", checkRole(["admin"]), emailAccessLimit, emailController.getAllEmails);

// Download the raw RFC822 source of an email (.eml)
router.get("/email/:emailId/:email_id/raw", emailAccessLimit, validateEmailId, validateMongoId, handleValidationErrors, emailController.getRawEmail);

router.get("/email/:emailId/:email_id", emailAccessLimit, validateEmailId, validateMongoId, handleValidationErrors, emailController.getEmail);

router.delete("/email/:emailId/:email_id", emailAccessLimit, validateEmailId, validateMongoId, handleValidationErrors, emailController.deleteEmail);

module.exports = router;
