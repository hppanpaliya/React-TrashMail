# Start with the official MongoDB image
FROM mongo:latest

# Install Node.js and Git
RUN apt-get update && \
    apt-get install -y curl gnupg git && \
    curl -sL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Install yarn globally
RUN npm install -g yarn

# Clone the repository
RUN git clone https://github.com/hppanpaliya/React-TrashMail

# Install dependencies for the React project
WORKDIR /React-TrashMail/react
RUN yarn


# Install dependencies for the mailserver
WORKDIR /React-TrashMail/mailserver
RUN yarn

# Install pm2 globally
RUN npm install -g pm2

# Define mountable volume
VOLUME ["/React-TrashMail/mailserver/attachments"]

# Copy startup script
COPY docker_start.sh /docker_start.sh
RUN chmod +x /docker_start.sh

# Set the command to start the application using the startup script
CMD ["/docker_start.sh"]
