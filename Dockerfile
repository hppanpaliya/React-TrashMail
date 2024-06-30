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
RUN yarn global add pm2

# Copy in package.json files and run install to allow docker to cache them
COPY react/package.json /React-TrashMail/react/
COPY react/yarn.lock /React-TrashMail/react/
WORKDIR /React-TrashMail/react
RUN yarn install

COPY mailserver/package.json /React-TrashMail/mailserver/
COPY mailserver/yarn.lock /React-TrashMail/mailserver/
WORKDIR /React-TrashMail/mailserver
RUN yarn install

# Copy the rest of the application code
COPY . /React-TrashMail

WORKDIR /React-TrashMail/react
RUN yarn build 
RUN rm -rf ../mailserver/src/build/* && mkdir -p ../mailserver/src/build/ && cp -r build/* ../mailserver/src/build/

# Define mountable volume
VOLUME ["/React-TrashMail/mailserver/attachments"]

# Copy startup script
COPY docker_start.sh /docker_start.sh
RUN chmod +x /docker_start.sh

# Set the health check
COPY healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD /healthcheck.sh

# Set the command to start the application using the startup script
CMD ["/docker_start.sh"]
