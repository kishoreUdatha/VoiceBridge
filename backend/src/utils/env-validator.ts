/**
 * Environment Variable Validator
 * Validates required environment variables at startup
 */

interface EnvConfig {
  name: string;
  required: boolean;
  secret?: boolean;
  validator?: (value: string) => boolean;
  default?: string;
}

const ENV_CONFIG: EnvConfig[] = [
  // Database
  { name: 'DATABASE_URL', required: true, secret: true },

  // JWT
  { name: 'JWT_SECRET', required: true, secret: true, validator: (v) => v.length >= 32 },
  { name: 'JWT_REFRESH_SECRET', required: true, secret: true, validator: (v) => v.length >= 32 },

  // Server
  { name: 'PORT', required: false, default: '3001' },
  { name: 'NODE_ENV', required: false, default: 'development' },
  { name: 'FRONTEND_URL', required: false, default: 'http://localhost:5173' },

  // Encryption
  { name: 'CREDENTIALS_ENCRYPTION_KEY', required: true, secret: true, validator: (v) => v.length >= 32 },

  // Redis (optional but recommended)
  { name: 'REDIS_URL', required: false },

  // OpenAI
  { name: 'OPENAI_API_KEY', required: false, secret: true },

  // Exotel
  { name: 'EXOTEL_API_KEY', required: false, secret: true },
  { name: 'EXOTEL_API_TOKEN', required: false, secret: true },
  { name: 'EXOTEL_SUBDOMAIN', required: false },
  { name: 'EXOTEL_ACCOUNT_SID', required: false },

  // WhatsApp
  { name: 'WHATSAPP_PHONE_NUMBER_ID', required: false },
  { name: 'WHATSAPP_ACCESS_TOKEN', required: false, secret: true },

  // ElevenLabs
  { name: 'ELEVENLABS_API_KEY', required: false, secret: true },

  // Razorpay
  { name: 'RAZORPAY_KEY_ID', required: false },
  { name: 'RAZORPAY_KEY_SECRET', required: false, secret: true },

  // AWS S3
  { name: 'AWS_ACCESS_KEY_ID', required: false, secret: true },
  { name: 'AWS_SECRET_ACCESS_KEY', required: false, secret: true },
  { name: 'AWS_S3_BUCKET', required: false },
  { name: 'AWS_REGION', required: false, default: 'ap-south-1' },

  // Sentry (Error Monitoring)
  { name: 'SENTRY_DSN', required: false },
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  configured: string[];
  missing: string[];
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const configured: string[] = [];
  const missing: string[] = [];

  for (const config of ENV_CONFIG) {
    const value = process.env[config.name];

    if (!value) {
      if (config.required) {
        errors.push(`Missing required environment variable: ${config.name}`);
      } else if (config.default) {
        process.env[config.name] = config.default;
        configured.push(`${config.name} (default: ${config.default})`);
      } else {
        missing.push(config.name);
      }
      continue;
    }

    // Run custom validator if provided
    if (config.validator && !config.validator(value)) {
      errors.push(`Invalid value for ${config.name}: validation failed`);
      continue;
    }

    configured.push(config.name);
  }

  // Check for security issues in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CREDENTIALS_ENCRYPTION_KEY) {
      errors.push('CREDENTIALS_ENCRYPTION_KEY is required in production');
    }

    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      errors.push('JWT_SECRET must be changed from default in production');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    configured,
    missing,
  };
}

export function printValidationReport(result: ValidationResult): void {
  console.log('\n============================================================');
  console.log('Environment Variable Validation');
  console.log('============================================================');

  if (result.errors.length > 0) {
    console.error('\n❌ ERRORS:');
    result.errors.forEach(err => console.error(`  - ${err}`));
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  WARNINGS:');
    result.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }

  console.log(`\nConfigured: ${result.configured.length}`);
  console.log(`Missing (optional): ${result.missing.length}`);

  if (result.isValid) {
    console.log('\n✅ Environment validation passed');
  } else {
    console.error('\n❌ Environment validation FAILED');
    console.error('Please fix the errors above before starting the server.');
  }

  console.log('============================================================\n');
}

export function validateAndExit(): void {
  const result = validateEnvironment();
  printValidationReport(result);

  if (!result.isValid && process.env.NODE_ENV === 'production') {
    console.error('Exiting due to environment validation errors in production.');
    process.exit(1);
  }
}
