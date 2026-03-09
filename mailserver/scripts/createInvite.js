const { MongoClient } = require("mongodb");
const config = require("../src/config");
const { generateInviteCode } = require("../src/utils/inviteCode");

async function createInvite() {
  const client = new MongoClient(config.mongoURL);
  
  try {
    await client.connect();
    const db = client.db(config.dbName);
    const invitesCollection = db.collection("invites");

    const args = process.argv.slice(2);
    const role = args[0] || 'user'; // Default to 'user' if not specified

    const code = generateInviteCode();
    
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
