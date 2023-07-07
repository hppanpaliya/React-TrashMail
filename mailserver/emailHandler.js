const { simpleParser } = require("mailparser");
const fs = require("fs");
const path = require("path");
const { getDB } = require("./db");
const { collectionName } = require("./config");
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

async function saveEmailToDB(parsedEmail) {
  console.log("parsedEmail", parsedEmail.to.value[0].address);
  parsedEmail.to.value[0].address = parsedEmail.to.value[0].address.toLowerCase();
  parsedEmail.from.value[0].address = parsedEmail.from.value[0].address.toLowerCase();
  parsedEmail.to.text = parsedEmail.to.text.toLowerCase();
  

  try {
    const db = getDB();
    const collection = db.collection(parsedEmail.to.value[0].address);
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
    await collection.insertOne(parsedEmail);
    console.log("Email saved to MongoDB");
  } catch (error) {
    console.error("Error saving email or attachments:", error);
    throw error;
  }
}

async function handleIncomingEmail(stream) {
  try {
    const parsedEmail = await simpleParser(stream);
    await saveEmailToDB(parsedEmail);
  } catch (error) {
    console.error("Error parsing or saving email:", error);
    throw error;
  }
}

module.exports = {
  handleIncomingEmail,
};
