require("dotenv").config();

// Parse an integer environment variable with radix 10 and strict validation.
// - unset/empty  -> defaultValue (silent)
// - valid int    -> the integer (0 preserved)
// - invalid text -> defaultValue + warning (surfaces misconfiguration)
const parseIntEnv = (value, defaultValue) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return defaultValue;
  }
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) {
    console.warn(`Invalid integer env value "${value}"; falling back to ${defaultValue}.`);
    return defaultValue;
  }
  return n;
};

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

// JWT secret handling: never fall back to a hardcoded secret outside local dev.
const DEV_JWT_FALLBACK = "your-secret-key-change-this-in-prod";
const isDevelopment = process.env.NODE_ENV === "development";
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (!isDevelopment) {
    console.error(
      `FATAL: JWT_SECRET environment variable is not set (NODE_ENV="${process.env.NODE_ENV || "unset"}"). ` +
        "The insecure development fallback is only permitted when NODE_ENV=development. Refusing to start."
    );
    process.exit(1);
  }
  console.warn("*".repeat(80));
  console.warn("WARNING: JWT_SECRET is not set. Using an INSECURE development-only fallback (NODE_ENV=development).");
  console.warn("Set the JWT_SECRET environment variable before deploying anywhere non-local.");
  console.warn("*".repeat(80));
  jwtSecret = DEV_JWT_FALLBACK;
}
// Reject the known dev default anywhere except explicit local development,
// even if it was supplied via the JWT_SECRET env var.
if (!isDevelopment && jwtSecret === DEV_JWT_FALLBACK) {
  console.error(
    `FATAL: JWT_SECRET is set to the insecure default value while NODE_ENV="${process.env.NODE_ENV || "unset"}". Refusing to start.`
  );
  process.exit(1);
}

const config = {
  smtpPort: parseIntEnv(process.env.SMTP_PORT, 25),
  mongoURL: process.env.MONGO_URI || "mongodb://localhost:27017",
  dbName: process.env.DB_NAME || "myemails",
  webPort: parseIntEnv(process.env.PORT, 4000),
  emailRetentionDays: parseIntEnv(process.env.EMAIL_RETENTION_DAYS, 30),
  jwtSecret,
  jwtExpiry: process.env.JWT_EXPIRY || "5d",
  bcryptSaltRounds: parseIntEnv(process.env.BCRYPT_SALT_ROUNDS, 10),
  allowedDomains: parseDomains(process.env.ALLOWED_DOMAINS),
  // True when the operator explicitly configured ALLOWED_DOMAINS. When it is
  // not configured we keep accepting mail for any domain (dev behavior).
  allowedDomainsConfigured: Boolean(process.env.ALLOWED_DOMAINS),
  // Opt-out flag: accept SMTP recipients on unknown domains even when
  // ALLOWED_DOMAINS is configured.
  acceptUnknownDomains: process.env.ACCEPT_UNKNOWN_DOMAINS === "true",
  // Maximum SMTP message size in bytes (default 25MB).
  smtpMaxMessageSize: parseIntEnv(process.env.SMTP_MAX_MESSAGE_SIZE, 25 * 1024 * 1024),
  // SSE admission control
  sseMaxConnectionsPerIp: parseIntEnv(process.env.SSE_MAX_CONNECTIONS_PER_IP, 5),
  sseMaxConnectionsPerUser: parseIntEnv(process.env.SSE_MAX_CONNECTIONS_PER_USER, 5),
  sseMaxConnectionsGlobal: parseIntEnv(process.env.SSE_MAX_CONNECTIONS_GLOBAL, 500),
  // SMTP connection hardening
  smtpMaxClients: parseIntEnv(process.env.SMTP_MAX_CLIENTS, 50),
  smtpSocketTimeoutMs: parseIntEnv(process.env.SMTP_SOCKET_TIMEOUT_MS, 60000),
  smtpMaxRecipients: parseIntEnv(process.env.SMTP_MAX_RECIPIENTS, 50),
  // Raw RFC822 sources larger than this are not persisted in MongoDB
  // (documents are capped at 16MB).
  maxRawStoreSize: parseIntEnv(process.env.MAX_RAW_STORE_SIZE, 10 * 1024 * 1024),
  // Escape hatch for self-hosted deployments: allow webhook URLs that point
  // to private/loopback/link-local addresses (SSRF protection is skipped).
  webhookAllowPrivate: process.env.WEBHOOK_ALLOW_PRIVATE === "true",
  // Timezone for scheduled jobs (IANA name); defaults to UTC so "2am" is
  // deterministic across deployments.
  cronTimezone: process.env.CRON_TIMEZONE || "UTC",
  // MongoDB client tuning (all optional)
  mongoServerSelectionTimeoutMS: parseIntEnv(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 5000),
  mongoConnectTimeoutMS: parseIntEnv(process.env.MONGO_CONNECT_TIMEOUT_MS, 10000),
  mongoSocketTimeoutMS: parseIntEnv(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000),
  mongoMaxPoolSize: parseIntEnv(process.env.MONGO_MAX_POOL_SIZE, 10),
};

module.exports = config;
