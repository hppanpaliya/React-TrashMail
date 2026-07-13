const { ObjectId } = require("mongodb");
const webhookService = require("../services/webhookService");
const auditService = require("../services/auditService");

// Public response shape. The secret itself is NEVER returned, only whether
// one is configured.
const toResponse = (doc) => ({
  url: doc.url,
  enabled: doc.enabled,
  hasSecret: Boolean(doc.secret),
  lastStatus: doc.lastStatus || null,
  lastError: doc.lastError || null,
  lastDeliveredAt: doc.lastDeliveredAt || null,
});

const webhookController = {
  getWebhook: async (req, res) => {
    try {
      const emailId = req.params.emailId.toLowerCase();
      const webhook = await webhookService.getWebhooksCollection().findOne({ emailId });
      if (!webhook) {
        return res.status(404).json({ message: "No webhook configured" });
      }
      res.status(200).json(toResponse(webhook));
    } catch (error) {
      console.error("Error fetching webhook:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  upsertWebhook: async (req, res) => {
    try {
      const emailId = req.params.emailId.toLowerCase();
      const { url, secret, enabled } = req.body;

      const collection = webhookService.getWebhooksCollection();
      const existing = await collection.findOne({ emailId });

      const set = {
        url,
        enabled: enabled === undefined ? (existing ? existing.enabled : true) : enabled === true || enabled === "true",
        updatedAt: new Date(),
      };
      const update = {
        $set: set,
        $setOnInsert: {
          emailId,
          createdBy: new ObjectId(req.user.id),
          createdAt: new Date(),
        },
      };

      // Secret semantics: omitted -> keep existing, empty string -> clear,
      // non-empty string -> replace.
      if (secret === "") {
        update.$unset = { secret: "" };
      } else if (typeof secret === "string") {
        set.secret = secret;
      }

      await collection.updateOne({ emailId }, update, { upsert: true });
      const saved = await collection.findOne({ emailId });

      await auditService.logActivity(new ObjectId(req.user.id), "WEBHOOK_CONFIGURED", { emailId, url }, req.user.role);

      res.status(200).json(toResponse(saved));
    } catch (error) {
      console.error("Error saving webhook:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  deleteWebhook: async (req, res) => {
    try {
      const emailId = req.params.emailId.toLowerCase();
      const result = await webhookService.getWebhooksCollection().deleteOne({ emailId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "No webhook configured" });
      }

      await auditService.logActivity(new ObjectId(req.user.id), "WEBHOOK_DELETED", { emailId }, req.user.role);

      res.status(200).json({ message: "Webhook deleted successfully" });
    } catch (error) {
      console.error("Error deleting webhook:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  testWebhook: async (req, res) => {
    try {
      const emailId = req.params.emailId.toLowerCase();
      const webhook = await webhookService.getWebhooksCollection().findOne({ emailId });
      if (!webhook) {
        return res.status(404).json({ message: "No webhook configured" });
      }

      // Single attempt, no retries; uses the exact same delivery path
      // (signature, headers, SSRF checks) as real email deliveries.
      const outcome = await webhookService.sendTestDelivery(webhook);

      await auditService.logActivity(new ObjectId(req.user.id), "WEBHOOK_TEST", { emailId, ok: outcome.ok }, req.user.role);

      if (outcome.ok) {
        return res.status(200).json({ ok: true, status: outcome.status });
      }
      res.status(200).json({ ok: false, error: outcome.error });
    } catch (error) {
      console.error("Error testing webhook:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};

module.exports = { webhookController };
