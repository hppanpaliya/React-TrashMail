const { MongoMemoryServer } = require("mongodb-memory-server");
const { connectMongoDB, closeMongoDB, getDB } = require("../../db");
const config = require("../../config");
const { setupCronJobs } = require("../../services/cronService");
const { getOldEmails, deleteEmailAndAttachments } = require("../../controllers/emailController");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  config.mongoURL = mongoServer.getUri();
  await connectMongoDB();
});

afterAll(async () => {
  await closeMongoDB();
  await mongoServer.stop();
});

describe("Cron Job", () => {
  test("should delete old emails", async () => {
    const db = getDB();
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - (config.emailRetentionDays + 1));

    await db.collection("test@example.com").insertMany([
      { from: { text: "sender@example.com" }, subject: "Old Email", date: oldDate },
      { from: { text: "sender@example.com" }, subject: "New Email", date: new Date() },
    ]);

    const oldEmails = await getOldEmails(config.emailRetentionDays);
    expect(oldEmails.length).toBe(1);

    for (const email of oldEmails) {
      await deleteEmailAndAttachments(email.emailID, email.emailId.toHexString());
    }

    const remainingEmails = await db.collection("test@example.com").find({}).toArray();
    expect(remainingEmails.length).toBe(1);
    expect(remainingEmails[0].subject).toBe("New Email");
  });
});
