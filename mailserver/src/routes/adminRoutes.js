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
  sseService.addAdminClient(res);
});

// @route   GET api/admin/logs
// @desc    Get audit logs
router.get("/logs", adminController.getLogs);

// @route   GET api/admin/conflicts
// @desc    Get conflicting email usage
router.get("/conflicts", adminController.getConflicts);

// @route   PUT api/admin/users/:userId/domains
// @desc    Update allowed domains for a user
router.put("/users/:userId/domains", adminController.updateUserDomains);

// @route   POST api/admin/invites
// @desc    Generate a new invite code
router.post("/invites", adminController.generateInvite);

// @route   GET api/admin/system-emails
// @desc    Get emails sent to system addresses (admin@, abuse@, etc.)
router.get("/system-emails", adminController.getSystemEmails);

// @route   GET api/admin/received-emails
// @desc    Get all received emails with access info
router.get("/received-emails", adminController.getReceivedEmails);

module.exports = router;
