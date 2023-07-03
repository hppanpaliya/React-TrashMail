const express = require("express");
const { getDB } = require("./db");
const { collectionName } = require("./config");

const router = express.Router();

// GET /emails/:emailId
// Retrieve emails and attachment file links for a specific email ID
router.get("/emails/:emailId", async (req, res) => {
  try {
    const { emailId } = req.params;
    console.log("emailId", emailId);
    const db = getDB();
    const collection = db.collection(collectionName);
    const emails = await collection.find({ "to.text": emailId }).toArray();

    if (emails.length === 0) {
      return res.status(404).json({ message: "No emails found for the provided email ID" });
    }

    const emailData = emails.map((email) => {
      // Extract attachment file links if available
      const attachments = email.attachments || [];
      const attachmentFileLinks = attachments.map((attachment) => ({
        filename: attachment.filename,
        link: `/attachments/${attachment.directory}/${attachment.filename}`,
      }));

      return {
        email,
        attachments: attachmentFileLinks,
      };
    });

    return res.json(emailData);
  } catch (error) {
    console.error("Error retrieving emails:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
