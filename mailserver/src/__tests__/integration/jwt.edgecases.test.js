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
let user;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  config.mongoURL = mongoServer.getUri();
  await connectMongoDB();
  app = createApp();

  const hashed = await bcrypt.hash("Password1", 10);
  const { insertedId } = await getDB().collection("users").insertOne({
    username: "jwtedgeuser",
    password: hashed,
    role: "user",
    allowedDomains: null,
    createdAt: new Date(),
  });
  user = { _id: insertedId, username: "jwtedgeuser", role: "user" };
});

afterAll(async () => {
  await closeMongoDB();
  await mongoServer.stop();
});

const hit = (token) => request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

describe("JWT edge cases", () => {
  test("expired token is rejected with 401", async () => {
    const token = jwt.sign({ id: user._id.toString(), role: "user" }, config.jwtSecret, { expiresIn: "-10s" });
    const res = await hit(token);
    expect(res.status).toBe(401);
  });

  test("tampered signature is rejected with 401", async () => {
    const token = jwt.sign({ id: user._id.toString(), role: "user" }, "some-other-secret", { expiresIn: "1h" });
    const res = await hit(token);
    expect(res.status).toBe(401);
  });

  test("alg=none token is rejected (HS256 pinned)", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ id: user._id.toString(), role: "admin" })).toString("base64url");
    const res = await hit(`${header}.${payload}.`);
    expect(res.status).toBe(401);
  });

  test("malformed token is rejected with 401", async () => {
    const res = await hit("not-a-jwt-at-all");
    expect(res.status).toBe(401);
  });

  test("valid token for a since-deleted user is rejected with 401", async () => {
    const hashed = await bcrypt.hash("Password1", 10);
    const { insertedId } = await getDB().collection("users").insertOne({
      username: "deleteduser",
      password: hashed,
      role: "user",
      createdAt: new Date(),
    });
    const token = jwt.sign({ id: insertedId.toString(), role: "user" }, config.jwtSecret, { expiresIn: "1h" });
    await getDB().collection("users").deleteOne({ _id: new ObjectId(insertedId) });

    const res = await hit(token);
    expect(res.status).toBe(401);
  });
});
