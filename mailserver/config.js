require("dotenv").config();
console.log("process.env.MONGO_URL", process.env.MONGO_URL);

module.exports = {
  smtpPort: 25,
  mongoURL: process.env.MONGO_URL || "mongodb://localhost:27017",
  dbName: "myemails",
  collectionName: "emails",
};
