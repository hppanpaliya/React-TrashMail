const { MongoClient } = require("mongodb");
const crypto = require("crypto");
const config = require("../src/config");

const ALLOWED_ROLES = ["user", "admin"];

async function createInvite() {
  const client = new MongoClient(config.mongoURL);
  
  try {
    await client.connect();
    const db = client.db(config.dbName);
    const invitesCollection = db.collection("invites");

    const args = process.argv.slice(2);
    const role = args[0] || 'user'; // Default to 'user' if not specified
    if (!ALLOWED_ROLES.includes(role)) {
      console.error(`Invalid role '${role}'. Allowed roles: ${ALLOWED_ROLES.join(", ")}`);
      process.exitCode = 1;
      return;
    }

    // 16 random bytes = 128 bits of entropy; Math.random() is not suitable for secrets.
    const code = "WELCOME-TRASHMAIL-" + crypto.randomBytes(16).toString("hex").toUpperCase();
    
    await invitesCollection.insertOne({
      code: code,
      role: role,
      used: false,
      createdAt: new Date()
    });

    console.log(`Invite code created for role '${role}':`, code);
  } catch (error) {
    console.error("Error creating invite:", error);
  } finally {
    await client.close();
  }
}

createInvite();
