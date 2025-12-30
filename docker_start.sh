#!/bin/bash

# Start MongoDB in the background
mongod --fork --logpath /var/log/mongod.log

# Path to a flag file that indicates the first run is completed
FIRST_RUN_FLAG="/React-TrashMail/.first-run-complete"

# Check if it's the first run
if [ ! -f "$FIRST_RUN_FLAG" ]; then
    # Create .env file with runtime environment variables for React
    echo "REACT_APP_API_URL=$REACT_APP_API_URL" > /React-TrashMail/react/.env
    echo "REACT_APP_DOMAINS=$REACT_APP_DOMAINS" >> /React-TrashMail/react/.env

    pm2-runtime stop yarn -- start

    # Set environment variables in react
    cd /React-TrashMail/react
    
    npx react-inject-env set
    mv ./build/env.js ../mailserver/src/build/

    # Create the flag file to indicate completion of first run
    touch "$FIRST_RUN_FLAG"
fi

# Create .env file for mailserver with all required variables
cat > /React-TrashMail/mailserver/.env << EOF
PORT=${PORT:-4000}
MONGO_URI=${MONGO_URI:-mongodb://localhost:27017}
DB_NAME=${DB_NAME:-trashmail}
SMTP_PORT=${SMTP_PORT:-25}
ALLOWED_DOMAINS=${ALLOWED_DOMAINS:-example.com}
JWT_SECRET=${JWT_SECRET:-your-secret-key-change-this-in-prod}
JWT_EXPIRY=${JWT_EXPIRY:-24h}
BCRYPT_SALT_ROUNDS=${BCRYPT_SALT_ROUNDS:-10}
EMAIL_RETENTION_DAYS=${EMAIL_RETENTION_DAYS:-30}
EOF

cd /React-TrashMail/mailserver && npm run create-invite-admin

# Start the application
cd /React-TrashMail/mailserver
PM2_HOME=/React-TrashMail/mailserver pm2-runtime start yarn -- start:docker
