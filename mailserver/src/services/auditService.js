const { getDB } = require("../db");
const sseService = require("./sseService");
const { escapeRegex } = require("../utils/regex");

// Sort keys clients may request; anything else falls back to the default.
const CONFLICT_SORT = new Set(["lastAccess", "accessCount", "emailId"]);
// Filter keys getLogs accepts; $-prefixed or unknown keys are dropped so a
// future caller cannot inject Mongo operators.
const LOG_FILTER_KEYS = new Set(["userId", "action", "role", "timestamp", "$or"]);

// Data minimization: mask the host part of IPs before persisting.
const anonymizeIp = (ip) => {
  const s = String(ip);
  if (s.includes(".")) return s.replace(/\.\d+$/, ".xxx");
  if (s.includes(":")) {
    const parts = s.split(":");
    return parts.slice(0, 4).join(":") + "::xxxx";
  }
  return "redacted";
};

const redactDetails = (details = {}) => {
  const d = { ...details };
  if (d.ip) d.ip = anonymizeIp(d.ip);
  return d;
};

const auditService = {
  logActivity: async (userId, action, details = {}, role = 'user') => {
    try {
      const db = getDB();
      const auditCollection = db.collection("audit_logs");

      const logEntry = {
        userId,
        action,
        details: redactDetails(details),
        role,
        timestamp: new Date(),
      };

      const result = await auditCollection.insertOne(logEntry);
      
      // Emit real-time update to admins
      sseService.sendAdminUpdate('NEW_LOG', { ...logEntry, _id: result.insertedId });

    } catch (error) {
      console.error("Audit logging failed:", error);
      // Don't block the main flow if logging fails
    }
  },

  getLogs: async (filter = {}, page = 1, limit = 50) => {
    const db = getDB();
    const skip = (page - 1) * limit;

    // Guard against operator injection from any future caller: only known
    // filter keys pass through.
    const safeFilter = {};
    for (const key of Object.keys(filter || {})) {
      if (LOG_FILTER_KEYS.has(key)) safeFilter[key] = filter[key];
    }
    filter = safeFilter;

    const logs = await db.collection("audit_logs")
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
      
    const total = await db.collection("audit_logs").countDocuments(filter);
    
    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  },

  getConflicts: async (page = 1, limit = 50, search = '', sortBy = 'lastAccess', sortOrder = 'desc') => {
    const db = getDB();
    const skip = (page - 1) * limit;

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

    if (search) {
      // Escape metacharacters and cap length: user input is matched literally.
      pipeline.push({ $match: { emailId: { $regex: escapeRegex(String(search).slice(0, 128)), $options: 'i' } } });
    }

    const sortKey = CONFLICT_SORT.has(sortBy) ? sortBy : 'lastAccess';
    const sort = { [sortKey]: sortOrder === 'asc' ? 1 : -1 };
    pipeline.push({ $sort: sort });

    // Count total before pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await db.collection("audit_logs").aggregate(countPipeline).toArray();
    const total = countResult.length > 0 ? countResult[0].total : 0;

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Lookup usernames
    pipeline.push({
      $lookup: {
        from: "users",
        localField: "users",
        foreignField: "_id",
        as: "userDetails"
      }
    });
    
    pipeline.push({
      $addFields: {
        users: {
          $map: {
            input: "$userDetails",
            as: "u",
            in: "$$u.username"
          }
        }
      }
    });
    
    pipeline.push({ $project: { userDetails: 0 } });

    const conflicts = await db.collection("audit_logs").aggregate(pipeline).toArray();

    return { conflicts, total, page, totalPages: Math.ceil(total / limit) };
  },

  // retentionDays === null means "delete all"; callers must gate that path
  // behind an explicit confirmation (see adminController.clearLogs).
  clearLogs: async (retentionDays = null) => {
    const db = getDB();
    const filter = {};

    if (retentionDays !== null) {
      const days = parseInt(retentionDays, 10);
      if (!Number.isInteger(days) || days <= 0) {
        throw new Error("retentionDays must be a positive integer");
      }
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - days);
      filter.timestamp = { $lt: thresholdDate };
    }

    const result = await db.collection("audit_logs").deleteMany(filter);
    return result.deletedCount;
  }
};

module.exports = auditService;
