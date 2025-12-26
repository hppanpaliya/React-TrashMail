const { MongoMemoryServer } = require("mongodb-memory-server");
const { connectMongoDB, closeMongoDB, getDB } = require("../../db");
const { startSMTPServer } = require("../../services/smtpService");
const nodemailer = require("nodemailer");
const config = require("../../config");

let mongoServer;
let smtpServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  config.mongoURL = mongoServer.getUri();
  await connectMongoDB();
  smtpServer = await startSMTPServer();
});

afterAll(async () => {
  await closeMongoDB();
  await mongoServer.stop();
  await new Promise((resolve) => smtpServer.close(resolve));
});

describe("Email Receiving and Storage", () => {
  test("should receive email and store in DB", async () => {
    const transporter = nodemailer.createTransport({
      host: "localhost",
      port: config.smtpPort,
      secure: false,
      tls: { rejectUnauthorized: false },
    });

    const info = await transporter.sendMail({
      from: "SendTestEmail <noreply@sendtestemail.com>",
      to: "harshal@myserver.pw",
      subject: "SendTestEmail.com - Testing Email ID: test123",
      text: "If you are reading this your email address is working.",
      html: "<html>Congratulations!<br><br>If you are reading this your email address is working.</html>",
    });

    // Wait for email processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const db = getDB();
    const emails = await db.collection("emails").find({ emailId: "harshal@myserver.pw" }).toArray();

    expect(emails.length).toBe(1);
    expect(emails[0].subject).toBe("SendTestEmail.com - Testing Email ID: test123");
    expect(emails[0].text).toContain("If you are reading this your email address is working.");
    expect(emails[0].html).toContain("Congratulations!");
    expect(emails[0].from.text).toBe('"SendTestEmail" <noreply@sendtestemail.com>');
    expect(emails[0].to.text).toBe("harshal@myserver.pw");
    expect(emails[0].readStatus).toBe(false);
    expect(emails[0].createdAt).toBeDefined();
  });
});
