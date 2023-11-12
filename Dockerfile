# Start with the official MongoDB image
FROM mongo:latest

# Install Node.js
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -sL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Clone the repository
RUN git clone https://github.com/hppanpaliya/React-TrashMail

# Build the React project
WORKDIR /React-TrashMail/react
RUN yarn && \
    yarn run build

# Install dependencies for the mailserver
WORKDIR /React-TrashMail/mailserver
RUN yarn

# Install pm2 globally
RUN npm install -g pm2

# Define mountable volume
VOLUME ["/React-TrashMail/mailserver/attachments"]

# Set the command to start MongoDB and the mail server
CMD ["sh", "-c", "rc-service mongodb start && pm2-runtime start yarn -- start"]
