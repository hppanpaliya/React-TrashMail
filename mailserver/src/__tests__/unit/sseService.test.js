const sseService = require("../../services/sseService");
const EventEmitter = require("events");

describe("SSE Service", () => {
  let mockResponse;

  beforeEach(() => {
    mockResponse = new EventEmitter();
    mockResponse.writeHead = jest.fn();
    mockResponse.write = jest.fn();
    sseService.clients = new Map();
  });

  test("should add client and send updates", () => {
    sseService.addClient("test@example.com", mockResponse);

    expect(sseService.clients.has("test@example.com")).toBe(true);

    const testData = { subject: "New Email" };
    sseService.sendUpdate("test@example.com", testData);

    expect(mockResponse.write).toHaveBeenCalledWith(`data: ${JSON.stringify(testData)}\n\n`);
  });

  test("should remove client on connection close", () => {
    sseService.addClient("test@example.com", mockResponse);
    mockResponse.emit("close");

    expect(sseService.clients.has("test@example.com")).toBe(false);
  });
});
