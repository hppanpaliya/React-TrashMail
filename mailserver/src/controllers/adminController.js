const { getDB } = require("../db");
const { ObjectId } = require("mongodb");
const auditService = require("../services/auditService");

const adminController = {
  getLogs: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const { userId, action, role } = req.query;

      const filter = {};
      if (userId) filter.userId = new ObjectId(userId);
      if (action) filter.action = action;
      if (role) filter.role = role;

      const result = await auditService.getLogs(filter, page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getConflicts: async (req, res) => {
    try {
      const conflicts = await auditService.getConflicts();
      res.json(conflicts);
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
      const db = getDB();
      const collection = db.collection('emails');
      
      const systemPrefixes = ['admin', 'spam', 'abuse', 'help', 'support', 'webmaster', 'postmaster', 'hostmaster'];
      const regexPattern = `^(${systemPrefixes.join('|')})@`;
      
      const emails = await collection
        .find({ emailId: { $regex: regexPattern, $options: 'i' } })
        .sort({ date: -1 })
        .limit(100)
        .toArray();

      res.json(emails);
    } catch (error) {
      console.error("Error fetching system emails:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
};

module.exports = adminController;
