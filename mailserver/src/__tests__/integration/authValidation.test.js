const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { connectMongoDB, closeMongoDB, getDB } = require("../../db");
const createApp = require("../../app");
const config = require("../../config");

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

const signup = (body) => request(app).post("/api/auth/signup").send(body);

// Validation short-circuits before the controller, so no invite is needed for
// the failure cases and none is consumed.
describe("signup validation policy", () => {
  test.each([
    ["too short", "Ab1", /at least 8 characters/i],
    ["no digit", "Passwordxx", /at least one number/i],
    ["no uppercase", "password12", /at least one uppercase/i],
  ])("password %s is rejected", async (_label, password, msgRe) => {
    const res = await signup({ username: "validuser1", password, inviteCode: "whatever" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(res.body.details.map((d) => d.msg).join(" ")).toMatch(msgRe);
  });

  // Single username case: signup shares loginLimit (5 req / 15 min / IP), so
  // this file must stay at <= 5 requests total.
  test("invalid username is rejected", async () => {
    const res = await signup({ username: "ab", password: "Password1", inviteCode: "whatever" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  test("valid signup with a valid invite succeeds", async () => {
    await getDB().collection("invites").insertOne({ code: "VALID-INVITE-1", role: "user", used: false, createdAt: new Date() });
    const res = await signup({ username: "validsignup1", password: "Password1", inviteCode: "VALID-INVITE-1" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});
