const { EventEmitter } = require("events");

class SSEService extends EventEmitter {
  constructor() {
    super();
    this.clients = new Map();
    this.adminClients = new Set();
  }

  addClient(emailId, res) {
    if (!this.clients.has(emailId)) {
      this.clients.set(emailId, new Set());
    }
    this.clients.get(emailId).add(res);

    this.setupConnection(res, () => {
      this.clients.get(emailId).delete(res);
      if (this.clients.get(emailId).size === 0) {
        this.clients.delete(emailId);
      }
    });
  }

  addAdminClient(res) {
    this.adminClients.add(res);
    this.setupConnection(res, () => {
      this.adminClients.delete(res);
    });
  }

  setupConnection(res, onClose) {
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
      onClose();
    });
  }

  sendUpdate(emailId, data) {
    if (this.clients.has(emailId)) {
      this.clients.get(emailId).forEach((client) => {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
      });
    }
  }

  sendAdminUpdate(type, data) {
    this.adminClients.forEach((client) => {
      client.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    });
  }
}

module.exports = new SSEService();
