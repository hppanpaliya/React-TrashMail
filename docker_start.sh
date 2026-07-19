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

    # Set environment variables in react
    cd /React-TrashMail/react

    # NOTE: deliberately npx, not `pnpm exec`. The image deletes
    # react/node_modules after the Vite build, so pnpm exec cannot resolve
    # react-inject-env here; npx fetches it on demand at first start.
    npx react-inject-env set || true
    mv ./build/env.js ../mailserver/src/build/ || true

    # Create the flag file to indicate completion of first run
    touch "$FIRST_RUN_FLAG"
fi

# Create .env file for mailserver with all required variables.
# Written with a restrictive umask + chmod 600 so secrets are never
# world/group-readable on the container filesystem. JWT_SECRET gets no
# insecure default: the app itself refuses to start without a real secret
# outside NODE_ENV=development.
ENV_FILE=/React-TrashMail/mailserver/.env
(
  umask 077
  cat > "$ENV_FILE" << EOF
PORT=${PORT:-4000}
# Default to the mongo-compose service, but allow overriding via env (for cloud)
MONGO_URI=${MONGO_URI:-mongodb://mongo:27017}
DB_NAME=${DB_NAME:-trashmail}
SMTP_PORT=${SMTP_PORT:-25}
ALLOWED_DOMAINS=${ALLOWED_DOMAINS:-example.com}
${JWT_SECRET:+JWT_SECRET=${JWT_SECRET}}
JWT_EXPIRY=${JWT_EXPIRY:-24h}
BCRYPT_SALT_ROUNDS=${BCRYPT_SALT_ROUNDS:-10}
EMAIL_RETENTION_DAYS=${EMAIL_RETENTION_DAYS:-30}
EOF
)
chmod 600 "$ENV_FILE"

# If the DB is remote and requires setup you may want to wait or run migrations here
# (pnpm is available at runtime via corepack, enabled in the Dockerfile)
cd /React-TrashMail/mailserver && pnpm run create-invite-admin || true

# Start the application.
# NOTE: run node directly, not `pm2-runtime start yarn`. PM2 launches its
# target with Node in fork mode, so pointing it at the `yarn` shell script
# made Node try to parse shell as JS ("SyntaxError: missing ) after argument
# list") and crash-loop forever. `start:docker` is just `node server.js`.
cd /React-TrashMail/mailserver
PM2_HOME=/React-TrashMail/mailserver pm2-runtime start server.js --name mailserver
