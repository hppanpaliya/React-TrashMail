require("dotenv").config();

const config = {
  smtpPort: parseInt(process.env.SMTP_PORT) || 25,
  mongoURL: process.env.MONGO_URL || "mongodb://localhost:27017",
  dbName: process.env.DB_NAME || "myemails",
  collectionName: process.env.COLLECTION_NAME || "emails",
  webPort: parseInt(process.env.WEB_PORT) || 4000,
  emailRetentionDays: parseInt(process.env.EMAIL_RETENTION_DAYS) || 30,
};

module.exports = config;
