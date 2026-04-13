import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { config } from './config';
import { connectDatabase } from './config/database';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimit';
import { rateLimiters } from './services/rate-limit.service';
import { auditMiddleware } from './middlewares/audit';
import { websocketService } from './services/websocket.service';
import { setupSwagger } from './swagger';
import testCallRoutes from './routes/test-call.routes';
import voicebotRoutes, { initializeVoiceBotWebSocket } from './routes/voicebot.routes';
import { initializeScheduledJobs } from './services/job-initializer.service';
import { csrfTokenSetter, csrfProtection, csrfTokenEndpoint } from './middlewares/csrf';
import { maintenanceMiddleware } from './middlewares/maintenance.middleware';
import fs from 'fs';
import path from 'path';

const app = express();
const httpServer = createServer(app);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Build CSP connect sources from config
const cspConnectSources = [
  "'self'",
  'wss:',
  'ws:',
  config.apiUrls.openai.replace('/v1', ''), // OpenAI API
  config.sarvam.apiUrl, // Sarvam AI
  config.apiUrls.elevenlabs.replace('/v1', ''), // ElevenLabs
  config.apiUrls.facebookGraph, // Facebook Graph API
  ...(process.env.CSP_ADDITIONAL_CONNECT_SRC?.split(',') || []),
].filter(Boolean);

// Security middleware with enhanced headers
app.use(
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Removed unsafe-eval for production security
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: cspConnectSources,
        mediaSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },
    // Prevent clickjacking
    frameguard: { action: 'deny' },
    // Prevent MIME type sniffing
    noSniff: true,
    // Enable XSS filter
    xssFilter: true,
    // Hide powered by header
    hidePoweredBy: true,
    // HTTP Strict Transport Security
    hsts: config.isProduction
      ? {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        }
      : false,
    // Referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: false, // Disabled to allow external resources
    // Cross-Origin-Opener-Policy
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    // Cross-Origin-Resource-Policy
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin for API
  })
);

// Additional security headers
app.use((req, res, next) => {
  // Prevent caching of sensitive data
  if (req.path.startsWith('/api/auth')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Feature Policy / Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=(), payment=()'
  );

  next();
});

// CORS configuration - allow all origins in development for team testing
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      // In production, check against allowed origins
      const allowedOrigins = Array.isArray(config.corsOrigins)
        ? config.corsOrigins
        : [config.corsOrigins];
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-csrf-token', 'X-CSRF-Token'],
  })
);

// Cookie parsing middleware (for httpOnly cookie auth)
app.use(cookieParser());

// Body parsing middleware - capture raw body for webhook signature verification
app.use(express.json({
  limit: '10mb',
  verify: (req: any, res, buf) => {
    // Save raw body for webhook routes that need signature verification
    if (req.url?.includes('/webhook')) {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CSRF Protection
// Sets CSRF token cookie on all requests
app.use(csrfTokenSetter);
// Endpoint to get CSRF token for SPAs
app.get('/api/csrf-token', csrfTokenEndpoint);
// Validate CSRF token on state-changing requests to /api
app.use('/api', csrfProtection);

// Static files
app.use('/uploads', express.static(uploadsDir));

// Public demo pages (no auth required)
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use('/demo', express.static(publicDir));

// Audio files for TTS (Generated audio)
const audioDir = path.join(__dirname, '../public/audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}
app.use('/audio', express.static(audioDir));

// Rate limiting
app.use('/api', apiLimiter);

// Audit logging
app.use('/api', auditMiddleware);

// Maintenance mode check (blocks non-super-admin requests when in maintenance)
app.use('/api', maintenanceMiddleware);

// Swagger documentation
setupSwagger(app);

// Test call page (no auth required for testing)
app.use('/test-call', testCallRoutes);

// Voice Bot routes (no auth required for Exotel webhooks)
app.use('/api/voicebot', voicebotRoutes);

// API routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// =============================================================================
// Global Error Handlers - Prevent silent crashes
// =============================================================================

/**
 * Handle unhandled promise rejections
 * These occur when a promise is rejected but no .catch() handler is attached
 */
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('='.repeat(60));
  console.error('UNHANDLED PROMISE REJECTION');
  console.error('='.repeat(60));
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('Stack:', reason instanceof Error ? reason.stack : 'No stack trace');
  console.error('='.repeat(60));

  // In production, log to monitoring service (e.g., Sentry, DataDog)
  // For now, we log and continue - but could exit in strict mode
  // process.exit(1);
});

/**
 * Handle uncaught exceptions
 * These are synchronous errors that were not caught by try/catch
 */
process.on('uncaughtException', (error: Error) => {
  console.error('='.repeat(60));
  console.error('UNCAUGHT EXCEPTION - Server will shut down');
  console.error('='.repeat(60));
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  console.error('='.repeat(60));

  // Uncaught exceptions leave the app in an undefined state
  // Graceful shutdown is recommended
  gracefulShutdown('uncaughtException');
});

/**
 * Handle SIGTERM (graceful shutdown request)
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received - initiating graceful shutdown');
  gracefulShutdown('SIGTERM');
});

/**
 * Handle SIGINT (Ctrl+C)
 */
process.on('SIGINT', () => {
  console.log('SIGINT received - initiating graceful shutdown');
  gracefulShutdown('SIGINT');
});

/**
 * Graceful shutdown function
 * Closes all connections properly before exiting
 */
async function gracefulShutdown(signal: string) {
  console.log(`\nGraceful shutdown initiated (${signal})...`);

  // Set a timeout to force exit if graceful shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    console.error('Graceful shutdown timed out - forcing exit');
    process.exit(1);
  }, 30000); // 30 seconds timeout

  try {
    // Close HTTP server (stop accepting new connections)
    httpServer.close(() => {
      console.log('HTTP server closed');
    });

    // Close database connections
    const { disconnectDatabase } = require('./config/database');
    await disconnectDatabase();
    console.log('Database connections closed');

    clearTimeout(forceExitTimeout);
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

// =============================================================================
// Start Server
// =============================================================================

async function startServer() {
  try {
    await connectDatabase();

    // Initialize WebSocket for real-time updates
    websocketService.initialize(httpServer);

    // Initialize Voice Bot WebSocket for Exotel streaming
    initializeVoiceBotWebSocket(httpServer);

    httpServer.listen(config.port, '0.0.0.0', async () => {
      console.log(`Server running on port ${config.port} (network: 0.0.0.0)`);
      console.log(`WebSocket enabled`);
      console.log(`Voice Bot WebSocket: wss://${config.baseUrl?.replace('https://', '').replace('http://', '')}/voice-stream`);
      console.log(`Environment: ${config.env}`);
      console.log(`API docs available at ${config.baseUrl}/api-docs`);

      // Initialize scheduled jobs after server starts
      await initializeScheduledJobs();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
