#!/bin/bash

# NOTE: This startup script no longer starts an embedded MongoDB.
# The service should get its DB from the MONGO_URI environment variable (e.g. mongodb://mongo:27017)

# Path to a flag file that indicates the first run is completed
FIRST_RUN_FLAG="/React-TrashMail/.first-run-complete"

# Check if it's the first run
if [ ! -f "$FIRST_RUN_FLAG" ]; then
    # Create .env file with runtime environment variables for React
    echo "REACT_APP_API_URL=$REACT_APP_API_URL" > /React-TrashMail/react/.env
    echo "REACT_APP_DOMAINS=$REACT_APP_DOMAINS" >> /React-TrashMail/react/.env

    pm2-runtime stop yarn -- start || true

    # Set environment variables in react
    cd /React-TrashMail/react
    
    npx react-inject-env set || true
    mv ./build/env.js ../mailserver/src/build/ || true

    # Create the flag file to indicate completion of first run
    touch "$FIRST_RUN_FLAG"
fi

# Create .env file for mailserver with all required variables
cat > /React-TrashMail/mailserver/.env << EOF
PORT=${PORT:-4000}
# Default to the mongo-compose service, but allow overriding via env (for cloud)
MONGO_URI=${MONGO_URI:-mongodb://mongo:27017}
DB_NAME=${DB_NAME:-trashmail}
SMTP_PORT=${SMTP_PORT:-25}
ALLOWED_DOMAINS=${ALLOWED_DOMAINS:-example.com}
JWT_SECRET=${JWT_SECRET:-your-secret-key-change-this-in-prod}
JWT_EXPIRY=${JWT_EXPIRY:-24h}
BCRYPT_SALT_ROUNDS=${BCRYPT_SALT_ROUNDS:-10}
EMAIL_RETENTION_DAYS=${EMAIL_RETENTION_DAYS:-30}
EOF

# If the DB is remote and requires setup you may want to wait or run migrations here
cd /React-TrashMail/mailserver && npm run create-invite-admin || true

# Start the application (uses start:docker script)
cd /React-TrashMail/mailserver
PM2_HOME=/React-TrashMail/mailserver pm2-runtime start yarn -- start:docker
