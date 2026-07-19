const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authMiddleware, checkRole } = require("../middleware/authMiddleware");

const sseService = require("../services/sseService");

// Protect all admin routes
router.use(authMiddleware);
router.use(checkRole(['admin']));

// @route   GET api/admin/sse/logs
// @desc    Real-time audit logs
router.get("/sse/logs", (req, res) => {
  if (!sseService.addAdminClient(res, { ip: req.ip, userId: req.user.id })) {
    return res.status(429).json({ message: "Too many concurrent connections" });
  }
});

// @route   GET api/admin/logs
// @desc    Get audit logs
router.get("/logs", adminController.getLogs);

// @route   DELETE api/admin/logs
// @desc    Clear audit logs
router.delete("/logs", adminController.clearLogs);

// @route   GET api/admin/conflicts
// @desc    Get conflicting email usage
router.get("/conflicts", adminController.getConflicts);

// @route   PUT api/admin/users/:userId/domains
// @desc    Update allowed domains for a user
router.put("/users/:userId/domains", adminController.updateUserDomains);

// @route   PUT api/admin/users/:userId/status
// @desc    Enable or disable a user account
router.put("/users/:userId/status", adminController.updateUserStatus);

// @route   PUT api/admin/users/:userId/role
// @desc    Change a user's role
router.put("/users/:userId/role", adminController.updateUserRole);

// @route   DELETE api/admin/users/:userId
// @desc    Delete a user account (audit logs are retained)
router.delete("/users/:userId", adminController.deleteUser);

// @route   POST api/admin/invites
// @desc    Generate a new invite code (optional expiresInDays)
router.post("/invites", adminController.generateInvite);

// @route   GET api/admin/invites
// @desc    List invite codes with status and creator/consumer info
router.get("/invites", adminController.getInvites);

// @route   DELETE api/admin/invites/:id
// @desc    Revoke an unused invite code
router.delete("/invites/:id", adminController.revokeInvite);

// @route   GET api/admin/settings
// @desc    Get global settings (email retention)
router.get("/settings", adminController.getSettings);

// @route   PUT api/admin/settings
// @desc    Update global settings (email retention)
router.put("/settings", adminController.updateSettings);

// @route   GET api/admin/stats
// @desc    Aggregate counters for the admin overview
router.get("/stats", adminController.getStats);

// @route   GET api/admin/system-emails
// @desc    Get emails sent to system addresses (admin@, abuse@, etc.)
router.get("/system-emails", adminController.getSystemEmails);

// @route   GET api/admin/received-emails
// @desc    Get all received emails with access info
router.get("/received-emails", adminController.getReceivedEmails);

// @route   GET api/admin/top-emails
// @desc    Get top emails by received count
router.get("/top-emails", adminController.getTopEmails);

// @route   GET api/admin/emails-with-attachments
// @desc    Get emails with attachments and their sizes
router.get("/emails-with-attachments", adminController.getEmailsWithAttachments);

module.exports = router;
