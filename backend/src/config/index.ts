import dotenv from 'dotenv';
import { validateAndLog, isFeatureConfigured, getConfiguredFeatures } from '../utils/configValidator';

dotenv.config();

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

// Run comprehensive configuration validation
const isValidConfig = validateAndLog();

// In production, fail fast on invalid configuration
if (isProduction && !isValidConfig) {
  console.error('FATAL: Invalid configuration in production mode. Exiting.');
  process.exit(1);
}

// Production security checks
if (isProduction) {
  const criticalMissing: string[] = [];

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    criticalMissing.push('JWT_SECRET (must be at least 32 characters)');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    criticalMissing.push('JWT_REFRESH_SECRET (must be at least 32 characters)');
  }
  if (!process.env.CREDENTIALS_ENCRYPTION_KEY) {
    criticalMissing.push('CREDENTIALS_ENCRYPTION_KEY');
  }
  if (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.includes('localhost')) {
    console.warn('⚠️  WARNING: FRONTEND_URL should be set to production domain');
  }
  if (!process.env.CORS_ORIGINS) {
    console.warn('⚠️  WARNING: CORS_ORIGINS should be explicitly set in production');
  }

  if (criticalMissing.length > 0) {
    console.error('🔴 CRITICAL: Missing required production environment variables:');
    criticalMissing.forEach(v => console.error(`   - ${v}`));
    console.error('Application cannot start in production without these. Exiting.');
    process.exit(1);
  }
}

// Log configured features
const configuredFeatures = getConfiguredFeatures();
if (configuredFeatures.length > 0) {
  console.info(`Configured features: ${configuredFeatures.join(', ')}`);
}

// Parse CORS origins (supports comma-separated list)
function parseCorsOrigins(): string | string[] | boolean {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const corsOrigins = process.env.CORS_ORIGINS;

  if (corsOrigins) {
    // Support multiple origins: "https://example.com,https://www.example.com"
    return corsOrigins.split(',').map((origin) => origin.trim());
  }

  // In development, allow all origins for easy local network testing
  if (!isProduction) {
    return true; // Allow all origins in development
  }

  return frontendUrl;
}

export const config = {
  env,
  isProduction,
  port: parseInt(process.env.PORT || '3000', 10),

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: (() => {
      const secret = process.env.JWT_SECRET;
      if (!secret && isProduction) {
        throw new Error('FATAL: JWT_SECRET environment variable is required in production');
      }
      if (!secret) {
        console.warn('WARNING: Using default JWT_SECRET - set JWT_SECRET env var for production');
        return 'dev-only-secret-' + Math.random().toString(36).substring(7);
      }
      return secret;
    })(),
    refreshSecret: (() => {
      const secret = process.env.JWT_REFRESH_SECRET;
      if (!secret && isProduction) {
        throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is required in production');
      }
      if (!secret) {
        console.warn('WARNING: Using default JWT_REFRESH_SECRET - set JWT_REFRESH_SECRET env var for production');
        return 'dev-only-refresh-' + Math.random().toString(36).substring(7);
      }
      return secret;
    })(),
    expiry: process.env.JWT_EXPIRY || '24h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Cookie settings for secure token storage
  cookie: {
    httpOnly: true,
    secure: isProduction, // Enable secure cookies in production (HTTPS)
    sameSite: 'lax' as 'strict' | 'lax' | 'none',
    // Set domain for cross-subdomain cookies (api.myleadx.ai <-> app.myleadx.ai)
    domain: process.env.COOKIE_DOMAIN || (isProduction ? '.myleadx.ai' : undefined),
    accessTokenMaxAge: 24 * 60 * 60 * 1000, // 24 hours in ms
    refreshTokenMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  plivo: {
    authId: process.env.PLIVO_AUTH_ID,
    authToken: process.env.PLIVO_AUTH_TOKEN,
    phoneNumber: process.env.PLIVO_PHONE_NUMBER,
  },

  exotel: {
    accountSid: process.env.EXOTEL_ACCOUNT_SID,
    apiKey: process.env.EXOTEL_API_KEY,
    apiToken: process.env.EXOTEL_API_TOKEN,
    callerId: process.env.EXOTEL_CALLER_ID,
    subdomain: process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
    appId: process.env.EXOTEL_APP_ID,
    smsSenderId: process.env.EXOTEL_SMS_SENDER_ID,
    dltEntityId: process.env.EXOTEL_DLT_ENTITY_ID,
    dltTemplateId: process.env.EXOTEL_DLT_TEMPLATE_ID,
  },

  // SMS/Voice provider selection: 'plivo' or 'exotel'
  smsProvider: process.env.SMS_PROVIDER || 'exotel',
  voiceProvider: process.env.VOICE_PROVIDER || 'exotel',

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucketName: process.env.AWS_BUCKET_NAME,
    region: process.env.AWS_REGION || 'ap-south-1',
  },

  // AWS SES Configuration
  ses: {
    region: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
    fromEmail: process.env.AWS_SES_FROM_EMAIL || 'noreply@myleadx.ai',
    fromName: process.env.AWS_SES_FROM_NAME || 'MyLeadX',
  },

  // MSG91 SMS Configuration
  msg91: {
    authKey: process.env.MSG91_AUTH_KEY,
    senderId: process.env.MSG91_SENDER_ID || 'MYLEADX',
    dltEntityId: process.env.MSG91_DLT_ENTITY_ID,
    route: process.env.MSG91_ROUTE || '4', // 4 = Transactional, 1 = Promotional
    baseUrl: process.env.MSG91_BASE_URL || 'https://control.msg91.com',
    otpTemplateId: process.env.MSG91_OTP_TEMPLATE_ID, // DLT registered OTP template
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },

  facebook: {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    verifyToken: process.env.FACEBOOK_VERIFY_TOKEN,
  },

  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  google: {
    adsClientId: process.env.GOOGLE_ADS_CLIENT_ID,
    adsClientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    adsDeveloperToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  // API versions (can be overridden via env vars)
  apiVersions: {
    facebook: process.env.FACEBOOK_API_VERSION || 'v18.0',
    whatsapp: process.env.WHATSAPP_API_VERSION || 'v18.0',
    linkedin: process.env.LINKEDIN_API_VERSION || 'v2',
    googleAds: process.env.GOOGLE_ADS_API_VERSION || 'v15',
  },

  // External API URLs (configurable for proxies/custom endpoints)
  apiUrls: {
    facebookGraph: process.env.FACEBOOK_GRAPH_URL || 'https://graph.facebook.com',
    linkedin: process.env.LINKEDIN_API_URL || 'https://api.linkedin.com',
    apify: process.env.APIFY_API_URL || 'https://api.apify.com/v2',
    elevenlabs: process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io/v1',
    openai: process.env.OPENAI_API_URL || 'https://api.openai.com/v1',
    huggingface: process.env.HUGGINGFACE_API_URL || 'https://api-inference.huggingface.co',
  },

  // Sarvam AI (Indian language support)
  sarvam: {
    apiKey: process.env.SARVAM_API_KEY,
    apiUrl: process.env.SARVAM_API_URL || 'https://api.sarvam.ai',
    ttsPace: parseFloat(process.env.SARVAM_TTS_PACE || '1.10'),
  },

  // ElevenLabs TTS
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
  },

  // Apify Web Scraping
  apify: {
    apiKey: process.env.APIFY_API_KEY,
  },

  // Voice AI settings - Simplified Configuration
  voiceAi: {
    // LLM for conversation
    chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',

    // Sample rate for telephony
    sampleRateTelephony: parseInt(process.env.AUDIO_SAMPLE_RATE || '8000', 10),

    // ===========================================
    // TTS (Text-to-Speech) Provider Configuration
    // ===========================================
    // Options: 'sarvam' | 'elevenlabs' | 'openai' | 'auto'
    // 'auto' = Sarvam for Indian languages, ElevenLabs/OpenAI for English
    ttsProvider: process.env.TTS_PROVIDER || 'auto',

    // TTS Models per provider
    ttsOpenAiModel: process.env.TTS_MODEL || 'tts-1-hd',        // OpenAI: tts-1, tts-1-hd
    ttsOpenAiVoice: process.env.TTS_VOICE || 'shimmer',         // OpenAI voices
    ttsElevenLabsModel: 'eleven_multilingual_v2',               // Best ElevenLabs model
    ttsSarvamModel: 'bulbul:v3',                                // Sarvam model

    // ===========================================
    // STT (Speech-to-Text) Provider Configuration
    // ===========================================
    // Options: 'sarvam' | 'openai' | 'auto'
    // 'auto' = Sarvam for Indian languages, OpenAI Whisper for English
    sttProvider: process.env.STT_PROVIDER || 'auto',

    // STT Models
    sttOpenAiModel: process.env.OPENAI_STT_MODEL || 'whisper-1',
    sttSarvamModel: 'saaras:v3',

    // ===========================================
    // Indian Languages (use Sarvam)
    // ===========================================
    indianLanguages: ['hi-IN', 'te-IN', 'ta-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'bn-IN', 'gu-IN', 'pa-IN', 'or-IN', 'as-IN', 'en-IN'],
  },

  // CORS - supports single URL or comma-separated list via CORS_ORIGINS
  corsOrigins: parseCorsOrigins(),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
};
