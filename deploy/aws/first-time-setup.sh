#!/bin/bash

# VoiceBridge - AWS EC2 First-Time Setup
# Run this ONCE on a fresh EC2 instance before CI/CD can deploy
# Usage: curl -sSL https://raw.githubusercontent.com/kishoreUdatha/VoiceBridge/main/deploy/aws/first-time-setup.sh | sudo bash

set -e

echo "=========================================="
echo "VoiceBridge AWS EC2 First-Time Setup"
echo "=========================================="

# Variables
APP_DIR="/opt/voicebridge"
REPO_URL="https://github.com/kishoreUdatha/VoiceBridge.git"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo"
  exit 1
fi

echo "[1/8] Updating system..."
apt update && apt upgrade -y

echo "[2/8] Installing Docker..."
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

echo "[3/8] Installing Docker Compose..."
apt install docker-compose-plugin -y

echo "[4/8] Installing tools..."
apt install -y git nginx certbot python3-certbot-nginx ufw htop

echo "[5/8] Setting up firewall..."
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw allow 3000
ufw --force enable

echo "[6/8] Cloning repository..."
mkdir -p $APP_DIR
git clone $REPO_URL $APP_DIR
chown -R ubuntu:ubuntu $APP_DIR

echo "[7/8] Creating environment file..."
cp $APP_DIR/deploy/aws/env.aws.template $APP_DIR/.env.production
chown ubuntu:ubuntu $APP_DIR/.env.production

echo "[8/8] Setting permissions..."
chmod +x $APP_DIR/deploy/aws/*.sh

echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "IMPORTANT: Complete these steps manually:"
echo ""
echo "1. Edit environment file with your EC2 IP:"
echo "   sudo nano $APP_DIR/.env.production"
echo "   Replace YOUR_EC2_IP with your actual IP"
echo ""
echo "2. Add GitHub Secrets (in your repo settings):"
echo "   - EC2_HOST: Your EC2 public IP"
echo "   - EC2_SSH_KEY: Contents of your .pem file"
echo "   - VITE_API_URL: http://YOUR_EC2_IP/api"
echo ""
echo "3. First deploy (run as ubuntu user):"
echo "   su - ubuntu"
echo "   cd $APP_DIR"
echo "   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build"
echo ""
echo "4. After first deploy works, push to main branch"
echo "   and CI/CD will auto-deploy!"
echo "=========================================="
