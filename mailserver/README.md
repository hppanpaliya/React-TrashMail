# Mail Server

This is a Node.js-based mail server that provides SMTP (Simple Mail Transfer Protocol) and web server functionality. The server allows users to receive emails and store them in a MongoDB database. It also provides routes for retrieving and managing emails and their attachments.

## Prerequisites

Before running the mail server, ensure that you have the following prerequisites installed:

- Node.js (version 14 or higher)
- MongoDB
- NPM (Node Package Manager)

## Installation

1. Clone the repository or download the source code files.

2. Open a terminal or command prompt and navigate to the project directory.

3. Install the required dependencies by running the following command:

   ```shell
   npm install
   ```

## Configuration

The mail server is configured using environment variables. Create a `.env` file in the `mailserver` directory with the following variables:

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017
DB_NAME=trashmail
SMTP_PORT=2525
DOMAIN=localhost
ALLOWED_DOMAINS=localhost,example.com
JWT_SECRET=your_super_secret_jwt_key
BCRYPT_SALT_ROUNDS=10
JWT_EXPIRY=24h
EMAIL_RETENTION_DAYS=30
# Optional hardening / limits
ACCEPT_UNKNOWN_DOMAINS=false
SMTP_MAX_MESSAGE_SIZE=26214400
MAX_RAW_STORE_SIZE=10485760
WEBHOOK_ALLOW_PRIVATE=false
```

- `PORT`: The port the API server will listen on (default: 4000).
- `MONGO_URI`: The connection string for your MongoDB instance (default: mongodb://localhost:27017).
- `DB_NAME`: The name of the database to use (default: trashmail).
- `SMTP_PORT`: The port the SMTP server will listen on (default: 2525).
- `DOMAIN`: The domain name for the email addresses (e.g., `trashmail.com`).
- `ALLOWED_DOMAINS`: Comma-separated list of domains allowed for disposable emails.
- `JWT_SECRET`: Secret key for signing JWT tokens. **Required in production** — the server refuses to start with `NODE_ENV=production` if it is unset. In development a loud warning is printed and an insecure fallback is used.
- `BCRYPT_SALT_ROUNDS`: Cost factor for password hashing (default: 10).
- `JWT_EXPIRY`: Token expiration time (default: 24h).
- `EMAIL_RETENTION_DAYS`: Number of days to retain emails (default: 30).
- `ACCEPT_UNKNOWN_DOMAINS`: When `true`, the SMTP server accepts mail for any recipient domain. Default `false`: recipients whose domain is not in `ALLOWED_DOMAINS` are rejected with SMTP 550. Note: if `ALLOWED_DOMAINS` is not set at all, all domains are accepted (development behavior).
- `SMTP_MAX_MESSAGE_SIZE`: Maximum accepted SMTP message size in bytes (default: 26214400 = 25MB).
- `MAX_RAW_STORE_SIZE`: Raw RFC822 sources larger than this (bytes) are not stored in MongoDB, so the raw `.eml` download is unavailable for those emails (default: 10485760 = 10MB).
- `WEBHOOK_ALLOW_PRIVATE`: When `true`, webhook URLs pointing at private, loopback or link-local addresses are allowed (escape hatch for self-hosted setups that deliver webhooks to services on the same network). Default `false` — see [SSRF protection](#ssrf-protection).

## Database Setup

This project uses MongoDB. Ensure you have a MongoDB instance running.

### Creating Invite Codes

To allow users to sign up, you need to generate invite codes. Run the following script:

```bash
node scripts/createInvite.js [role]
```

- `role` (optional): The role to assign to the user who uses this invite (e.g., `admin`, `user`). Defaults to `user`.

Examples:

```bash
node scripts/createInvite.js          # Creates a user invite
node scripts/createInvite.js admin    # Creates an admin invite
```

This will generate a new invite code and print it to the console. Share this code with users you want to allow to register.

## Usage

To start the mail server, run the following command:

```shell
npm start
```

The server will start the SMTP server on the specified port and the web server on the configured PORT.

## Testing

The mail server includes comprehensive API tests with JWT authentication.

```shell
npm test
```

## SMTP Server

The SMTP server is responsible for handling incoming emails. It listens for incoming connections and processes the email data. The `handleIncomingEmail` function in `emailHandler.js` parses the email using the `mailparser` library and saves it to the MongoDB database using the `saveEmailToDB` function.

## Web Server

The web server provides a RESTful API for accessing and managing emails. It serves the email client interface and handles various routes for retrieving and deleting emails, as well as serving email attachments.

The following routes are available:

#### Authentication Routes

- `POST /auth/signup` - User signup with invite code
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user information
- `GET /auth/admin` - Check admin access
- `GET /auth/users` - Get all users (admin only)

#### Email Routes

- `GET /emails-list/:emailId` - Retrieves a paginated list of emails (limited fields) for an inbox. An empty inbox returns `200` with `[]` and `X-Total-Count: 0` (not `404`). Optional query parameters:
  - `page` (default 1, min 1) and `limit` (default 50, clamped to 1..100)
  - `search` - case-insensitive substring match against `subject`, `from.text` and the plain-text body (regex metacharacters are escaped)
  - `filter` - `all` | `read` | `unread` (default `all`)
  - `sortBy` - `date` | `subject` | `from` (default `date`)
  - `sortOrder` - `asc` | `desc` (default `desc`)
  - Pagination headers `X-Total-Count`, `X-Total-Pages` and `X-Current-Page` reflect the filtered query.
- `GET /emails-list/:emailId/unread-count` - Returns `{ "unreadCount": <number> }` for the inbox (cheap count, used for tab badges).
- `GET /all-emails` - Retrieves all emails stored in the database (admin only). Supports the same `page`/`limit`/`search`/`filter`/`sortBy`/`sortOrder` parameters and pagination headers as `/emails-list/:emailId`.
- `GET /email/:emailId/:email_id` - Retrieves a specific email by inbox address and email ObjectId (marks it read).
- `GET /email/:emailId/:email_id/raw` - Downloads the raw RFC822 source as an `.eml` file (`Content-Type: message/rfc822`, `Content-Disposition: attachment`). Returns `404` with `{ "message": "Raw source not available" }` for emails received before raw storage existed or larger than `MAX_RAW_STORE_SIZE`.
- `DELETE /email/:emailId/:email_id` - Deletes a specific email (and its attachment folder).
- `DELETE /emails/:emailId` - Deletes ALL emails for the inbox and their attachment folders. Responds with `{ "deletedCount": <number> }` and is audit-logged as `DELETE_INBOX`.

#### Attachment Routes

- `GET /attachment/:directory/:filename` - Serves attachment files based on directory and filename

#### SSE Routes

- `GET /sse/:emailId?token=JWT` - Server-Sent Events for real-time updates on a specific email address. The token's user is re-fetched from the database and the same per-user domain authorization as the REST routes applies.
- `GET /sse-all?token=JWT` - Server-Sent Events for real-time updates on all emails (admin only).

#### Admin Routes

- `GET /admin/logs` - Get audit logs
- `DELETE /admin/logs` - Clear audit logs
- `GET /admin/conflicts` - Get domain conflicts
- `PUT /admin/users/:userId/domains` - Update user domain access
- `POST /admin/invites` - Generate new invite codes
- `GET /admin/system-emails` - Get system emails
- `GET /admin/received-emails` - Get received emails statistics
- `GET /admin/top-emails` - Get top email addresses

#### Config Route

- `GET /config` - Returns client-facing runtime configuration for the authenticated user (any role):

  ```json
  { "retentionDays": 30, "domains": ["example.com", "myserver.pw"] }
  ```

  `retentionDays` mirrors `EMAIL_RETENTION_DAYS` (used by the frontend for per-email expiry countdowns). `domains` is the _effective_ allowed-domain list for the requesting user: their own `allowedDomains` array if one is set, the global `ALLOWED_DOMAINS` list when it is unset or `"*"`.

#### Webhook Routes

Per-inbox webhooks: when an email arrives for an address that has an enabled webhook, the server POSTs a JSON payload to the configured URL. One webhook per inbox address. All routes are authenticated and enforce the same per-user allowed-domains policy as the email routes. Configure, delete and test actions are audit-logged (`WEBHOOK_CONFIGURED`, `WEBHOOK_DELETED`, `WEBHOOK_TEST`).

- `GET /webhooks/:emailId` - Returns the webhook configuration for the inbox, or `404` with `{ "message": "No webhook configured" }`:

  ```json
  {
    "url": "https://example.com/hook",
    "enabled": true,
    "hasSecret": true,
    "lastStatus": "success",
    "lastError": null,
    "lastDeliveredAt": "2026-07-12T10:00:00.000Z"
  }
  ```

  The signing secret itself is **never** returned - only `hasSecret`.

- `PUT /webhooks/:emailId` - Creates or updates the webhook. Body: `{ "url": "...", "secret": "...", "enabled": true }`.
  - `url` (required): `http` or `https`, max 2048 characters. Subject to the SSRF policy below.
  - `secret` (optional): omit to keep the existing secret, send `""` to clear it, send a non-empty string (max 256 chars) to set it.
  - `enabled` (optional boolean): defaults to `true` on create, unchanged on update.
  - Responds with the same shape as `GET`.
- `DELETE /webhooks/:emailId` - Removes the webhook (`404` if none is configured).
- `POST /webhooks/:emailId/test` - Sends a single test delivery (event `webhook.test`, no retries) through the exact same delivery path (headers, signature, SSRF checks). Responds `{ "ok": true, "status": 200 }` or `{ "ok": false, "error": "..." }` and updates `lastStatus`/`lastError`/`lastDeliveredAt`.

##### Delivery payload

On each stored incoming email the webhook receives:

```
POST <url>
Content-Type: application/json
User-Agent: TrashMail-Webhook
X-TrashMail-Event: email.received
X-TrashMail-Signature: sha256=<hex>        (only when a secret is set)
```

```json
{
  "event": "email.received",
  "to": "inbox@example.com",
  "from": "Sender <sender@example.org>",
  "subject": "Hello",
  "date": "2026-07-12T10:00:00.000Z",
  "text": "plain-text body, truncated to ~10KB",
  "attachments": ["invoice.pdf", "photo.png"]
}
```

Delivery is fire-and-forget from the email-save path: webhook failures never fail or slow down email ingestion. Failed deliveries are retried up to 5 attempts total with jittered exponential backoff (roughly 1s, 5s, 25s, 60s between attempts) and a 10 second timeout per attempt. HTTP redirects are not followed. The final outcome is recorded on the webhook (`lastStatus`, `lastError`, `lastDeliveredAt`).

##### Signature verification

When a secret is configured, `X-TrashMail-Signature` is `sha256=` followed by the hex HMAC-SHA256 of the **raw request body**, keyed with the secret. Verify it before trusting a delivery, e.g. in Node.js:

```js
const crypto = require("crypto");

function verify(rawBody, signatureHeader, secret) {
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return signatureHeader && signatureHeader.length === expected.length && crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}
```

Note: the secret is stored as-is (plaintext) in MongoDB - it is an outbound signing key that the server must be able to read to sign requests. Treat database access accordingly and rotate the secret via `PUT` if it is ever exposed.

##### SSRF protection

Webhook destinations are validated twice:

1. **At save-time** (`PUT`): only `http`/`https` URLs are accepted, and URLs whose host is `localhost`/`*.localhost` or a private, loopback or link-local IP literal are rejected.
2. **At delivery-time**: the hostname is resolved via DNS immediately before each attempt, and delivery is refused when any resolved address is private. Blocked ranges: `127.0.0.0/8`, `::1`, `0.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `fe80::/10`, `fc00::/7` and IPv4-mapped IPv6 equivalents. This also catches DNS records that point public-looking names at internal addresses.

Self-hosted deployments that legitimately need to deliver webhooks to services on a private network can set `WEBHOOK_ALLOW_PRIVATE=true` to disable both checks.

## Database

The mail server uses a MongoDB database to store emails. The `db.js` file handles the database connection and provides functions for connecting to the database, retrieving the database instance, and closing the connection.

## Attachment Storage

Attachments received in emails are saved to the file system under the `attachments` directory (the root is centralized in `src/config/paths.js`). Each attachment is stored in a directory named after the email's ObjectId. Attachment filenames arriving over SMTP are sanitized (directory components and control characters stripped, empty names replaced with a generated one) and de-duplicated within their folder; the sanitized name is what is stored in the email's attachment metadata. The `attachmentRoutes.js` file defines a route for serving attachment files based on their directory and filename.

## Cleanup

When the server is closed, it performs cleanup tasks such as closing the MongoDB connection. The `server.js` file defines the cleanup logic to be executed when the server is closed.

## Dependency Notes

- `bcrypt` is on the v6 major (requires Node.js >= 18).
- `nodemailer` v9 is a **devDependency** only - it is used exclusively by the integration tests to send mail to the local SMTP server. The runtime never sends outbound email.
- `emailjs` was removed: it was declared but never imported anywhere in the codebase.
- Webhook delivery uses the global `fetch`/`AbortController` built into Node.js >= 18 - no extra HTTP client dependency.

## Support

If you encounter any issues or have any questions or suggestions, please open an issue in the GitHub repository.

## Acknowledgments

This mail server is built using the following libraries:

- Express.js - Fast, unopinionated, minimalist web framework for Node.js
- SMTP Server - SMTP server implementation for Node.js
- Mailparser - Email parsing library for Node.js

Thanks to the contributors of these libraries for their excellent work.
