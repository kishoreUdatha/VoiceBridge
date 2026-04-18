# MyLeadX AWS EC2 Deployment Guide

## Prerequisites

- AWS Account
- Domain: myleadx.ai (DNS access)
- SSH key pair for EC2

---

## Step 1: Launch EC2 Instance

### Recommended Instance
- **Type**: t3.medium (2 vCPU, 4GB RAM) or t3.large for production
- **AMI**: Ubuntu 22.04 LTS
- **Storage**: 30GB+ SSD
- **Region**: ap-south-1 (Mumbai) for Indian users

### Security Group Rules
| Type | Port | Source | Description |
|------|------|--------|-------------|
| SSH | 22 | Your IP | SSH access |
| HTTP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | 443 | 0.0.0.0/0 | Secure web traffic |

---

## Step 2: Configure DNS

Add these records at your domain registrar:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_EC2_PUBLIC_IP | 300 |
| A | app | YOUR_EC2_PUBLIC_IP | 300 |
| A | api | YOUR_EC2_PUBLIC_IP | 300 |
| A | * | YOUR_EC2_PUBLIC_IP | 300 |

---

## Step 3: Connect to EC2 and Install Dependencies

```bash
# Connect to your EC2 instance
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Logout and login again for docker group
exit
```

---

## Step 4: Clone and Configure Project

```bash
# Reconnect
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Clone repository
git clone https://github.com/YOUR_USERNAME/VoiceBridge.git myleadx
cd myleadx

# Create production environment file
cp .env.production.example .env.production
nano .env.production
```

### Fill in .env.production:
```env
POSTGRES_PASSWORD=generate_secure_password
JWT_SECRET=generate_32_char_secret
JWT_REFRESH_SECRET=generate_32_char_secret
CREDENTIALS_ENCRYPTION_KEY=generate_32_char_key
OPENAI_API_KEY=sk-your-key
# ... other keys
```

Generate secrets:
```bash
openssl rand -hex 32  # For JWT secrets
openssl rand -hex 16  # For encryption key
```

---

## Step 5: Initial SSL Setup

```bash
# Make scripts executable
chmod +x deploy.sh setup-ssl.sh

# Setup SSL certificate (requires DNS to be configured first)
./setup-ssl.sh
```

---

## Step 6: Deploy Application

```bash
./deploy.sh
```

---

## Step 7: Verify Deployment

```bash
# Check containers
docker ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Test endpoints
curl https://api.myleadx.ai/api/health
curl https://app.myleadx.ai
```

---

## Useful Commands

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Database shell
docker exec -it myleadx-postgres psql -U myleadx -d myleadx

# Backend shell
docker exec -it myleadx-backend sh

# Run migrations manually
docker exec myleadx-backend npx prisma migrate deploy

# Seed database
docker exec myleadx-backend npx prisma db seed
```

---

## Updating the Application

```bash
cd ~/myleadx
git pull origin main
./deploy.sh
```

---

## Backup Database

```bash
# Create backup
docker exec myleadx-postgres pg_dump -U myleadx myleadx > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i myleadx-postgres psql -U myleadx myleadx < backup_20240101.sql
```

---

## Monitoring

### Check disk space
```bash
df -h
```

### Check memory
```bash
free -h
```

### Check container resource usage
```bash
docker stats
```

---

## Troubleshooting

### Container won't start
```bash
docker-compose -f docker-compose.prod.yml logs backend
```

### Database connection issues
```bash
docker exec myleadx-backend nc -zv postgres 5432
```

### SSL certificate issues
```bash
docker exec myleadx-certbot certbot certificates
```

### Renew SSL manually
```bash
docker exec myleadx-certbot certbot renew --force-renewal
docker-compose -f docker-compose.prod.yml restart nginx
```
