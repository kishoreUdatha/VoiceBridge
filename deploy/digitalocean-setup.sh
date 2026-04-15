#!/bin/bash

# ================================================================
# VoiceBridge - DigitalOcean Setup Script
# ================================================================
# Prerequisites:
#   1. Install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/
#   2. Authenticate: doctl auth init
# ================================================================

set -e

# Configuration
APP_NAME="voicebridge"
REGION="blr1"  # Bangalore
GITHUB_REPO="kishoreUdatha/VoiceBridge"

echo "=========================================="
echo "  VoiceBridge - DigitalOcean Setup"
echo "=========================================="

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "Error: doctl is not installed. Install it from:"
    echo "https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check authentication
echo "Checking DigitalOcean authentication..."
doctl account get || {
    echo "Error: Not authenticated. Run: doctl auth init"
    exit 1
}

echo ""
echo "Step 1: Creating Spaces bucket for file uploads..."
echo "---------------------------------------------------"
doctl spaces create ${APP_NAME}-uploads --region ${REGION} 2>/dev/null || echo "Bucket may already exist"

echo ""
echo "Step 2: Creating Managed PostgreSQL Database..."
echo "---------------------------------------------------"
doctl databases create ${APP_NAME}-db \
    --engine pg \
    --version 15 \
    --region ${REGION} \
    --size db-s-1vcpu-1gb \
    --num-nodes 1 \
    2>/dev/null || echo "Database may already exist"

echo ""
echo "Step 3: Creating Managed Redis..."
echo "---------------------------------------------------"
doctl databases create ${APP_NAME}-redis \
    --engine redis \
    --version 7 \
    --region ${REGION} \
    --size db-s-1vcpu-1gb \
    --num-nodes 1 \
    2>/dev/null || echo "Redis may already exist"

echo ""
echo "Step 4: Getting connection strings..."
echo "---------------------------------------------------"

# Wait for databases to be ready
echo "Waiting for databases to be ready (this may take a few minutes)..."
sleep 60

# Get database connection string
DB_ID=$(doctl databases list --format ID,Name --no-header | grep ${APP_NAME}-db | awk '{print $1}')
if [ -n "$DB_ID" ]; then
    DB_URL=$(doctl databases connection $DB_ID --format URI --no-header)
    echo "PostgreSQL URL: $DB_URL"
fi

# Get Redis connection string
REDIS_ID=$(doctl databases list --format ID,Name --no-header | grep ${APP_NAME}-redis | awk '{print $1}')
if [ -n "$REDIS_ID" ]; then
    REDIS_URL=$(doctl databases connection $REDIS_ID --format URI --no-header)
    echo "Redis URL: $REDIS_URL"
fi

echo ""
echo "Step 5: Creating App Platform application..."
echo "---------------------------------------------------"

# Create app from spec
doctl apps create --spec .do/app.yaml 2>/dev/null || echo "App may already exist"

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Go to DigitalOcean Console: https://cloud.digitalocean.com/apps"
echo "2. Find your app: ${APP_NAME}"
echo "3. Add the following environment variables as secrets:"
echo ""
echo "   DATABASE_URL     = $DB_URL"
echo "   REDIS_URL        = $REDIS_URL"
echo "   JWT_SECRET       = $(openssl rand -base64 32)"
echo "   OPENAI_API_KEY   = <your-key>"
echo "   DEEPGRAM_API_KEY = <your-key>"
echo "   SARVAM_API_KEY   = <your-key>"
echo ""
echo "4. Create Spaces access keys:"
echo "   - Go to API > Spaces Keys"
echo "   - Generate new key"
echo "   - Add DO_SPACES_KEY and DO_SPACES_SECRET"
echo ""
echo "5. Deploy the app!"
echo ""
