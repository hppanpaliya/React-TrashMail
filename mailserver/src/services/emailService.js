const { simpleParser } = require("mailparser");
const fs = require("fs");
const path = require("path");
const { getDB } = require("../db");
const { ObjectId } = require("mongodb");
const sseService = require("./sseService");
const { sanitizeEmailHTML, textToHTML } = require('../utils/sanitizer');

async function saveAttachment(attachmentFolder, attachment) {
  const attachmentsDir = path.join(__dirname, "../..", "attachments", attachmentFolder);

  if (!fs.existsSync(attachmentsDir)) {
    fs.mkdirSync(attachmentsDir, { recursive: true });
  }

  const filename = attachment.filename;
  const savePath = path.join(attachmentsDir, filename);

  return new Promise((resolve, reject) => {
    let writeStream;
    if (attachment.content instanceof Buffer) {
      // Handle attachment content as a Buffer
      writeStream = fs.createWriteStream(savePath);
      writeStream.write(attachment.content);
      writeStream.end();
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    } else if (typeof attachment.content === "string") {
      // Handle attachment content as a string
      writeStream = fs.createWriteStream(savePath, { encoding: "utf8" });
      writeStream.write(attachment.content);
      writeStream.end();
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    } else {
      reject(new Error("Unsupported attachment content type"));
    }
  });
}

async function saveEmailToDB(parsedEmail, toAddress) {
  if (!("to" in parsedEmail)) {
    parsedEmail.to = {
      text: "",
      value: [{ address: "" }],
    };
  }

  parsedEmail.to.value[0].address = parsedEmail.to.value[0].address.toLowerCase();
  parsedEmail.from.value[0].address = parsedEmail.from.value[0].address.toLowerCase();
  parsedEmail.to.text = parsedEmail.to.text.toLowerCase();

  try {
    // Sanitize email content before saving
    if (parsedEmail.html) {
      parsedEmail.html = sanitizeEmailHTML(parsedEmail.html);
      parsedEmail.htmlOriginal = parsedEmail.html; // Keep sanitized version
    }
    
    if (parsedEmail.text) {
      parsedEmail.textAsHtml = textToHTML(parsedEmail.text);
    }
    const db = getDB();
    const collection = db.collection('emails');
    const attachments = parsedEmail.attachments;
    // Generate a new MongoDB ObjectId
    const objectId = new ObjectId();
    // Use the ObjectId as the attachment folder name
    let attachmentFolder = objectId.toHexString();
    if (attachments && attachments.length > 0) {
      console.log("Saving attachments to the file system");
      for (const attachment of attachments) {
        await saveAttachment(attachmentFolder, attachment);
      }
    }
    if (attachments && attachments.length > 0) {
      parsedEmail.attachments = attachments.map((attachment) => ({
        filename: attachment.filename,
        directory: attachmentFolder,
      }));
    }
    parsedEmail._id = objectId;
    parsedEmail.emailId = toAddress; // Add emailId field for single collection schema
    parsedEmail.readStatus = false;
    parsedEmail.createdAt = new Date();
    await collection.insertOne(parsedEmail);
    console.log("Email saved to MongoDB collection: emails (for user " + toAddress + ")");

    // Send SSE update
    sseService.sendUpdate(toAddress, {
      _id: parsedEmail._id,
      subject: parsedEmail.subject,
      from: parsedEmail.from,
      date: parsedEmail.date,
      readStatus: parsedEmail.readStatus,
    });

    // Send Admin SSE update
    sseService.sendAdminUpdate('NEW_EMAIL', {
      _id: parsedEmail._id,
      emailId: toAddress,
      subject: parsedEmail.subject,
      from: parsedEmail.from,
      date: parsedEmail.date,
      readStatus: parsedEmail.readStatus,
      accessedBy: [] // Initially no one has accessed it
    });
  } catch (error) {
    console.error("Error saving email or attachments:", error);
    throw error;
  }
}

async function handleIncomingEmail(stream, session) {
  try {
    const parsedEmail = await simpleParser(stream);
    for (toAddress of session.envelope.rcptTo) {
      await saveEmailToDB(parsedEmail, toAddress.address.toLowerCase());
    }
  } catch (error) {
    console.error("Error parsing or saving email:", error);
    throw error;
  }
}

module.exports = {
  handleIncomingEmail,
};
