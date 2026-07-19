const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { connectMongoDB, closeMongoDB, getDB } = require("../../db");
const createApp = require("../../app");
const config = require("../../config");
const settingsService = require("../../services/settingsService");

let mongoServer;
let app;
let admin;
let adminToken;

const mintToken = (user) =>
  jwt.sign({ id: user._id.toString(), username: user.username, role: user.role }, config.jwtSecret, { expiresIn: "24h" });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  config.mongoURL = mongoServer.getUri();
  await connectMongoDB();
  app = createApp();

  const hashed = await bcrypt.hash("Password1", 10);
  const { insertedId } = await getDB().collection("users").insertOne({
    username: "settingsadmin",
    password: hashed,
    role: "admin",
    allowedDomains: null,
    createdAt: new Date(),
  });
  admin = { _id: insertedId, username: "settingsadmin", role: "admin" };
  adminToken = mintToken(admin);
});

afterAll(async () => {
  await closeMongoDB();
  await mongoServer.stop();
});

describe("Admin settings (email retention)", () => {
  beforeEach(async () => {
    await getDB().collection("settings").deleteMany({});
  });

  test("GET returns the env default when nothing is stored", async () => {
    const res = await request(app).get("/api/admin/settings").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ emailRetentionDays: config.emailRetentionDays, source: "env-default" });
  });

  test("PUT stores an override and GET reflects it", async () => {
    const put = await request(app).put("/api/admin/settings").set("Authorization", `Bearer ${adminToken}`).send({ emailRetentionDays: 90 });
    expect(put.status).toBe(200);

    const res = await request(app).get("/api/admin/settings").set("Authorization", `Bearer ${adminToken}`);
    expect(res.body).toEqual({ emailRetentionDays: 90, source: "db" });

    // The cron path resolves the same effective value
    expect(await settingsService.getEffectiveRetentionDays()).toBe(90);

    const log = await getDB().collection("audit_logs").findOne({ action: "UPDATE_SETTINGS" });
    expect(log.details.emailRetentionDays).toBe(90);
  });

  test.each([0, -5, 3651, 1.5, "abc", null])("PUT rejects invalid retention %p", async (bad) => {
    const res = await request(app).put("/api/admin/settings").set("Authorization", `Bearer ${adminToken}`).send({ emailRetentionDays: bad });
    expect(res.status).toBe(400);
  });

  test("getEffectiveRetentionDays falls back to env default", async () => {
    expect(await settingsService.getEffectiveRetentionDays()).toBe(config.emailRetentionDays);
  });
});

describe("GET /api/admin/stats", () => {
  test("returns the expected shape with seeded counts", async () => {
    const db = getDB();
    await db.collection("emails").deleteMany({});
    await db.collection("invites").deleteMany({});
    await db.collection("emails").insertMany([
      { emailId: "a@test.com", subject: "old", date: new Date(Date.now() - 3 * 86400000) },
      { emailId: "b@test.com", subject: "today", date: new Date() },
    ]);
    await db.collection("invites").insertMany([
      { code: "STATS-ACTIVE", role: "user", used: false, createdAt: new Date(), expiresAt: null },
      { code: "STATS-EXPIRED", role: "user", used: false, createdAt: new Date(), expiresAt: new Date(Date.now() - 1000) },
      { code: "STATS-USED", role: "user", used: true, createdAt: new Date() },
    ]);

    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBeGreaterThanOrEqual(1);
    expect(res.body.totalEmails).toBe(2);
    expect(res.body.emailsToday).toBe(1);
    expect(res.body.activeInvites).toBe(1);
    expect(res.body.usedInvites).toBe(1);
    expect(typeof res.body.attachmentStorageBytes).toBe("number");
    expect(typeof res.body.emailRetentionDays).toBe("number");
    expect(typeof res.body.disabledUsers).toBe("number");
  });
});

describe("DELETE /api/admin/logs confirmDeleteAll", () => {
  test("clears all logs when confirmDeleteAll:true is sent with null retention", async () => {
    const res = await request(app)
      .delete("/api/admin/logs")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ retentionDays: null, confirmDeleteAll: true });
    expect(res.status).toBe(200);
    expect(res.body.deletedCount).toBeGreaterThanOrEqual(0);
  });

  test("rejects null retention without the confirmation flag", async () => {
    const res = await request(app).delete("/api/admin/logs").set("Authorization", `Bearer ${adminToken}`).send({ retentionDays: null });
    expect(res.status).toBe(400);
  });
});
