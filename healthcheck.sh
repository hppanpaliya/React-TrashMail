#!/bin/bash

# Check MongoDB
if ! mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
  echo "MongoDB is down"
  exit 1
fi

# Check Backend
if ! curl -f http://localhost:4000/ > /dev/null 2>&1; then
  echo "Backend is down"
  exit 1
fi

echo "All services are running"
exit 0
