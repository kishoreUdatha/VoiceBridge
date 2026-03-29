import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { openaiService } from '../integrations/openai.service';
import { ApiResponse } from '../utils/apiResponse';
import { validate } from '../middlewares/validate';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';

const router = Router();

// Rate limiters for public endpoints to prevent abuse
const sessionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 sessions per minute per IP
  message: { success: false, message: 'Too many chat sessions created. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute per IP
  message: { success: false, message: 'Too many messages sent. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const voiceRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 voice requests per minute per IP
  message: { success: false, message: 'Too many voice requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public chatbot endpoints (for embedded chat widget)

// Start a new chat session
router.post('/session', sessionRateLimiter, validate([
  body('organizationId').isUUID().withMessage('Valid organization ID is required'),
]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.body;

    // SECURITY: Verify organization exists and has chatbot enabled
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, isActive: true },
    });

    if (!org || !org.isActive) {
      return ApiResponse.error(res, 'Invalid organization', 400);
    }

    const sessionId = uuidv4();

    // Get initial greeting
    const response = await openaiService.chat(
      sessionId,
      'Hello',
      organizationId
    );

    ApiResponse.success(res, 'Chat session started', {
      sessionId,
      message: response.message,
    });
  } catch (error) {
    next(error);
  }
});

// Send message to chatbot
router.post(
  '/message',
  messageRateLimiter,
  validate([
    body('sessionId').isUUID().withMessage('Valid session ID is required'),
    body('message').trim().notEmpty().withMessage('Message is required')
      .isLength({ max: 5000 }).withMessage('Message must be at most 5000 characters'),
    body('organizationId').isUUID().withMessage('Valid organization ID is required'),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, message, organizationId } = req.body;

      // SECURITY: Verify organization exists
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, isActive: true },
      });

      if (!org || !org.isActive) {
        return ApiResponse.error(res, 'Invalid organization', 400);
      }

      const response = await openaiService.chat(sessionId, message, organizationId);

      ApiResponse.success(res, 'Message sent', {
        message: response.message,
        extractedData: response.extractedData,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get conversation history
router.get(
  '/conversation/:sessionId',
  validate([param('sessionId').isUUID().withMessage('Valid session ID is required')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversation = await prisma.chatbotConversation.findUnique({
        where: { sessionId: req.params.sessionId },
        select: {
          sessionId: true,
          messages: true,
          extractedData: true,
          createdAt: true,
          updatedAt: true,
          // Don't expose organizationId to prevent enumeration
        },
      });

      if (!conversation) {
        return ApiResponse.notFound(res, 'Conversation not found');
      }

      ApiResponse.success(res, 'Conversation retrieved', conversation);
    } catch (error) {
      next(error);
    }
  }
);

// Convert conversation to lead
router.post(
  '/convert/:sessionId',
  messageRateLimiter,
  validate([param('sessionId').isUUID().withMessage('Valid session ID is required')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lead = await openaiService.convertConversationToLead(req.params.sessionId);

      if (!lead) {
        return ApiResponse.error(res, 'Insufficient data to create lead', 400);
      }

      ApiResponse.created(res, 'Lead created from conversation', lead);
    } catch (error) {
      next(error);
    }
  }
);

// Voice bot endpoints
router.post(
  '/voice/transcribe',
  voiceRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Expect audio file in request
      if (!req.file) {
        return ApiResponse.error(res, 'Audio file is required', 400);
      }

      // SECURITY: Limit file size (already handled by multer, but add explicit check)
      if (req.file.size > 10 * 1024 * 1024) { // 10MB
        return ApiResponse.error(res, 'Audio file too large (max 10MB)', 400);
      }

      const transcription = await openaiService.transcribeAudio(req.file.buffer);

      ApiResponse.success(res, 'Audio transcribed', { text: transcription });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/voice/chat',
  voiceRateLimiter,
  validate([
    body('organizationId').isUUID().withMessage('Valid organization ID is required'),
    body('sessionId').optional().isUUID().withMessage('Invalid session ID'),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, organizationId } = req.body;

      if (!req.file) {
        return ApiResponse.error(res, 'Audio file is required', 400);
      }

      // SECURITY: Limit file size
      if (req.file.size > 10 * 1024 * 1024) { // 10MB
        return ApiResponse.error(res, 'Audio file too large (max 10MB)', 400);
      }

      // SECURITY: Verify organization exists
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, isActive: true },
      });

      if (!org || !org.isActive) {
        return ApiResponse.error(res, 'Invalid organization', 400);
      }

      const response = await openaiService.voiceChat(
        sessionId || uuidv4(),
        req.file.buffer,
        organizationId
      );

      // Send audio response
      res.set({
        'Content-Type': 'audio/mpeg',
        'X-Transcription': response.transcription,
        'X-Response-Text': encodeURIComponent(response.response),
        'X-Session-Id': response.sessionId,
      });

      res.send(response.audio);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
