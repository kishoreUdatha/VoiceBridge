/**
 * Application Constants
 * Centralized configuration for magic numbers, timeouts, and other configurable values
 */

// ==================== TIMEOUTS ====================

export const TIMEOUTS = {
  // API request timeouts (in milliseconds)
  DEFAULT: 30000,       // 30 seconds
  SHORT: 5000,          // 5 seconds
  MEDIUM: 15000,        // 15 seconds
  LONG: 60000,          // 1 minute
  VERY_LONG: 300000,    // 5 minutes

  // Voice/telephony timeouts
  CALL_RING: 30000,     // 30 seconds ring timeout
  CALL_RECORD_MAX: 30,  // 30 seconds max recording (in seconds for XML)
  DTMF_TIMEOUT: 5,      // 5 seconds DTMF input timeout (in seconds for XML)
  DIAL_TIMEOUT: 30,     // 30 seconds dial timeout (in seconds for XML)

  // WebSocket/realtime timeouts
  WEBSOCKET_PING: 30000,    // 30 seconds
  REALTIME_CONNECT: 10000,  // 10 seconds

  // Cache timeouts
  CACHE_SHORT: 60000,       // 1 minute
  CACHE_MEDIUM: 300000,     // 5 minutes
  CACHE_LONG: 3600000,      // 1 hour

  // Retry delays
  RETRY_INITIAL: 1000,      // 1 second
  RETRY_MAX: 30000,         // 30 seconds
  RATE_LIMIT_DELAY: 100,    // 100ms between rate-limited requests
};

// ==================== BATCH SIZES ====================

export const BATCH_SIZES = {
  // Import/export batch sizes
  CSV_IMPORT: 5000,
  BULK_EMAIL: 100,
  BULK_SMS: 50,

  // Query limits
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  LEADS_EXPORT: 10000,

  // Processing batches
  WEBHOOK_BATCH: 10,
  CLEANUP_BATCH: 1000,
};

// ==================== LIMITS ====================

export const LIMITS = {
  // File upload limits (in bytes)
  FILE_UPLOAD_MAX: 10 * 1024 * 1024,    // 10 MB
  IMAGE_UPLOAD_MAX: 5 * 1024 * 1024,    // 5 MB
  CSV_UPLOAD_MAX: 50 * 1024 * 1024,     // 50 MB

  // Text field limits
  MESSAGE_MAX_LENGTH: 1600,   // SMS message limit
  NOTES_MAX_LENGTH: 5000,
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,

  // Rate limits
  API_REQUESTS_PER_MINUTE: 100,
  WEBHOOK_REQUESTS_PER_MINUTE: 30,
  LOGIN_ATTEMPTS: 5,

  // Queue limits
  MAX_RETRY_ATTEMPTS: 5,
  MAX_QUEUE_SIZE: 10000,
};

// ==================== API VERSIONS (defaults, can be overridden in config) ====================

export const API_VERSIONS = {
  FACEBOOK_GRAPH: 'v18.0',
  LINKEDIN: 'v2',
  WHATSAPP: 'v18.0',
  GOOGLE_ADS: 'v15',
};

// ==================== API ENDPOINTS ====================
// Note: Use getApiEndpoint() for runtime-configurable URLs and versions
// These are deprecated - use config.apiUrls instead

export const API_ENDPOINTS = {
  // DEPRECATED: Use getApiEndpoint() or config.apiUrls for dynamic support
  EXOTEL: (subdomain: string) => `https://${subdomain}`,
};

/**
 * Get API endpoint with configurable version
 * Import config at runtime to avoid circular dependencies
 */
export function getApiEndpoint(service: 'facebook' | 'linkedin' | 'whatsapp' | 'sarvam' | 'elevenlabs'): string {
  // Lazy import to avoid circular dependency
  const { config } = require('../config');

  switch (service) {
    case 'facebook':
      return `${config.apiUrls.facebookGraph}/${config.apiVersions.facebook}`;
    case 'linkedin':
      return `${config.apiUrls.linkedin}/${config.apiVersions.linkedin}`;
    case 'whatsapp':
      return `${config.apiUrls.facebookGraph}/${config.apiVersions.whatsapp}`;
    case 'sarvam':
      return config.sarvam.apiUrl;
    case 'elevenlabs':
      return config.apiUrls.elevenlabs;
    default:
      throw new Error(`Unknown service: ${service}`);
  }
}

// ==================== SCORING ====================

export const SCORING = {
  // Lead scoring defaults
  DEFAULT_SCORE: 50,
  MIN_SCORE: 0,
  MAX_SCORE: 100,

  // Decay settings
  DECAY_RATE_DAILY: 0.02,     // 2% daily decay
  DECAY_MIN_THRESHOLD: 10,    // Minimum score before stopping decay
  ACTIVITY_BOOST: 5,          // Points to add on activity

  // Score weights
  ENGAGEMENT_WEIGHT: 0.3,
  QUALIFICATION_WEIGHT: 0.4,
  BEHAVIOR_WEIGHT: 0.3,
};

// ==================== CIRCUIT BREAKER ====================

export const CIRCUIT_BREAKER = {
  // Default thresholds
  FAILURE_THRESHOLD: 5,
  SUCCESS_THRESHOLD: 2,

  // Timeout configurations (in milliseconds)
  DEFAULT_TIMEOUT: 30000,        // 30 seconds
  PAYMENT_TIMEOUT: 60000,        // 1 minute for payment services

  // Retry intervals
  RETRY_INTERVAL: 10000,         // 10 seconds
};

// ==================== VOICE AI ====================
// Note: Use config.voiceAi for runtime-configurable model settings

export const VOICE_AI = {
  // Audio settings
  SAMPLE_RATE_TELEPHONY: 8000,
  SAMPLE_RATE_HIGH_QUALITY: 22050,
  SAMPLE_RATE_DEFAULT: 16000,

  // Speech settings
  TTS_PACE_DEFAULT: 1.10,
  STT_LANGUAGE_DEFAULT: 'en-IN',

  // Model defaults (can be overridden in config)
  OPENAI_CHAT_MODEL: 'gpt-4o-mini',
  OPENAI_STT_MODEL: 'whisper-1',
  OPENAI_TTS_MODEL: 'tts-1-hd',
};

// ==================== DATES ====================

export const DATES = {
  // Retention periods (in days)
  LOG_RETENTION: 90,
  WEBHOOK_LOG_RETENTION: 30,
  TRACKING_EVENT_RETENTION: 180,
  TEMP_FILE_RETENTION: 1,

  // Analytics periods
  ANALYTICS_DEFAULT_DAYS: 30,
  ANALYTICS_MAX_DAYS: 365,
};

// ==================== REGEX PATTERNS ====================

export const PATTERNS = {
  INDIAN_PHONE: /^(\+91|91)?[6-9]\d{9}$/,
  INTERNATIONAL_PHONE: /^\+?[1-9]\d{1,14}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};

// ==================== HTTP STATUS CODES ====================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// ==================== DEFAULT VALUES ====================

export const DEFAULTS = {
  // Pagination
  PAGE: 1,
  PAGE_SIZE: 20,

  // JWT
  JWT_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY: '7d',

  // AWS
  AWS_REGION: 'ap-south-1',

  // SMTP
  SMTP_PORT: 587,

  // Locale
  TIMEZONE: 'Asia/Kolkata',
  LOCALE: 'en-IN',
  CURRENCY: 'INR',
};
