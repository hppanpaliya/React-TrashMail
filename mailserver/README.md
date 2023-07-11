I apologize for the duplicated response. Here's the corrected version of the README file:

# Mail Server

This is a Node.js-based mail server that provides SMTP (Simple Mail Transfer Protocol) and web server functionality. The server allows users to receive emails and store them in a MongoDB database. It also provides routes for retrieving and managing emails and their attachments.

## Prerequisites

Before running the mail server, ensure that you have the following prerequisites installed:

- Node.js (version 14 or higher)
- MongoDB (running on `mongodb://192.168.1.248:27017`)
- NPM (Node Package Manager)

## Installation

1. Clone the repository or download the source code files.

2. Open a terminal or command prompt and navigate to the project directory.

3. Install the required dependencies by running the following command:

   ```shell
   npm install
   ```

## Configuration

The mail server can be configured using the `config.js` file located in the project root directory. Modify the following configuration options according to your setup:

- `smtpPort`: The port number on which the SMTP server should listen.
- `mongoURL`: The URL for connecting to the MongoDB database.
- `dbName`: The name of the MongoDB database to be used.
- `collectionName`: The name of the collection in the database to store the emails.

## Usage

To start the mail server, run the following command:

```shell
node server.js
```

The server will start the SMTP server on the specified port and the web server on port 4000.

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
