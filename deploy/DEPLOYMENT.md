# VoiceBridge - DigitalOcean Deployment Guide

## Quick Start

### Prerequisites

1. **DigitalOcean Account** - [Sign up](https://cloud.digitalocean.com/registrations/new)
2. **doctl CLI** - [Install](https://docs.digitalocean.com/reference/doctl/how-to/install/)
3. **GitHub Repository** - Push your code to GitHub

### Step 1: Install & Authenticate doctl

```bash
# Windows (using Chocolatey)
choco install doctl

# Or download from: https://github.com/digitalocean/doctl/releases

# Authenticate
doctl auth init
# Enter your API token from: https://cloud.digitalocean.com/account/api/tokens
```

### Step 2: Create Resources

```bash
# Run the setup script
chmod +x deploy/digitalocean-setup.sh
./deploy/digitalocean-setup.sh
```

Or manually:

```bash
# Create PostgreSQL Database
doctl databases create voicebridge-db \
    --engine pg \
    --version 15 \
    --region blr1 \
    --size db-s-1vcpu-1gb \
    --num-nodes 1

# Create Redis
doctl databases create voicebridge-redis \
    --engine redis \
    --version 7 \
    --region blr1 \
    --size db-s-1vcpu-1gb \
    --num-nodes 1

# Create Spaces bucket
doctl spaces create voicebridge-uploads --region blr1

# Create App
doctl apps create --spec .do/app.yaml
```

### Step 3: Configure Secrets

Go to **DigitalOcean Console > Apps > voicebridge > Settings > Environment Variables**

Add these secrets:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Random 32+ char string |
| `OPENAI_API_KEY` | OpenAI API key |
| `DEEPGRAM_API_KEY` | Deepgram API key |
| `SARVAM_API_KEY` | Sarvam AI key |
| `DO_SPACES_KEY` | Spaces access key |
| `DO_SPACES_SECRET` | Spaces secret key |

### Step 4: Deploy

```bash
# Get app ID
APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep voicebridge | awk '{print $1}')

# Trigger deployment
doctl apps create-deployment $APP_ID
```

Or push to GitHub (auto-deploys if GitHub Actions is configured).

---

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │         DigitalOcean Cloud          │
                    └─────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│  Static Site  │          │  App Service  │          │   Managed DB  │
│   (Frontend)  │─────────▶│   (Backend)   │─────────▶│  PostgreSQL   │
│    React      │          │   Node.js     │          │               │
└───────────────┘          └───────────────┘          └───────────────┘
                                  │                          │
                                  │                          │
                           ┌──────┴──────┐                   │
                           │   Managed   │                   │
                           │    Redis    │◀──────────────────┘
                           └─────────────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │   Spaces    │
                           │  (Storage)  │
                           └─────────────┘
```

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL URL | `postgresql://...` |
| `REDIS_URL` | Redis URL | `rediss://...` |
| `JWT_SECRET` | Auth secret | `random-32-char-string` |
| `OPENAI_API_KEY` | OpenAI key | `sk-...` |

### AI Services (Optional)

| Variable | Description |
|----------|-------------|
| `DEEPGRAM_API_KEY` | Speech-to-text |
| `SARVAM_API_KEY` | Indian languages |
| `ELEVENLABS_API_KEY` | Premium TTS |
| `ANTHROPIC_API_KEY` | Claude AI |
| `GOOGLE_AI_API_KEY` | Gemini AI |
| `GROQ_API_KEY` | Fast inference |

### Storage

| Variable | Description |
|----------|-------------|
| `DO_SPACES_KEY` | Spaces access key |
| `DO_SPACES_SECRET` | Spaces secret |
| `DO_SPACES_BUCKET` | Bucket name |
| `DO_SPACES_REGION` | Region (blr1) |

### Telephony

| Variable | Description |
|----------|-------------|
| `PLIVO_AUTH_ID` | Plivo auth |
| `PLIVO_AUTH_TOKEN` | Plivo token |
| `EXOTEL_SID` | Exotel SID |
| `EXOTEL_API_KEY` | Exotel key |

---

## CI/CD with GitHub Actions

### Setup

1. Go to **GitHub > Settings > Secrets**
2. Add secret: `DIGITALOCEAN_ACCESS_TOKEN`
3. Push to `main` branch to trigger deployment

### Manual Deployment

```bash
# Trigger deployment manually
gh workflow run deploy-digitalocean.yml
```

---

## Scaling

### Horizontal Scaling (More Instances)

```bash
# Update app spec
doctl apps update $APP_ID --spec .do/app.yaml
```

Edit `.do/app.yaml`:
```yaml
services:
  - name: api
    instance_count: 5  # Increase from 2
    instance_size_slug: professional-s  # Upgrade from xs
```

### Vertical Scaling (Bigger Instances)

| Size | vCPU | RAM | Monthly Cost |
|------|------|-----|--------------|
| `professional-xs` | 1 | 1GB | $12 |
| `professional-s` | 1 | 2GB | $25 |
| `professional-m` | 2 | 4GB | $50 |
| `professional-l` | 4 | 8GB | $100 |

### Database Scaling

```bash
# Upgrade database
doctl databases resize voicebridge-db --size db-s-2vcpu-4gb
```

---

## Monitoring

### View Logs

```bash
# Stream logs
doctl apps logs $APP_ID --follow

# Backend logs only
doctl apps logs $APP_ID --component api --follow
```

### Metrics

- Go to **DigitalOcean > Apps > voicebridge > Insights**
- Monitor: CPU, Memory, Request Rate, Response Time

---

## Troubleshooting

### Deployment Failed

```bash
# Check deployment logs
doctl apps logs $APP_ID --type deploy

# Check build logs
doctl apps logs $APP_ID --type build
```

### Database Connection Issues

```bash
# Test connection
doctl databases connection $DB_ID

# Check firewall
doctl databases firewalls list $DB_ID
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Build fails | Check Node.js version in Dockerfile |
| DB connection refused | Add app to trusted sources in DB settings |
| Prisma migration fails | Run `npx prisma migrate deploy` manually |
| Out of memory | Upgrade instance size |

---

## Cost Optimization

### Tips

1. **Use Basic DB tier** for development
2. **Enable auto-scaling** min=1, max=10
3. **Use Spaces CDN** (free) instead of paid CDN
4. **Monitor bandwidth** - first 1TB is free

### Estimated Costs

| Component | Development | Production |
|-----------|-------------|------------|
| App Service | $12/mo | $50-100/mo |
| PostgreSQL | $15/mo | $50-100/mo |
| Redis | $15/mo | $30-50/mo |
| Spaces | $5/mo | $20/mo |
| **Total** | **~$47/mo** | **~$200/mo** |

---

## Backup & Recovery

### Database Backup

```bash
# Create manual backup
doctl databases backups create $DB_ID

# List backups
doctl databases backups list $DB_ID

# Restore from backup
doctl databases backups restore $DB_ID --backup-id $BACKUP_ID
```

### Spaces Backup

Enable versioning in Spaces settings for automatic file versioning.

---

## Support

- **DigitalOcean Docs**: https://docs.digitalocean.com/
- **Community**: https://www.digitalocean.com/community
- **Support Ticket**: https://cloud.digitalocean.com/support
