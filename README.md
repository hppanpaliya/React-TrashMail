# TrashMail - Disposable Email Service

TrashMail is a web application for generating disposable/temporary email addresses and viewing emails sent to those addresses. The project consists of a React frontend and a Node.js and MongoDB backend mail server.

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
   sudo docker run -d -p 4000:4000 -p 25:25 -v ./attachments:/React-TrashMail/mailserver/attachments -e REACT_APP_API_URL= -e REACT_APP_DOMAINS='["example.com"]' --name trashmail-container hppanpaliya/react-trashmail:latest
   ```

   This command starts the TrashMail application and exposes it on ports 4000 and 25 for mailserver.

3. **Accessing the Application**:
   Once the container is running, you can access the frontend at [http://localhost:3000](http://localhost:3000) and the backend on port 4000.

Ensure you have Docker installed and running on your machine before executing these commands.

#### Docker environment variables and volume options used or can be added:

| Option/Variable                                            | Description                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `-e REACT_APP_API_URL=`                                    | Sets the API URL. Leave empty or set to the backend URL if hosted externally. Example: `-e REACT_APP_API_URL=http://backendhost:4000` |
| `-e REACT_APP_DOMAINS='["example.com", "example.org"]'`    | Specifies the domains for the email service. Set to desired domains.                                                                  |
| `-v ./attachments:/React-TrashMail/mailserver/attachments` | Volume mount for attachments. Maps a local directory to a container directory.                                                        |
| `-v /my/local/mongodb:/data/db`                            | (Optional) Volume mount for MongoDB data. Maps a local directory to the MongoDB data directory in the container.                      |

These options and environment variables are crucial for configuring the TrashMail application within the Docker environment, especially for handling backend API communication and data persistence.

## Conclusion

This application demonstrates a disposable email service with basic functionality like inbox and reading emails. Additional features like registering custom domains, tagging emails, search, etc. can be added.

## Support

If you encounter any issues or have any questions or suggestions, please open an issue in the GitHub repository.

## Acknowledgments

Thanks to the contributors of the libraries used in this project for their excellent work.
