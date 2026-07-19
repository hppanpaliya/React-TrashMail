const { simpleParser } = require("mailparser");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getDB } = require("../db");
const { ObjectId, Binary } = require("mongodb");
const sseService = require("./sseService");
const webhookService = require("./webhookService");
const { sanitizeEmailHTML, textToHTML } = require("../utils/sanitizer");
const { sanitizeAttachmentFilename, dedupeFilename } = require("../utils/filename");
const { attachmentsRoot } = require("../config/paths");
const config = require("../config");
const { Readable } = require("stream");

/**
 * Save a single attachment inside the given folder (named after the email's
 * ObjectId). The filename is attacker-controlled, so it is sanitized and
 * de-duplicated. Returns the filename actually used on disk so the DB
 * metadata matches the file system.
 */
async function saveAttachment(attachmentFolder, attachment) {
  const attachmentsDir = path.join(attachmentsRoot, attachmentFolder);

  // recursive:true is idempotent, so no racy existsSync pre-check is needed.
  await fs.promises.mkdir(attachmentsDir, { recursive: true });

  const safeName = sanitizeAttachmentFilename(attachment.filename);
  const filename = dedupeFilename(fs, attachmentsDir, safeName);
  const savePath = path.join(attachmentsDir, filename);

  await new Promise((resolve, reject) => {
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
    } else if (attachment.content instanceof Readable) {
      // Handle attachment content as a Readable stream. pipe() does not
      // forward source errors, so listen on the source too or the promise
      // never settles and the error crashes the process.
      writeStream = fs.createWriteStream(savePath);
      attachment.content.on("error", (err) => {
        writeStream.destroy();
        reject(err);
      });
      attachment.content.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    } else {
      reject(new Error("Unsupported attachment content type"));
    }
  });

  return filename;
}

/**
 * Buffer a readable stream into memory, rejecting once it exceeds maxBytes.
 */
function bufferStream(stream, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let failed = false;

    stream.on("data", (chunk) => {
      if (failed) return;
      size += chunk.length;
      if (size > maxBytes) {
        failed = true;
        reject(new Error(`Message size exceeds the maximum allowed (${maxBytes} bytes)`));
        return;
      }
      chunks.push(chunk);
    });
    stream.on("end", () => {
      if (!failed) resolve(Buffer.concat(chunks));
    });
    stream.on("error", (err) => {
      if (!failed) {
        failed = true;
        reject(err);
      }
    });
  });
}

/**
 * Insert one email document for a single recipient. `parsedEmail` is treated
 * as read-only shared state; every recipient gets a fresh document.
 */
async function saveEmailToDB(parsedEmail, originalAttachments, toAddress, rawBuffer) {
  // Generate a new MongoDB ObjectId; it doubles as the attachment folder name.
  const objectId = new ObjectId();
  const attachmentFolder = objectId.toHexString();
  const attachmentsDirAbs = path.join(attachmentsRoot, attachmentFolder);
  let wroteAttachments = false;

  const cleanupAttachments = async () => {
    if (!wroteAttachments) return;
    try {
      await fs.promises.rm(attachmentsDirAbs, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error("Failed to clean orphaned attachments:", cleanupErr);
    }
  };

  try {
    const db = getDB();
    const collection = db.collection("emails");

    // Build a fresh document per recipient (shallow clone + fixed fields) so
    // concurrent/multi-recipient deliveries never share mutated state.
    const emailDoc = { ...parsedEmail };
    delete emailDoc.attachments;

    if (originalAttachments && originalAttachments.length > 0) {
      console.log("Saving attachments to the file system");
      const attachmentsMeta = [];
      for (const attachment of originalAttachments) {
        const savedFilename = await saveAttachment(attachmentFolder, attachment);
        wroteAttachments = true;
        attachmentsMeta.push({
          filename: savedFilename,
          directory: attachmentFolder,
        });
      }
      emailDoc.attachments = attachmentsMeta;
    }

    emailDoc._id = objectId;
    emailDoc.emailId = toAddress; // Add emailId field for single collection schema
    emailDoc.readStatus = false;
    emailDoc.createdAt = new Date();

    // Store the raw RFC822 source (for .eml download) unless it is too large
    // to fit comfortably inside a MongoDB document. Storing it per email up to
    // the cap is an intentional storage trade-off.
    const rawCap = config.maxRawStoreSize;
    if (rawBuffer && Number.isFinite(rawCap) && rawCap > 0 && rawBuffer.length <= rawCap) {
      emailDoc.raw = new Binary(rawBuffer);
    } else if (rawBuffer && rawBuffer.length > rawCap) {
      console.warn(`Raw source (${rawBuffer.length}B) exceeds maxRawStoreSize (${rawCap}B); not persisted for ${toAddress}`);
    }

    // Idempotency: an SMTP retry of the same message for the same recipient
    // must not create a duplicate. Message-ID is attacker-controllable, so mix
    // in a hash of the raw source when available.
    const rawHash = rawBuffer ? crypto.createHash("sha256").update(rawBuffer).digest("hex") : "";
    emailDoc.dedupeKey = `${parsedEmail.messageId || ""}:${rawHash}:${toAddress}`;

    const upsertResult = await collection.updateOne({ dedupeKey: emailDoc.dedupeKey }, { $setOnInsert: emailDoc }, { upsert: true });
    if (!upsertResult.upsertedId) {
      // Duplicate delivery (retry): drop the freshly written attachment folder
      // and skip SSE/webhook so clients are not notified twice.
      await cleanupAttachments();
      console.log(`Duplicate delivery suppressed for ${toAddress} (dedupeKey match)`);
      return;
    }
    console.log("Email saved to MongoDB collection: emails (for user " + toAddress + ")");

    const updatePayload = {
      _id: emailDoc._id,
      subject: emailDoc.subject,
      from: emailDoc.from,
      to: emailDoc.to,
      date: emailDoc.date,
      readStatus: emailDoc.readStatus,
    };

    // Send SSE update
    sseService.sendUpdate(toAddress, updatePayload);

    // Send SSE update for all emails page
    sseService.sendAllEmailsUpdate(updatePayload);

    // Send Admin SSE update
    sseService.sendAdminUpdate("NEW_EMAIL", {
      _id: emailDoc._id,
      emailId: toAddress,
      subject: emailDoc.subject,
      from: emailDoc.from,
      date: emailDoc.date,
      readStatus: emailDoc.readStatus,
      accessedBy: [], // Initially no one has accessed it
    });

    // Fire-and-forget webhook delivery; a .catch (not try/catch) is required
    // because a floating async rejection would otherwise be unhandled. Never
    // await it — ingestion must not block on webhook delivery.
    Promise.resolve()
      .then(() => webhookService.deliverForEmail(toAddress, emailDoc))
      .catch((webhookError) => {
        console.error(`Error in webhook delivery for ${toAddress}:`, webhookError);
      });
  } catch (error) {
    // A DB failure after attachments hit disk would otherwise orphan them.
    await cleanupAttachments();
    console.error("Error saving email or attachments:", error);
    throw error;
  }
}

async function handleIncomingEmail(stream, session) {
  try {
    // Buffer the raw message first so we can both parse it and persist the
    // original RFC822 source for download.
    const rawBuffer = await bufferStream(stream, config.smtpMaxMessageSize);
    const parsedEmail = await simpleParser(rawBuffer);

    const originalAttachments = parsedEmail.attachments || [];
    delete parsedEmail.attachments;

    // Normalize addresses once, before fan-out to recipients.
    if (!("to" in parsedEmail) || !parsedEmail.to) {
      parsedEmail.to = {
        text: "",
        value: [{ address: "" }],
      };
    }
    if (parsedEmail.to.value && parsedEmail.to.value[0] && parsedEmail.to.value[0].address) {
      parsedEmail.to.value[0].address = parsedEmail.to.value[0].address.toLowerCase();
    }
    if (parsedEmail.from && parsedEmail.from.value && parsedEmail.from.value[0] && parsedEmail.from.value[0].address) {
      parsedEmail.from.value[0].address = parsedEmail.from.value[0].address.toLowerCase();
    }
    if (typeof parsedEmail.to.text === "string") {
      parsedEmail.to.text = parsedEmail.to.text.toLowerCase();
    }

    // Sanitize HTML exactly once; every recipient shares the same content.
    if (parsedEmail.html) {
      parsedEmail.htmlOriginal = parsedEmail.html; // Keep original version
      parsedEmail.html = sanitizeEmailHTML(parsedEmail.html);
    }
    if (parsedEmail.text) {
      parsedEmail.textAsHtml = textToHTML(parsedEmail.text);
    }

    // Per-recipient isolation: if one recipient fails after others succeeded,
    // re-throwing would make the sender retry the whole message and duplicate
    // the successes. Only re-throw when every recipient failed (clean retry).
    const failures = [];
    for (const toAddress of session.envelope.rcptTo) {
      try {
        await saveEmailToDB(parsedEmail, originalAttachments, toAddress.address.toLowerCase(), rawBuffer);
      } catch (err) {
        failures.push({ address: toAddress.address, err });
        console.error(`Failed to persist for ${toAddress.address}:`, err);
      }
    }
    if (failures.length > 0 && failures.length === session.envelope.rcptTo.length) {
      throw failures[0].err;
    }
  } catch (error) {
    console.error("Error parsing or saving email:", error);
    throw error;
  }
}

module.exports = {
  handleIncomingEmail,
};
