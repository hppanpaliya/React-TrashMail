require("dotenv").config();

const parseDomains = (envVar) => {
  if (!envVar) return ["example.com"];

  let domains = [];

  // Try parsing as JSON first
  try {
    const parsed = JSON.parse(envVar);
    if (Array.isArray(parsed)) {
      // Handle the case: ["a", "b,c"] -> ["a", "b", "c"]
      domains = parsed.flatMap((item) => (typeof item === "string" ? item.split(",").map((d) => d.trim()) : []));
    } else {
      domains = [String(parsed)];
    }
  } catch (e) {
    // Not valid JSON, treat as comma separated string
    domains = envVar.split(",").map((d) => d.trim());
  }

  // Clean up each domain string to remove common copy-paste artifacts
  return domains
    .map((d) => {
      // Remove wrapping quotes or brackets if they stuck around
      return d.replace(/[\[\]"']/g, "").trim();
    })
    .filter((d) => d.length > 0);
};

// JWT secret handling: never fall back to a hardcoded secret in production.
const DEV_JWT_FALLBACK = "your-secret-key-change-this-in-prod";
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: JWT_SECRET environment variable is not set. Refusing to start in production without a JWT secret.");
    process.exit(1);
  }
  console.warn("*".repeat(80));
  console.warn("WARNING: JWT_SECRET is not set. Using an INSECURE development-only fallback.");
  console.warn("Set the JWT_SECRET environment variable before deploying to production.");
  console.warn("*".repeat(80));
  jwtSecret = DEV_JWT_FALLBACK;
}

const config = {
  smtpPort: parseInt(process.env.SMTP_PORT) || 25,
  mongoURL: process.env.MONGO_URI || "mongodb://localhost:27017",
  dbName: process.env.DB_NAME || "myemails",
  webPort: parseInt(process.env.PORT) || 4000,
  emailRetentionDays: parseInt(process.env.EMAIL_RETENTION_DAYS) || 30,
  jwtSecret,
  jwtExpiry: process.env.JWT_EXPIRY || "5d",
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10,
  allowedDomains: parseDomains(process.env.ALLOWED_DOMAINS),
  // True when the operator explicitly configured ALLOWED_DOMAINS. When it is
  // not configured we keep accepting mail for any domain (dev behavior).
  allowedDomainsConfigured: Boolean(process.env.ALLOWED_DOMAINS),
  // Opt-out flag: accept SMTP recipients on unknown domains even when
  // ALLOWED_DOMAINS is configured.
  acceptUnknownDomains: process.env.ACCEPT_UNKNOWN_DOMAINS === "true",
  // Maximum SMTP message size in bytes (default 25MB).
  smtpMaxMessageSize: parseInt(process.env.SMTP_MAX_MESSAGE_SIZE) || 25 * 1024 * 1024,
  // Raw RFC822 sources larger than this are not persisted in MongoDB
  // (documents are capped at 16MB).
  maxRawStoreSize: parseInt(process.env.MAX_RAW_STORE_SIZE) || 10 * 1024 * 1024,
  // Escape hatch for self-hosted deployments: allow webhook URLs that point
  // to private/loopback/link-local addresses (SSRF protection is skipped).
  webhookAllowPrivate: process.env.WEBHOOK_ALLOW_PRIVATE === "true",
};

module.exports = config;
