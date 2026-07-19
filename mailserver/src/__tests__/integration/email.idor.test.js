const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { connectMongoDB, closeMongoDB, getDB } = require("../../db");
const createApp = require("../../app");
const config = require("../../config");

let mongoServer;
let app;
let scopedToken; // allowedDomains: ["a.com"]
let wildcardToken; // allowedDomains: "*"

const mintToken = (user) =>
  jwt.sign({ id: user._id.toString(), username: user.username, role: user.role }, config.jwtSecret, { expiresIn: "24h" });

const createUser = async ({ username, allowedDomains }) => {
  const hashed = await bcrypt.hash("Password1", 10);
  const { insertedId } = await getDB().collection("users").insertOne({
    username,
    password: hashed,
    role: "user",
    allowedDomains,
    createdAt: new Date(),
  });
  return { _id: insertedId, username, role: "user" };
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  config.mongoURL = mongoServer.getUri();
  await connectMongoDB();
  app = createApp();

  scopedToken = mintToken(await createUser({ username: "scopeduser", allowedDomains: ["a.com"] }));
  wildcardToken = mintToken(await createUser({ username: "wildcarduser", allowedDomains: "*" }));

  await getDB()
    .collection("emails")
    .insertOne({ emailId: "victim@b.com", subject: "secret", date: new Date(), readStatus: false });
});

afterAll(async () => {
  await closeMongoDB();
  await mongoServer.stop();
});

describe("inbox domain scoping (IDOR guard)", () => {
  test("user scoped to a.com cannot list an inbox on b.com", async () => {
    const res = await request(app).get("/api/emails-list/victim@b.com").set("Authorization", `Bearer ${scopedToken}`);
    expect(res.status).toBe(400); // validateEmailId rejects out-of-scope domains
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });

  test("user scoped to a.com cannot delete an inbox on b.com", async () => {
    const res = await request(app).delete("/api/emails/victim@b.com").set("Authorization", `Bearer ${scopedToken}`);
    expect(res.status).toBe(400);
    const stillThere = await getDB().collection("emails").findOne({ emailId: "victim@b.com" });
    expect(stillThere).toBeTruthy();
  });

  test("user scoped to a.com CAN list an inbox on a.com", async () => {
    const res = await request(app).get("/api/emails-list/anyone@a.com").set("Authorization", `Bearer ${scopedToken}`);
    expect(res.status).toBe(200);
  });

  test("wildcard user reaches any domain", async () => {
    const res = await request(app).get("/api/emails-list/victim@b.com").set("Authorization", `Bearer ${wildcardToken}`);
    expect(res.status).toBe(200);
  });

  test("empty allowedDomains array denies everything", async () => {
    const emptyToken = mintToken(await createUser({ username: "emptydomains", allowedDomains: [] }));
    const res = await request(app).get("/api/emails-list/anyone@a.com").set("Authorization", `Bearer ${emptyToken}`);
    expect(res.status).toBe(400);
  });
});
