#!/bin/bash
# =============================================================================
# MyLeadX Deployment Script for AWS EC2
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  MyLeadX Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production not found!${NC}"
    echo "Copy .env.production.example to .env.production and fill in the values"
    exit 1
fi

# Function to display step
step() {
    echo -e "\n${YELLOW}➜ $1${NC}"
}

# Pull latest code
step "Pulling latest code..."
git pull origin main

# Build and start containers
step "Building and starting containers..."
docker-compose -f docker-compose.prod.yml --env-file .env.production build
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Wait for services to be healthy
step "Waiting for services to start..."
sleep 10

# Run database migrations
step "Running database migrations..."
docker exec myleadx-backend npx prisma migrate deploy

# Show status
step "Checking container status..."
docker-compose -f docker-compose.prod.yml ps

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Frontend: https://app.myleadx.ai"
echo -e "API: https://api.myleadx.ai"
echo -e ""
echo -e "View logs: docker-compose -f docker-compose.prod.yml logs -f"
