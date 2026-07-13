const { getDB } = require("../db");
const { ObjectId } = require("mongodb");
const fs = require("fs");
const path = require("path");
const auditService = require("../services/auditService");
const { escapeRegex } = require("../utils/regex");
const { attachmentsRoot } = require("../config/paths");

const clampPage = (value) => Math.max(parseInt(value) || 1, 1);
const clampLimit = (value) => Math.min(Math.max(parseInt(value) || 50, 1), 100);

// Build the MongoDB query fragment for the shared search/filter params.
// search: case-insensitive substring match on subject, from.text and text body.
// filter: all | read | unread
const buildSearchFilterQuery = (baseQuery, { search, filter }) => {
  const query = { ...baseQuery };

  if (filter === "read") {
    query.readStatus = true;
  } else if (filter === "unread") {
    query.readStatus = { $ne: true };
  }

  if (search) {
    const regex = { $regex: escapeRegex(search), $options: "i" };
    query.$and = [{ $or: [{ subject: regex }, { "from.text": regex }, { text: regex }] }];
  }

  return query;
};

// sortBy: date | subject | from; sortOrder: asc | desc (default date desc)
const buildSort = ({ sortBy, sortOrder }) => {
  const sortFieldMap = {
    date: "date",
    subject: "subject",
    from: "from.text",
  };
  const field = sortFieldMap[sortBy] || "date";
  const direction = sortOrder === "asc" ? 1 : -1;
  const sort = { [field]: direction };
  if (field !== "date") {
    sort.date = -1; // stable secondary sort
  }
  return sort;
};

function attachmentFolderPath(email_id) {
  // Attachment folders are named after the email document's _id hex string.
  const folderName = email_id instanceof ObjectId ? email_id.toHexString() : String(email_id);
  return path.join(attachmentsRoot, folderName);
}

async function deleteEmailAndAttachments(emailID, email_id) {
  const db = getDB();
  const collection = db.collection("emails");
  email_id = new ObjectId(email_id);

  // Ensure we only delete the email if it belongs to the user (emailID)
  const deleteResult = await collection.deleteOne({ _id: email_id, emailId: emailID });

  const attachmentsPath = attachmentFolderPath(email_id);
  if (fs.existsSync(attachmentsPath)) {
    fs.rmSync(attachmentsPath, { recursive: true, force: true });
  }

  return deleteResult.deletedCount;
}

async function getOldEmails(days) {
  try {
    const db = getDB();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const oldEmails = await db
      .collection("emails")
      .find(
        {
          date: { $lt: thresholdDate },
        },
        { projection: { _id: 1, emailId: 1 } }
      )
      .toArray();

    // Map to expected format { emailID: userEmail, emailId: objectId }
    return oldEmails.map((email) => ({
      emailID: email.emailId,
      emailId: email._id,
    }));
  } catch (error) {
    console.error("Error retrieving old emails:", error);
    throw error;
  }
}

const emailController = {
  getEmailsList: async (req, res) => {
    try {
      let { emailId } = req.params;
      const page = clampPage(req.query.page);
      const limit = clampLimit(req.query.limit);
      const skip = (page - 1) * limit;
      const { search, filter = "all", sortBy = "date", sortOrder = "desc" } = req.query;

      emailId = emailId.toLowerCase();
      const db = getDB();
      const collection = db.collection("emails");

      // Log Activity
      if (req.user) {
        await auditService.logActivity(new ObjectId(req.user.id), "VIEW_INBOX", { emailId }, req.user.role);
      }

      const query = buildSearchFilterQuery({ emailId: emailId }, { search, filter });
      const sort = buildSort({ sortBy, sortOrder });

      // Get total count for pagination (reflects search/filter)
      const totalCount = await collection.countDocuments(query);

      const emails = await collection
        .find(query, { projection: { "from.text": 1, subject: 1, date: 1, readStatus: 1 } })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();

      emails.forEach((email) => {
        if (!email["readStatus"]) {
          email["readStatus"] = false;
        }
      });

      // Set pagination headers
      res.setHeader("X-Total-Count", totalCount);
      res.setHeader("X-Total-Pages", Math.ceil(totalCount / limit));
      res.setHeader("X-Current-Page", page);

      // An empty inbox is not an error: return 200 with an empty array.
      return res.json(emails);
    } catch (error) {
      console.error("Error retrieving emails:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getUnreadCount: async (req, res) => {
    try {
      let { emailId } = req.params;
      emailId = emailId.toLowerCase();

      const db = getDB();
      const unreadCount = await db.collection("emails").countDocuments({
        emailId: emailId,
        readStatus: { $ne: true },
      });

      return res.json({ unreadCount });
    } catch (error) {
      console.error("Error retrieving unread count:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getAllEmails: async (req, res) => {
    try {
      const page = clampPage(req.query.page);
      const limit = clampLimit(req.query.limit);
      const skip = (page - 1) * limit;
      const { search, filter = "all", sortBy = "date", sortOrder = "desc" } = req.query;

      const db = getDB();
      const collection = db.collection("emails");

      const query = buildSearchFilterQuery({}, { search, filter });
      const sort = buildSort({ sortBy, sortOrder });

      // Get total count for pagination (reflects search/filter)
      const totalCount = await collection.countDocuments(query);

      const allEmails = await collection
        .find(query, {
          projection: {
            "from.text": 1,
            subject: 1,
            "to.value.address": 1,
            "from.value.address": 1,
            date: 1,
            readStatus: 1,
          },
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();

      // Set pagination headers
      res.setHeader("X-Total-Count", totalCount);
      res.setHeader("X-Total-Pages", Math.ceil(totalCount / limit));
      res.setHeader("X-Current-Page", page);

      return res.json(allEmails);
    } catch (error) {
      console.error("Error retrieving emails:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getEmail: async (req, res) => {
    try {
      let { email_id, emailId } = req.params; // Changed emailID to emailId to match route param

      // Fallback if emailId is undefined (might be passed as emailID)
      if (!emailId && req.params.emailID) {
        emailId = req.params.emailID;
      }

      if (!emailId) {
        return res.status(400).json({ message: "Email ID is required" });
      }

      emailId = emailId.toLowerCase();
      const db = getDB();
      const collection = db.collection("emails");

      try {
        email_id = new ObjectId(email_id);
      } catch (err) {
        return res.status(400).json({ message: "Invalid email_id format" });
      }

      // Ensure we only fetch the email if it belongs to the user (emailId).
      // The raw RFC822 source is excluded (it has its own download endpoint).
      const emails = await collection.find({ _id: email_id, emailId: emailId }, { projection: { raw: 0 } }).toArray();

      if (emails.length === 0) {
        return res.status(404).json({ message: "No emails found for the provided email ID" });
      }

      // Log Activity
      if (req.user) {
        await auditService.logActivity(new ObjectId(req.user.id), "READ_EMAIL", { emailId: emailId, messageId: email_id }, req.user.role);
      }

      if (!emails[0]["readStatus"]) {
        await collection.updateOne({ _id: email_id }, { $set: { readStatus: true } });
      }

      return res.json(emails);
    } catch (error) {
      console.error("Error retrieving emails:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getRawEmail: async (req, res) => {
    try {
      let { email_id, emailId } = req.params;

      if (!emailId) {
        return res.status(400).json({ message: "Email ID is required" });
      }

      emailId = emailId.toLowerCase();

      try {
        email_id = new ObjectId(email_id);
      } catch (err) {
        return res.status(400).json({ message: "Invalid email_id format" });
      }

      const db = getDB();
      const email = await db.collection("emails").findOne({ _id: email_id, emailId: emailId }, { projection: { raw: 1, subject: 1 } });

      if (!email) {
        return res.status(404).json({ message: "No emails found for the provided email ID" });
      }

      if (!email.raw) {
        return res.status(404).json({ message: "Raw source not available" });
      }

      // BSON Binary exposes the bytes via .buffer
      const rawBuffer = Buffer.isBuffer(email.raw) ? email.raw : Buffer.from(email.raw.buffer);

      // Build a safe download filename from the subject (fall back to the id).
      let baseName = typeof email.subject === "string" ? email.subject : "";
      baseName = baseName
        .replace(/[\r\n"\\/:*?<>|\x00-\x1f\x7f]/g, "")
        .trim()
        .slice(0, 100);
      if (!baseName) {
        baseName = email_id.toHexString();
      }

      if (req.user) {
        await auditService.logActivity(new ObjectId(req.user.id), "DOWNLOAD_RAW_EMAIL", { emailId: emailId, messageId: email_id }, req.user.role);
      }

      res.setHeader("Content-Type", "message/rfc822");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.eml"`);
      return res.send(rawBuffer);
    } catch (error) {
      console.error("Error retrieving raw email:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  deleteEmail: async (req, res) => {
    try {
      let { email_id, emailId } = req.params; // Changed emailID to emailId to match route param

      // Fallback if emailId is undefined (might be passed as emailID)
      if (!emailId && req.params.emailID) {
        emailId = req.params.emailID;
      }

      if (!emailId) {
        return res.status(400).json({ message: "Email ID is required" });
      }

      emailId = emailId.toLowerCase();

      const deletedCount = await deleteEmailAndAttachments(emailId, email_id);

      if (deletedCount === 0) {
        return res.status(404).json({ message: "No email found for the provided email ID" });
      }

      // Log Activity
      if (req.user) {
        await auditService.logActivity(new ObjectId(req.user.id), "DELETE_EMAIL", { emailId: emailId, messageId: email_id }, req.user.role);
      }

      return res.json({ message: "Email deleted successfully" });
    } catch (error) {
      console.error("Error deleting email:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  deleteAllEmails: async (req, res) => {
    try {
      let { emailId } = req.params;

      if (!emailId) {
        return res.status(400).json({ message: "Email ID is required" });
      }

      emailId = emailId.toLowerCase();

      const db = getDB();
      const collection = db.collection("emails");

      // Collect ids first so attachment folders can be removed.
      const emails = await collection.find({ emailId: emailId }, { projection: { _id: 1 } }).toArray();

      for (const email of emails) {
        const attachmentsPath = attachmentFolderPath(email._id);
        if (fs.existsSync(attachmentsPath)) {
          fs.rmSync(attachmentsPath, { recursive: true, force: true });
        }
      }

      const deleteResult = await collection.deleteMany({ emailId: emailId });

      // Log Activity
      if (req.user) {
        await auditService.logActivity(
          new ObjectId(req.user.id),
          "DELETE_INBOX",
          { emailId: emailId, deletedCount: deleteResult.deletedCount },
          req.user.role
        );
      }

      return res.json({ deletedCount: deleteResult.deletedCount });
    } catch (error) {
      console.error("Error deleting inbox:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};

module.exports = { emailController, deleteEmailAndAttachments, getOldEmails };
