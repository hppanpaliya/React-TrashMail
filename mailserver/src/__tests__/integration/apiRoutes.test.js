const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { connectMongoDB, closeMongoDB, getDB } = require("../../db");
const createApp = require("../../app");
const config = require("../../config");
const { ObjectId } = require("mongodb");
const path = require("path");
const fs = require("fs");
const { Readable } = require("stream");
const { handleIncomingEmail } = require("../../services/emailService");

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  config.mongoURL = mongoServer.getUri();
  await connectMongoDB();
  app = createApp();
});

afterAll(async () => {
  await closeMongoDB();
  await mongoServer.stop();
});

describe("API Routes", () => {
  beforeEach(async () => {
    const db = getDB();
    await db.collection("test@example.com").deleteMany({});
    await db.collection("other@example.com").deleteMany({});
  });

  const insertEmails = async (db, emails, collection) => {
    await db.collection(collection).insertMany(emails);
  };

  const sendTestEmail = async (testEmail) => {
    const emailStream = new Readable();
    emailStream.push(
      Buffer.from(
        Object.entries(testEmail)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\r\n")
      )
    );
    emailStream.push(null);

    const session = {
      envelope: {
        rcptTo: [{ address: testEmail.to }],
      },
    };

    await handleIncomingEmail(emailStream, session);
    const db = getDB();
    return db.collection(testEmail.to).findOne({ subject: testEmail.subject });
  };

  test("GET /api/all-emails should return emails for all users", async () => {
    const db = getDB();
    await insertEmails(db, [{ from: { text: "sender@example.com" }, subject: "Test Email 1", date: new Date() }], "test@example.com");
    await insertEmails(db, [{ from: { text: "sender@example.com" }, subject: "Test Email 2", date: new Date() }], "other@example.com");

    const response = await request(app).get("/api/all-emails");

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
  });

  test("GET /api/emails-list/:emailId should return emails for a specific user", async () => {
    const db = getDB();
    const emails = [
      { subject: "Test Email 1", from: { text: "SendTestEmail <noreply@sendtestemail.com>" }, date: new Date(), readStatus: false },
      { subject: "Test Email 2", from: { text: "SendTestEmail <noreply@sendtestemail.com>" }, date: new Date(), readStatus: true },
    ];
    await insertEmails(db, emails, "harshal@myserver.pw");

    const response = await request(app).get("/api/emails-list/harshal@myserver.pw");

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
    expect(response.body[0].subject).toBe("Test Email 1");
    expect(response.body[1].subject).toBe("Test Email 2");
  });

  test("GET /api/email/:emailID/:email_id should return a specific email and update readStatus", async () => {
    const testEmail = {
      from: "SendTestEmail <noreply@sendtestemail.com>",
      to: "harshal@myserver.pw",
      subject: "Test Email",
      text: "This is a test email.",
    };

    const savedEmail = await sendTestEmail(testEmail);

    let response = await request(app).get(`/api/email/${testEmail.to}/${savedEmail._id.toString()}`);
    response = await request(app).get(`/api/email/${testEmail.to}/${savedEmail._id.toString()}`);

    expect(response.status).toBe(200);
    expect(response.body[0].subject).toBe("Test Email");
    expect(response.body[0].readStatus).toBe(true);

    const db = getDB();
    const updatedEmail = await db.collection(testEmail.to).findOne({ _id: savedEmail._id });
    expect(updatedEmail.readStatus).toBe(true);

    await db.collection(testEmail.to).deleteOne({ _id: savedEmail._id });
  });

  test("DELETE /api/email/:emailID/:email_id should delete an email", async () => {
    const db = getDB();
    const insertResult = await db.collection("harshal@myserver.pw").insertOne({
      subject: "Test Email",
      from: { text: "SendTestEmail <noreply@sendtestemail.com>" },
      date: new Date(),
    });

    const response = await request(app).delete(`/api/email/harshal@myserver.pw/${insertResult.insertedId.toString()}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Email deleted successfully");

    const deletedEmail = await db.collection("harshal@myserver.pw").findOne({ _id: insertResult.insertedId });
    expect(deletedEmail).toBeNull();
  });

  test("GET /api/attachment/:directory/:filename should serve attachment files", async () => {
    const testEmail = {
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Test Email with Attachment",
      text: "This is a test email with an attachment.",
      attachments: [
        {
          filename: "test.txt",
          content: "This is a test attachment content.",
        },
      ],
    };

    const emailStream = new Readable();
    emailStream.push(
      `From: ${testEmail.from}\r\n` +
        `To: ${testEmail.to}\r\n` +
        `Subject: ${testEmail.subject}\r\n` +
        `Content-Type: multipart/mixed; boundary="boundary"\r\n\r\n` +
        `--boundary\r\n` +
        `Content-Type: text/plain\r\n\r\n` +
        `${testEmail.text}\r\n\r\n` +
        `--boundary\r\n` +
        `Content-Type: text/plain; name=${testEmail.attachments[0].filename}\r\n` +
        `Content-Disposition: attachment; filename=${testEmail.attachments[0].filename}\r\n` +
        `Content-Transfer-Encoding: base64\r\n\r\n` +
        `${Buffer.from(testEmail.attachments[0].content).toString("base64")}\r\n\r\n` +
        `--boundary--\r\n`
    );
    emailStream.push(null);

    const session = {
      envelope: {
        rcptTo: [{ address: testEmail.to }],
      },
    };

    await handleIncomingEmail(emailStream, session);

    const db = getDB();
    const savedEmail = await db.collection(testEmail.to).findOne({ subject: testEmail.subject });

    expect(savedEmail).toBeTruthy();
    expect(savedEmail.attachments.length).toBe(1);
    const [attachment] = savedEmail.attachments;

    const response = await request(app).get(`/api/attachment/${attachment.directory}/${attachment.filename}`);

    expect(response.status).toBe(200);
    expect(response.text).toBe("This is a test attachment content.");

    await db.collection(testEmail.to).deleteOne({ _id: savedEmail._id });
    const attachmentPath = path.join(__dirname, "../../attachments", attachment.directory, attachment.filename);
    if (fs.existsSync(attachmentPath)) {
      fs.unlinkSync(attachmentPath);
      fs.rmdirSync(path.dirname(attachmentPath));
    }
  });
});
