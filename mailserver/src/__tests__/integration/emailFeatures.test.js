const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { connectMongoDB, closeMongoDB, getDB } = require("../../db");
const createApp = require("../../app");
const config = require("../../config");
const { ObjectId, Binary } = require("mongodb");
const path = require("path");
const fs = require("fs");
const { Readable } = require("stream");
const { handleIncomingEmail } = require("../../services/emailService");
const { attachmentsRoot } = require("../../config/paths");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

let mongoServer;
let app;
let authToken;

const INBOX = "features@myserver.pw";

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  config.mongoURL = mongoServer.getUri();
  await connectMongoDB();
  app = createApp();

  const db = getDB();
  const hashedPassword = await bcrypt.hash("testpassword", 10);
  const testUser = {
    username: "featureuser",
    password: hashedPassword,
    role: "admin",
    allowedDomains: ["myserver.pw", "example.com"],
    createdAt: new Date(),
  };
  const result = await db.collection("users").insertOne(testUser);

  authToken = jwt.sign({ id: result.insertedId.toString(), username: testUser.username, role: testUser.role }, config.jwtSecret, {
    expiresIn: "24h",
  });
});

afterAll(async () => {
  await closeMongoDB();
  await mongoServer.stop();
});

const seedInbox = async () => {
  const db = getDB();
  await db.collection("emails").deleteMany({});
  await db.collection("emails").insertMany([
    {
      emailId: INBOX,
      subject: "Your invoice is ready",
      from: { text: "Billing <billing@shop.com>" },
      text: "Please pay the invoice",
      date: new Date("2026-01-03T10:00:00Z"),
      readStatus: false,
    },
    {
      emailId: INBOX,
      subject: "Welcome aboard",
      from: { text: "Onboarding <hello@service.io>" },
      text: "Great to have you",
      date: new Date("2026-01-02T10:00:00Z"),
      readStatus: true,
    },
    {
      emailId: INBOX,
      subject: "Another message",
      from: { text: "Invoice Robot <robot@shop.com>" },
      text: "Nothing to see here",
      date: new Date("2026-01-01T10:00:00Z"),
      readStatus: false,
    },
  ]);
};

describe("GET /api/emails-list/:emailId search/filter/sort", () => {
  beforeEach(seedInbox);

  test("returns 200 with empty array (not 404) for an empty inbox", async () => {
    const response = await request(app).get("/api/emails-list/empty@myserver.pw").set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(response.headers["x-total-count"]).toBe("0");
  });

  test("search matches subject, from.text and text body (case-insensitive)", async () => {
    // "invoice" appears in subject of #1, from.text of #3, text of #1
    const response = await request(app).get(`/api/emails-list/${INBOX}?search=INVOICE`).set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
    expect(response.headers["x-total-count"]).toBe("2");
    const subjects = response.body.map((e) => e.subject).sort();
    expect(subjects).toEqual(["Another message", "Your invoice is ready"]);
  });

  test("search escapes regex metacharacters", async () => {
    const response = await request(app).get(`/api/emails-list/${INBOX}?search=.*`).set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    // ".*" as a literal string matches nothing (would match everything unescaped)
    expect(response.body.length).toBe(0);
  });

  test("filter=unread returns only unread emails and headers reflect filtered totals", async () => {
    const response = await request(app).get(`/api/emails-list/${INBOX}?filter=unread`).set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
    expect(response.headers["x-total-count"]).toBe("2");
    response.body.forEach((email) => expect(email.readStatus).toBe(false));
  });

  test("filter=read returns only read emails", async () => {
    const response = await request(app).get(`/api/emails-list/${INBOX}?filter=read`).set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].subject).toBe("Welcome aboard");
  });

  test("sortBy=subject&sortOrder=asc sorts alphabetically", async () => {
    const response = await request(app).get(`/api/emails-list/${INBOX}?sortBy=subject&sortOrder=asc`).set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.map((e) => e.subject)).toEqual(["Another message", "Welcome aboard", "Your invoice is ready"]);
  });

  test("default sort is date desc", async () => {
    const response = await request(app).get(`/api/emails-list/${INBOX}`).set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.map((e) => e.subject)).toEqual(["Your invoice is ready", "Welcome aboard", "Another message"]);
  });

  test("negative page and huge limit are clamped", async () => {
    const response = await request(app).get(`/api/emails-list/${INBOX}?page=-5&limit=99999`).set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.headers["x-current-page"]).toBe("1");
    expect(response.body.length).toBe(3);
  });

  test("same params work on GET /api/all-emails (admin)", async () => {
    const response = await request(app)
      .get("/api/all-emails?search=invoice&filter=unread&sortBy=date&sortOrder=asc")
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
    expect(response.headers["x-total-count"]).toBe("2");
    expect(response.body.map((e) => e.subject)).toEqual(["Another message", "Your invoice is ready"]);
  });
});

describe("GET /api/emails-list/:emailId/unread-count", () => {
  beforeEach(seedInbox);

  test("returns the unread count", async () => {
    const response = await request(app).get(`/api/emails-list/${INBOX}/unread-count`).set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ unreadCount: 2 });
  });

  test("returns 0 for an empty inbox", async () => {
    const response = await request(app).get("/api/emails-list/empty@myserver.pw/unread-count").set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ unreadCount: 0 });
  });

  test("requires authentication", async () => {
    const response = await request(app).get(`/api/emails-list/${INBOX}/unread-count`);
    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/emails/:emailId (delete whole inbox)", () => {
  test("deletes all emails for the inbox and their attachment folders", async () => {
    await seedInbox();
    const db = getDB();

    // Give one email an attachment folder on disk
    const email = await db.collection("emails").findOne({ emailId: INBOX });
    const folder = path.join(attachmentsRoot, email._id.toHexString());
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, "file.txt"), "data");

    const response = await request(app).delete(`/api/emails/${INBOX}`).set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ deletedCount: 3 });
    expect(await db.collection("emails").countDocuments({ emailId: INBOX })).toBe(0);
    expect(fs.existsSync(folder)).toBe(false);

    // Audit logged as DELETE_INBOX
    const log = await db.collection("audit_logs").findOne({ action: "DELETE_INBOX", "details.emailId": INBOX });
    expect(log).toBeTruthy();
    expect(log.details.deletedCount).toBe(3);
  });

  test("returns deletedCount 0 for an empty inbox", async () => {
    const response = await request(app).delete("/api/emails/empty@myserver.pw").set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ deletedCount: 0 });
  });
});

describe("GET /api/email/:emailId/:email_id/raw", () => {
  test("returns 404 with 'Raw source not available' when raw was never stored", async () => {
    const db = getDB();
    const insertResult = await db.collection("emails").insertOne({
      emailId: INBOX,
      subject: "Legacy email",
      from: { text: "old@sender.com" },
      date: new Date(),
    });

    const response = await request(app)
      .get(`/api/email/${INBOX}/${insertResult.insertedId.toHexString()}/raw`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Raw source not available" });
  });

  test("downloads the raw RFC822 source as .eml when available", async () => {
    const rawSource = `From: Sender <sender@example.com>\r\nTo: ${INBOX}\r\nSubject: Raw download test\r\n\r\nHello raw body.\r\n`;
    const emailStream = Readable.from([Buffer.from(rawSource)]);
    await handleIncomingEmail(emailStream, { envelope: { rcptTo: [{ address: INBOX }] } });

    const db = getDB();
    const saved = await db.collection("emails").findOne({ subject: "Raw download test", emailId: INBOX });
    expect(saved).toBeTruthy();
    expect(saved.raw).toBeTruthy();

    const response = await request(app)
      .get(`/api/email/${INBOX}/${saved._id.toHexString()}/raw`)
      .set("Authorization", `Bearer ${authToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/message\/rfc822/);
    expect(response.headers["content-disposition"]).toBe('attachment; filename="Raw download test.eml"');
    expect(response.body.toString("utf8")).toBe(rawSource);
  });

  test("getEmail response does not include the raw source blob", async () => {
    const db = getDB();
    const saved = await db.collection("emails").findOne({ subject: "Raw download test", emailId: INBOX });

    const response = await request(app).get(`/api/email/${INBOX}/${saved._id.toHexString()}`).set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body[0].raw).toBeUndefined();
  });
});

describe("attachment filename sanitization (end-to-end)", () => {
  test("a traversal filename from SMTP is stored sanitized inside the attachment folder", async () => {
    const evilName = "../../../evil.txt";
    const content = "malicious content";
    const rawSource =
      `From: attacker@example.com\r\n` +
      `To: ${INBOX}\r\n` +
      `Subject: Traversal attachment\r\n` +
      `Content-Type: multipart/mixed; boundary="b"\r\n\r\n` +
      `--b\r\n` +
      `Content-Type: text/plain\r\n\r\nbody\r\n\r\n` +
      `--b\r\n` +
      `Content-Type: text/plain; name="${evilName}"\r\n` +
      `Content-Disposition: attachment; filename="${evilName}"\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${Buffer.from(content).toString("base64")}\r\n\r\n` +
      `--b--\r\n`;

    const emailStream = Readable.from([Buffer.from(rawSource)]);
    await handleIncomingEmail(emailStream, { envelope: { rcptTo: [{ address: INBOX }] } });

    const db = getDB();
    const saved = await db.collection("emails").findOne({ subject: "Traversal attachment", emailId: INBOX });
    expect(saved).toBeTruthy();
    expect(saved.attachments.length).toBe(1);

    const [attachment] = saved.attachments;
    // DB metadata carries the sanitized name
    expect(attachment.filename).toBe("evil.txt");

    // File landed inside the attachment folder, not outside the root
    const safePath = path.join(attachmentsRoot, attachment.directory, "evil.txt");
    expect(fs.existsSync(safePath)).toBe(true);
    expect(fs.existsSync(path.resolve(attachmentsRoot, "../../../evil.txt"))).toBe(false);
    expect(fs.existsSync(path.resolve(attachmentsRoot, "../evil.txt"))).toBe(false);
    expect(fs.readFileSync(safePath, "utf8")).toBe(content);

    // Cleanup
    fs.rmSync(path.join(attachmentsRoot, attachment.directory), { recursive: true, force: true });
  });
});

describe("attachment download hardening", () => {
  test("rejects paths that escape the attachments root", async () => {
    // A literal ".." segment is normalized away before routing, but an
    // encoded slash inside a single path segment ("..%2f..") decodes to
    // "../.." and reaches the controller — the containment check must catch it.
    const response = await request(app).get("/api/attachment/..%2f../package.json").set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Access denied" });
  });
});
