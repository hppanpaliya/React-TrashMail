# Start with the official MongoDB image
FROM mongo:latest

# Install Node.js
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -sL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs git

# Clone the repository
RUN git clone https://github.com/hppanpaliya/React-TrashMail

# Set arguments for environment variables
ARG REACT_APP_API_URL
ARG REACT_APP_DOMAINS

# Check if REACT_APP_DOMAINS is set
RUN if [ -z "$REACT_APP_DOMAINS" ] ; then echo "REACT_APP_DOMAINS argument not provided" && exit 1; fi

# Create .env file
RUN echo "REACT_APP_API_URL=$REACT_APP_API_URL\nREACT_APP_DOMAINS=$REACT_APP_DOMAINS" > /React-TrashMail/react/.env

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
CMD ["sh", "-c", "pm2-runtime start yarn -- start"]
