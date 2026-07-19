#!/bin/bash

# Healthcheck: /health verifies the backend AND its MongoDB connection
# (a plain GET / would serve the static SPA even with the DB down).
if ! curl -f http://localhost:4000/health > /dev/null 2>&1; then
  echo "Backend is down"
  exit 1
fi

echo "Backend is up"
exit 0
