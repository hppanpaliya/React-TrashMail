const express = require("express");
const { getDB } = require("./db");
const { collectionName } = require("./config");
const { ObjectId } = require("mongodb");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// GET /emails/:emailId
// Retrieve emails and attachment file links for a specific email ID
router.get("/emails/:emailId", async (req, res) => {
  try {
    const { emailId } = req.params;
    console.log("emailId", emailId);
    const db = getDB();
    const collection = db.collection(emailId);
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

// GET list of Subject, Time, Read-Status and From fields for a specific emailId (email address)
router.get("/emails-list/:emailId", async (req, res) => {
  try {
    const { emailId } = req.params;
    console.log("emailId", emailId);
    const db = getDB();
    const collection = db.collection(emailId);
    const emails = await collection
      .find(
        { "to.text": emailId.toLocaleLowerCase() },
        { projection: { "from.text": 1, subject: 1, date: 1, readStatus: 1 } } // Only fetch the required fields
      )
      .toArray();
    console.log("emails", emails);
    if (emails.length === 0) {
      return res.status(404).json({ message: "No emails found for the provided email ID" });
    }

    // if there is no readStatus field, add it to the email data with value false
    emails.map((email) => {
      if (!email["readStatus"]) {
        email["readStatus"] = false;
      }
    });

    return res.json(emails);
  } catch (error) {
    console.error("Error retrieving emails:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET all the received emails regardless of the email ID (email address)
router.get("/all-emails", async (req, res) => {
  try {
    const db = getDB();
    const collections = await db.listCollections().toArray();
    const allEmails = [];

    for (const collection of collections) {
      const emails = await db
        .collection(collection.name)
        .find({}, { projection: { "from.text": 1, subject: 1, "to.value.address": 1, "from.value.address": 1, date: 1, readStatus: 1 } })
        .toArray();
      allEmails.push(...emails);
    }

    if (allEmails.length === 0) {
      return res.status(404).json({ message: "No emails found in the database" });
    }

    return res.json(allEmails);
  } catch (error) {
    console.error("Error retrieving emails:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get email data for emailId with specific mongodb id (email_id)
// Also if the email had read status as false, update it to true
router.get("/email/:emailID/:email_id", async (req, res) => {
  try {
    let { email_id } = req.params;
    let { emailID } = req.params;
    console.log("email_id", email_id);
    const db = getDB();
    const collection = db.collection(emailID);
    email_id = new ObjectId(email_id);

    const emails = await collection.find({ _id: email_id }).toArray(); // fetch email data for input email uid
    console.log("emails", emails);

    if (emails.length === 0) {
      return res.status(404).json({ message: "No emails found for the provided email ID" });
    }

    // if there is no readStatus field or if it is false, update it to true
    if (!emails[0]["readStatus"]) {
      const updateResult = await collection.updateOne({ _id: email_id }, { $set: { readStatus: true } });
      console.log("updateResult", updateResult);
    }

    return res.json(emails);
  } catch (error) {
    console.error("Error retrieving emails:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Delete email data and attachments for emailId with specific mongodb id (email_id)
router.delete("/email/:emailID/:email_id", async (req, res) => {
  try {
    let { email_id } = req.params;
    let { emailID } = req.params;
    console.log("email_id", email_id);
    const db = getDB();
    const collection = db.collection(emailID);
    email_id = new ObjectId(email_id);

    const deleteResult = await collection.deleteOne({ _id: email_id }); // delete email data with the provided email uid
    console.log("deleteResult", deleteResult);

    // Check if the email had any attachments at attachments folder /attachments/:email_id/*
    const attachmentsPath = path.join(__dirname, `./attachments/${email_id}`);

    // Delete the attachments folder if it exists
    if (fs.existsSync(attachmentsPath)) {
      fs.rmdirSync(attachmentsPath, { recursive: true });
    }

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ message: "No email found for the provided email ID" });
    }

    return res.json({ message: "Email deleted successfully" });
  } catch (error) {
    console.error("Error deleting email:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
