const express = require("express");
const { emailController } = require("../controllers/emailController");

const router = express.Router();

router.get("/emails-list/:emailId", emailController.getEmailsList);
router.get("/all-emails", emailController.getAllEmails);
router.get("/email/:emailID/:email_id", emailController.getEmail);
router.delete("/email/:emailID/:email_id", emailController.deleteEmail);

module.exports = router;
