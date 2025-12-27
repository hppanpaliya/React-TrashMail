# TrashMail - Disposable Email Service

TrashMail is a web application for generating disposable/temporary email addresses and viewing emails sent to those addresses. The project consists of a React frontend and a Node.js and MongoDB backend mail server.

## Features

- **Disposable Emails**: Generate random or custom disposable email addresses.
- **Real-time Updates**: Receive emails instantly without refreshing the page (Server-Sent Events - SSE).
- **Authentication System**: Secure signup (invite-only) and login with JWT tokens.
- **Role-Based Access Control (RBAC)**: User and Admin roles with different permissions.
- **Admin Dashboard**: Manage users, view audit logs, generate invites, and monitor system activity.
- **Search, Filter & Sort**: Advanced email management with search, filtering, and sorting capabilities.
- **Pagination**: Efficient handling of large email lists with pagination support.
- **Dark Mode**: Toggle between light and dark themes for better user experience.
- **Responsive Design**: Optimized for desktop and mobile devices.
- **Secure**:
    - **Audit Logging**: Comprehensive logging of user and admin activities.
    - **Sanitization**: All inputs and email content are sanitized to prevent XSS and NoSQL injection.
    - **Rate Limiting**: Protects against abuse.
- **Scalable**: Optimized database schema (single collection) and pagination for large inboxes.
- **Attachments**: Support for email attachments with secure file serving.
- **Testing**: Comprehensive API tests with JWT authentication.

## Table of Contents

- [Frontend](#frontend)
- [Backend](#backend)
- [Deployment](#deployment)
- [Testing](#testing)
- [Conclusion](#conclusion)
- [Support](#support)
- [Acknowledgments](#acknowledgments)

## Frontend

The React frontend provides the user interface for generating disposable emails, viewing the inbox, and reading emails.

### Features

- Generate a random disposable email address
- Enter a custom disposable email address
- View all received emails for an address with pagination
- Search, filter, and sort emails
- Read a specific email and attachments
- Delete emails
- Real-time email updates via SSE
- Dark mode toggle
- Responsive design optimized for mobile and desktop
- Authentication: Login and Signup pages with invite codes
- Admin Dashboard: Manage users, view logs, generate invites (admin only)

### Tech Stack

- React
- React Router
- Material UI
- Axios
- Framer Motion

### Pages

- **Login/Signup**: Secure access to the service with invite codes.
- **Home**: Explains the service and contains buttons to generate or enter an email
- **Inbox**: Lists received emails for an address with search, filter, sort, and pagination
- **Email**: Displays the content of a specific email with attachments
- **Admin Dashboard**: Admin-only page for user management and system monitoring

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
- Retrieve emails for an address with pagination, search, filter, sort
- Delete emails
- Serve attachment files
- Authentication with JWT tokens
- Role-based access control (User/Admin)
- Admin routes for user management and audit logs
- Real-time updates via Server-Sent Events (SSE)
- MongoDB sanitization middleware
- Comprehensive audit logging

### Tech Stack

- Node.js
- Express
- MongoDB
- SMTP Server
- Mailparser
- JWT for authentication
- Bcrypt for password hashing

### API Endpoints

#### Authentication
- `POST /auth/signup` - User signup with invite code
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info
- `GET /auth/admin` - Check admin access

#### Emails
- `GET /emails/:emailId` - Get emails for an address (with pagination, search, filter, sort)
- `GET /emails-list/:emailId` - Get email list summary
- `GET /all-emails` - Get all emails (admin only)
- `GET /email/:emailId/:email_id` - Get specific email
- `DELETE /email/:emailId/:email_id` - Delete email

#### Attachments
- `GET /attachment/:directory/:filename` - Serve attachment file

#### SSE (Server-Sent Events)
- `GET /sse/:emailId` - Real-time updates for specific email address
- `GET /sse-all` - Real-time updates for all emails (admin)

#### Admin Routes
- `GET /admin/users` - Get all users
- `PUT /admin/users/:userId/domains` - Update user domain access
- `POST /admin/invites` - Generate new invite codes
- `GET /admin/logs` - Get audit logs
- `DELETE /admin/logs` - Clear audit logs
- `GET /admin/conflicts` - Get domain conflicts
- `GET /admin/system-emails` - Get system emails
- `GET /admin/received-emails` - Get received emails stats
- `GET /admin/top-emails` - Get top email addresses

### Installation

```shell
cd mailserver
npm install
```

### Configuration

Create a `.env` file in the `mailserver` directory with the following variables:

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
```

### Running

```shell
node server.js
```

The backend will run on port 4000, SMTP on port 2525

## Testing

### Backend Tests

The backend includes comprehensive API tests with JWT authentication.

```shell
cd mailserver
npm test
```

### Email Testing Script

A test script is provided to send complex HTML emails with attachments via local SMTP.

```shell
./test_email.sh
```

This script sends a test email to `test@domain.com` with HTML content and attachments.

## Deployment

The frontend and backend can be deployed separately. The React frontend can be built and served using any web server. The Node.js backend can be deployed to a server or hosting service like AWS or Home Server like Raspberry Pi with port forwarding. Make sure to configure the frontend to point to the correct backend URL.

### Deploying with Docker

For those who prefer a containerized deployment, Docker can be used to easily set up and run TrashMail. The repository includes a Dockerfile to simplify this process.

#### Docker Setup

1. **Build the Docker Image**:
   Ensure you are in the root directory of the project and run:

   ```shell
   docker build -t trashmail-app .
   ```

2. **Run the Docker Container**:
   After building the image, you can start the container using:

   ```shell
   sudo docker run -d \
     -p 4000:4000 \
     -p 2525:25 \
     -v ./attachments:/React-TrashMail/mailserver/attachments \
     -e REACT_APP_API_URL= \
     -e REACT_APP_DOMAINS='["example.com"]' \
     -e JWT_SECRET=your-super-secret-key-change-in-production \
     -e ALLOWED_DOMAINS=example.com \
     -e EMAIL_RETENTION_DAYS=30 \
     --name trashmail-container \
     hppanpaliya/react-trashmail:latest
   ```

   **Important**: Always set a strong `JWT_SECRET` in production!
   
   This command starts the TrashMail application and exposes it on ports 4000 (API) and 2525 (SMTP).

3. **Accessing the Application**:
   Once the container is running, you can access the frontend at [http://localhost:3000](http://localhost:3000) and the backend on port 4000.

Ensure you have Docker installed and running on your machine before executing these commands.

#### Docker environment variables and volume options:

| Option/Variable                                            | Description                                                                                                                           | Default |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `-e REACT_APP_API_URL=`                                    | Sets the API URL. Leave empty or set to the backend URL if hosted externally. Example: `-e REACT_APP_API_URL=http://backendhost:4000` | Empty (uses same host) |
| `-e REACT_APP_DOMAINS='["example.com", "example.org"]'`    | Specifies the domains for the email service. Set to desired domains.                                                                  | Required |
| `-e PORT=4000`                                             | Backend API server port                                                                                                               | 4000 |
| `-e MONGO_URI=mongodb://localhost:27017`                   | MongoDB connection string                                                                                                             | mongodb://localhost:27017 |
| `-e DB_NAME=trashmail`                                     | Database name                                                                                                                         | trashmail |
| `-e SMTP_PORT=2525`                                        | SMTP server port                                                                                                                      | 2525 |
| `-e ALLOWED_DOMAINS=example.com,test.org`                  | Comma-separated list of allowed email domains                                                                                          | example.com |
| `-e JWT_SECRET=your-secret-key`                            | **Required** - Secret key for JWT token signing. **Must be changed in production!**                                                   | your-secret-key-change-this-in-prod |
| `-e JWT_EXPIRY=24h`                                        | JWT token expiration time                                                                                                             | 24h |
| `-e BCRYPT_SALT_ROUNDS=10`                                 | Bcrypt salt rounds for password hashing                                                                                               | 10 |
| `-e EMAIL_RETENTION_DAYS=30`                               | Number of days to retain emails before automatic cleanup                                                                              | 30 |
| `-v ./attachments:/React-TrashMail/mailserver/attachments` | Volume mount for attachments. Maps a local directory to a container directory.                                                        | Required |
| `-v /my/local/mongodb:/data/db`                            | (Optional) Volume mount for MongoDB data. Maps a local directory to the MongoDB data directory in the container.                      | Optional |

These options and environment variables are crucial for configuring the TrashMail application within the Docker environment, especially for handling backend API communication and data persistence.


## Support

If you encounter any issues or have any questions or suggestions, please open an issue in the GitHub repository.

## Acknowledgments

Thanks to the contributors of the libraries used in this project for their excellent work.
