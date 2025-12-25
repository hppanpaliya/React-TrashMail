require("dotenv").config();

const config = {
  smtpPort: parseInt(process.env.SMTP_PORT) || 25,
  mongoURL: process.env.MONGO_URI || "mongodb://localhost:27017",
  dbName: process.env.DB_NAME || "myemails",
  webPort: parseInt(process.env.PORT) || 4000,
  emailRetentionDays: parseInt(process.env.EMAIL_RETENTION_DAYS) || 30,
  jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-this-in-prod",
  jwtExpiry: process.env.JWT_EXPIRY || "5d",
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10,
  allowedDomains: process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(',') : ['example.com'],
};

module.exports = config;
