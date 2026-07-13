const crypto = require("crypto");
const webhookService = require("../../services/webhookService");

const { signBody, validateWebhookUrl, isPrivateAddress, assertSafeDestination, attemptDelivery, deliverWithRetries, buildEmailPayload } =
  webhookService;

describe("webhookService - HMAC signing", () => {
  test("produces the expected HMAC-SHA256 hex digest for a known vector", () => {
    const body = JSON.stringify({ event: "email.received", to: "inbox@example.com", subject: "Hi" });
    // Independently computed:
    //   HMAC-SHA256(key="test-secret", msg='{"event":"email.received","to":"inbox@example.com","subject":"Hi"}')
    expect(signBody("test-secret", body)).toBe("aa50f34fef312c035b9a7631ebf6c3f4a0921ec192bd8a424c856ad9f6ca2087");
  });

  test("signature changes when the body changes", () => {
    expect(signBody("test-secret", "a")).not.toBe(signBody("test-secret", "b"));
    expect(signBody("secret-a", "body")).not.toBe(signBody("secret-b", "body"));
  });
});

describe("webhookService - URL validation (save-time SSRF protection)", () => {
  const opts = { allowPrivate: false };

  test("accepts normal public http/https URLs", () => {
    expect(() => validateWebhookUrl("https://example.com/hook?a=1&b=2", opts)).not.toThrow();
    expect(() => validateWebhookUrl("http://hooks.example.org:8080/path", opts)).not.toThrow();
  });

  test("rejects non-http(s) schemes and malformed URLs", () => {
    expect(() => validateWebhookUrl("ftp://example.com/x", opts)).toThrow(/http or https/);
    expect(() => validateWebhookUrl("file:///etc/passwd", opts)).toThrow(/http or https/);
    expect(() => validateWebhookUrl("not a url", opts)).toThrow(/not a valid URL/);
    expect(() => validateWebhookUrl("", opts)).toThrow(/required/);
    expect(() => validateWebhookUrl(undefined, opts)).toThrow(/required/);
  });

  test("rejects URLs longer than the maximum length", () => {
    const longUrl = "https://example.com/" + "a".repeat(webhookService.MAX_URL_LENGTH);
    expect(() => validateWebhookUrl(longUrl, opts)).toThrow(/at most/);
  });

  test.each([
    "http://localhost/hook",
    "http://localhost:3000/hook",
    "http://sub.localhost/hook",
    "http://127.0.0.1/hook",
    "http://127.53.1.2:8080/hook",
    "http://0.0.0.0/hook",
    "http://10.0.0.5/hook",
    "http://172.16.0.1/hook",
    "http://172.31.255.255/hook",
    "http://192.168.1.10/hook",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]:8080/hook",
    "http://[::]/hook",
    "http://[fe80::1]/hook",
    "http://[fc00::1]/hook",
    "http://[fd12:3456::1]/hook",
    "http://[::ffff:10.0.0.1]/hook",
  ])("rejects private/loopback/link-local destination %s", (url) => {
    expect(() => validateWebhookUrl(url, opts)).toThrow(/private, loopback or link-local/);
  });

  test("does not reject public-edge addresses", () => {
    expect(() => validateWebhookUrl("http://172.15.0.1/hook", opts)).not.toThrow();
    expect(() => validateWebhookUrl("http://172.32.0.1/hook", opts)).not.toThrow();
    expect(() => validateWebhookUrl("http://11.0.0.1/hook", opts)).not.toThrow();
    expect(() => validateWebhookUrl("http://8.8.8.8/hook", opts)).not.toThrow();
  });

  test("WEBHOOK_ALLOW_PRIVATE escape hatch allows private destinations", () => {
    expect(() => validateWebhookUrl("http://127.0.0.1:9000/hook", { allowPrivate: true })).not.toThrow();
    expect(() => validateWebhookUrl("http://localhost:9000/hook", { allowPrivate: true })).not.toThrow();
  });
});

describe("webhookService - isPrivateAddress", () => {
  test("classifies addresses correctly", () => {
    expect(isPrivateAddress("127.0.0.1")).toBe(true);
    expect(isPrivateAddress("10.1.2.3")).toBe(true);
    expect(isPrivateAddress("192.168.0.1")).toBe(true);
    expect(isPrivateAddress("169.254.0.1")).toBe(true);
    expect(isPrivateAddress("0.0.0.0")).toBe(true);
    expect(isPrivateAddress("::1")).toBe(true);
    expect(isPrivateAddress("::ffff:192.168.1.1")).toBe(true);
    expect(isPrivateAddress("fe80::abcd")).toBe(true);
    expect(isPrivateAddress("fd00::1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(isPrivateAddress("93.184.216.34")).toBe(false);
    expect(isPrivateAddress("2606:4700::1111")).toBe(false);
    // Non-IP input fails closed
    expect(isPrivateAddress("not-an-ip")).toBe(true);
  });
});

describe("webhookService - delivery-time DNS resolution (SSRF protection)", () => {
  test("rejects hostnames that resolve to private addresses", async () => {
    const lookupImpl = jest.fn(async () => [{ address: "10.0.0.5", family: 4 }]);
    await expect(assertSafeDestination("internal.example.com", { allowPrivate: false, lookupImpl })).rejects.toThrow(/private address 10\.0\.0\.5/);
    expect(lookupImpl).toHaveBeenCalledWith("internal.example.com", expect.objectContaining({ all: true }));
  });

  test("rejects when ANY resolved address is private (multi-record)", async () => {
    const lookupImpl = jest.fn(async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "192.168.7.7", family: 4 },
    ]);
    await expect(assertSafeDestination("mixed.example.com", { allowPrivate: false, lookupImpl })).rejects.toThrow(/private address/);
  });

  test("allows hostnames that resolve to public addresses only", async () => {
    const lookupImpl = jest.fn(async () => [{ address: "93.184.216.34", family: 4 }]);
    await expect(assertSafeDestination("hooks.example.com", { allowPrivate: false, lookupImpl })).resolves.toBeUndefined();
  });

  test("rejects localhost names without doing a DNS lookup", async () => {
    const lookupImpl = jest.fn();
    await expect(assertSafeDestination("localhost", { allowPrivate: false, lookupImpl })).rejects.toThrow(/localhost/);
    expect(lookupImpl).not.toHaveBeenCalled();
  });

  test("skips all checks when allowPrivate is set", async () => {
    const lookupImpl = jest.fn();
    await expect(assertSafeDestination("localhost", { allowPrivate: true, lookupImpl })).resolves.toBeUndefined();
    expect(lookupImpl).not.toHaveBeenCalled();
  });
});

describe("webhookService - attemptDelivery", () => {
  const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];

  test("POSTs JSON with the expected headers and a valid signature", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, status: 200 }));
    const webhook = { url: "https://hooks.example.com/receive", secret: "test-secret" };
    const payload = { event: "email.received", to: "inbox@example.com", subject: "Hi" };

    const status = await attemptDelivery(webhook, payload, { fetchImpl, lookupImpl: publicLookup, allowPrivate: false });

    expect(status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe(webhook.url);
    expect(options.method).toBe("POST");
    expect(options.redirect).toBe("manual"); // redirects are never followed
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["User-Agent"]).toBe("TrashMail-Webhook");
    expect(options.headers["X-TrashMail-Event"]).toBe("email.received");
    // Signature must be the HMAC of the exact raw body that was sent
    const expected = crypto.createHmac("sha256", "test-secret").update(options.body).digest("hex");
    expect(options.headers["X-TrashMail-Signature"]).toBe(`sha256=${expected}`);
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  test("omits the signature header when no secret is configured", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, status: 204 }));
    const webhook = { url: "https://hooks.example.com/receive" };

    await attemptDelivery(webhook, { event: "email.received" }, { fetchImpl, lookupImpl: publicLookup, allowPrivate: false });

    const [, options] = fetchImpl.mock.calls[0];
    expect(options.headers["X-TrashMail-Signature"]).toBeUndefined();
  });

  test("throws on non-2xx responses", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: false, status: 500 }));
    const webhook = { url: "https://hooks.example.com/receive" };
    await expect(attemptDelivery(webhook, { event: "e" }, { fetchImpl, lookupImpl: publicLookup, allowPrivate: false })).rejects.toThrow(/HTTP 500/);
  });

  test("does not call fetch when DNS resolves to a private address", async () => {
    const fetchImpl = jest.fn();
    const lookupImpl = async () => [{ address: "172.16.1.1", family: 4 }];
    const webhook = { url: "https://internal.example.com/receive" };
    await expect(attemptDelivery(webhook, { event: "e" }, { fetchImpl, lookupImpl, allowPrivate: false })).rejects.toThrow(/private address/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("aborts the request after the configured timeout", async () => {
    const fetchImpl = (url, options) =>
      new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          const err = new Error("This operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    const webhook = { url: "https://hooks.example.com/receive" };
    await expect(
      attemptDelivery(webhook, { event: "e" }, { fetchImpl, lookupImpl: publicLookup, allowPrivate: false, timeoutMs: 30 })
    ).rejects.toThrow();
  });
});

describe("webhookService - deliverWithRetries", () => {
  const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];
  const zeroSchedule = [0, 0, 0, 0, 0]; // injected: no real waiting in tests

  test("succeeds on the first attempt without retrying", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, status: 200 }));
    const webhook = { url: "https://hooks.example.com/receive" };

    const outcome = await deliverWithRetries(
      webhook,
      { event: "e" },
      { fetchImpl, lookupImpl: publicLookup, allowPrivate: false, schedule: zeroSchedule }
    );

    expect(outcome).toEqual({ ok: true, status: 200, attempts: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("retries after failures and reports the successful attempt number", async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const webhook = { url: "https://hooks.example.com/receive" };

    const outcome = await deliverWithRetries(
      webhook,
      { event: "e" },
      { fetchImpl, lookupImpl: publicLookup, allowPrivate: false, schedule: zeroSchedule }
    );

    expect(outcome).toEqual({ ok: true, status: 200, attempts: 3 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  test("gives up after 5 attempts and reports the last error", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const webhook = { url: "https://hooks.example.com/receive" };

    const outcome = await deliverWithRetries(
      webhook,
      { event: "e" },
      { fetchImpl, lookupImpl: publicLookup, allowPrivate: false, schedule: zeroSchedule }
    );

    expect(outcome).toEqual({ ok: false, error: "ECONNREFUSED", attempts: 5 });
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });

  test("waits according to the injected backoff schedule between attempts", async () => {
    const fetchImpl = jest.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({ ok: true, status: 200 });
    const webhook = { url: "https://hooks.example.com/receive" };

    const start = Date.now();
    const outcome = await deliverWithRetries(
      webhook,
      { event: "e" },
      { fetchImpl, lookupImpl: publicLookup, allowPrivate: false, schedule: [40, 0, 0, 0] }
    );
    const elapsed = Date.now() - start;

    expect(outcome.ok).toBe(true);
    expect(outcome.attempts).toBe(2);
    expect(elapsed).toBeGreaterThanOrEqual(35); // ~40ms backoff (plus jitter) actually elapsed
  });
});

describe("webhookService - payload building", () => {
  test("builds the documented payload shape and truncates long text to ~10KB", () => {
    const bigText = "x".repeat(50 * 1024);
    const payload = buildEmailPayload("inbox@example.com", {
      from: { text: "Sender <sender@example.com>" },
      subject: "Hello",
      date: new Date("2026-01-02T03:04:05.000Z"),
      text: bigText,
      attachments: [
        { filename: "a.pdf", directory: "abc" },
        { filename: "b.png", directory: "abc" },
      ],
    });

    expect(payload.event).toBe("email.received");
    expect(payload.to).toBe("inbox@example.com");
    expect(payload.from).toBe("Sender <sender@example.com>");
    expect(payload.subject).toBe("Hello");
    expect(payload.date).toBe("2026-01-02T03:04:05.000Z");
    expect(payload.attachments).toEqual(["a.pdf", "b.png"]);
    expect(Buffer.byteLength(payload.text, "utf8")).toBeLessThanOrEqual(10 * 1024);
  });

  test("handles missing fields gracefully", () => {
    const payload = buildEmailPayload("inbox@example.com", {});
    expect(payload).toEqual({
      event: "email.received",
      to: "inbox@example.com",
      from: "",
      subject: "",
      date: null,
      text: "",
      attachments: [],
    });
  });
});
