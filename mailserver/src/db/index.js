const { MongoClient } = require("mongodb");
const { mongoURL, dbName } = require("../config");

let client;

async function connectMongoDB() {
  try {
    client = new MongoClient(mongoURL);
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

function getDB() {
  return client.db(dbName);
}

async function closeMongoDB() {
  try {
    await client.close();
    console.log("Closed MongoDB connection");
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
    throw error;
  }
}

module.exports = {
  connectMongoDB,
  getDB,
  closeMongoDB,
};
