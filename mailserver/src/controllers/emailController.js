const { getDB } = require("../db");
const { ObjectId } = require("mongodb");
const fs = require("fs");
const path = require("path");
const auditService = require("../services/auditService");

async function deleteEmailAndAttachments(emailID, email_id) {
  const db = getDB();
  const collection = db.collection('emails');
  email_id = new ObjectId(email_id);

  // Ensure we only delete the email if it belongs to the user (emailID)
  const deleteResult = await collection.deleteOne({ _id: email_id, emailId: emailID });

  const attachmentsPath = path.join(__dirname, `../attachments/${email_id}`);
  if (fs.existsSync(attachmentsPath)) {
    fs.rmSync(attachmentsPath, { recursive: true, force: true });
  }

  return deleteResult.deletedCount;
}

async function getOldEmails(days) {
  try {
    const db = getDB();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const oldEmails = await db
      .collection('emails')
      .find(
        {
          date: { $lt: thresholdDate },
        },
        { projection: { _id: 1, emailId: 1 } }
      )
      .toArray();

    // Map to expected format { emailID: userEmail, emailId: objectId }
    return oldEmails.map(email => ({
      emailID: email.emailId,
      emailId: email._id
    }));
  } catch (error) {
    console.error("Error retrieving old emails:", error);
    throw error;
  }
}

const emailController = {
  getEmailsList: async (req, res) => {
    try {
      let { emailId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;

      emailId = emailId.toLowerCase();
      console.log("emailId", emailId);
      const db = getDB();
      const collection = db.collection('emails');

      // Log Activity
      if (req.user) {
        await auditService.logActivity(
          new ObjectId(req.user.id), 
          'VIEW_INBOX', 
          { emailId }, 
          req.user.role
        );
      }
      
      const emails = await collection
        .find({ emailId: emailId }, { projection: { "from.text": 1, subject: 1, date: 1, readStatus: 1 } })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
        
      if (emails.length === 0 && page === 1) {
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
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;

      const db = getDB();
      
      const allEmails = await db
        .collection('emails')
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
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

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
      let { email_id, emailId } = req.params; // Changed emailID to emailId to match route param
      
      // Fallback if emailId is undefined (might be passed as emailID)
      if (!emailId && req.params.emailID) {
        emailId = req.params.emailID;
      }

      if (!emailId) {
        return res.status(400).json({ message: "Email ID is required" });
      }

      emailId = emailId.toLowerCase();
      console.log(`get user_email_id's emailID, ${email_id}, ${emailId}`);
      const db = getDB();
      const collection = db.collection('emails');
      
      try {
        email_id = new ObjectId(email_id);
      } catch (err) {
        return res.status(400).json({ message: "Invalid email_id format" });
      }

      // Ensure we only fetch the email if it belongs to the user (emailId)
      const emails = await collection.find({ _id: email_id, emailId: emailId }).toArray();

      if (emails.length === 0) {
        return res.status(404).json({ message: "No emails found for the provided email ID" });
      }

      // Log Activity
      if (req.user) {
        await auditService.logActivity(
          new ObjectId(req.user.id), 
          'READ_EMAIL', 
          { emailId: emailId, messageId: email_id }, 
          req.user.role
        );
      }

      if (!emails[0]["readStatus"]) {
        await collection.updateOne({ _id: email_id }, { $set: { readStatus: true } });
      }

      return res.json(emails);
    } catch (error) {
      console.error("Error retrieving emails:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  deleteEmail: async (req, res) => {
    try {
      let { email_id, emailId } = req.params; // Changed emailID to emailId to match route param
      
      // Fallback if emailId is undefined (might be passed as emailID)
      if (!emailId && req.params.emailID) {
        emailId = req.params.emailID;
      }

      if (!emailId) {
        return res.status(400).json({ message: "Email ID is required" });
      }

      emailId = emailId.toLowerCase();
      console.log("delete email_id", email_id);

      const deletedCount = await deleteEmailAndAttachments(emailId, email_id);

      if (deletedCount === 0) {
        return res.status(404).json({ message: "No email found for the provided email ID" });
      }

      // Log Activity
      if (req.user) {
        await auditService.logActivity(
          new ObjectId(req.user.id), 
          'DELETE_EMAIL', 
          { emailId: emailId, messageId: email_id }, 
          req.user.role
        );
      }

      return res.json({ message: "Email deleted successfully" });
    } catch (error) {
      console.error("Error deleting email:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};

module.exports = { emailController, deleteEmailAndAttachments, getOldEmails };
