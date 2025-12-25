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
PORT=3000
MONGO_URI=mongodb://localhost:27017
DB_NAME=trashmail
SMTP_PORT=2525
DOMAIN=localhost
ALLOWED_DOMAINS=localhost,example.com
JWT_SECRET=your_super_secret_jwt_key
BCRYPT_SALT_ROUNDS=10
JWT_EXPIRY=24h
```

- `PORT`: The port the API server will listen on.
- `MONGO_URI`: The connection string for your MongoDB instance.
- `DB_NAME`: The name of the database to use.
- `SMTP_PORT`: The port the SMTP server will listen on.
- `DOMAIN`: The domain name for the email addresses (e.g., `trashmail.com`).
- `ALLOWED_DOMAINS`: Comma-separated list of domains allowed for disposable emails.
- `JWT_SECRET`: Secret key for signing JWT tokens.
- `BCRYPT_SALT_ROUNDS`: Cost factor for password hashing (default: 10).
- `JWT_EXPIRY`: Token expiration time (default: 24h).

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

## SMTP Server

The SMTP server is responsible for handling incoming emails. It listens for incoming connections and processes the email data. The `handleIncomingEmail` function in `emailHandler.js` parses the email using the `mailparser` library and saves it to the MongoDB database using the `saveEmailToDB` function.

## Web Server

The web server provides a RESTful API for accessing and managing emails. It serves the email client interface and handles various routes for retrieving and deleting emails, as well as serving email attachments.

The following routes are available:

- `GET` `/emails/:emailId`: Retrieves emails and attachment file links for a specific email ID.
- `GET` `/emails-list/:emailId`: Retrieves a list of emails (with limited fields) for a specific email ID.
- `GET` `/all-emails`: Retrieves all emails stored in the database.
- `GET` `/email/:emailID/:email_id`: Retrieves a specific email by its email ID and email UID.
- `DELETE` `/email/:emailID/:email_id`: Deletes a specific email by its email ID and email UID.

## Database

The mail server uses a MongoDB database to store emails. The `db.js` file handles the database connection and provides functions for connecting to the database, retrieving the database instance, and closing the connection.

## Attachment Storage

Attachments received in emails are saved to the file system under the `attachments` directory. Each attachment is stored in a separate directory named after the email's ObjectId. The `attachmentRoutes.js` file defines a route for serving attachment files based on their directory and filename.

## Cleanup

When the server is closed, it performs cleanup tasks such as closing the MongoDB connection. The `server.js` file defines the cleanup logic to be executed when the server is closed.

## Support

If you encounter any issues or have any questions or suggestions, please open an issue in the GitHub repository.

## Acknowledgments

This mail server is built using the following libraries:

- Express.js - Fast, unopinionated, minimalist web framework for Node.js
- SMTP Server - SMTP server implementation for Node.js
- Mailparser - Email parsing library for Node.js

Thanks to the contributors of these libraries for their excellent work.
