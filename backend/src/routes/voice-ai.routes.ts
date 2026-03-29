import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { voiceAIService } from '../integrations/voice-ai.service';
import { elevenlabsService } from '../integrations/elevenlabs.service';
import { openaiService } from '../integrations/openai.service';
import { createWhatsAppService } from '../integrations/whatsapp.service';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import multer from 'multer';
import { config } from '../config';
import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

const router = Router();

// Rate limiter for public endpoints - more restrictive
const publicEndpointLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for TTS/STT endpoints - expensive operations
const voiceProcessingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: { success: false, message: 'Rate limit exceeded for voice processing' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure multer for audio upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// ==================== PUBLIC ENDPOINTS (For Widget) ====================

// Get agent info for widget (public)
router.get('/widget/:agentId', publicEndpointLimiter, validate([
  param('agentId').isUUID().withMessage('Invalid agent ID'),
]), async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const agent = await voiceAIService.getAgent(agentId);
    if (!agent || !agent.isActive) {
      return ApiResponse.error(res, 'Agent not found or inactive', 404);
    }

    ApiResponse.success(res, 'Agent retrieved', {
      id: agent.id,
      name: agent.name,
      industry: agent.industry,
      greeting: agent.greeting,
      widgetTitle: agent.widgetTitle || agent.name,
      widgetSubtitle: agent.widgetSubtitle || 'AI Voice Assistant',
      widgetColor: agent.widgetColor,
      widgetPosition: agent.widgetPosition,
      voiceId: agent.voiceId,
      // Pre-chat form configuration
      authenticationRequired: agent.authenticationRequired,
      preChatFormEnabled: agent.preChatFormEnabled,
      preChatFormFields: agent.preChatFormFields,
      preChatFormTitle: agent.preChatFormTitle,
      preChatFormSubtitle: agent.preChatFormSubtitle,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Start voice session (public - for widget)
router.post('/session/start', publicEndpointLimiter, validate([
  body('agentId').isUUID().withMessage('Invalid agent ID'),
  body('visitorInfo').optional().isObject().withMessage('Visitor info must be an object'),
  body('visitorInfo.name').optional().trim().isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),
  body('visitorInfo.email').optional().trim().isEmail().withMessage('Invalid email format'),
  body('visitorInfo.phone').optional().trim().matches(/^[\d+\-() ]{0,20}$/).withMessage('Invalid phone format'),
]), async (req: Request, res: Response) => {
  try {
    const { agentId, visitorInfo } = req.body;

    // Get agent to check authentication requirements
    const agent = await voiceAIService.getAgent(agentId);
    if (!agent || !agent.isActive) {
      return ApiResponse.error(res, 'Agent not found or inactive', 404);
    }

    // Check if pre-chat form is required
    if (agent.authenticationRequired || agent.preChatFormEnabled) {
      const formFields = agent.preChatFormFields as Array<{
        name: string;
        label: string;
        type: string;
        required: boolean;
      }>;

      // Validate required fields
      const missingFields: string[] = [];
      for (const field of formFields) {
        if (field.required && (!visitorInfo || !visitorInfo[field.name])) {
          missingFields.push(field.label);
        }
      }

      if (missingFields.length > 0) {
        return ApiResponse.error(
          res,
          `Please provide: ${missingFields.join(', ')}`,
          400,
          { code: 'PRE_CHAT_REQUIRED', missingFields }
        );
      }
    }

    // Create lead from form data if enabled
    let leadId: string | undefined;
    if (agent.createLeadFromForm && visitorInfo && (visitorInfo.name || visitorInfo.email || visitorInfo.phone)) {
      try {
        const lead = await prisma.lead.create({
          data: {
            organizationId: agent.organizationId,
            firstName: visitorInfo.name || 'Voice Widget Visitor',
            email: visitorInfo.email || null,
            phone: visitorInfo.phone || 'unknown',
            source: 'AI_VOICE_INBOUND',
            customFields: {
              capturedFrom: 'voice-ai-widget',
              agentId: agent.id,
              agentName: agent.name,
              capturedAt: new Date().toISOString(),
              ...visitorInfo,
            },
          },
        });
        leadId = lead.id;
      } catch (leadError) {
        console.error('Failed to create lead from voice widget:', leadError);
        // Continue even if lead creation fails
      }
    }

    const session = await voiceAIService.startSession(agentId, {
      ...visitorInfo,
      ip: req.ip,
      device: req.headers['user-agent'],
      leadId,
    });

    ApiResponse.success(res, 'Session started', {
      ...session,
      leadId,
      visitorName: visitorInfo?.name,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Process voice message (public - for widget)
router.post('/session/:sessionId/message', publicEndpointLimiter, upload.single('audio'), validate([
  param('sessionId').isUUID().withMessage('Invalid session ID'),
  body('text').optional().trim().isLength({ max: 5000 }).withMessage('Text must be at most 5000 characters'),
]), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { text } = req.body;

    // Verify session exists and is active before processing
    const existingSession = await prisma.voiceSession.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true }
    });
    if (!existingSession) {
      return ApiResponse.error(res, 'Session not found', 404);
    }
    if (existingSession.status !== 'ACTIVE') {
      return ApiResponse.error(res, 'Session is no longer active', 400);
    }

    let userMessage = text;

    // If audio file is provided, transcribe it
    if (req.file) {
      userMessage = await voiceAIService.speechToText(
        req.file.buffer,
        req.file.mimetype.split('/')[1] || 'webm'
      );
    }

    if (!userMessage) {
      return ApiResponse.error(res, 'No message provided', 400);
    }

    const result = await voiceAIService.processMessage(sessionId, userMessage);

    // Convert audio buffer to base64 for response
    let audioBase64: string | undefined;
    if (result.audioBuffer) {
      audioBase64 = result.audioBuffer.toString('base64');
    }

    ApiResponse.success(res, 'Message processed', {
      userMessage,
      response: result.response,
      audio: audioBase64,
      audioFormat: 'mp3',
      qualification: result.qualification,
      shouldEnd: result.shouldEnd,
    });
  } catch (error) {
    console.error('Voice message error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// End voice session (public - for widget)
router.post('/session/:sessionId/end', publicEndpointLimiter, validate([
  param('sessionId').isUUID().withMessage('Invalid session ID'),
  body('status').optional().isIn(['COMPLETED', 'CANCELLED', 'FAILED']).withMessage('Invalid status'),
]), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;

    const session = await voiceAIService.endSession(sessionId, status || 'COMPLETED');

    // Send WhatsApp follow-up if enabled
    let whatsappSent = false;
    try {
      // Get the agent settings
      const agent = await prisma.voiceAgent.findUnique({
        where: { id: session.agentId },
        select: {
          organizationId: true,
          whatsappFollowupEnabled: true,
          whatsappFollowupMessage: true,
          whatsappFollowupDelay: true,
          name: true,
        },
      });

      if (agent?.whatsappFollowupEnabled && session.leadId) {
        // Get lead phone number
        const lead = await prisma.lead.findUnique({
          where: { id: session.leadId },
          select: { phone: true, firstName: true, lastName: true },
        });

        if (lead?.phone) {
          const whatsappService = createWhatsAppService(agent.organizationId);
          await whatsappService.loadConfig();

          // Build the message
          const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'there';
          const durationMinutes = Math.round((session.duration || 0) / 60);

          let message = agent.whatsappFollowupMessage ||
            `Hi {{name}}! Thank you for speaking with us. Here's a summary of our conversation:\n\n{{summary}}\n\nFeel free to reach out if you have any questions!`;

          // Replace placeholders
          message = message
            .replace(/\{\{name\}\}/g, leadName)
            .replace(/\{\{summary\}\}/g, session.summary || 'No summary available')
            .replace(/\{\{duration\}\}/g, `${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}`);

          // Send after delay (if configured)
          const delay = agent.whatsappFollowupDelay || 0;
          if (delay > 0) {
            setTimeout(async () => {
              try {
                await whatsappService.sendMessage({ to: lead.phone!, message });
                console.log(`[VoiceAI] WhatsApp follow-up sent to ${lead.phone} after ${delay}s delay`);
              } catch (err) {
                console.error('[VoiceAI] Failed to send delayed WhatsApp:', err);
              }
            }, delay * 1000);
          } else {
            const result = await whatsappService.sendMessage({ to: lead.phone, message });
            whatsappSent = result.success;
            if (result.success) {
              console.log(`[VoiceAI] WhatsApp follow-up sent to ${lead.phone}`);
            } else {
              console.error(`[VoiceAI] WhatsApp follow-up failed: ${result.error}`);
            }
          }
        }
      }
    } catch (whatsappError) {
      console.error('[VoiceAI] WhatsApp follow-up error:', whatsappError);
    }

    ApiResponse.success(res, 'Session ended', {
      sessionId: session.id,
      duration: session.duration,
      summary: session.summary,
      sentiment: session.sentiment,
      leadCreated: !!session.leadId,
      whatsappSent,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get session transcript (public - for widget)
router.get('/session/:sessionId/transcript', publicEndpointLimiter, validate([
  param('sessionId').isUUID().withMessage('Invalid session ID'),
]), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await voiceAIService.getSession(sessionId);
    if (!session) {
      return ApiResponse.error(res, 'Session not found', 404);
    }

    ApiResponse.success(res, 'Transcript retrieved', {
      transcripts: session.transcripts,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get all available voices (public)
router.get('/voices', publicEndpointLimiter, async (req: Request, res: Response) => {
  try {
    const voices: Array<{
      id: string;
      name: string;
      provider: string;
      gender?: string;
      accent?: string;
      description?: string;
      premium?: boolean;
    }> = [];

    // OpenAI voices
    const openaiVoices = [
      { id: 'openai-alloy', name: 'Alloy', provider: 'openai', gender: 'neutral', accent: 'American', description: 'Neutral and balanced' },
      { id: 'openai-echo', name: 'Echo', provider: 'openai', gender: 'male', accent: 'American', description: 'Clear and resonant' },
      { id: 'openai-fable', name: 'Fable', provider: 'openai', gender: 'male', accent: 'British', description: 'British storyteller' },
      { id: 'openai-onyx', name: 'Onyx', provider: 'openai', gender: 'male', accent: 'American', description: 'Deep and authoritative' },
      { id: 'openai-nova', name: 'Nova', provider: 'openai', gender: 'female', accent: 'American', description: 'Warm and engaging' },
      { id: 'openai-shimmer', name: 'Shimmer', provider: 'openai', gender: 'female', accent: 'American', description: 'Soft and soothing' },
    ];
    voices.push(...openaiVoices);

    // ElevenLabs voices
    if (elevenlabsService.isAvailable()) {
      const elevenLabsVoices = elevenlabsService.getPrebuiltVoices();
      voices.push(...elevenLabsVoices);
    } else {
      // Show ElevenLabs voices as unavailable
      const elevenLabsVoices = elevenlabsService.getPrebuiltVoices().map(v => ({
        ...v,
        description: `${v.description} (Configure ELEVENLABS_API_KEY to enable)`,
      }));
      voices.push(...elevenLabsVoices);
    }

    // Sarvam voices (Indian languages)
    const { sarvamService } = await import('../integrations/sarvam.service');
    if (sarvamService.isAvailable()) {
      const sarvamVoices = [
        { id: 'sarvam-priya', name: 'Priya', provider: 'sarvam', gender: 'female', accent: 'Indian', description: 'Hindi female voice' },
        { id: 'sarvam-dev', name: 'Dev', provider: 'sarvam', gender: 'male', accent: 'Indian', description: 'Hindi male voice' },
        { id: 'sarvam-kavya', name: 'Kavya', provider: 'sarvam', gender: 'female', accent: 'Indian', description: 'Indian English female' },
        { id: 'sarvam-ravi', name: 'Ravi', provider: 'sarvam', gender: 'male', accent: 'Indian', description: 'Indian English male' },
        { id: 'sarvam-neha', name: 'Neha', provider: 'sarvam', gender: 'female', accent: 'Indian', description: 'Multilingual female' },
        { id: 'sarvam-aditya', name: 'Aditya', provider: 'sarvam', gender: 'male', accent: 'Indian', description: 'Multilingual male' },
      ];
      voices.push(...sarvamVoices);
    }

    ApiResponse.success(res, 'Voices retrieved', {
      voices,
      providers: {
        openai: { available: true, name: 'OpenAI TTS', description: 'High-quality voices, good for English' },
        elevenlabs: { available: elevenlabsService.isAvailable(), name: 'ElevenLabs', description: 'Premium natural voices, best quality' },
        sarvam: { available: sarvamService.isAvailable(), name: 'Sarvam AI', description: 'Indian language voices' },
      },
    });
  } catch (error) {
    console.error('[Voices] Error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Text to Speech endpoint (public - for widget)
router.post('/tts', voiceProcessingLimiter, validate([
  body('text').trim().notEmpty().withMessage('Text is required')
    .isLength({ max: 5000 }).withMessage('Text must be at most 5000 characters'),
  body('voice').optional().isString().withMessage('Voice must be a string'),
  body('provider').optional().isIn(['openai', 'elevenlabs', 'sarvam', 'ai4bharat']).withMessage('Invalid provider'),
  body('language').optional().isString().isLength({ max: 10 }).withMessage('Invalid language code'),
]), async (req: Request, res: Response) => {
  try {
    const { text, voice, provider, language } = req.body;

    console.log('[TTS] Request:', { text: text?.substring(0, 50), voice, provider, language });

    let audioBuffer: Buffer;
    let contentType = 'audio/mpeg';

    // Detect provider from voice ID prefix if not explicitly set
    let detectedProvider = provider;
    if (!detectedProvider && voice) {
      if (voice.startsWith('elevenlabs-')) {
        detectedProvider = 'elevenlabs';
      } else if (voice.startsWith('sarvam-')) {
        detectedProvider = 'sarvam';
      } else if (voice.startsWith('ai4bharat-')) {
        detectedProvider = 'ai4bharat';
      } else if (voice.startsWith('openai-')) {
        detectedProvider = 'openai';
      }
    }

    // ElevenLabs TTS (Premium)
    if (detectedProvider === 'elevenlabs') {
      if (!elevenlabsService.isAvailable()) {
        console.log('[TTS] ElevenLabs not configured, falling back to OpenAI');
      } else {
        try {
          console.log('[TTS] Using ElevenLabs TTS with voice:', voice);
          const cleanVoiceId = voice.replace('elevenlabs-', '');
          audioBuffer = await elevenlabsService.textToSpeech(text, cleanVoiceId);
          console.log('[TTS] ElevenLabs TTS generated, size:', audioBuffer.length);

          res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
          });
          return res.send(audioBuffer);
        } catch (elevenLabsError) {
          console.warn('[TTS] ElevenLabs TTS failed, falling back to OpenAI:', (elevenLabsError as Error).message);
        }
      }
    }

    // Sarvam TTS (Indian languages)
    if (detectedProvider === 'sarvam') {
      const { sarvamService } = await import('../integrations/sarvam.service');

      if (!sarvamService.isAvailable()) {
        console.log('[TTS] Sarvam not available, falling back to OpenAI');
      } else {
        try {
          console.log('[TTS] Using Sarvam TTS with voice:', voice, 'language:', language);
          const cleanVoiceId = voice.replace('sarvam-', '');

          audioBuffer = await sarvamService.textToSpeech(
            text,
            cleanVoiceId || 'priya',
            language || 'hi-IN',
            22050
          );

          console.log('[TTS] Sarvam TTS generated, size:', audioBuffer.length);
          contentType = 'audio/wav';

          res.set({
            'Content-Type': contentType,
            'Content-Length': audioBuffer.length,
          });
          return res.send(audioBuffer);
        } catch (sarvamError) {
          console.warn('[TTS] Sarvam TTS failed, falling back to OpenAI:', (sarvamError as Error).message);
        }
      }
    }

    // AI4Bharat TTS (Open source Indian languages via HuggingFace)
    if (detectedProvider === 'ai4bharat') {
      const { ai4bharatService } = await import('../integrations/ai4bharat.service');

      if (!ai4bharatService.isAvailable()) {
        console.log('[TTS] AI4Bharat not available, falling back to OpenAI');
      } else {
        try {
          // Extract gender from voice ID (e.g., ai4bharat-te-female -> female)
          const voiceGender = voice.includes('female') ? 'female' : 'male';

          // PRIORITY: Use language from request (agent config) first
          // Normalize and validate the language code
          let langCode = language;

          // Normalize short language codes (e.g., 'te' -> 'te-IN')
          if (langCode && langCode.length === 2) {
            langCode = `${langCode}-IN`;
          }

          // Validate it's a supported Indian language code
          const supportedLangs = ['hi-IN', 'te-IN', 'ta-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'bn-IN', 'gu-IN', 'pa-IN', 'or-IN', 'as-IN'];
          if (!langCode || !supportedLangs.includes(langCode)) {
            // Fall back to extracting from voice ID
            const voiceMatch = voice.match(/ai4bharat-(\w{2})-/);
            if (voiceMatch) {
              langCode = `${voiceMatch[1]}-IN`;
            } else {
              langCode = 'te-IN'; // Default fallback
            }
          }

          console.log('[TTS] Using AI4Bharat TTS with voice:', voice, 'language:', langCode, '(from request:', language, ')');

          const result = await ai4bharatService.synthesize(
            text,
            langCode as any,
            voiceGender,
            22050
          );

          audioBuffer = result.audio;
          console.log('[TTS] AI4Bharat TTS generated, size:', audioBuffer.length);
          contentType = 'audio/wav';

          res.set({
            'Content-Type': contentType,
            'Content-Length': audioBuffer.length,
          });
          return res.send(audioBuffer);
        } catch (ai4bharatError) {
          console.warn('[TTS] AI4Bharat TTS failed, falling back to OpenAI:', (ai4bharatError as Error).message);
        }
      }
    }

    // OpenAI TTS (Default/Fallback)
    console.log('[TTS] Using OpenAI TTS with voice:', voice || 'alloy');

    // Clean voice ID and map to OpenAI voice
    let openaiVoice = (voice || 'alloy').replace('openai-', '');

    // Map other provider voice names to OpenAI voices as fallback
    const voiceMap: Record<string, string> = {
      'priya': 'nova',
      'dev': 'echo',
      'kavya': 'shimmer',
      'ravi': 'onyx',
      'neha': 'nova',
      'aditya': 'echo',
      'Rachel': 'nova',
      'Adam': 'onyx',
      'Josh': 'echo',
      'Bella': 'shimmer',
    };
    openaiVoice = voiceMap[openaiVoice] || openaiVoice;

    // Validate OpenAI voice
    const validOpenAIVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    if (!validOpenAIVoices.includes(openaiVoice)) {
      openaiVoice = 'alloy';
    }

    audioBuffer = await voiceAIService.textToSpeech(text, openaiVoice);

    console.log('[TTS] OpenAI TTS generated, size:', audioBuffer.length);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('[TTS] Error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Speech to Text endpoint (public - for widget)
router.post('/stt', voiceProcessingLimiter, upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Audio file is required', 400);
    }

    // Validate file size (already handled by multer but add safety check)
    if (req.file.size > 10 * 1024 * 1024) {
      return ApiResponse.error(res, 'Audio file too large (max 10MB)', 400);
    }

    // Validate MIME type
    const allowedMimes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/m4a'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return ApiResponse.error(res, 'Invalid audio format', 400);
    }

    const text = await voiceAIService.speechToText(
      req.file.buffer,
      req.file.mimetype.split('/')[1] || 'webm'
    );

    ApiResponse.success(res, 'Transcription complete', { text });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== AUTHENTICATED ENDPOINTS (Admin) ====================

router.use(authenticate);
router.use(tenantMiddleware);

// Rate limiter for expensive voice operations
const voiceCloneLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 voice cloning requests per hour
  message: { success: false, message: 'Too many voice cloning requests' },
});

// Clone voice - Upload voice sample for voice cloning
router.post('/clone-voice', voiceCloneLimiter, upload.single('voice'), validate([
  body('name').optional().trim().isLength({ max: 100 }).withMessage('Name too long'),
]), async (req: TenantRequest, res: Response) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Voice sample is required', 400);
    }

    // Validate file size (safety check)
    if (req.file.size > 10 * 1024 * 1024) {
      return ApiResponse.error(res, 'Voice sample too large (max 10MB)', 400);
    }

    // Validate MIME type
    const allowedMimes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/m4a'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return ApiResponse.error(res, 'Invalid audio format', 400);
    }

    const { name } = req.body;

    // Save voice sample and create a cloned voice entry
    const result = await voiceAIService.cloneVoice({
      organizationId: req.organizationId!,
      name: name || 'Custom Voice',
      audioBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });

    ApiResponse.success(res, 'Voice cloned successfully', {
      voiceId: result.voiceId,
      name: result.name,
      status: result.status,
    }, 201);
  } catch (error) {
    console.error('Voice cloning error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get custom voices for organization
router.get('/custom-voices', async (req: TenantRequest, res: Response) => {
  try {
    const voices = await voiceAIService.getCustomVoices(req.organizationId!);
    ApiResponse.success(res, 'Custom voices retrieved', voices);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Delete custom voice
router.delete('/custom-voices/:voiceId', authorize('admin'), validate([
  param('voiceId').trim().notEmpty().withMessage('Voice ID is required')
    .isLength({ max: 100 }).withMessage('Invalid voice ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { voiceId } = req.params;
    await voiceAIService.deleteCustomVoice(voiceId, req.organizationId!);
    ApiResponse.success(res, 'Custom voice deleted');
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get all industry templates
router.get('/templates', async (req: TenantRequest, res: Response) => {
  try {
    const templates = voiceAIService.getAllTemplates();
    ApiResponse.success(res, 'Templates retrieved', templates);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get specific template
router.get('/templates/:industry', async (req: TenantRequest, res: Response) => {
  try {
    const { industry } = req.params;
    const template = voiceAIService.getTemplate(industry as any);

    if (!template) {
      return ApiResponse.error(res, 'Template not found', 404);
    }

    ApiResponse.success(res, 'Template retrieved', template);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== AI TEST EVALUATION FUNCTION ====================
async function evaluateTestResult(
  testInput: string,
  expectedOutput: string,
  actualOutput: string,
  agentName: string
): Promise<{ passed: boolean; score: number; reason: string }> {
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: config.openai.apiKey });

    const evaluationPrompt = `You are a QA evaluator for an AI voice agent named "${agentName}".

Evaluate if the agent's actual response appropriately addresses the test case.

TEST INPUT (what user said): "${testInput}"

EXPECTED BEHAVIOR: "${expectedOutput}"

ACTUAL RESPONSE: "${actualOutput}"

Evaluate based on:
1. Does the response address the user's input appropriately?
2. Does it match the expected behavior/intent?
3. Is the response helpful and relevant?
4. Is the tone appropriate?

Respond in JSON format ONLY:
{
  "passed": true/false,
  "score": 0-100,
  "reason": "Brief explanation of why it passed or failed"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: evaluationPrompt }],
      max_tokens: 200,
      temperature: 0.1,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        passed: result.passed === true,
        score: typeof result.score === 'number' ? result.score : (result.passed ? 80 : 30),
        reason: result.reason || 'Evaluation complete',
      };
    }

    // Fallback if parsing fails
    return {
      passed: actualOutput.length > 10,
      score: 50,
      reason: 'Could not parse evaluation result',
    };
  } catch (error) {
    console.error('Evaluation error:', error);
    return {
      passed: actualOutput.length > 10,
      score: 50,
      reason: 'Evaluation service unavailable',
    };
  }
}

// Rate limiter for chat/LLM endpoints
const chatTestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 chat tests per minute
  message: { success: false, message: 'Too many chat test requests' },
});

// ==================== CHAT TEST ENDPOINT ====================
// Test agent responses via chat (text-based testing)
// Uses the model configured in the agent settings
router.post('/chat/test', chatTestLimiter, validate([
  body('agentId').isUUID().withMessage('Invalid agent ID'),
  body('message').trim().notEmpty().withMessage('Message is required')
    .isLength({ max: 5000 }).withMessage('Message must be at most 5000 characters'),
  body('conversationHistory').optional().isArray({ max: 50 }).withMessage('Conversation history too long'),
  body('testMode').optional().isBoolean().withMessage('testMode must be a boolean'),
  body('expectedOutput').optional().trim().isLength({ max: 2000 }).withMessage('Expected output too long'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { agentId, message, conversationHistory = [], testMode = false, expectedOutput } = req.body;

    // Get the agent with model configuration
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: req.organizationId,
      },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    // Build conversation context
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: agent.systemPrompt || `You are ${agent.name}, a helpful AI assistant. ${agent.greeting ? `Start conversations with: "${agent.greeting}"` : ''}`,
      },
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    // Get agent's configured LLM provider and model
    const llmProvider = (agent as any).llmProvider || 'openai';
    const llmModel = (agent as any).llmModel || 'gpt-4o-mini';

    let responseText = '';

    // Route to appropriate provider
    if (llmProvider === 'openai') {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: config.openai.apiKey });

      const completion = await openai.chat.completions.create({
        model: llmModel,
        messages,
        max_tokens: 500,
        temperature: agent.temperature || 0.7,
      });

      responseText = completion.choices[0]?.message?.content || '';
    } else if (llmProvider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const chatMessages = messages.filter(m => m.role !== 'system');

      const completion = await anthropic.messages.create({
        model: llmModel || 'claude-3-sonnet-20240229',
        max_tokens: 500,
        system: systemMessage,
        messages: chatMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      responseText = (completion.content[0] as any)?.text || '';
    } else if (llmProvider === 'google') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: llmModel || 'gemini-pro' });

      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const chatMessages = messages.filter(m => m.role !== 'system');

      const chat = model.startChat({
        history: chatMessages.slice(0, -1).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      });

      const result = await chat.sendMessage(
        `${systemMessage}\n\n${chatMessages[chatMessages.length - 1]?.content || message}`
      );
      responseText = result.response.text();
    } else if (llmProvider === 'groq') {
      const Groq = (await import('groq-sdk')).default;
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

      const completion = await groq.chat.completions.create({
        model: llmModel || 'llama-3.1-70b-versatile',
        messages,
        max_tokens: 500,
        temperature: agent.temperature || 0.7,
      });

      responseText = completion.choices[0]?.message?.content || '';
    } else {
      // Default to OpenAI
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: config.openai.apiKey });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: agent.temperature || 0.7,
      });

      responseText = completion.choices[0]?.message?.content || '';
    }

    if (!responseText) {
      responseText = 'I apologize, I could not generate a response. Please try again.';
    }

    // If in test mode with expected output, evaluate the response
    let evaluation = null;
    if (testMode && expectedOutput) {
      evaluation = await evaluateTestResult(
        message,
        expectedOutput,
        responseText,
        agent.name
      );
    }

    ApiResponse.success(res, 'Chat response generated', {
      response: responseText,
      agentName: agent.name,
      provider: llmProvider,
      model: llmModel,
      testMode,
      evaluation, // { passed: boolean, score: number, reason: string }
    });
  } catch (error) {
    console.error('Chat test error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Rate limiter for agent creation
const agentCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 agent creations per hour
  message: { success: false, message: 'Too many agent creation requests' },
});

// Create new voice agent
router.post('/agents', agentCreationLimiter, authorize('admin', 'manager'), validate([
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),
  body('industry').trim().notEmpty().withMessage('Industry is required')
    .isIn(['EDUCATION', 'REAL_ESTATE', 'HEALTHCARE', 'ECOMMERCE', 'FINANCE', 'IT_RECRUITMENT', 'CUSTOMER_CARE', 'CUSTOM'])
    .withMessage('Invalid industry'),
  body('customPrompt').optional().trim().isLength({ max: 10000 }).withMessage('Custom prompt too long'),
  body('customQuestions').optional().isArray({ max: 50 }).withMessage('Too many custom questions'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { name, industry, customPrompt, customQuestions } = req.body;

    const agent = await voiceAIService.createAgent({
      organizationId: req.organizationId!,
      name,
      industry,
      customPrompt,
      customQuestions,
      createdById: req.user?.id,
    });

    ApiResponse.success(res, 'Agent created', agent, 201);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Pagination validation
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

// Get all agents for organization
router.get('/agents', async (req: TenantRequest, res: Response) => {
  try {
    const agents = await voiceAIService.getAgents(req.organizationId!);
    ApiResponse.success(res, 'Agents retrieved', agents);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get single agent
router.get('/agents/:agentId', validate([
  param('agentId').isUUID().withMessage('Invalid agent ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId: req.organizationId },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    const fullAgent = await voiceAIService.getAgent(agentId);
    ApiResponse.success(res, 'Agent retrieved', fullAgent);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Upload document for agent knowledge base
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for documents (reduced from 50MB)
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'text/markdown',
    ];

    // Validate MIME type
    if (!allowedMimes.includes(file.mimetype)) {
      cb(new Error(`File type ${file.mimetype} not allowed`));
      return;
    }

    // Validate file extension matches MIME type
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    const mimeExtMap: Record<string, string[]> = {
      'application/pdf': ['pdf'],
      'text/plain': ['txt', 'text'],
      'text/csv': ['csv'],
      'application/msword': ['doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
      'application/vnd.ms-excel': ['xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
      'application/json': ['json'],
      'text/markdown': ['md', 'markdown'],
    };

    const allowedExts = mimeExtMap[file.mimetype] || [];
    if (!ext || !allowedExts.includes(ext)) {
      cb(new Error('File extension does not match content type'));
      return;
    }

    cb(null, true);
  }
});

router.post('/agents/documents/upload', documentUpload.single('file'), validate([
  body('agentId').isUUID().withMessage('Valid agent ID is required'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.body;
    const file = req.file;

    if (!file) {
      return ApiResponse.error(res, 'No file uploaded', 400);
    }

    // Additional file validation
    if (file.size > 10 * 1024 * 1024) {
      return ApiResponse.error(res, 'File too large (max 10MB)', 400);
    }

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId: req.organizationId }
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    // For now, store as base64 in the document record (for small files)
    // For production, you'd want to upload to S3/cloud storage
    const document = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'file',
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString(),
      // Store file content as base64 for text-based files (for RAG processing)
      content: file.mimetype.startsWith('text/') || file.mimetype === 'application/json'
        ? file.buffer.toString('utf-8')
        : undefined,
    };

    console.log('[VoiceAI] Document uploaded:', { agentId, name: file.originalname, size: file.size });

    ApiResponse.success(res, 'Document uploaded successfully', { document });
  } catch (error) {
    console.error('[VoiceAI] Document upload error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Update agent
router.put('/agents/:agentId', validate([
  param('agentId').isUUID().withMessage('Invalid agent ID'),
  body('name').optional().trim().isLength({ max: 100 }).withMessage('Name too long'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long'),
  body('systemPrompt').optional().trim().isLength({ max: 10000 }).withMessage('System prompt too long'),
  body('greeting').optional().trim().isLength({ max: 1000 }).withMessage('Greeting too long'),
  body('maxDuration').optional().isInt({ min: 30, max: 3600 }).withMessage('Max duration must be 30-3600 seconds'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;

    // Verify agent belongs to organization
    const existingAgent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId: req.organizationId },
    });
    if (!existingAgent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    const updateData = req.body;

    // Filter out fields that don't exist in the schema
    const allowedFields = [
      // Core Settings
      'name', 'description', 'industry', 'isActive', 'systemPrompt', 'voiceId',
      'language', 'temperature', 'questions', 'knowledgeBase', 'faqs', 'greeting',
      'fallbackMessage', 'transferMessage', 'endMessage', 'maxDuration',
      'personality', 'responseSpeed', 'interruptHandling', 'workingHoursEnabled',
      'workingHoursStart', 'workingHoursEnd', 'workingDays', 'afterHoursMessage',
      'silenceTimeout', 'widgetColor', 'widgetTitle', 'widgetSubtitle', 'widgetPosition',
      'documents', 'callDirection',
      // Lead Generation & CRM Integration Settings
      'autoCreateLeads', 'deduplicateByPhone', 'defaultStageId', 'defaultAssigneeId', 'autoAdvanceStage',
      // Appointment Booking Settings
      'appointmentEnabled', 'appointmentType', 'appointmentDuration', 'appointmentTimezone',
      // CRM Integration Settings
      'crmIntegration', 'crmWebhookUrl', 'triggerWebhookOnLead',
      // Realtime Settings
      'realtimeEnabled', 'webrtcEnabled',
      // Workflow Settings
      'workflowSteps',
      // Branches/Version Control
      'branches', 'activeBranch', 'branchHistory',
      // Analysis/Evaluation Settings
      'evaluationCriteria', 'dataCollectionPoints', 'analysisLanguage',
      // Test Cases
      'testCases',
      // Security Settings
      'authenticationRequired', 'rateLimitingEnabled', 'rateLimitRequests', 'rateLimitBurst',
      'contentFilteringEnabled', 'contentFilterCategories', 'dataRetentionDays',
      'anonymizeUserData', 'gdprComplianceEnabled', 'allowedDomains', 'ipWhitelist', 'sessionTimeoutMinutes',
      // Pre-chat Form Settings
      'preChatFormEnabled', 'preChatFormFields', 'preChatFormTitle', 'preChatFormSubtitle', 'createLeadFromForm',
      // Advanced Settings
      'topP', 'frequencyPenalty', 'presencePenalty', 'maxResponseTokens', 'stopSequences',
      'speechRate', 'voicePitch', 'silenceDetection', 'debugMode', 'logLevel', 'logConversations',
      // RAG Settings
      'ragSettings',
      // Metadata
      'metadata'
    ];

    const filteredData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        filteredData[key] = updateData[key];
      }
    }

    console.log('[VoiceAI] Updating agent:', agentId, 'with fields:', Object.keys(filteredData));

    const agent = await voiceAIService.updateAgent(agentId, filteredData);

    // Handle agent integrations separately (Calendar, CRM, Payment, Custom API)
    if (updateData.agentIntegrations) {
      const integrationsService = require('../services/integration.service').default;
      const { calendar, crm, payment, customApi } = updateData.agentIntegrations;

      // Save calendar integration settings
      if (calendar) {
        await integrationsService.agentIntegration.toggleIntegration(agentId, 'CALENDAR', true, calendar);
      }

      // Save CRM integration settings
      if (crm) {
        await integrationsService.agentIntegration.toggleIntegration(agentId, 'CRM', true, crm);
      }

      // Save payment integration settings
      if (payment) {
        await integrationsService.agentIntegration.toggleIntegration(agentId, 'PAYMENT', true, payment);
      }

      // Save custom API settings
      if (customApi) {
        await integrationsService.agentIntegration.toggleIntegration(agentId, 'CUSTOM_API', true, customApi);
      }
    }

    ApiResponse.success(res, 'Agent updated', agent);
  } catch (error) {
    console.error('[VoiceAI] Update agent error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Delete agent
router.delete('/agents/:agentId', validate([
  param('agentId').isUUID().withMessage('Invalid agent ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId: req.organizationId },
    });
    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    await voiceAIService.deleteAgent(agentId);

    ApiResponse.success(res, 'Agent deleted');
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== PUBLISH FEATURE ====================

// Publish agent - makes the agent live
router.post('/agents/:agentId/publish', validate([
  param('agentId').isUUID().withMessage('Invalid agent ID'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const { description } = req.body; // Optional version description
    const userId = req.user?.id;

    // Get current agent and verify organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId: req.organizationId },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    // Create a snapshot of current configuration
    const configSnapshot = {
      systemPrompt: agent.systemPrompt,
      voiceId: agent.voiceId,
      language: agent.language,
      temperature: agent.temperature,
      questions: agent.questions,
      knowledgeBase: agent.knowledgeBase,
      greeting: agent.greeting,
      fallbackMessage: agent.fallbackMessage,
      personality: agent.personality,
      workingHoursEnabled: agent.workingHoursEnabled,
      workingHoursStart: agent.workingHoursStart,
      workingHoursEnd: agent.workingHoursEnd,
      workingDays: agent.workingDays,
      realtimeEnabled: agent.realtimeEnabled,
      webrtcEnabled: agent.webrtcEnabled,
      // Security settings
      authenticationRequired: agent.authenticationRequired,
      rateLimitingEnabled: agent.rateLimitingEnabled,
      rateLimitRequests: agent.rateLimitRequests,
      rateLimitBurst: agent.rateLimitBurst,
      contentFilteringEnabled: agent.contentFilteringEnabled,
      allowedDomains: agent.allowedDomains,
      ipWhitelist: agent.ipWhitelist,
    };

    // Update version history
    const versionHistory = (agent.versionHistory as any[]) || [];
    const newVersion = agent.versionNumber + 1;
    versionHistory.push({
      version: newVersion,
      publishedAt: new Date().toISOString(),
      publishedBy: userId,
      description: description || `Version ${newVersion}`,
      config: configSnapshot,
    });

    // Update agent
    const updatedAgent = await prisma.voiceAgent.update({
      where: { id: agentId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedById: userId,
        publishedConfig: configSnapshot,
        draftConfig: Prisma.JsonNull, // Clear draft when publishing
        versionNumber: newVersion,
        versionHistory: versionHistory,
      },
    });

    console.log(`[VoiceAI] Agent ${agentId} published as version ${newVersion} by user ${userId}`);

    ApiResponse.success(res, 'Agent published successfully', {
      status: updatedAgent.status,
      versionNumber: updatedAgent.versionNumber,
      publishedAt: updatedAgent.publishedAt,
    });
  } catch (error) {
    console.error('[VoiceAI] Publish agent error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Unpublish agent - returns to draft mode
router.post('/agents/:agentId/unpublish', validate([
  param('agentId').isUUID().withMessage('Invalid agent ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;

    // Verify agent belongs to organization (IDOR protection)
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId: req.organizationId },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    const updatedAgent = await prisma.voiceAgent.update({
      where: { id: agentId },
      data: {
        status: 'DRAFT',
      },
    });

    console.log(`[VoiceAI] Agent ${agentId} unpublished`);

    ApiResponse.success(res, 'Agent unpublished', {
      status: updatedAgent.status,
    });
  } catch (error) {
    console.error('[VoiceAI] Unpublish agent error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get agent version history
router.get('/agents/:agentId/versions', validate([
  param('agentId').isUUID().withMessage('Invalid agent ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;

    // Verify agent belongs to organization (IDOR protection)
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId: req.organizationId },
      select: {
        versionNumber: true,
        versionHistory: true,
        publishedAt: true,
        status: true,
      },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    ApiResponse.success(res, 'Version history retrieved', {
      currentVersion: agent.versionNumber,
      status: agent.status,
      publishedAt: agent.publishedAt,
      versions: agent.versionHistory || [],
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== END PUBLISH FEATURE ====================

// Get agent sessions
router.get('/agents/:agentId/sessions', validate([
  param('agentId').isUUID().withMessage('Invalid agent ID'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId: req.organizationId },
      select: { id: true },
    });
    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const sessions = await voiceAIService.getAgentSessions(agentId, limit);

    ApiResponse.success(res, 'Sessions retrieved', sessions);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get agent analytics
router.get('/agents/:agentId/analytics', validate([
  param('agentId').isUUID().withMessage('Invalid agent ID'),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: agentId, organizationId: req.organizationId },
      select: { id: true },
    });
    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    const days = Math.min(parseInt(req.query.days as string) || 30, 365);

    const analytics = await voiceAIService.getAgentAnalytics(agentId, days);

    ApiResponse.success(res, 'Analytics retrieved', analytics);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get session details (admin)
router.get('/sessions/:sessionId', validate([
  param('sessionId').isUUID().withMessage('Invalid session ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Verify session belongs to organization (IDOR protection)
    const sessionCheck = await prisma.voiceSession.findFirst({
      where: { id: sessionId },
      include: {
        agent: {
          select: { organizationId: true },
        },
      },
    });

    if (!sessionCheck || sessionCheck.agent?.organizationId !== req.organizationId) {
      return ApiResponse.error(res, 'Session not found', 404);
    }

    const session = await voiceAIService.getSession(sessionId);

    if (!session) {
      return ApiResponse.error(res, 'Session not found', 404);
    }

    ApiResponse.success(res, 'Session retrieved', session);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Test call endpoint - initiates a test call to verify agent settings
router.post('/test-call', async (req: TenantRequest, res: Response) => {
  try {
    const { phoneNumber, voiceId, greeting, language, agentId } = req.body;

    if (!phoneNumber) {
      return ApiResponse.error(res, 'Phone number is required', 400);
    }

    console.log(`[VoiceAI] Test call requested to ${phoneNumber} with voice ${voiceId}, agent ${agentId}`);

    // Import services dynamically
    const { exotelService } = await import('../integrations/exotel.service');
    const { outboundCallService } = await import('../integrations/outbound-call.service');

    if (!exotelService.isConfigured()) {
      return ApiResponse.error(res, 'Exotel is not configured. Please check EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN.', 400);
    }

    // Get agent for the call
    let agent = null;
    if (agentId) {
      agent = await prisma.voiceAgent.findUnique({ where: { id: agentId } });
    }
    if (!agent) {
      agent = await prisma.voiceAgent.findFirst({ where: { isActive: true } });
    }

    // Format phone number
    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/^0+/, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone; // Default to India
    }

    console.log(`[VoiceAI] Making call to ${formattedPhone} with agent ${agent?.name || 'default'}`);

    // Make the actual call via outbound call service
    const result = await outboundCallService.makeCall({
      phone: formattedPhone,
      agentId: agent?.id || '',
    });

    console.log(`[VoiceAI] Call result:`, result);

    if (result.callId) {
      ApiResponse.success(res, 'Test call initiated', {
        status: 'initiated',
        callId: result.callId,
        phoneNumber: formattedPhone,
        agent: agent?.name,
        message: 'Call is being connected. You should receive a call shortly.',
      });
    } else {
      ApiResponse.error(res, 'Failed to initiate call', 500);
    }
  } catch (error: any) {
    console.error('[VoiceAI] Test call error:', error);
    ApiResponse.error(res, error.message || 'Failed to make call', 500);
  }
});

// Generate embed code for agent
router.get('/agents/:agentId/embed', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const baseUrl = config.frontendUrl;

    const embedCode = `<!-- Voice AI Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['VoiceAI']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','voiceai','${baseUrl}/voice-widget.js'));
  voiceai('init', '${agentId}');
</script>`;

    ApiResponse.success(res, 'Embed code generated', { embedCode, agentId });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== RAG (Knowledge Base) ====================

// Get RAG documents for agent
router.get('/agents/:agentId/rag/documents', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: req.organizationId!,
      },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    // Get knowledge base documents (if table exists)
    // For now, return the agent's knowledge base content
    const documents = [];

    if (agent.knowledgeBase) {
      documents.push({
        id: `${agentId}-kb`,
        name: 'Knowledge Base',
        type: 'text',
        content: typeof agent.knowledgeBase === 'string'
          ? agent.knowledgeBase.substring(0, 200) + '...'
          : 'Knowledge base configured',
        createdAt: agent.createdAt,
      });
    }

    if (agent.faqs && Array.isArray(agent.faqs) && (agent.faqs as any[]).length > 0) {
      documents.push({
        id: `${agentId}-faqs`,
        name: 'FAQs',
        type: 'faq',
        count: (agent.faqs as any[]).length,
        createdAt: agent.createdAt,
      });
    }

    ApiResponse.success(res, 'RAG documents retrieved', documents);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Upload RAG document
router.post('/agents/:agentId/rag/documents', upload.single('file'), async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const { content, type = 'text' } = req.body;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: req.organizationId!,
      },
    });

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    // Handle file upload or text content
    let documentContent = content;
    if (req.file) {
      documentContent = req.file.buffer.toString('utf-8');
    }

    // Update agent's knowledge base
    const updatedAgent = await prisma.voiceAgent.update({
      where: { id: agentId },
      data: {
        knowledgeBase: documentContent,
      },
    });

    ApiResponse.success(res, 'Document uploaded', {
      id: `${agentId}-kb`,
      name: req.file?.originalname || 'Knowledge Base',
      type,
      size: documentContent?.length || 0,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
