const { EventEmitter } = require("events");

class SSEService extends EventEmitter {
  constructor() {
    super();
    this.clients = new Map();
  }

  addClient(emailId, res) {
    if (!this.clients.has(emailId)) {
      this.clients.set(emailId, new Set());
    }
    this.clients.get(emailId).add(res);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const heartbeat = setInterval(() => {
      res.write(":\n\n");
    }, 30000);

    res.on("close", () => {
      clearInterval(heartbeat);
      this.clients.get(emailId).delete(res);
      if (this.clients.get(emailId).size === 0) {
        this.clients.delete(emailId);
      }
    });
  }

  sendUpdate(emailId, data) {
    if (this.clients.has(emailId)) {
      this.clients.get(emailId).forEach((client) => {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
      });
    }
  }
}

module.exports = new SSEService();
