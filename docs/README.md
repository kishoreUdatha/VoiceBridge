# VoiceBridge CRM - Documentation

## Overview

VoiceBridge is an enterprise-grade, AI-powered CRM platform designed for lead generation, management, and conversion. It combines cutting-edge voice AI capabilities with traditional CRM features, supporting multiple industries including Education, Real Estate, Healthcare, Insurance, Finance, IT Recruitment, and E-commerce.

## Quick Links

- [Architecture Overview](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Features Guide](./FEATURES.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Testing Guide](./TESTING.md)
- [User Guide](./USER_GUIDE.md)

## Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Queue:** Bull (Redis-based)
- **Real-time:** Socket.io, Server-Sent Events

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **State Management:** Redux Toolkit
- **Styling:** TailwindCSS
- **Charts:** Chart.js, Recharts
- **Forms:** React Hook Form

### Mobile Applications
- **Telecaller App:** React Native
- **Field Sales App:** Expo / React Native

### AI & Voice
- OpenAI (GPT-4, Whisper, TTS)
- Anthropic Claude
- Groq (Fast inference)
- Sarvam AI (Indian languages)
- ElevenLabs (Premium TTS)
- Google Generative AI

### Telephony
- Exotel (India)
- Twilio (Global)
- Plivo (India/Global)
- MSG91 (SMS)

### Integrations
- Razorpay (Payments)
- AWS S3 (Storage)
- AWS SES (Email)
- Firebase (Push notifications)
- Salesforce, HubSpot, Pipedrive (CRM)
- Facebook, Instagram, LinkedIn, Google, YouTube, Twitter, TikTok (Ads)

## Project Structure

```
VoiceBridge/
├── backend/                 # Node.js + Express API server
│   ├── prisma/             # Database schema & migrations
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── middlewares/    # Express middlewares
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   └── scripts/            # Utility scripts
│
├── frontend/               # React + Vite web application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── layouts/        # Page layouts
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client services
│   │   ├── store/          # Redux store & slices
│   │   └── utils/          # Utility functions
│   └── e2e/                # Playwright E2E tests
│
├── mobile/                 # Field Sales Expo app
│   └── src/
│       ├── navigation/     # Navigation setup
│       ├── screens/        # Screen components
│       ├── services/       # API services
│       └── store/          # Redux store
│
├── telecaller-app/         # Telecaller React Native app
│   └── src/
│       ├── navigation/     # Navigation setup
│       ├── screens/        # Screen components
│       ├── services/       # API services
│       └── components/     # UI components
│
└── docs/                   # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for queues)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VoiceBridge
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Setup database**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Start backend server**
   ```bash
   npm run dev
   ```

6. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

7. **Start frontend**
   ```bash
   npm run dev
   ```

### Environment Variables

Key environment variables for backend:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/voicebridge

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GROQ_API_KEY=gsk_...

# Telephony
EXOTEL_SID=...
EXOTEL_TOKEN=...
PLIVO_AUTH_ID=...
PLIVO_AUTH_TOKEN=...

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...

# Payment
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
```

## Key Features Summary

| Category | Features |
|----------|----------|
| Lead Management | Lead lifecycle, scoring, deduplication, workflows, routing |
| Voice AI | AI agents, call flows, inbound/outbound, transcription, TTS |
| Campaigns | SMS, Email, WhatsApp campaigns with scheduling |
| Field Sales | College management, visits, deals, expenses |
| Analytics | Dashboards, conversion funnels, agent performance |
| Integrations | CRM, payment, social media ads, telephony |
| Multi-tenant | Organizations, branches, role-based access |

## Database Statistics

- **172 database models**
- **95+ API routes**
- **127 backend services**
- **55+ frontend pages**
- **31 mobile screens**

## Support

For issues and feature requests, please create an issue in the repository.

## License

Proprietary - All rights reserved.
