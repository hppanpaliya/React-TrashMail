#!/bin/bash

# Start MongoDB in the background
mongod --fork --logpath /var/log/mongod.log

# Path to a flag file that indicates the first run is completed
FIRST_RUN_FLAG="/React-TrashMail/.first-run-complete"


# Check if it's the first run
if [ ! -f "$FIRST_RUN_FLAG" ]; then
    # Create .env file with runtime environment variables
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

# Start the application
cd /React-TrashMail/mailserver
PM2_HOME=/React-TrashMail/mailserver pm2-runtime start yarn -- start:docker
