const { SMTPServer } = require("smtp-server");
const { startSMTPServer, isRecipientAllowed } = require("../../services/smtpService");
const config = require("../../config");

jest.mock("smtp-server", () => ({
  SMTPServer: jest.fn().mockImplementation(() => ({
    listen: jest.fn().mockResolvedValue(),
    on: jest.fn(),
  })),
}));

jest.mock("../../services/emailService", () => ({
  handleIncomingEmail: jest.fn().mockResolvedValue(),
}));

const savedConfig = {};
beforeEach(() => {
  savedConfig.acceptUnknownDomains = config.acceptUnknownDomains;
  savedConfig.allowedDomainsConfigured = config.allowedDomainsConfigured;
  savedConfig.allowedDomains = config.allowedDomains;
  SMTPServer.mockClear();
});
afterEach(() => {
  Object.assign(config, savedConfig);
});

describe("isRecipientAllowed", () => {
  test("accepts everything when ACCEPT_UNKNOWN_DOMAINS is on", () => {
    config.acceptUnknownDomains = true;
    expect(isRecipientAllowed("x@anything.example")).toBe(true);
  });

  test("default-denies when no domains are configured", () => {
    config.acceptUnknownDomains = false;
    config.allowedDomainsConfigured = false;
    expect(isRecipientAllowed("x@anything.example")).toBe(false);
  });

  test("allowlisted domain accepted case-insensitively; others rejected", () => {
    config.acceptUnknownDomains = false;
    config.allowedDomainsConfigured = true;
    config.allowedDomains = ["myserver.pw"];
    expect(isRecipientAllowed("x@myserver.pw")).toBe(true);
    expect(isRecipientAllowed("x@MyServer.PW")).toBe(true);
    expect(isRecipientAllowed("x@evil.com")).toBe(false);
  });

  test("multi-@ addresses resolve to the LAST @ segment", () => {
    config.acceptUnknownDomains = false;
    config.allowedDomainsConfigured = true;
    config.allowedDomains = ["b"];
    // Quoted-localpart trick: domain is evil.com, not b.
    expect(isRecipientAllowed('"a@b"@evil.com')).toBe(false);
  });

  test("empty / no-@ addresses are rejected", () => {
    config.acceptUnknownDomains = false;
    config.allowedDomainsConfigured = true;
    config.allowedDomains = ["myserver.pw"];
    expect(isRecipientAllowed("")).toBe(false);
    expect(isRecipientAllowed("bare-localpart")).toBe(false);
    expect(isRecipientAllowed(null)).toBe(false);
  });
});

describe("SMTP server configuration", () => {
  test("constructor receives hardened options and working handlers", async () => {
    config.acceptUnknownDomains = false;
    config.allowedDomainsConfigured = true;
    config.allowedDomains = ["myserver.pw"];

    await startSMTPServer();
    const options = SMTPServer.mock.calls[0][0];

    expect(options.authOptional).toBe(true);
    expect(options.size).toBeGreaterThan(0);
    expect(options.maxClients).toBeGreaterThan(0);
    expect(options.socketTimeout).toBeGreaterThan(0);
    expect(typeof options.onRcptTo).toBe("function");
    expect(typeof options.onData).toBe("function");

    // Disallowed recipient -> 550
    const cb = jest.fn();
    options.onRcptTo({ address: "x@evil.com" }, { envelope: { rcptTo: [] } }, cb);
    expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(cb.mock.calls[0][0].responseCode).toBe(550);

    // Allowed recipient -> no error
    const cbOk = jest.fn();
    options.onRcptTo({ address: "x@myserver.pw" }, { envelope: { rcptTo: [] } }, cbOk);
    expect(cbOk).toHaveBeenCalledWith();

    // Too many recipients -> 452
    const cbFull = jest.fn();
    const fullSession = { envelope: { rcptTo: new Array(1000).fill({}) } };
    options.onRcptTo({ address: "x@myserver.pw" }, fullSession, cbFull);
    expect(cbFull.mock.calls[0][0].responseCode).toBe(452);
  });

  test("onData returns a generic error to the client on parse failure", async () => {
    const { handleIncomingEmail } = require("../../services/emailService");
    handleIncomingEmail.mockRejectedValueOnce(new Error("internal detail 10.0.0.5\r\nX-Injected: yes"));

    await startSMTPServer();
    const options = SMTPServer.mock.calls[SMTPServer.mock.calls.length - 1][0];

    const stream = { on: jest.fn() };
    const err = await new Promise((resolve) => {
      options.onData(stream, { envelope: { rcptTo: [] } }, (e) => resolve(e));
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.responseCode).toBe(451);
    expect(err.message).toBe("Message rejected");
    expect(err.message).not.toMatch(/10\.0\.0\.5|Injected/);
  });
});
