const { getDB } = require("../db");
const { ObjectId } = require("mongodb");
const auditService = require("../services/auditService");

const adminController = {
  getLogs: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const { userId, action, role, search, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;

      const filter = {};
      if (userId) filter.userId = new ObjectId(userId);
      if (action) filter.action = action;
      if (role) filter.role = role;
      
      if (search) {
        filter.$or = [
          { 'details.username': { $regex: search, $options: 'i' } },
          { 'details.emailId': { $regex: search, $options: 'i' } },
          { action: { $regex: search, $options: 'i' } }
        ];
      }

      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const db = getDB();
      const skip = (page - 1) * limit;
      
      const logs = await db.collection("audit_logs")
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
        
      const total = await db.collection("audit_logs").countDocuments(filter);
      
      res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getConflicts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const { search, sortBy = 'lastAccess', sortOrder = 'desc' } = req.query;

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
      const { allowedDomains } = req.body; // Array of strings or null

      if (allowedDomains !== null && !Array.isArray(allowedDomains)) {
        return res.status(400).json({ message: "allowedDomains must be an array or null" });
      }

      const db = getDB();
      const result = await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { allowedDomains: allowedDomains } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log Admin Action
      await auditService.logActivity(
        new ObjectId(req.user.id),
        'UPDATE_USER_DOMAINS',
        { targetUserId: userId, allowedDomains },
        req.user.role
      );

      res.json({ message: "User domains updated successfully" });
    } catch (error) {
      console.error("Error updating user domains:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  generateInvite: async (req, res) => {
    try {
      const { role = 'user' } = req.body;
      const db = getDB();
      const invitesCollection = db.collection("invites");

      const code = "WELCOME-TRASHMAIL-" + Math.random().toString(36).substring(7).toUpperCase();
      
      await invitesCollection.insertOne({
        code: code,
        role: role,
        used: false,
        createdAt: new Date(),
        createdBy: new ObjectId(req.user.id)
      });

      await auditService.logActivity(
        new ObjectId(req.user.id),
        'GENERATE_INVITE',
        { code, role },
        req.user.role
      );

      res.json({ code, role });
    } catch (error) {
      console.error("Error generating invite:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getSystemEmails: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const { search, sortBy = 'date', sortOrder = 'desc' } = req.query;
      const skip = (page - 1) * limit;

      const db = getDB();
      const collection = db.collection('emails');
      
      const systemPrefixes = ['admin', 'spam', 'abuse', 'help', 'support', 'webmaster', 'postmaster', 'hostmaster'];
      const regexPattern = `^(${systemPrefixes.join('|')})@`;
      
      const filter = { emailId: { $regex: regexPattern, $options: 'i' } };
      
      if (search) {
        filter.$or = [
          { subject: { $regex: search, $options: 'i' } },
          { 'from.text': { $regex: search, $options: 'i' } },
          { emailId: { $regex: search, $options: 'i' } }
        ];
      }

      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const emails = await collection
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await collection.countDocuments(filter);

      res.json({ emails, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      console.error("Error fetching system emails:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getReceivedEmails: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const { search, sortBy = 'date', sortOrder = 'desc' } = req.query;
      const skip = (page - 1) * limit;

      const db = getDB();
      const emailsCollection = db.collection('emails');
      const auditCollection = db.collection('audit_logs');
      const usersCollection = db.collection('users');

      const filter = {};
      if (search) {
        filter.$or = [
          { subject: { $regex: search, $options: 'i' } },
          { 'from.text': { $regex: search, $options: 'i' } },
          { emailId: { $regex: search, $options: 'i' } }
        ];
      }

      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      // 1. Fetch Emails
      const emails = await emailsCollection
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();

      const totalEmails = await emailsCollection.countDocuments(filter);

      // 2. Enrich with Access Logs
      const enrichedEmails = await Promise.all(emails.map(async (email) => {
        // Find logs for this email
        const logs = await auditCollection.find({
          action: 'READ_EMAIL',
          'details.messageId': email._id
        }).toArray();

        // Get unique user IDs who accessed it
        const userIds = [...new Set(logs.map(log => log.userId))];

        // Fetch usernames
        let accessedBy = [];
        if (userIds.length > 0) {
          const users = await usersCollection.find({
            _id: { $in: userIds }
          }).project({ username: 1 }).toArray();
          accessedBy = users.map(u => u.username);
        }

        return {
          ...email,
          accessedBy
        };
      }));

      res.json({
        emails: enrichedEmails,
        total: totalEmails,
        page,
        totalPages: Math.ceil(totalEmails / limit)
      });
    } catch (error) {
      console.error("Error fetching received emails:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  clearLogs: async (req, res) => {
    try {
      const { retentionDays } = req.body;
      
      const deletedCount = await auditService.clearLogs(retentionDays);
      
      // Log this administrative action
      await auditService.logActivity(
        new ObjectId(req.user.id), 
        'CLEAR_LOGS', 
        { retentionDays: retentionDays || 'ALL', deletedCount }, 
        req.user.role
      );

      res.json({ message: `Successfully deleted ${deletedCount} log entries`, deletedCount });
    } catch (error) {
      console.error("Error clearing logs:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
};

module.exports = adminController;
