# Start with the official MongoDB image
FROM mongo:latest

# Install Node.js and Git
RUN apt-get update && \
    apt-get install -y curl gnupg git && \
    curl -sL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Install yarn globally
RUN npm install -g yarn

# Install pm2 globally
RUN npm install -g pm2

# Copy in package.json files and run install to allow docker to cache themc
COPY react/package.json /React-TrashMail/react/
WORKDIR /React-TrashMail/react
RUN yarn
COPY mailserver/package.json /React-TrashMail/mailserver/
WORKDIR /React-TrashMail/mailserver
RUN yarn

COPY . /React-TrashMail

# Define mountable volume
VOLUME ["/React-TrashMail/mailserver/attachments"]

# Copy startup script
COPY docker_start.sh /docker_start.sh
RUN chmod +x /docker_start.sh

# Set the command to start the application using the startup script
CMD ["/docker_start.sh"]
