const http = require("http");
const crypto = require("crypto");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { Readable } = require("stream");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { connectMongoDB, closeMongoDB, getDB } = require("../../db");
const createApp = require("../../app");
const config = require("../../config");
const { handleIncomingEmail } = require("../../services/emailService");

let mongoServer;
let app;
let authToken;

// Local HTTP server that captures webhook deliveries.
let receiver;
let receiverPort;
let received = [];

const INBOX = "webhook-user@myserver.pw";
const SECRET = "integration-secret";

const receiverUrl = (path = "/hook") => `http://127.0.0.1:${receiverPort}${path}`;

const waitFor = async (predicate, timeoutMs = 5000, intervalMs = 25) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Timed out waiting for condition");
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  config.mongoURL = mongoServer.getUri();
  // The receiver listens on 127.0.0.1; allow private destinations in tests
  // (individual tests flip this off to exercise the SSRF rejection path).
  config.webhookAllowPrivate = true;
  await connectMongoDB();
  app = createApp();

  // Test user allowed to manage the myserver.pw domain
  const db = getDB();
  const hashedPassword = await bcrypt.hash("testpassword", 10);
  const result = await db.collection("users").insertOne({
    username: "webhooktester",
    password: hashedPassword,
    role: "user",
    allowedDomains: ["myserver.pw"],
    createdAt: new Date(),
  });
  authToken = jwt.sign({ id: result.insertedId.toString(), username: "webhooktester", role: "user" }, config.jwtSecret, { expiresIn: "1h" });

  // Local webhook receiver: 200 on /hook, 500 on /fail
  receiver = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      received.push({ url: req.url, headers: req.headers, body });
      if (req.url === "/fail") {
        res.writeHead(500);
        res.end("nope");
      } else {
        res.writeHead(200);
        res.end("ok");
      }
    });
  });
  await new Promise((resolve) => receiver.listen(0, "127.0.0.1", resolve));
  receiverPort = receiver.address().port;
});

afterAll(async () => {
  await new Promise((resolve) => receiver.close(resolve));
  await closeMongoDB();
  await mongoServer.stop();
});

beforeEach(async () => {
  received = [];
  config.webhookAllowPrivate = true;
  const db = getDB();
  await db.collection("webhooks").deleteMany({});
  await db.collection("emails").deleteMany({});
});

const api = () => request(app);
const auth = (req) => req.set("Authorization", `Bearer ${authToken}`);

describe("Webhook CRUD endpoints", () => {
  test("requires authentication", async () => {
    const response = await api().get(`/api/webhooks/${INBOX}`);
    expect(response.status).toBe(401);
  });

  test("GET returns 404 when no webhook is configured", async () => {
    const response = await auth(api().get(`/api/webhooks/${INBOX}`));
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("No webhook configured");
  });

  test("PUT creates a webhook and never returns the secret", async () => {
    const response = await auth(api().put(`/api/webhooks/${INBOX}`)).send({
      url: receiverUrl("/hook?a=1&b=2"),
      secret: SECRET,
      enabled: true,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      url: receiverUrl("/hook?a=1&b=2"), // URL preserved exactly (incl. & in query)
      enabled: true,
      hasSecret: true,
      lastStatus: null,
      lastError: null,
      lastDeliveredAt: null,
    });
    expect(JSON.stringify(response.body)).not.toContain(SECRET);

    const getResponse = await auth(api().get(`/api/webhooks/${INBOX}`));
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.url).toBe(receiverUrl("/hook?a=1&b=2"));
    expect(getResponse.body.secret).toBeUndefined();
  });

  test("PUT with omitted secret keeps the existing one; empty string clears it", async () => {
    await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: receiverUrl(), secret: SECRET });

    // Omitted secret -> unchanged
    let response = await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: receiverUrl("/other") });
    expect(response.status).toBe(200);
    expect(response.body.hasSecret).toBe(true);
    expect(response.body.url).toBe(receiverUrl("/other"));

    // Empty string -> cleared
    response = await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: receiverUrl(), secret: "" });
    expect(response.status).toBe(200);
    expect(response.body.hasSecret).toBe(false);
  });

  test("PUT validates the URL", async () => {
    let response = await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: "ftp://example.com/x" });
    expect(response.status).toBe(400);

    response = await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: "not a url" });
    expect(response.status).toBe(400);

    response = await auth(api().put(`/api/webhooks/${INBOX}`)).send({});
    expect(response.status).toBe(400);
  });

  test("PUT rejects private/loopback URLs unless WEBHOOK_ALLOW_PRIVATE is set", async () => {
    config.webhookAllowPrivate = false;
    const response = await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: receiverUrl() });
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.details)).toMatch(/private, loopback or link-local/);

    config.webhookAllowPrivate = true;
    const allowed = await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: receiverUrl() });
    expect(allowed.status).toBe(200);
  });

  test("rejects emailIds outside the user's allowed domains", async () => {
    const response = await auth(api().get("/api/webhooks/someone@forbidden-domain.com"));
    expect(response.status).toBe(400);
  });

  test("DELETE removes the webhook; deleting again returns 404", async () => {
    await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: receiverUrl() });

    let response = await auth(api().delete(`/api/webhooks/${INBOX}`));
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Webhook deleted successfully");

    response = await auth(api().delete(`/api/webhooks/${INBOX}`));
    expect(response.status).toBe(404);

    response = await auth(api().get(`/api/webhooks/${INBOX}`));
    expect(response.status).toBe(404);
  });

  test("configure/delete/test actions are audit-logged", async () => {
    await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: receiverUrl() });
    await auth(api().post(`/api/webhooks/${INBOX}/test`));
    await auth(api().delete(`/api/webhooks/${INBOX}`));

    const db = getDB();
    const actions = (await db.collection("audit_logs").find({ "details.emailId": INBOX }).toArray()).map((l) => l.action);
    expect(actions).toEqual(expect.arrayContaining(["WEBHOOK_CONFIGURED", "WEBHOOK_TEST", "WEBHOOK_DELETED"]));
  });
});

describe("POST /api/webhooks/:emailId/test", () => {
  test("returns 404 when no webhook is configured", async () => {
    const response = await auth(api().post(`/api/webhooks/${INBOX}/test`));
    expect(response.status).toBe(404);
  });

  test("fires a signed test payload and reports success", async () => {
    await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: receiverUrl(), secret: SECRET });

    const response = await auth(api().post(`/api/webhooks/${INBOX}/test`));
    expect(response.status).toBe(200);
    // The upstream HTTP status is deliberately NOT echoed (SSRF status oracle).
    expect(response.body).toEqual({ ok: true });

    expect(received.length).toBe(1);
    const delivery = received[0];
    expect(delivery.headers["content-type"]).toBe("application/json");
    expect(delivery.headers["user-agent"]).toBe("TrashMail-Webhook");
    expect(delivery.headers["x-trashmail-event"]).toBe("webhook.test");

    // Verify the HMAC signature against the raw body, as a consumer would
    const expected = crypto.createHmac("sha256", SECRET).update(delivery.body).digest("hex");
    expect(delivery.headers["x-trashmail-signature"]).toBe(`sha256=${expected}`);

    const payload = JSON.parse(delivery.body);
    expect(payload.event).toBe("webhook.test");
    expect(payload.to).toBe(INBOX);

    // Outcome recorded on the webhook
    const status = await auth(api().get(`/api/webhooks/${INBOX}`));
    expect(status.body.lastStatus).toBe("success");
    expect(status.body.lastError).toBeNull();
    expect(status.body.lastDeliveredAt).not.toBeNull();
  });

  test("reports failure (no retries) when the endpoint errors", async () => {
    await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: receiverUrl("/fail") });

    const response = await auth(api().post(`/api/webhooks/${INBOX}/test`));
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(false);
    // Generic message only - the real status/error must never reach the caller
    // (it would turn the endpoint into a port-scan/status oracle).
    expect(response.body.error).toBe("Webhook test delivery failed");
    expect(response.body.error).not.toMatch(/HTTP|refused|timed out|private/i);
    expect(received.length).toBe(1); // exactly one attempt - no retries for test fires

    const status = await auth(api().get(`/api/webhooks/${INBOX}`));
    expect(status.body.lastStatus).toBe("failed");
    expect(status.body.lastError).toMatch(/HTTP 500/);
  });
});

describe("Incoming email triggers webhook delivery", () => {
  const deliverEmail = async (to, subject, text) => {
    const emailStream = new Readable();
    emailStream.push(
      Buffer.from(`From: Sender <sender@example.com>\r\nTo: ${to}\r\nSubject: ${subject}\r\nDate: Mon, 06 Jul 2026 10:00:00 +0000\r\n\r\n${text}`)
    );
    emailStream.push(null);
    await handleIncomingEmail(emailStream, { envelope: { rcptTo: [{ address: to }] } });
  };

  test("delivers a signed email.received payload to the configured webhook", async () => {
    await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: receiverUrl(), secret: SECRET, enabled: true });

    await deliverEmail(INBOX, "Webhook me", "Hello from SMTP");

    const delivery = await waitFor(() => received[0]);
    expect(delivery.headers["x-trashmail-event"]).toBe("email.received");

    const expected = crypto.createHmac("sha256", SECRET).update(delivery.body).digest("hex");
    expect(delivery.headers["x-trashmail-signature"]).toBe(`sha256=${expected}`);

    const payload = JSON.parse(delivery.body);
    expect(payload).toMatchObject({
      event: "email.received",
      to: INBOX,
      subject: "Webhook me",
    });
    expect(payload.from).toContain("sender@example.com");
    expect(payload.text).toContain("Hello from SMTP");
    expect(payload.attachments).toEqual([]);
    expect(payload.date).toBeTruthy();

    // Email ingestion itself must be unaffected
    const db = getDB();
    const stored = await db.collection("emails").findOne({ emailId: INBOX, subject: "Webhook me" });
    expect(stored).toBeTruthy();

    // Delivery outcome recorded
    await waitFor(async () => {
      const webhook = await db.collection("webhooks").findOne({ emailId: INBOX });
      return webhook.lastStatus === "success";
    });
  });

  test("does not deliver when the webhook is disabled", async () => {
    await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: receiverUrl(), enabled: false });

    await deliverEmail(INBOX, "No webhook", "Should not be delivered");
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(received.length).toBe(0);
    // Email is still stored normally
    const stored = await getDB().collection("emails").findOne({ emailId: INBOX, subject: "No webhook" });
    expect(stored).toBeTruthy();
  });

  test("does not deliver for inboxes without a webhook", async () => {
    await deliverEmail("other@myserver.pw", "No config", "Nothing configured");
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(received.length).toBe(0);
  });

  test("email ingestion succeeds even when webhook delivery cannot start", async () => {
    // Unreachable port (and allowPrivate on, so it gets as far as fetch)
    await auth(api().put(`/api/webhooks/${INBOX}`)).send({ url: "http://127.0.0.1:1/hook" });

    await deliverEmail(INBOX, "Still stored", "Webhook target is down");

    const stored = await getDB().collection("emails").findOne({ emailId: INBOX, subject: "Still stored" });
    expect(stored).toBeTruthy();
  });
});
