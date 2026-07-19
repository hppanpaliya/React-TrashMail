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
let admin;
let adminToken;

const mintToken = (user) =>
  jwt.sign({ id: user._id.toString(), username: user.username, role: user.role }, config.jwtSecret, { expiresIn: "24h" });

const createUser = async ({ username, role, disabled }) => {
  const hashed = await bcrypt.hash("Password1", 10);
  const doc = { username, password: hashed, role, allowedDomains: null, createdAt: new Date() };
  if (disabled !== undefined) doc.disabled = disabled;
  const { insertedId } = await getDB().collection("users").insertOne(doc);
  return { _id: insertedId, username, role };
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  config.mongoURL = mongoServer.getUri();
  await connectMongoDB();
  app = createApp();

  admin = await createUser({ username: "mgmtadmin", role: "admin" });
  adminToken = mintToken(admin);
});

afterAll(async () => {
  await closeMongoDB();
  await mongoServer.stop();
});

beforeEach(async () => {
  await getDB()
    .collection("users")
    .deleteMany({ username: { $ne: "mgmtadmin" } });
});

describe("PUT /api/admin/users/:userId/status", () => {
  test("disables a user; login is blocked and existing tokens are rejected", async () => {
    const target = await createUser({ username: "todisable", role: "user" });
    const targetToken = mintToken(target);

    const res = await request(app)
      .put(`/api/admin/users/${target._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ disabled: true });
    expect(res.status).toBe(200);

    // Login rejected
    const login = await request(app).post("/api/auth/login").send({ username: "todisable", password: "Password1" });
    expect(login.status).toBe(403);
    expect(login.body.message).toBe("Account disabled");

    // Existing valid JWT also rejected by authMiddleware
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${targetToken}`);
    expect(me.status).toBe(403);
    expect(me.body.message).toBe("Account disabled");

    // Re-enable restores access
    await request(app).put(`/api/admin/users/${target._id}/status`).set("Authorization", `Bearer ${adminToken}`).send({ disabled: false });
    const loginAgain = await request(app).post("/api/auth/login").send({ username: "todisable", password: "Password1" });
    expect(loginAgain.status).toBe(200);
  });

  test("cannot disable yourself", async () => {
    const res = await request(app)
      .put(`/api/admin/users/${admin._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ disabled: true });
    expect(res.status).toBe(400);
  });

  test("validates body and target", async () => {
    const target = await createUser({ username: "statusval", role: "user" });
    const badBody = await request(app)
      .put(`/api/admin/users/${target._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ disabled: "yes" });
    expect(badBody.status).toBe(400);

    const missing = await request(app)
      .put(`/api/admin/users/${new ObjectId()}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ disabled: true });
    expect(missing.status).toBe(404);
  });
});

describe("PUT /api/admin/users/:userId/role", () => {
  test("changes a user's role and writes an audit log", async () => {
    const target = await createUser({ username: "topromote", role: "user" });

    const res = await request(app).put(`/api/admin/users/${target._id}/role`).set("Authorization", `Bearer ${adminToken}`).send({ role: "admin" });
    expect(res.status).toBe(200);

    const updated = await getDB().collection("users").findOne({ _id: target._id });
    expect(updated.role).toBe("admin");

    const log = await getDB().collection("audit_logs").findOne({ action: "UPDATE_USER_ROLE", "details.targetUserId": String(target._id) });
    expect(log).not.toBeNull();
  });

  test("cannot change your own role", async () => {
    const res = await request(app).put(`/api/admin/users/${admin._id}/role`).set("Authorization", `Bearer ${adminToken}`).send({ role: "user" });
    expect(res.status).toBe(400);
  });

  test("rejects unknown roles", async () => {
    const target = await createUser({ username: "badrole", role: "user" });
    const res = await request(app)
      .put(`/api/admin/users/${target._id}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "superadmin" });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/admin/users/:userId", () => {
  test("deletes a user and keeps audit history", async () => {
    const target = await createUser({ username: "todelete", role: "user" });

    const res = await request(app).delete(`/api/admin/users/${target._id}`).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(await getDB().collection("users").findOne({ _id: target._id })).toBeNull();

    const log = await getDB().collection("audit_logs").findOne({ action: "DELETE_USER", "details.username": "todelete" });
    expect(log).not.toBeNull();
  });

  test("cannot delete yourself", async () => {
    const res = await request(app).delete(`/api/admin/users/${admin._id}`).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(await getDB().collection("users").findOne({ _id: admin._id })).not.toBeNull();
  });

  test("404 on missing user", async () => {
    const res = await request(app).delete(`/api/admin/users/${new ObjectId()}`).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
