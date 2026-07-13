const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { connectMongoDB, closeMongoDB, getDB } = require("../../db");
const createApp = require("../../app");

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const config = require("../../config");
  config.mongoURL = mongoServer.getUri();
  await connectMongoDB();
  app = createApp();
});

afterAll(async () => {
  await closeMongoDB();
  await mongoServer.stop();
});

describe("Invite redemption", () => {
  beforeEach(async () => {
    const db = getDB();
    await db.collection("users").deleteMany({});
    await db.collection("invites").deleteMany({});
  });

  test("unique indexes exist on users.username and invites.code", async () => {
    const db = getDB();
    const userIndexes = await db.collection("users").indexes();
    const inviteIndexes = await db.collection("invites").indexes();

    expect(userIndexes.some((i) => i.key.username === 1 && i.unique)).toBe(true);
    expect(inviteIndexes.some((i) => i.key.code === 1 && i.unique)).toBe(true);
  });

  test("two concurrent signups cannot both consume the same invite", async () => {
    const db = getDB();
    await db.collection("invites").insertOne({ code: "RACE-CODE-1", role: "user", used: false, createdAt: new Date() });

    const [resA, resB] = await Promise.all([
      request(app).post("/api/auth/signup").send({ username: "raceuserA", password: "Password1", inviteCode: "RACE-CODE-1" }),
      request(app).post("/api/auth/signup").send({ username: "raceuserB", password: "Password1", inviteCode: "RACE-CODE-1" }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 400]);

    const winner = resA.status === 200 ? resA : resB;
    const loser = resA.status === 200 ? resB : resA;
    expect(winner.body.token).toBeDefined();
    expect(loser.body.message).toBe("Invalid or used invite code");

    // Exactly one user was created and the invite is spent exactly once
    expect(await db.collection("users").countDocuments({})).toBe(1);
    const invite = await db.collection("invites").findOne({ code: "RACE-CODE-1" });
    expect(invite.used).toBe(true);
    expect(invite.usedBy).toBeDefined();
  });

  test("duplicate username signup fails and rolls the invite back", async () => {
    const db = getDB();
    await db.collection("invites").insertMany([
      { code: "DUP-CODE-1", role: "user", used: false, createdAt: new Date() },
      { code: "DUP-CODE-2", role: "user", used: false, createdAt: new Date() },
    ]);

    // Two concurrent signups with the SAME username but different invites:
    // both pass the fast-path existence check, one insert hits the unique
    // index (11000), returns "User already exists" and rolls its invite back.
    const [resA, resB] = await Promise.all([
      request(app).post("/api/auth/signup").send({ username: "sameuser", password: "Password1", inviteCode: "DUP-CODE-1" }),
      request(app).post("/api/auth/signup").send({ username: "sameuser", password: "Password1", inviteCode: "DUP-CODE-2" }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 400]);

    const loser = resA.status === 200 ? resB : resA;
    expect(loser.body.message).toBe("User already exists");

    expect(await db.collection("users").countDocuments({ username: "sameuser" })).toBe(1);

    // Exactly one invite consumed; the loser's invite must be rolled back
    const invites = await db.collection("invites").find({}).toArray();
    const usedCount = invites.filter((i) => i.used).length;
    expect(usedCount).toBe(1);
  });
});
