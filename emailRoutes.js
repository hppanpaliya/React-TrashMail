const express = require("express");
const { getDB } = require("./db");
const { collectionName } = require("./config");
const { ObjectId } = require("mongodb");

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

router.get("/emails-list/:emailId", async (req, res) => {
  try {
    const { emailId } = req.params;
    console.log("emailId", emailId);
    const db = getDB();
    const collection = db.collection(collectionName);
    const emails = await collection
      .find(
        { "to.text": emailId.toLocaleLowerCase() },
        { projection: { "from.text": 1, subject: 1 } } // Only fetch "from.text" and "subject" fields list for input email ID
      )
      .toArray();
    console.log("emails", emails);
    if (emails.length === 0) {
      return res.status(404).json({ message: "No emails found for the provided email ID" });
    }

    return res.json(emails);
  } catch (error) {
    console.error("Error retrieving emails:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/email/:email_id", async (req, res) => {
  try {
    let { email_id } = req.params;
    console.log("email_id", email_id);
    const db = getDB();
    const collection = db.collection(collectionName);
    email_id = new ObjectId(email_id);

    const emails = await collection.find({ _id: email_id }).toArray(); // fetch email data for input email uid
    console.log("emails", emails);

    if (emails.length === 0) {
      return res.status(404).json({ message: "No emails found for the provided email ID" });
    }

    return res.json(emails);
  } catch (error) {
    console.error("Error retrieving emails:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});



module.exports = router;
