const express = require("express");
const { emailController } = require("../controllers/emailController");
const { validateEmailId, validateMongoId } = require("../middleware/validationMiddleware");

const router = express.Router();

router.get("/emails-list/:emailId", validateEmailId, emailController.getEmailsList);
router.get("/all-emails", emailController.getAllEmails);
router.get("/email/:emailID/:email_id", validateEmailId, validateMongoId, emailController.getEmail);
router.delete("/email/:emailID/:email_id", validateEmailId, validateMongoId, emailController.deleteEmail);

module.exports = router;
