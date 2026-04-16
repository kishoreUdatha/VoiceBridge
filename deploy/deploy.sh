#!/bin/bash

# VoiceBridge Deployment Script
# Run this in the project directory after initial setup

set -e

echo "=========================================="
echo "VoiceBridge Deployment"
echo "=========================================="

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "ERROR: .env.production not found!"
    echo "Copy deploy/env.production.template to .env.production and fill in your values"
    exit 1
fi

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Build and start containers
echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production down
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Run migrations
echo "Running database migrations..."
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Show status
echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
docker compose -f docker-compose.prod.yml ps

echo ""
echo "Check logs with: docker compose -f docker-compose.prod.yml logs -f"
