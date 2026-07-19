const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { connectMongoDB, closeMongoDB, getDB } = require("../../db");
const createApp = require("../../app");
const config = require("../../config");

let mongoServer;
let app;
let adminToken;
let userToken;
let guestToken;

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

  adminToken = mintToken(await createUser({ username: "adminroleuser", role: "admin" }));
  userToken = mintToken(await createUser({ username: "plainroleuser", role: "user" }));
  guestToken = mintToken(await createUser({ username: "guestroleuser", role: "guest" }));
});

afterAll(async () => {
  await closeMongoDB();
  await mongoServer.stop();
});

const ADMIN_ROUTES = ["/api/all-emails", "/api/auth/users", "/api/auth/admin"];

describe("checkRole authorization", () => {
  test.each(ADMIN_ROUTES)("non-admin gets 403 on %s", async (route) => {
    const res = await request(app).get(route).set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Forbidden: Insufficient permissions");
  });

  test.each(ADMIN_ROUTES)("admin gets 200 on %s (positive control)", async (route) => {
    const res = await request(app).get(route).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test("no token gets 401 before the role check", async () => {
    const res = await request(app).get("/api/all-emails");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("No token, authorization denied");
  });

  test("unknown role is denied", async () => {
    const res = await request(app).get("/api/all-emails").set("Authorization", `Bearer ${guestToken}`);
    expect(res.status).toBe(403);
  });
});
