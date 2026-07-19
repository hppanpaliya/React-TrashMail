const { getDB } = require("../db");
const { ObjectId } = require("mongodb");
const crypto = require("crypto");
const auditService = require("../services/auditService");
const { escapeRegex } = require("../utils/regex");

const toObjectId = (v) => (ObjectId.isValid(v) ? new ObjectId(v) : null);

// Restrict sort keys to an allowlist so clients cannot force unindexed
// in-memory sorts or sort on internal fields.
const buildSort = (sortBy, sortOrder, allowed, fallback) => {
  const field = allowed.includes(sortBy) ? sortBy : fallback;
  return { [field]: sortOrder === "asc" ? 1 : -1 };
};

const EMAIL_SORT_FIELDS = ["date", "subject", "emailId", "from.text"];
const ALLOWED_INVITE_ROLES = ["user", "admin"];

// Walking the attachments tree is IO-heavy, so the total is cached briefly.
let attachmentSizeCache = { value: 0, computedAt: 0 };
const ATTACHMENT_SIZE_CACHE_MS = 60 * 1000;

const getAttachmentStorageBytes = async () => {
  if (Date.now() - attachmentSizeCache.computedAt < ATTACHMENT_SIZE_CACHE_MS) {
    return attachmentSizeCache.value;
  }
  const fs = require("fs");
  const path = require("path");
  const { attachmentsRoot } = require("../config/paths");

  let total = 0;
  const walk = async (dir) => {
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return; // directory missing or unreadable
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        try {
          total += (await fs.promises.stat(full)).size;
        } catch {
          // file vanished mid-walk
        }
      }
    }
  };
  await walk(attachmentsRoot);
  attachmentSizeCache = { value: total, computedAt: Date.now() };
  return total;
};

const adminController = {
  getLogs: async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
      const { userId, action, role, search, sortBy = "timestamp", sortOrder = "desc" } = req.query;

      const filter = {};
      if (userId) {
        const oid = toObjectId(userId);
        if (!oid) return res.status(400).json({ message: "Invalid userId" });
        filter.userId = oid;
      }
      if (action) filter.action = action;
      if (role) filter.role = role;

      if (search) {
        filter.$or = [
          { "details.username": { $regex: escapeRegex(search), $options: "i" } },
          { "details.emailId": { $regex: escapeRegex(search), $options: "i" } },
          { action: { $regex: escapeRegex(search), $options: "i" } },
        ];
      }

      const sort = buildSort(sortBy, sortOrder, ["timestamp", "action", "role", "userId"], "timestamp");

      const db = getDB();
      const skip = (page - 1) * limit;

      const logs = await db.collection("audit_logs").find(filter).sort(sort).skip(skip).limit(limit).toArray();

      const total = await db.collection("audit_logs").countDocuments(filter);

      res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getConflicts: async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
      const { search, sortBy = "lastAccess", sortOrder = "desc" } = req.query;

      const result = await auditService.getConflicts(page, limit, search, sortBy, sortOrder);
      res.json(result);
    } catch (error) {
      console.error("Error fetching conflicts:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateUserDomains: async (req, res) => {
    try {
      const { userId } = req.params;
      const { allowedDomains } = req.body; // Array of strings, "*" for all, or null for default or "" for none

      if (allowedDomains !== null && allowedDomains !== "*" && !Array.isArray(allowedDomains)) {
        return res.status(400).json({ message: "allowedDomains must be an array, '*' for all domains, or null for default or \"\" for none" });
      }

      const oid = toObjectId(userId);
      if (!oid) return res.status(400).json({ message: "Invalid userId" });

      const db = getDB();
      const result = await db.collection("users").updateOne({ _id: oid }, { $set: { allowedDomains: allowedDomains } });

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log Admin Action
      await auditService.logActivity(new ObjectId(req.user.id), "UPDATE_USER_DOMAINS", { targetUserId: userId, allowedDomains }, req.user.role);

      res.json({ message: "User domains updated successfully" });
    } catch (error) {
      console.error("Error updating user domains:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  generateInvite: async (req, res) => {
    try {
      const { role = "user", expiresInDays } = req.body;
      if (!ALLOWED_INVITE_ROLES.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      let expiresAt = null;
      if (expiresInDays !== undefined && expiresInDays !== null) {
        const days = Number(expiresInDays);
        if (!Number.isInteger(days) || days < 1 || days > 365) {
          return res.status(400).json({ message: "expiresInDays must be an integer between 1 and 365" });
        }
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }

      const db = getDB();
      const invitesCollection = db.collection("invites");

      const code = "WELCOME-TRASHMAIL-" + crypto.randomBytes(16).toString("hex").toUpperCase();

      await invitesCollection.insertOne({
        code: code,
        role: role,
        used: false,
        createdAt: new Date(),
        createdBy: new ObjectId(req.user.id),
        expiresAt,
      });

      await auditService.logActivity(new ObjectId(req.user.id), "GENERATE_INVITE", { code, role, expiresAt }, req.user.role);

      res.json({ code, role, expiresAt });
    } catch (error) {
      console.error("Error generating invite:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getInvites: async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
      const { search, status = "all", sortBy = "createdAt", sortOrder = "desc" } = req.query;
      const skip = (page - 1) * limit;

      const filter = {};
      if (search) {
        filter.code = { $regex: escapeRegex(search), $options: "i" };
      }
      const now = new Date();
      if (status === "used") {
        filter.used = true;
      } else if (status === "unused") {
        filter.used = false;
        filter.$or = [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }];
      } else if (status === "expired") {
        filter.used = false;
        filter.expiresAt = { $ne: null, $lte: now };
      }

      const sort = buildSort(sortBy, sortOrder, ["createdAt", "role", "used", "expiresAt"], "createdAt");

      const db = getDB();
      const invitesCollection = db.collection("invites");

      const invites = await invitesCollection.find(filter).sort(sort).skip(skip).limit(limit).toArray();
      const total = await invitesCollection.countDocuments(filter);

      // Batch-resolve createdBy/usedBy usernames with a single $in query.
      const userIds = new Set();
      for (const invite of invites) {
        if (invite.createdBy) userIds.add(String(invite.createdBy));
        if (invite.usedBy) userIds.add(String(invite.usedBy));
      }
      const userDocs = userIds.size
        ? await db
            .collection("users")
            .find({ _id: { $in: [...userIds].filter(ObjectId.isValid).map((id) => new ObjectId(id)) } })
            .project({ username: 1 })
            .toArray()
        : [];
      const nameById = new Map(userDocs.map((u) => [String(u._id), u.username]));

      const enriched = invites.map((invite) => ({
        ...invite,
        createdByUsername: invite.createdBy ? nameById.get(String(invite.createdBy)) || null : null,
        usedByUsername: invite.usedBy ? nameById.get(String(invite.usedBy)) || null : null,
        expired: !invite.used && invite.expiresAt != null && invite.expiresAt <= now,
      }));

      res.json({ invites: enriched, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  revokeInvite: async (req, res) => {
    try {
      const oid = toObjectId(req.params.id);
      if (!oid) return res.status(400).json({ message: "Invalid invite id" });

      const db = getDB();
      const invitesCollection = db.collection("invites");

      const invite = await invitesCollection.findOne({ _id: oid });
      if (!invite) return res.status(404).json({ message: "Invite not found" });
      if (invite.used) return res.status(400).json({ message: "Cannot revoke a used invite" });

      await invitesCollection.deleteOne({ _id: oid, used: false });

      await auditService.logActivity(new ObjectId(req.user.id), "REVOKE_INVITE", { inviteId: req.params.id, code: invite.code }, req.user.role);

      res.json({ message: "Invite revoked" });
    } catch (error) {
      console.error("Error revoking invite:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateUserStatus: async (req, res) => {
    try {
      const { userId } = req.params;
      const { disabled } = req.body;

      if (typeof disabled !== "boolean") {
        return res.status(400).json({ message: "disabled must be a boolean" });
      }
      if (String(req.user.id) === String(userId)) {
        return res.status(400).json({ message: "You cannot disable your own account" });
      }

      const oid = toObjectId(userId);
      if (!oid) return res.status(400).json({ message: "Invalid userId" });

      const db = getDB();
      const result = await db.collection("users").updateOne({ _id: oid }, { $set: { disabled } });
      if (result.matchedCount === 0) return res.status(404).json({ message: "User not found" });

      await auditService.logActivity(new ObjectId(req.user.id), "UPDATE_USER_STATUS", { targetUserId: userId, disabled }, req.user.role);

      res.json({ message: `User ${disabled ? "disabled" : "enabled"} successfully` });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateUserRole: async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!ALLOWED_INVITE_ROLES.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      // Blocking self-changes prevents an admin from accidentally demoting the
      // last admin account (their own) and locking everyone out.
      if (String(req.user.id) === String(userId)) {
        return res.status(400).json({ message: "You cannot change your own role" });
      }

      const oid = toObjectId(userId);
      if (!oid) return res.status(400).json({ message: "Invalid userId" });

      const db = getDB();
      const result = await db.collection("users").updateOne({ _id: oid }, { $set: { role } });
      if (result.matchedCount === 0) return res.status(404).json({ message: "User not found" });

      await auditService.logActivity(new ObjectId(req.user.id), "UPDATE_USER_ROLE", { targetUserId: userId, role }, req.user.role);

      res.json({ message: "User role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { userId } = req.params;

      if (String(req.user.id) === String(userId)) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      const oid = toObjectId(userId);
      if (!oid) return res.status(400).json({ message: "Invalid userId" });

      const db = getDB();
      const user = await db.collection("users").findOne({ _id: oid }, { projection: { username: 1 } });
      if (!user) return res.status(404).json({ message: "User not found" });

      // Audit logs referencing this user are kept intentionally as history.
      await db.collection("users").deleteOne({ _id: oid });

      await auditService.logActivity(new ObjectId(req.user.id), "DELETE_USER", { targetUserId: userId, username: user.username }, req.user.role);

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getSettings: async (req, res) => {
    try {
      const settingsService = require("../services/settingsService");
      res.json(await settingsService.getRetentionSetting());
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  updateSettings: async (req, res) => {
    try {
      const { emailRetentionDays } = req.body;
      const days = Number(emailRetentionDays);
      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        return res.status(400).json({ message: "emailRetentionDays must be an integer between 1 and 3650" });
      }

      const settingsService = require("../services/settingsService");
      await settingsService.setRetentionDays(days, new ObjectId(req.user.id));

      await auditService.logActivity(new ObjectId(req.user.id), "UPDATE_SETTINGS", { emailRetentionDays: days }, req.user.role);

      res.json({ message: "Settings updated", emailRetentionDays: days, source: "db" });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getStats: async (req, res) => {
    try {
      const db = getDB();
      const now = new Date();
      const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      const [totalUsers, disabledUsers, totalEmails, emailsToday, activeInvites, usedInvites] = await Promise.all([
        db.collection("users").countDocuments({}),
        db.collection("users").countDocuments({ disabled: true }),
        db.collection("emails").countDocuments({}),
        db.collection("emails").countDocuments({ date: { $gte: startOfDay } }),
        db.collection("invites").countDocuments({
          used: false,
          $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
        }),
        db.collection("invites").countDocuments({ used: true }),
      ]);

      const settingsService = require("../services/settingsService");
      const emailRetentionDays = await settingsService.getEffectiveRetentionDays();
      const attachmentStorageBytes = await getAttachmentStorageBytes();

      res.json({ totalUsers, disabledUsers, totalEmails, emailsToday, activeInvites, usedInvites, attachmentStorageBytes, emailRetentionDays });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getSystemEmails: async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
      const { search, sortBy = "date", sortOrder = "desc" } = req.query;
      const skip = (page - 1) * limit;

      const db = getDB();
      const collection = db.collection("emails");

      const systemPrefixes = ["admin", "spam", "abuse", "help", "support", "webmaster", "postmaster", "hostmaster"];
      const regexPattern = `^(${systemPrefixes.join("|")})@`;

      const filter = { emailId: { $regex: regexPattern, $options: "i" } };

      if (search) {
        filter.$or = [
          { subject: { $regex: escapeRegex(search), $options: "i" } },
          { "from.text": { $regex: escapeRegex(search), $options: "i" } },
          { emailId: { $regex: escapeRegex(search), $options: "i" } },
        ];
      }

      const sort = buildSort(sortBy, sortOrder, EMAIL_SORT_FIELDS, "date");

      const emails = await collection.find(filter).sort(sort).skip(skip).limit(limit).toArray();

      const total = await collection.countDocuments(filter);

      res.json({ emails, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      console.error("Error fetching system emails:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getReceivedEmails: async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
      const { search, sortBy = "date", sortOrder = "desc" } = req.query;
      const skip = (page - 1) * limit;

      const db = getDB();
      const emailsCollection = db.collection("emails");
      const auditCollection = db.collection("audit_logs");
      const usersCollection = db.collection("users");

      const filter = {};
      if (search) {
        filter.$or = [
          { subject: { $regex: escapeRegex(search), $options: "i" } },
          { "from.text": { $regex: escapeRegex(search), $options: "i" } },
          { emailId: { $regex: escapeRegex(search), $options: "i" } },
        ];
      }

      const sort = buildSort(sortBy, sortOrder, EMAIL_SORT_FIELDS, "date");

      // 1. Fetch Emails
      const emails = await emailsCollection.find(filter).sort(sort).skip(skip).limit(limit).toArray();

      const totalEmails = await emailsCollection.countDocuments(filter);

      // 2. Enrich with Access Logs — batched with $in instead of per-email queries
      const emailIds = emails.map((e) => e._id);
      const logs = emailIds.length
        ? await auditCollection
            .find({ action: "READ_EMAIL", "details.messageId": { $in: emailIds } })
            .project({ userId: 1, "details.messageId": 1 })
            .toArray()
        : [];

      const usersByEmail = new Map(); // messageId(string) -> Set(userId string)
      const allUserIds = new Set();
      for (const log of logs) {
        const key = String(log.details.messageId);
        if (!usersByEmail.has(key)) usersByEmail.set(key, new Set());
        usersByEmail.get(key).add(String(log.userId));
        allUserIds.add(String(log.userId));
      }

      const userDocs = allUserIds.size
        ? await usersCollection
            .find({ _id: { $in: [...allUserIds].filter(ObjectId.isValid).map((id) => new ObjectId(id)) } })
            .project({ username: 1 })
            .toArray()
        : [];
      const nameById = new Map(userDocs.map((u) => [String(u._id), u.username]));

      const enrichedEmails = emails.map((email) => {
        const uids = usersByEmail.get(String(email._id)) || new Set();
        const accessedBy = [...uids].map((id) => nameById.get(id)).filter(Boolean);
        return { ...email, accessedBy };
      });

      res.json({
        emails: enrichedEmails,
        total: totalEmails,
        page,
        totalPages: Math.ceil(totalEmails / limit),
      });
    } catch (error) {
      console.error("Error fetching received emails:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  clearLogs: async (req, res) => {
    try {
      const { retentionDays, confirmDeleteAll } = req.body;

      if (retentionDays === undefined || retentionDays === null) {
        // Deleting the entire audit trail requires an explicit confirmation flag.
        if (confirmDeleteAll !== true) {
          return res.status(400).json({
            message: "retentionDays (positive integer) is required, or set confirmDeleteAll:true to delete all logs",
          });
        }
      } else {
        const days = Number(retentionDays);
        if (!Number.isInteger(days) || days <= 0) {
          return res.status(400).json({ message: "retentionDays must be a positive integer" });
        }
      }

      const deletedCount = await auditService.clearLogs(retentionDays == null ? null : Number(retentionDays));

      // Log this administrative action
      await auditService.logActivity(new ObjectId(req.user.id), "CLEAR_LOGS", { retentionDays: retentionDays || "ALL", deletedCount }, req.user.role);

      res.json({ message: `Successfully deleted ${deletedCount} log entries`, deletedCount });
    } catch (error) {
      console.error("Error clearing logs:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getTopEmails: async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
      const db = getDB();
      const collection = db.collection("emails");

      // Aggregate emails by emailId and count them
      const topEmails = await collection
        .aggregate([
          {
            $group: {
              _id: "$emailId",
              count: { $sum: 1 },
              lastEmailDate: { $max: "$date" },
            },
          },
          {
            $sort: { count: -1 },
          },
          {
            $limit: limit,
          },
        ])
        .toArray();

      res.json({
        emails: topEmails,
        total: topEmails.length,
        page: 1,
        totalPages: 1,
      });
    } catch (error) {
      console.error("Error fetching top emails:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getEmailsWithAttachments: async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
      const { search, sortBy = "date", sortOrder = "desc" } = req.query;
      const skip = (page - 1) * limit;

      const db = getDB();
      const collection = db.collection("emails");

      const filter = {
        attachments: { $exists: true, $ne: [] },
      };

      if (search) {
        filter.$or = [
          { subject: { $regex: escapeRegex(search), $options: "i" } },
          { "from.text": { $regex: escapeRegex(search), $options: "i" } },
          { emailId: { $regex: escapeRegex(search), $options: "i" } },
        ];
      }

      const sort = buildSort(sortBy, sortOrder, EMAIL_SORT_FIELDS, "date");

      // Get emails with attachments
      const emails = await collection.find(filter).sort(sort).skip(skip).limit(limit).toArray();

      const total = await collection.countDocuments(filter);

      // Calculate attachment sizes
      const fs = require("fs");
      const path = require("path");
      const { attachmentsRoot: attachmentsDir } = require("../config/paths");

      const emailsWithSizes = emails.map((email) => {
        let totalSize = 0;
        if (email.attachments && email.attachments.length > 0) {
          email.attachments.forEach((attachment) => {
            const attachmentPath = path.join(attachmentsDir, attachment.directory, attachment.filename);
            try {
              if (fs.existsSync(attachmentPath)) {
                const stats = fs.statSync(attachmentPath);
                totalSize += stats.size;
              }
            } catch (err) {
              console.error(`Error getting size for ${attachmentPath}:`, err);
            }
          });
        }

        return {
          ...email,
          attachmentCount: email.attachments ? email.attachments.length : 0,
          totalAttachmentSize: totalSize,
        };
      });

      res.json({
        emails: emailsWithSizes,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error("Error fetching emails with attachments:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = adminController;
