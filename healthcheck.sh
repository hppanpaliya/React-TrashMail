#!/bin/bash

# Healthcheck: verify the backend HTTP endpoint is serving
# Note: DB health is provided by the DB container when using docker-compose
if ! curl -f http://localhost:4000/ > /dev/null 2>&1; then
  echo "Backend is down"
  exit 1
fi

echo "Backend is up"
exit 0
