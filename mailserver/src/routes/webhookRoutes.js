const express = require("express");
const { body } = require("express-validator");
const { webhookController } = require("../controllers/webhookController");
const { validateEmailId, emailAccessLimit, handleValidationErrors } = require("../middleware/validationMiddleware");
const { authMiddleware } = require("../middleware/authMiddleware");
const webhookService = require("../services/webhookService");

const router = express.Router();

// All webhook routes require authentication (applied per-route rather than
// via router.use so unrelated /api requests falling through this router are
// unaffected - it is mounted ahead of the other /api routers). validateEmailId
// enforces the per-user allowed-domains policy exactly like the email routes.
// NOTE: the generic sanitizeInput middleware is intentionally NOT applied
// here - HTML-escaping would corrupt webhook URLs (e.g. `&` in query
// strings) and secrets. The URL is strictly validated below instead.

const validateWebhookBody = [
  body("url")
    .isString()
    .withMessage("url is required")
    .bail()
    .isLength({ max: webhookService.MAX_URL_LENGTH })
    .withMessage(`url must be at most ${webhookService.MAX_URL_LENGTH} characters`)
    .bail()
    .custom((value) => {
      // Throws with a descriptive message on invalid scheme / private target.
      webhookService.validateWebhookUrl(value);
      return true;
    }),
  body("secret").optional({ values: "null" }).isString().withMessage("secret must be a string").isLength({ max: 256 }).withMessage("secret too long"),
  body("enabled").optional().isBoolean().withMessage("enabled must be a boolean"),
];

router.get("/webhooks/:emailId", authMiddleware, emailAccessLimit, validateEmailId, handleValidationErrors, webhookController.getWebhook);

router.put(
  "/webhooks/:emailId",
  authMiddleware,
  emailAccessLimit,
  validateEmailId,
  validateWebhookBody,
  handleValidationErrors,
  webhookController.upsertWebhook
);

router.delete("/webhooks/:emailId", authMiddleware, emailAccessLimit, validateEmailId, handleValidationErrors, webhookController.deleteWebhook);

router.post("/webhooks/:emailId/test", authMiddleware, emailAccessLimit, validateEmailId, handleValidationErrors, webhookController.testWebhook);

module.exports = router;
