# VoiceBridge Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables (REQUIRED)

Set these environment variables before deploying:

```bash
# CRITICAL - Must be set in production
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/voicebridge?connection_limit=20&pool_timeout=20
JWT_SECRET=<min-32-char-secure-random-string>
JWT_REFRESH_SECRET=<min-32-char-secure-random-string>
BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com,https://yourdomain.com

# Generate secure secrets with:
openssl rand -base64 64
```

### 2. Database Setup

```bash
# Run migrations (NOT db push)
npx prisma migrate deploy

# Verify migrations applied
npx prisma migrate status
```

### 3. Build Process

```bash
# Install dependencies
npm ci --only=production

# Generate Prisma client
npx prisma generate

# Build TypeScript
npm run build

# Start production server
NODE_ENV=production node dist/index.js
```

### 4. Docker Deployment

Use the production Dockerfile:

```bash
# Build production image
docker build -f Dockerfile.production -t voicebridge-backend:latest .

# Run with docker-compose
docker-compose -f docker-compose.production.yml up -d
```

### 5. Health Checks

Verify these endpoints after deployment:

| Endpoint | Purpose | Expected |
|----------|---------|----------|
| `GET /health/live` | Kubernetes liveness | `200 OK` |
| `GET /health/ready` | Kubernetes readiness | `200 OK` (DB connected) |
| `GET /health/detailed` | Full status | All services healthy |

### 6. Security Checklist

- [ ] JWT_SECRET is unique and secure (32+ chars)
- [ ] JWT_REFRESH_SECRET is unique and secure (32+ chars)
- [ ] CORS_ORIGINS set to allowed domains only
- [ ] DATABASE_URL uses SSL (`?sslmode=require`)
- [ ] All API keys are production keys (not test/sandbox)
- [ ] Rate limiting enabled (default in production)
- [ ] HTTPS enforced (via reverse proxy)

### 7. Monitoring Setup

- [ ] Set up error tracking (Sentry, DataDog, etc.)
- [ ] Configure log aggregation
- [ ] Set up uptime monitoring
- [ ] Configure alerting for:
  - Health check failures
  - Error rate spikes
  - Memory/CPU thresholds

### 8. Backup Strategy

- [ ] Database automated backups enabled
- [ ] Point-in-time recovery configured
- [ ] Backup retention policy set (30+ days recommended)
- [ ] Backup restoration tested

## Post-Deployment Verification

```bash
# Check health
curl https://api.yourdomain.com/health/ready

# Check logs for errors
docker logs voicebridge-backend --tail 100

# Verify database connection
curl https://api.yourdomain.com/health/detailed
```

## Rollback Procedure

```bash
# If issues occur, rollback to previous version
docker-compose -f docker-compose.production.yml down
docker tag voicebridge-backend:previous voicebridge-backend:latest
docker-compose -f docker-compose.production.yml up -d

# Rollback database if needed
npx prisma migrate resolve --rolled-back <migration-name>
```

## Environment-Specific Configuration

### Staging
```
NODE_ENV=staging
# Use staging API keys
# Use staging database
```

### Production
```
NODE_ENV=production
# Use production API keys
# Use production database with read replicas
```

## Optional Services Configuration

| Service | Required | Purpose |
|---------|----------|---------|
| OpenAI | For AI features | Voice agents, chatbots |
| Twilio/Plivo/Exotel | For calls | Voice, SMS, WhatsApp |
| Razorpay | For payments | Subscriptions, billing |
| AWS S3 | For storage | File uploads, recordings |
| Redis | For caching | Job queues, rate limiting |
| SMTP | For email | Notifications, reports |

## Performance Tuning

### Database Connection Pool
Add to DATABASE_URL:
```
?connection_limit=20&pool_timeout=20
```

### Node.js Memory
```bash
NODE_OPTIONS="--max-old-space-size=2048"
```

### PM2 Configuration (Alternative to Docker)
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'voicebridge-api',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

## Support

For issues, check:
1. Application logs
2. Health endpoints
3. Database connectivity
4. External service status (Twilio, OpenAI, etc.)
