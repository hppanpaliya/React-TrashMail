const { simpleParser } = require("mailparser");
const fs = require("fs");
const path = require("path");
const { getDB } = require("./db");
const { collectionName } = require("./src/config");
const { ObjectId } = require("mongodb");

async function saveAttachment(attachmentFolder, attachment) {
  const attachmentsDir = path.join(__dirname, "attachments", attachmentFolder);

  if (!fs.existsSync(attachmentsDir)) {
    fs.mkdirSync(attachmentsDir, { recursive: true });
  }

  const filename = attachment.filename;
  const savePath = path.join(__dirname, "attachments", attachmentFolder, filename);

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
  console.log("parsedEmail", toAddress);

  parsedEmail.to.value[0].address = parsedEmail.to.value[0].address.toLowerCase();
  parsedEmail.from.value[0].address = parsedEmail.from.value[0].address.toLowerCase();
  parsedEmail.to.text = parsedEmail.to.text.toLowerCase();

  try {
    const db = getDB();
    const collection = db.collection(toAddress);
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
    parsedEmail.readStatus = false;
    parsedEmail.createdAt = new Date();
    await collection.insertOne(parsedEmail);
    console.log("Email saved to MongoDB");
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

async function getOldEmails(days) {
  try {
    const db = getDB();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const collections = await db.listCollections().toArray();
    let oldEmails = [];

    for (const collection of collections) {
      const emails = await db
        .collection(collection.name)
        .find(
          {
            date: { $lt: thresholdDate },
          },
          { projection: { _id: 1 } }
        )
        .toArray(); // Only fetch the _id field

      // Append the collection name (emailID) and email._id to the oldEmails array
      emails.forEach((email) => {
        oldEmails.push({ emailID: collection.name, emailId: email._id });
      });
    }

    return oldEmails;
  } catch (error) {
    console.error("Error retrieving old emails:", error);
    throw error;
  }
}

async function deleteEmailAndAttachments(emailID, email_id) {
  const db = getDB();
  const collection = db.collection(emailID);
  email_id = new ObjectId(email_id);

  const deleteResult = await collection.deleteOne({ _id: email_id });

  const attachmentsPath = path.join(__dirname, `./attachments/${email_id}`);
  if (fs.existsSync(attachmentsPath)) {
    fs.rmdirSync(attachmentsPath, { recursive: true });
  }

  return deleteResult.deletedCount;
}

module.exports = {
  handleIncomingEmail,
  getOldEmails,
  deleteEmailAndAttachments,
};
