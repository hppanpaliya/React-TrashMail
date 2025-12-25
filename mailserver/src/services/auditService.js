const { getDB } = require("../db");

const auditService = {
  logActivity: async (userId, action, details = {}, role = 'user') => {
    try {
      const db = getDB();
      const auditCollection = db.collection("audit_logs");

      await auditCollection.insertOne({
        userId,
        action,
        details,
        role,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Audit logging failed:", error);
      // Don't block the main flow if logging fails
    }
  },

  getLogs: async (filter = {}, page = 1, limit = 50) => {
    const db = getDB();
    const skip = (page - 1) * limit;
    
    const logs = await db.collection("audit_logs")
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
      
    const total = await db.collection("audit_logs").countDocuments(filter);
    
    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  },

  getConflicts: async () => {
    const db = getDB();
    // Find emailIds that have been accessed (VIEW_INBOX) by more than one distinct user
    const pipeline = [
      { $match: { action: "VIEW_INBOX" } },
      { 
        $group: { 
          _id: "$details.emailId", 
          users: { $addToSet: "$userId" },
          accessCount: { $sum: 1 },
          lastAccess: { $max: "$timestamp" }
        } 
      },
      { $match: { $expr: { $gt: [{ $size: "$users" }, 1] } } },
      { $project: { emailId: "$_id", users: 1, accessCount: 1, lastAccess: 1, _id: 0 } }
    ];

    return await db.collection("audit_logs").aggregate(pipeline).toArray();
  }
};

module.exports = auditService;
