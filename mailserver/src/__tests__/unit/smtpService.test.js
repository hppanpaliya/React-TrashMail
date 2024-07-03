const { startSMTPServer } = require("../../services/smtpService");

jest.mock("smtp-server", () => ({
  SMTPServer: jest.fn().mockImplementation(() => ({
    listen: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    onData: jest.fn(),
  })),
}));

describe("SMTP Service", () => {
  test("should create SMTP server with correct configuration", async () => {
    const server = await startSMTPServer();

    expect(server.onData).toBeDefined();
    expect(typeof server.onData).toBe("function");
  });
});
