#!/bin/bash

# VoiceBridge - DigitalOcean Droplet Setup Script
# Run this script on a fresh Ubuntu 24.04 droplet as root

set -e

echo "=========================================="
echo "VoiceBridge Droplet Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 1: Updating system...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}Step 2: Installing Docker...${NC}"
curl -fsSL https://get.docker.com | sh

echo -e "${YELLOW}Step 3: Installing Docker Compose plugin...${NC}"
apt install docker-compose-plugin -y

echo -e "${YELLOW}Step 4: Installing additional tools...${NC}"
apt install -y git nginx certbot python3-certbot-nginx ufw htop

echo -e "${YELLOW}Step 5: Creating deploy user...${NC}"
if id "deploy" &>/dev/null; then
    echo "User 'deploy' already exists"
else
    useradd -m -s /bin/bash deploy
    usermod -aG sudo deploy
    usermod -aG docker deploy
    echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/deploy
fi

echo -e "${YELLOW}Step 6: Setting up firewall...${NC}"
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw allow 3000
ufw --force enable

echo -e "${YELLOW}Step 7: Creating app directory...${NC}"
mkdir -p /opt/voicebridge
chown deploy:deploy /opt/voicebridge

echo -e "${GREEN}=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Switch to deploy user: su - deploy"
echo "2. Clone your repo: cd /opt/voicebridge && git clone YOUR_REPO_URL ."
echo "3. Create .env.production file"
echo "4. Run: docker compose -f docker-compose.prod.yml up -d"
echo "==========================================${NC}"
