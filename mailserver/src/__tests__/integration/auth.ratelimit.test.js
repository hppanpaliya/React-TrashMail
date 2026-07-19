const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { connectMongoDB, closeMongoDB } = require("../../db");
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

// Isolated file: loginLimit (5 / 15 min / IP) is process-global, so exhausting
// it here cannot bleed into other suites (Jest workers are separate processes).
describe("login rate limiting", () => {
  test("6th login attempt within the window is rejected with 429", async () => {
    const attempt = () => request(app).post("/api/auth/login").send({ username: "nobody", password: "WrongPass1" });

    for (let i = 0; i < 5; i++) {
      const res = await attempt();
      expect(res.status).not.toBe(429);
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(JSON.stringify(blocked.body)).toMatch(/too many login/i);
    expect(blocked.headers["ratelimit-limit"] || blocked.headers["ratelimit-policy"]).toBeDefined();
  });
});
