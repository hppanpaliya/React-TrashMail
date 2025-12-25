const express = require("express");
const { emailController } = require("../controllers/emailController");
const { 
  validateEmailId, 
  validateMongoId, 
  sanitizeInput,
  emailAccessLimit,
  handleValidationErrors
} = require("../middleware/validationMiddleware");

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeInput);

router.get(
  "/emails-list/:emailId", 
  emailAccessLimit,
  validateEmailId,
  handleValidationErrors,
  emailController.getEmailsList
);

router.get(
  "/all-emails", 
  emailAccessLimit,
  emailController.getAllEmails
);

router.get(
  "/email/:emailID/:email_id", 
  emailAccessLimit,
  validateEmailId,
  validateMongoId,
  handleValidationErrors,
  emailController.getEmail
);

router.delete(
  "/email/:emailID/:email_id", 
  emailAccessLimit,
  validateEmailId,
  validateMongoId,
  handleValidationErrors,
  emailController.deleteEmail
);

module.exports = router;