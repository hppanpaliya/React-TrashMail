require("dotenv").config();

const parseDomains = (envVar) => {
  if (!envVar) return ['example.com'];
  
  let domains = [];
  
  // Try parsing as JSON first
  try {
    const parsed = JSON.parse(envVar);
    if (Array.isArray(parsed)) {
       // Handle the case: ["a", "b,c"] -> ["a", "b", "c"]
       domains = parsed.flatMap(item => 
         typeof item === 'string' ? item.split(',').map(d => d.trim()) : []
       );
    } else {
        domains = [String(parsed)];
    }
  } catch (e) {
    // Not valid JSON, treat as comma separated string
    domains = envVar.split(',').map(d => d.trim());
  }

  // Clean up each domain string to remove common copy-paste artifacts
  return domains.map(d => {
    // Remove wrapping quotes or brackets if they stuck around
    return d.replace(/[\[\]"']/g, '').trim(); 
  }).filter(d => d.length > 0);
};

const config = {
  smtpPort: parseInt(process.env.SMTP_PORT) || 25,
  mongoURL: process.env.MONGO_URI || "mongodb://localhost:27017",
  dbName: process.env.DB_NAME || "myemails",
  webPort: parseInt(process.env.PORT) || 4000,
  emailRetentionDays: parseInt(process.env.EMAIL_RETENTION_DAYS) || 30,
  jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-this-in-prod",
  jwtExpiry: process.env.JWT_EXPIRY || "5d",
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10,
  allowedDomains: parseDomains(process.env.ALLOWED_DOMAINS),
};


module.exports = config;
