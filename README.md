# TrashMail - Disposable Email Service

TrashMail is a web application for generating disposable/temporary email addresses and viewing emails sent to those addresses. The project consists of a React frontend and a Node.js backend mail server.

## Table of Contents
- [Frontend](#frontend)
- [Backend](#backend)
- [Deployment](#deployment)
- [Conclusion](#conclusion)
- [Support](#support)
- [Acknowledgments](#acknowledgments)

## Frontend

The React frontend provides the user interface for generating disposable emails, viewing the inbox, and reading emails.

### Features
- Generate a random disposable email address
- Enter a custom disposable email address
- View all received emails for an address
- Read a specific email and attachments
- Delete emails
- Responsive design

### Tech Stack
- React
- React Router
- Material UI
- Axios

### Pages
- **Home**: Explains the service and contains buttons to generate or enter an email
- **Inbox**: Lists received emails for an address
- **Email**: Displays the content of a specific email

### Installation
```shell

cd react
npm install

```

### Running
```shell

npm start

```
The frontend will run on [http://localhost:3000](http://localhost:3000)

## Backend

The Node.js backend provides the mail server functionality for receiving emails via SMTP and managing emails via a REST API.

### Features
- SMTP server to receive emails
- Save emails and attachments to MongoDB database
- Retrieve emails for an address
- Delete emails
- Serve attachment files

### Tech Stack
- Node.js
- Express
- MongoDB
- SMTP Server
- Mailparser

### API Endpoints
- `GET /emails/:emailId` - Get emails for an address
- `GET /emails-list/:emailId` - Get email list
- `GET /all-emails` - Get all emails
- `GET /email/:emailId/:email_id` - Get specific email
- `DELETE /email/:emailId/:email_id` - Delete email

### Installation
```shell

cd server
npm install

```

### Configuration
Edit `config.js` to configure SMTP port, MongoDB URL, etc.

### Running
```shell

node server.js

```
The backend will run on port 4000

## Deployment

The frontend and backend can be deployed separately. The React frontend can be built and served using any web server. The Node.js backend can be deployed to a server or hosting service like AWS or Home Server like Raspberry Pi with port forwarding. Make sure to configure the frontend to point to the correct backend URL.

## Conclusion

This application demonstrates a disposable email service with basic functionality like inbox and reading emails. Additional features like registering custom domains, tagging emails, search, etc. can be added.

The frontend and backend are deployed separately for modularity and scalability. The React frontend is served using Nginx and the Node.js backend is on AWS.

## Support

If you encounter any issues or have any questions or suggestions, please open an issue in the GitHub repository.

## Acknowledgments

Thanks to the contributors of the libraries used in this project for their excellent work.
