#!/bin/bash

# VoiceBridge - AWS EC2 Setup Script
# Run this on a fresh Ubuntu 24.04 EC2 instance as root/ubuntu user

set -e

echo "=========================================="
echo "VoiceBridge AWS EC2 Setup"
echo "=========================================="

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo: sudo bash setup-ec2.sh"
  exit 1
fi

echo "Step 1: Updating system..."
apt update && apt upgrade -y

echo "Step 2: Installing Docker..."
curl -fsSL https://get.docker.com | sh

echo "Step 3: Installing Docker Compose..."
apt install docker-compose-plugin -y

echo "Step 4: Installing additional tools..."
apt install -y git nginx certbot python3-certbot-nginx ufw htop

echo "Step 5: Adding ubuntu user to docker group..."
usermod -aG docker ubuntu

echo "Step 6: Setting up firewall..."
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw allow 3000
ufw --force enable

echo "Step 7: Creating app directory..."
mkdir -p /opt/voicebridge
chown ubuntu:ubuntu /opt/voicebridge

echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Exit and reconnect: exit && ssh -i your-key.pem ubuntu@YOUR_EC2_IP"
echo "2. Clone repo: cd /opt/voicebridge && git clone YOUR_REPO_URL ."
echo "3. Create .env.production file"
echo "4. Run: docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build"
echo "=========================================="
