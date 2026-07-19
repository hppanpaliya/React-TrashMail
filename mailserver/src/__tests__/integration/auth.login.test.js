const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { connectMongoDB, closeMongoDB, getDB } = require("../../db");
const createApp = require("../../app");
const config = require("../../config");

let mongoServer;
let app;

// NOTE: loginLimit is 5 requests / 15 min / IP and its state is per-process.
// This file makes at most 5 login requests total; the 429 path is covered in
// auth.ratelimit.test.js (separate Jest worker => fresh limiter).
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  config.mongoURL = mongoServer.getUri();
  await connectMongoDB();
  app = createApp();

  const hashed = await bcrypt.hash("Password1", 10);
  await getDB().collection("users").insertOne({
    username: "loginuser",
    password: hashed,
    role: "user",
    allowedDomains: null,
    createdAt: new Date(),
  });
});

afterAll(async () => {
  await closeMongoDB();
  await mongoServer.stop();
});

describe("POST /api/auth/login", () => {
  test("valid credentials return 200 and a verifiable token", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "loginuser", password: "Password1" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const decoded = jwt.verify(res.body.token, config.jwtSecret, { algorithms: ["HS256"] });
    expect(decoded.user.username).toBe("loginuser");
    expect(decoded.user.role).toBe("user");
  });

  test("wrong password returns the generic 400 and audits the failure", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "loginuser", password: "WrongPass1" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid Credentials");
    const log = await getDB().collection("audit_logs").findOne({ action: "LOGIN_FAILED", "details.reason": "Invalid password" });
    expect(log).toBeTruthy();
  });

  test("nonexistent user returns the SAME generic 400 (no enumeration)", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "ghostuser", password: "Password1" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid Credentials");
    const log = await getDB().collection("audit_logs").findOne({ action: "LOGIN_FAILED", "details.reason": "User not found" });
    expect(log).toBeTruthy();
    expect(log.userId).toBeNull();
  });

  test("missing fields fail validation with 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "loginuser" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });
});
