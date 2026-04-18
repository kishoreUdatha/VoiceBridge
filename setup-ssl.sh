#!/bin/bash
# =============================================================================
# SSL Certificate Setup for MyLeadX using Let's Encrypt
# =============================================================================

set -e

DOMAIN="myleadx.ai"
EMAIL="admin@myleadx.ai"  # Change this to your email

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SSL Certificate Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Create directories
mkdir -p certbot/conf certbot/www

# Create temporary nginx config for initial certificate
step() {
    echo -e "\n${YELLOW}➜ $1${NC}"
}

step "Creating temporary nginx config..."
cat > nginx/conf.d/myleadx-temp.conf << 'NGINX'
server {
    listen 80;
    server_name myleadx.ai *.myleadx.ai;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'MyLeadX - SSL Setup in progress';
        add_header Content-Type text/plain;
    }
}
NGINX

# Remove production config temporarily
if [ -f nginx/conf.d/myleadx.conf ]; then
    mv nginx/conf.d/myleadx.conf nginx/conf.d/myleadx.conf.bak
fi

step "Starting nginx for certificate verification..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d nginx

sleep 5

step "Requesting SSL certificate..."
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d *.$DOMAIN

step "Restoring production nginx config..."
rm nginx/conf.d/myleadx-temp.conf
if [ -f nginx/conf.d/myleadx.conf.bak ]; then
    mv nginx/conf.d/myleadx.conf.bak nginx/conf.d/myleadx.conf
fi

step "Reloading nginx with SSL..."
docker-compose -f docker-compose.prod.yml --env-file .env.production restart nginx

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  SSL Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Certificate location: ./certbot/conf/live/$DOMAIN/"
echo -e ""
echo -e "Certificate will auto-renew via certbot container"
