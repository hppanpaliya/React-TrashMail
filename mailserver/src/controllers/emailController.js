const { getDB } = require("../db");
const { ObjectId } = require("mongodb");
const { deleteEmailAndAttachments } = require("../services/emailService");

const emailController = {
  getEmailsList: async (req, res) => {
    try {
      let { emailId } = req.params;
      emailId = emailId.toLowerCase();
      console.log("emailId", emailId);
      const db = getDB();
      const collection = db.collection(emailId);
      const emails = await collection
        .find({}, { projection: { "from.text": 1, subject: 1, date: 1, readStatus: 1 } })
        .sort({ date: -1 })
        .toArray();
      console.log("emails", emails);
      if (emails.length === 0) {
        return res.status(404).json({ message: "No emails found for the provided email ID" });
      }

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
  },

  getAllEmails: async (req, res) => {
    try {
      const db = getDB();
      const collections = await db.listCollections().toArray();
      let allEmails = [];

      for (const collection of collections) {
        const emails = await db
          .collection(collection.name)
          .find(
            {},
            {
              projection: {
                "from.text": 1,
                subject: 1,
                "to.value.address": 1,
                "from.value.address": 1,
                date: 1,
                readStatus: 1,
              },
            }
          )
          .toArray();
        allEmails.push(...emails);
      }

      allEmails.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA;
      });

      if (allEmails.length === 0) {
        return res.status(404).json({ message: "No emails found in the database" });
      }

      return res.json(allEmails);
    } catch (error) {
      console.error("Error retrieving emails:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getEmail: async (req, res) => {
    try {
      let { email_id, emailID } = req.params;
      emailID = emailID.toLowerCase();
      console.log("email_id", email_id);
      const db = getDB();
      const collection = db.collection(emailID);
      email_id = new ObjectId(email_id);

      const emails = await collection.find({ _id: email_id }).toArray();
      console.log("emails", emails);

      if (emails.length === 0) {
        return res.status(404).json({ message: "No emails found for the provided email ID" });
      }

      if (!emails[0]["readStatus"]) {
        const updateResult = await collection.updateOne({ _id: email_id }, { $set: { readStatus: true } });
        console.log("updateResult", updateResult);
      }

      return res.json(emails);
    } catch (error) {
      console.error("Error retrieving emails:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  deleteEmail: async (req, res) => {
    try {
      let { email_id, emailID } = req.params;
      emailID = emailID.toLowerCase();
      console.log("email_id", email_id);

      const deletedCount = await deleteEmailAndAttachments(emailID, email_id);

      if (deletedCount === 0) {
        return res.status(404).json({ message: "No email found for the provided email ID" });
      }

      return res.json({ message: "Email deleted successfully" });
    } catch (error) {
      console.error("Error deleting email:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};

module.exports = emailController;