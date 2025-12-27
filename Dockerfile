# Start with the official MongoDB image
FROM mongo:latest

RUN apt-get update

# Install Node.js and Git
RUN apt-get install -y curl gnupg git
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash
RUN apt-get install -y nodejs

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
RUN rm -rf /React-TrashMail/react/node_modules/

WORKDIR /React-TrashMail/mailserver
RUN rm -rf src/build/*
RUN mkdir -p src/build
RUN cp -r ../react/build/* src/build/

RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Define mountable volume
VOLUME ["/React-TrashMail/mailserver/src/attachments"]

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
