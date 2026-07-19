const { EventEmitter } = require("events");
const config = require("../config");

class SSEService extends EventEmitter {
  constructor() {
    super();
    this.clients = new Map();
    this.adminClients = new Set();
    this.allEmailsClients = new Set();
    // Admission-control accounting so one client cannot exhaust sockets/timers.
    this.ipCounts = new Map();
    this.userCounts = new Map();
    this.totalCount = 0;
    this.caps = {
      perIp: config.sseMaxConnectionsPerIp || 5,
      perUser: config.sseMaxConnectionsPerUser || 5,
      global: config.sseMaxConnectionsGlobal || 500,
    };
  }

  _tryReserve(ip, userId) {
    if (this.totalCount >= this.caps.global) return false;
    if (ip && (this.ipCounts.get(ip) || 0) >= this.caps.perIp) return false;
    if (userId && (this.userCounts.get(userId) || 0) >= this.caps.perUser) return false;
    this.totalCount++;
    if (ip) this.ipCounts.set(ip, (this.ipCounts.get(ip) || 0) + 1);
    if (userId) this.userCounts.set(userId, (this.userCounts.get(userId) || 0) + 1);
    return true;
  }

  _release(ip, userId) {
    this.totalCount = Math.max(0, this.totalCount - 1);
    if (ip) {
      const i = (this.ipCounts.get(ip) || 1) - 1;
      if (i > 0) this.ipCounts.set(ip, i);
      else this.ipCounts.delete(ip);
    }
    if (userId) {
      const u = (this.userCounts.get(userId) || 1) - 1;
      if (u > 0) this.userCounts.set(userId, u);
      else this.userCounts.delete(userId);
    }
  }

  // Returns false (and writes nothing) when the connection is not admitted.
  addClient(emailId, res, { ip, userId } = {}) {
    if (!this._tryReserve(ip, userId)) return false;
    if (!this.clients.has(emailId)) {
      this.clients.set(emailId, new Set());
    }
    this.clients.get(emailId).add(res);

    this.setupConnection(res, () => {
      const set = this.clients.get(emailId);
      if (set) {
        set.delete(res);
        if (set.size === 0) this.clients.delete(emailId);
      }
      this._release(ip, userId);
    });
    return true;
  }

  addAdminClient(res, { ip, userId } = {}) {
    if (!this._tryReserve(ip, userId)) return false;
    this.adminClients.add(res);
    this.setupConnection(res, () => {
      this.adminClients.delete(res);
      this._release(ip, userId);
    });
    return true;
  }

  addAllEmailsClient(res, { ip, userId } = {}) {
    if (!this._tryReserve(ip, userId)) return false;
    this.allEmailsClients.add(res);
    this.setupConnection(res, () => {
      this.allEmailsClients.delete(res);
      this._release(ip, userId);
    });
    return true;
  }

  setupConnection(res, onClose) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      try {
        onClose();
      } catch (_) {
        /* registry cleanup must never throw */
      }
      try {
        res.end();
      } catch (_) {
        /* socket may already be gone */
      }
    };

    const heartbeat = setInterval(() => {
      if (!this._isWritable(res)) return cleanup();
      this._safeWrite(res, ":\n\n");
    }, 30000);

    res.on("close", cleanup);
    res.on("error", cleanup);
  }

  _isWritable(res) {
    return !res.writableEnded && res.writable !== false;
  }

  // Returns false only when the connection is dead (ended or write threw) —
  // a backpressure `false` from res.write is NOT treated as fatal.
  _safeWrite(res, payload) {
    if (!this._isWritable(res)) return false;
    try {
      res.write(payload);
      return true;
    } catch (_) {
      return false;
    }
  }

  _broadcast(set, payload) {
    for (const client of [...set]) {
      if (!this._safeWrite(client, payload)) {
        // Self-heal the registry even if "close"/"error" never fired.
        set.delete(client);
        try {
          client.destroy();
        } catch (_) {
          /* already gone */
        }
      }
    }
  }

  sendUpdate(emailId, data) {
    const set = this.clients.get(emailId);
    if (!set) return;
    this._broadcast(set, `data: ${JSON.stringify(data)}\n\n`);
    if (set.size === 0) this.clients.delete(emailId);
  }

  sendAdminUpdate(type, data) {
    this._broadcast(this.adminClients, `data: ${JSON.stringify({ type, data })}\n\n`);
  }

  sendAllEmailsUpdate(data) {
    this._broadcast(this.allEmailsClients, `data: ${JSON.stringify(data)}\n\n`);
  }

  getClientCount() {
    let total = 0;
    this.clients.forEach((clientSet) => {
      total += clientSet.size;
    });
    return total;
  }
}

module.exports = new SSEService();
