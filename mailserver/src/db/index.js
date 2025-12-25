const { MongoClient } = require("mongodb");
const config = require("../config");

let client;
let db;

async function connectWithRetry(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      client = new MongoClient(config.mongoURL);
      await client.connect();
      db = client.db(config.dbName);
      
      // Create index for emailId to optimize queries
      await db.collection('emails').createIndex({ emailId: 1 });
      await db.collection('emails').createIndex({ date: -1 }); // For sorting by date
      
      console.log("Connected to MongoDB");
      return;
    } catch (err) {
      console.error(`Attempt ${i + 1} failed: ${err.message}`);
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function connectMongoDB() {
  try {
    await connectWithRetry();
  } catch (error) {
    console.error("Error connecting to MongoDB after multiple attempts:", error);
    throw error;
  }
}

function getDB() {
  if (!db) {
    throw new Error("Database not connected. Call connectMongoDB first.");
  }
  return db;
}

async function closeMongoDB() {
  if (client) {
    try {
      await client.close();
      console.log("Closed MongoDB connection");
      db = null;
    } catch (error) {
      console.error("Error closing MongoDB connection:", error);
      throw error;
    }
  }
}

module.exports = {
  connectMongoDB,
  getDB,
  closeMongoDB,
};
