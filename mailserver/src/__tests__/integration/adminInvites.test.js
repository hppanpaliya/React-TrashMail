const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { connectMongoDB, closeMongoDB, getDB } = require("../../db");
const createApp = require("../../app");
const config = require("../../config");

let mongoServer;
let app;
let adminToken;
let adminId;
let userToken;

const mintToken = (user) =>
  jwt.sign({ id: user._id.toString(), username: user.username, role: user.role }, config.jwtSecret, { expiresIn: "24h" });

const createUser = async ({ username, role }) => {
  const hashed = await bcrypt.hash("Password1", 10);
  const { insertedId } = await getDB().collection("users").insertOne({
    username,
    password: hashed,
    role,
    allowedDomains: null,
    createdAt: new Date(),
  });
  return { _id: insertedId, username, role };
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  config.mongoURL = mongoServer.getUri();
  await connectMongoDB();
  app = createApp();

  const admin = await createUser({ username: "inviteadmin", role: "admin" });
  adminId = admin._id;
  adminToken = mintToken(admin);
  userToken = mintToken(await createUser({ username: "inviteplain", role: "user" }));
});

afterAll(async () => {
  await closeMongoDB();
  await mongoServer.stop();
});

beforeEach(async () => {
  await getDB().collection("invites").deleteMany({});
});

describe("POST /api/admin/invites (expiry)", () => {
  test("creates an invite with expiresAt when expiresInDays is given", async () => {
    const res = await request(app).post("/api/admin/invites").set("Authorization", `Bearer ${adminToken}`).send({ role: "user", expiresInDays: 7 });

    expect(res.status).toBe(200);
    expect(res.body.code).toMatch(/^WELCOME-TRASHMAIL-/);
    expect(res.body.expiresAt).toBeDefined();

    const invite = await getDB().collection("invites").findOne({ code: res.body.code });
    expect(invite.expiresAt).toBeInstanceOf(Date);
    const daysOut = (invite.expiresAt - Date.now()) / 86400000;
    expect(daysOut).toBeGreaterThan(6.9);
    expect(daysOut).toBeLessThan(7.1);
  });

  test("creates a never-expiring invite when expiresInDays is omitted", async () => {
    const res = await request(app).post("/api/admin/invites").set("Authorization", `Bearer ${adminToken}`).send({ role: "user" });
    expect(res.status).toBe(200);
    expect(res.body.expiresAt).toBeNull();
  });

  test.each([0, -1, 366, 1.5, "abc"])("rejects invalid expiresInDays %p", async (bad) => {
    const res = await request(app).post("/api/admin/invites").set("Authorization", `Bearer ${adminToken}`).send({ role: "user", expiresInDays: bad });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/invites", () => {
  test("lists invites with status filter and username enrichment", async () => {
    const db = getDB();
    const now = Date.now();
    await db.collection("invites").insertMany([
      { code: "LIST-ACTIVE", role: "user", used: false, createdAt: new Date(), createdBy: adminId, expiresAt: null },
      { code: "LIST-EXPIRED", role: "user", used: false, createdAt: new Date(), createdBy: adminId, expiresAt: new Date(now - 1000) },
      { code: "LIST-USED", role: "admin", used: true, createdAt: new Date(), createdBy: adminId, usedBy: adminId, expiresAt: null },
    ]);

    const all = await request(app).get("/api/admin/invites").set("Authorization", `Bearer ${adminToken}`);
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(3);
    const active = all.body.invites.find((i) => i.code === "LIST-ACTIVE");
    expect(active.createdByUsername).toBe("inviteadmin");
    expect(active.expired).toBe(false);
    const expired = all.body.invites.find((i) => i.code === "LIST-EXPIRED");
    expect(expired.expired).toBe(true);
    const used = all.body.invites.find((i) => i.code === "LIST-USED");
    expect(used.usedByUsername).toBe("inviteadmin");

    const unused = await request(app).get("/api/admin/invites?status=unused").set("Authorization", `Bearer ${adminToken}`);
    expect(unused.body.invites.map((i) => i.code)).toEqual(["LIST-ACTIVE"]);

    const expiredOnly = await request(app).get("/api/admin/invites?status=expired").set("Authorization", `Bearer ${adminToken}`);
    expect(expiredOnly.body.invites.map((i) => i.code)).toEqual(["LIST-EXPIRED"]);

    const usedOnly = await request(app).get("/api/admin/invites?status=used").set("Authorization", `Bearer ${adminToken}`);
    expect(usedOnly.body.invites.map((i) => i.code)).toEqual(["LIST-USED"]);
  });

  test("non-admin gets 403", async () => {
    const res = await request(app).get("/api/admin/invites").set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/invites/:id", () => {
  test("revokes an unused invite", async () => {
    const db = getDB();
    const { insertedId } = await db.collection("invites").insertOne({ code: "REVOKE-ME", role: "user", used: false, createdAt: new Date() });

    const res = await request(app).delete(`/api/admin/invites/${insertedId}`).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(await db.collection("invites").findOne({ _id: insertedId })).toBeNull();
  });

  test("refuses to revoke a used invite", async () => {
    const db = getDB();
    const { insertedId } = await db.collection("invites").insertOne({ code: "USED-KEEP", role: "user", used: true, createdAt: new Date() });

    const res = await request(app).delete(`/api/admin/invites/${insertedId}`).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cannot revoke a used invite");
    expect(await db.collection("invites").findOne({ _id: insertedId })).not.toBeNull();
  });

  test("404 on missing invite, 400 on malformed id", async () => {
    const missing = await request(app).delete(`/api/admin/invites/${new ObjectId()}`).set("Authorization", `Bearer ${adminToken}`);
    expect(missing.status).toBe(404);

    const malformed = await request(app).delete("/api/admin/invites/not-an-id").set("Authorization", `Bearer ${adminToken}`);
    expect(malformed.status).toBe(400);
  });
});

describe("Signup with invite expiry", () => {
  test("expired invite is rejected like an invalid one", async () => {
    await getDB().collection("invites").insertOne({
      code: "EXPIRED-SIGNUP",
      role: "user",
      used: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app).post("/api/auth/signup").send({ username: "expireduser", password: "Password1", inviteCode: "EXPIRED-SIGNUP" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid or used invite code");
  });

  test("unexpired invite still works", async () => {
    await getDB().collection("invites").insertOne({
      code: "FUTURE-SIGNUP",
      role: "user",
      used: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    });

    const res = await request(app).post("/api/auth/signup").send({ username: "futureuser", password: "Password1", inviteCode: "FUTURE-SIGNUP" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test("legacy invite without expiresAt field still works", async () => {
    await getDB().collection("invites").insertOne({ code: "LEGACY-SIGNUP", role: "user", used: false, createdAt: new Date() });

    const res = await request(app).post("/api/auth/signup").send({ username: "legacyuser", password: "Password1", inviteCode: "LEGACY-SIGNUP" });
    expect(res.status).toBe(200);
  });
});
