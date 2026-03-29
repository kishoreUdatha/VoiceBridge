import { Router } from 'express';
import OpenAI, { toFile } from 'openai';
import { voiceTemplateService } from '../services/voice-template.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sarvamService } from '../integrations/sarvam.service';
import { calendarService } from '../services/calendar.service';
import { Readable } from 'stream';

// Initialize OpenAI client for template testing
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * @api {get} /voice-templates List Templates
 * @description Get all voice templates for the organization
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      industry,
      category,
      isActive,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const result = await voiceTemplateService.getTemplates(organizationId, {
      industry: industry as any,
      category: category as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({
      success: true,
      ...result,
    });
  })
);

/**
 * @api {get} /voice-templates/industry-defaults Get Industry Default Templates
 * @description Get the default system templates for all industries
 */
router.get(
  '/industry-defaults',
  asyncHandler(async (req, res) => {
    const templates = voiceTemplateService.getIndustryTemplates();

    res.json({
      success: true,
      data: templates,
    });
  })
);

/**
 * @api {post} /voice-templates/initialize Initialize Default Templates
 * @description Create default templates for organization from industry defaults
 */
router.post(
  '/initialize',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { industries } = req.body;

    const templates = await voiceTemplateService.initializeDefaultTemplates(
      organizationId,
      industries
    );

    res.status(201).json({
      success: true,
      message: `Created ${templates.length} templates`,
      data: templates,
    });
  })
);

/**
 * @api {get} /voice-templates/:id Get Template
 * @description Get a single template by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const template = await voiceTemplateService.getTemplateById(id, organizationId);

    res.json({
      success: true,
      data: template,
    });
  })
);

/**
 * @api {get} /voice-templates/:id/preview Preview Template
 * @description Preview template with sample data
 */
router.get(
  '/:id/preview',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const preview = await voiceTemplateService.previewTemplate(id, organizationId);

    res.json({
      success: true,
      data: preview,
    });
  })
);

// Valid Sarvam voices
const SARVAM_VOICES = {
  male: ['aditya', 'rahul', 'rohan', 'amit', 'dev', 'ratan', 'varun', 'manan', 'sumit', 'kabir', 'aayan', 'shubh', 'ashutosh', 'advait'],
  female: ['ritu', 'priya', 'neha', 'pooja', 'simran', 'kavya', 'ishita', 'shreya', 'roopa', 'amelia', 'sophia'],
};

const SARVAM_LANGUAGES = ['hi-IN', 'te-IN', 'ta-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'bn-IN', 'gu-IN', 'pa-IN', 'od-IN', 'en-IN', 'as-IN'];

/**
 * @api {post} /voice-templates/:id/preview-voice Preview Voice
 * @description Generate TTS audio preview for template greeting
 */
router.post(
  '/:id/preview-voice',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const { text, voice, language } = req.body;

    const template = await voiceTemplateService.getTemplateById(id, organizationId);

    // Use provided text or default to template greeting
    const greetings = template.greetings as Record<string, string> | null;
    const textToSpeak = text || template.greeting || greetings?.default ||
      `Hello! Welcome to ${template.name}. How can I help you today?`;

    // Use template voice settings or provided overrides
    const requestedVoice = voice || template.voiceId || 'priya';
    const requestedLang = language || template.language || 'en-IN';

    // Generate TTS audio
    let audioBase64: string;
    let format: string;
    let usedVoice: string;
    let usedLang: string;

    // Check if voice is valid for Sarvam
    const allSarvamVoices = [...SARVAM_VOICES.male, ...SARVAM_VOICES.female];
    const isValidSarvamVoice = allSarvamVoices.includes(requestedVoice.toLowerCase());
    const isValidSarvamLang = SARVAM_LANGUAGES.includes(requestedLang);

    // Try Sarvam first if available and voice is valid
    if (sarvamService.isAvailable() && isValidSarvamVoice && isValidSarvamLang) {
      try {
        const audioBuffer = await sarvamService.textToSpeech(
          textToSpeak,
          requestedVoice.toLowerCase(),
          requestedLang,
          22050 // Higher quality for preview
        );
        audioBase64 = audioBuffer.toString('base64');
        format = 'wav';
        usedVoice = requestedVoice;
        usedLang = requestedLang;
      } catch (sarvamError: any) {
        console.warn('[Preview Voice] Sarvam TTS failed, trying OpenAI:', sarvamError.message);
        // Fall through to OpenAI
        if (!openai) {
          throw new AppError(`Sarvam TTS failed: ${sarvamError.message}`, 500);
        }
      }
    }

    // Use OpenAI as fallback or primary
    if (!audioBase64! && openai) {
      // Map to OpenAI voice
      const openaiVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
      const openaiVoice = openaiVoices.includes(requestedVoice as any)
        ? requestedVoice as typeof openaiVoices[number]
        : 'alloy';

      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: openaiVoice,
        input: textToSpeak,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      audioBase64 = buffer.toString('base64');
      format = 'mp3';
      usedVoice = openaiVoice;
      usedLang = 'en';
    }

    if (!audioBase64!) {
      throw new AppError('No TTS service available. Configure SARVAM_API_KEY or OPENAI_API_KEY.', 503);
    }

    res.json({
      success: true,
      data: {
        audio: audioBase64,
        text: textToSpeak,
        voice: usedVoice!,
        language: usedLang!,
        format: format!,
      },
    });
  })
);

/**
 * @api {post} /voice-templates/:id/test-conversation Test Conversation
 * @description Send a test message and get AI response with voice
 */
router.post(
  '/:id/test-conversation',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const { message, conversationHistory = [], includeAudio = false } = req.body;

    if (!message) {
      throw new AppError('Message is required', 400);
    }

    if (!openai) {
      throw new AppError('OpenAI not configured. Set OPENAI_API_KEY to test conversations.', 503);
    }

    const template = await voiceTemplateService.getTemplateById(id, organizationId);

    // Build system prompt from template - keep it concise for speed
    const faqs = template.faqs as any[] || [];
    const questions = template.questions as any[] || [];

    const systemPrompt = `${template.systemPrompt || 'You are a helpful AI assistant.'}

Knowledge Base:
${template.knowledgeBase || 'No specific knowledge base provided.'}

FAQs:
${faqs.slice(0, 10).map((faq: any) => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n') || 'No FAQs provided.'}

Questions to collect: ${questions.slice(0, 5).map((q: any) => q.question).join(', ') || 'None'}

IMPORTANT: Keep responses SHORT (1-2 sentences max). This is a phone call - be concise.
Be ${template.personality || 'friendly and professional'}.`;

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // Get AI response with faster model
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fastest model
      messages,
      temperature: 0.7,
      max_tokens: 150, // Shorter responses = faster
    });

    const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";

    // Generate audio if requested
    let audioBase64: string | undefined;
    let audioFormat: string | undefined;

    if (includeAudio) {
      const requestedVoice = template.voiceId || 'priya';
      const requestedLang = template.language || 'en-IN';

      const allSarvamVoices = [...SARVAM_VOICES.male, ...SARVAM_VOICES.female];
      const isValidSarvamVoice = allSarvamVoices.includes(requestedVoice.toLowerCase());
      const isValidSarvamLang = SARVAM_LANGUAGES.includes(requestedLang);

      try {
        if (sarvamService.isAvailable() && isValidSarvamVoice && isValidSarvamLang) {
          const audioBuffer = await sarvamService.textToSpeech(
            reply,
            requestedVoice.toLowerCase(),
            requestedLang,
            8000 // Lower sample rate = faster
          );
          audioBase64 = audioBuffer.toString('base64');
          audioFormat = 'wav';
        } else if (openai) {
          const mp3 = await openai.audio.speech.create({
            model: 'tts-1', // Faster than tts-1-hd
            voice: 'alloy',
            input: reply,
            speed: 1.1, // Slightly faster speech
          });
          const buffer = Buffer.from(await mp3.arrayBuffer());
          audioBase64 = buffer.toString('base64');
          audioFormat = 'mp3';
        }
      } catch (ttsError: any) {
        console.warn('[Test Conversation] TTS failed:', ttsError.message);
        // Continue without audio
      }
    }

    res.json({
      success: true,
      data: {
        reply,
        audio: audioBase64,
        audioFormat,
        templateName: template.name,
      },
    });
  })
);

/**
 * @api {post} /voice-templates Create Template
 * @description Create a new voice template
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;
    const {
      name,
      industry,
      description,
      category,
      systemPrompt,
      knowledgeBase,
      questions,
      faqs,
      documents,
      greeting,
      greetings,
      fallbackMessage,
      transferMessage,
      endMessage,
      afterHoursMessage,
      language,
      voiceId,
      temperature,
      personality,
      responseSpeed,
      maxDuration,
      workingHoursEnabled,
      workingHoursStart,
      workingHoursEnd,
      workingDays,
      autoCreateLeads,
      deduplicateByPhone,
      appointmentEnabled,
      appointmentType,
      appointmentDuration,
    } = req.body;

    if (!name) {
      throw new AppError('Template name is required', 400);
    }

    if (!industry) {
      throw new AppError('Industry is required', 400);
    }

    const template = await voiceTemplateService.createTemplate({
      organizationId,
      name,
      industry,
      description,
      category,
      systemPrompt,
      knowledgeBase,
      questions,
      faqs,
      documents,
      greeting,
      greetings,
      fallbackMessage,
      transferMessage,
      endMessage,
      afterHoursMessage,
      language,
      voiceId,
      temperature,
      personality,
      responseSpeed,
      maxDuration,
      workingHoursEnabled,
      workingHoursStart,
      workingHoursEnd,
      workingDays,
      autoCreateLeads,
      deduplicateByPhone,
      appointmentEnabled,
      appointmentType,
      appointmentDuration,
      createdById: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template,
    });
  })
);

/**
 * @api {put} /voice-templates/:id Update Template
 * @description Update an existing voice template
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const {
      name,
      description,
      category,
      systemPrompt,
      knowledgeBase,
      questions,
      faqs,
      documents,
      greeting,
      greetings,
      fallbackMessage,
      transferMessage,
      endMessage,
      afterHoursMessage,
      language,
      voiceId,
      temperature,
      personality,
      responseSpeed,
      maxDuration,
      workingHoursEnabled,
      workingHoursStart,
      workingHoursEnd,
      workingDays,
      autoCreateLeads,
      deduplicateByPhone,
      appointmentEnabled,
      appointmentType,
      appointmentDuration,
      isActive,
      isDefault,
    } = req.body;

    const template = await voiceTemplateService.updateTemplate(id, organizationId, {
      name,
      description,
      category,
      systemPrompt,
      knowledgeBase,
      questions,
      faqs,
      documents,
      greeting,
      greetings,
      fallbackMessage,
      transferMessage,
      endMessage,
      afterHoursMessage,
      language,
      voiceId,
      temperature,
      personality,
      responseSpeed,
      maxDuration,
      workingHoursEnabled,
      workingHoursStart,
      workingHoursEnd,
      workingDays,
      autoCreateLeads,
      deduplicateByPhone,
      appointmentEnabled,
      appointmentType,
      appointmentDuration,
      isActive,
      isDefault,
    });

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template,
    });
  })
);

/**
 * @api {delete} /voice-templates/:id Delete Template
 * @description Delete a voice template
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    await voiceTemplateService.deleteTemplate(id, organizationId);

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  })
);

/**
 * @api {post} /voice-templates/:id/clone Clone Template
 * @description Clone an existing template
 */
router.post(
  '/:id/clone',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const { name } = req.body;

    const template = await voiceTemplateService.cloneTemplate(id, organizationId, name);

    res.status(201).json({
      success: true,
      message: 'Template cloned successfully',
      data: template,
    });
  })
);

/**
 * @api {post} /voice-templates/:id/deploy Deploy Template as Agent
 * @description Create a new voice agent from this template
 */
router.post(
  '/:id/deploy',
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;
    const { id } = req.params;
    const { name, description, systemPrompt, customizations } = req.body;

    if (!name) {
      throw new AppError('Agent name is required', 400);
    }

    const agent = await voiceTemplateService.deployAsAgent(id, organizationId, {
      name,
      description,
      systemPrompt,
      createdById: userId,
      customizations,
    });

    res.status(201).json({
      success: true,
      message: 'Agent created from template',
      data: agent,
    });
  })
);

// Whisper supported languages (subset of most common)
const WHISPER_SUPPORTED_LANGUAGES = [
  'en', 'zh', 'de', 'es', 'ru', 'ko', 'fr', 'ja', 'pt', 'tr', 'pl', 'ca',
  'nl', 'ar', 'sv', 'it', 'id', 'hi', 'fi', 'vi', 'he', 'uk', 'el', 'ms',
  'cs', 'ro', 'da', 'hu', 'ta', 'no', 'th', 'ur', 'hr', 'bg', 'lt', 'la',
  'mi', 'ml', 'cy', 'sk', 'mr', 'fa', 'lv', 'bn', 'sr', 'az', 'sl', 'kn',
  'et', 'mk', 'br', 'eu', 'is', 'hy', 'ne', 'mn', 'bs', 'kk', 'sq', 'sw',
  'gl', 'gu', 'pa', 'si', 'km', 'sn', 'yo', 'so', 'af', 'oc', 'ka', 'be',
  'tg', 'sd', 'gu', 'am', 'yi', 'lo', 'uz', 'fo', 'ht', 'ps', 'tk', 'nn',
  'mt', 'sa', 'lb', 'my', 'bo', 'tl', 'mg', 'as', 'tt', 'haw', 'ln', 'ha',
  'ba', 'jw', 'su'
];

/**
 * @api {post} /voice-templates/transcribe Transcribe Audio
 * @description Convert speech to text using Sarvam/OpenAI Whisper
 */
router.post(
  '/transcribe',
  asyncHandler(async (req, res) => {
    const { audio, language } = req.body;

    if (!audio) {
      throw new AppError('Audio data is required', 400);
    }

    // Decode base64 audio
    const audioBuffer = Buffer.from(audio, 'base64');
    const langToUse = language || 'en-IN';
    const langCode = langToUse.split('-')[0]; // 'en' from 'en-IN'

    console.log(`[Transcribe] Received audio: ${audioBuffer.length} bytes, language: ${langToUse}`);

    // Check if audio is too large (rough estimate: >30 seconds at typical bitrate)
    // WebM at ~50kbps = ~187KB for 30 seconds
    const estimatedDuration = audioBuffer.length / (50 * 1024 / 8); // rough seconds estimate
    console.log(`[Transcribe] Estimated duration: ${estimatedDuration.toFixed(1)} seconds`);

    let transcript = '';

    // Try OpenAI Whisper first (more reliable for WebM format from browser)
    if (!transcript && openai) {
      try {
        // Convert buffer to a file-like object using OpenAI's toFile helper
        // WebM is the default format from browser MediaRecorder
        const audioFile = await toFile(
          Readable.from(audioBuffer),
          'audio.webm',
          { type: 'audio/webm' }
        );

        // Use auto-detection if language not supported, otherwise use the language code
        const whisperLang = WHISPER_SUPPORTED_LANGUAGES.includes(langCode) ? langCode : undefined;
        console.log(`[Transcribe] Whisper using language: ${whisperLang || 'auto-detect'}`);

        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          ...(whisperLang && { language: whisperLang }),
        });

        transcript = transcription.text;
        console.log(`[Transcribe] Whisper result: "${transcript}"`);
      } catch (whisperError: any) {
        console.warn('[Transcribe] Whisper STT failed:', whisperError.message);
      }
    }

    // Fallback to Sarvam for Indian languages (only for shorter audio)
    if (!transcript && sarvamService.isAvailable() && SARVAM_LANGUAGES.includes(langToUse)) {
      // Only try Sarvam if audio is likely under 30 seconds
      if (estimatedDuration <= 25) {
        try {
          // Note: Sarvam expects PCM audio, WebM may not work directly
          const result = await sarvamService.speechToText(audioBuffer, 16000, langToUse);
          transcript = result.text;
          console.log(`[Transcribe] Sarvam result: "${transcript}"`);
        } catch (sarvamError: any) {
          console.warn('[Transcribe] Sarvam STT failed:', sarvamError.message);
        }
      } else {
        console.log('[Transcribe] Skipping Sarvam - audio too long');
      }
    }

    if (!transcript) {
      throw new AppError('Failed to transcribe audio. Please try again or speak more briefly.', 500);
    }

    // Post-process to improve accuracy for common patterns
    transcript = postProcessTranscript(transcript);

    res.json({
      success: true,
      data: {
        text: transcript,
      },
    });
  })
);

/**
 * Post-process transcript to fix common STT errors
 */
function postProcessTranscript(text: string): string {
  let result = text;

  // Fix email patterns - handle various ways people say email addresses
  result = result.replace(/\s*at\s*the\s*rate\s*(of\s*)?/gi, '@');
  result = result.replace(/\s*at\s*rate\s*/gi, '@');
  result = result.replace(/\s+at\s+/gi, '@'); // "john at gmail" → "john@gmail"
  result = result.replace(/\s*@\s*/g, '@');
  result = result.replace(/\s*dot\s*/gi, '.');
  result = result.replace(/\s*period\s*/gi, '.');

  // Fix common email domains
  result = result.replace(/gmail\s*\.?\s*com/gi, 'gmail.com');
  result = result.replace(/yahoo\s*\.?\s*com/gi, 'yahoo.com');
  result = result.replace(/hotmail\s*\.?\s*com/gi, 'hotmail.com');
  result = result.replace(/outlook\s*\.?\s*com/gi, 'outlook.com');
  result = result.replace(/rediff\s*\.?\s*com/gi, 'rediff.com');
  result = result.replace(/live\s*\.?\s*com/gi, 'live.com');

  // Handle spelled out letters with spaces or hyphens: "K I S H O R E" or "K-I-S-H-O-R-E"
  // Convert sequences of single letters to words
  result = result.replace(/\b([A-Z])\s*-\s*([A-Z])\s*-\s*([A-Z])/gi, '$1$2$3');
  result = result.replace(/\b([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])/gi, (match) => {
    return match.replace(/\s+/g, '').toLowerCase();
  });

  // Fix common mishearings for email parts
  result = result.replace(/g\s*mail/gi, 'gmail');
  result = result.replace(/gee\s*mail/gi, 'gmail');
  result = result.replace(/ji\s*mail/gi, 'gmail');

  // Fix phone number patterns - remove spaces between digits
  result = result.replace(/(\d)\s+(\d)/g, '$1$2');

  // Common word corrections
  result = result.replace(/\bai\b/gi, 'AI');
  result = result.replace(/\bml\b/gi, 'ML');
  result = result.replace(/\bb\.?\s*tech\b/gi, 'B.Tech');
  result = result.replace(/\bm\.?\s*tech\b/gi, 'M.Tech');
  result = result.replace(/\bmba\b/gi, 'MBA');
  result = result.replace(/\bbba\b/gi, 'BBA');
  result = result.replace(/\bbca\b/gi, 'BCA');
  result = result.replace(/\bmca\b/gi, 'MCA');

  return result;
}

// Tools for AI agent function calling
const agentTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description: 'Book an appointment for the customer. Use this when the user wants to schedule a meeting, appointment, demo, or consultation.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The date for the appointment in YYYY-MM-DD format',
          },
          time: {
            type: 'string',
            description: 'The time for the appointment in HH:MM format (24-hour)',
          },
          name: {
            type: 'string',
            description: 'The customer name',
          },
          phone: {
            type: 'string',
            description: 'The customer phone number',
          },
          email: {
            type: 'string',
            description: 'The customer email address. Convert spoken words: "at" or "at the rate" → @, "dot" or "period" → . For example: "john at gmail dot com" → "john@gmail.com"',
          },
          purpose: {
            type: 'string',
            description: 'The purpose or type of appointment (e.g., consultation, demo, follow-up)',
          },
          duration: {
            type: 'number',
            description: 'Duration in minutes (default 30)',
          },
        },
        required: ['date', 'time', 'name', 'purpose'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Check available appointment slots for a specific date',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The date to check availability in YYYY-MM-DD format',
          },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'transfer_to_human',
      description: 'Transfer the call to a human agent when the customer requests it or when the AI cannot help',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for the transfer',
          },
        },
        required: ['reason'],
      },
    },
  },
];

/**
 * @api {post} /voice-templates/chat Chat with AI Agent
 * @description Get AI response for testing agent configuration with function calling
 */
router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const { message, systemPrompt, conversationHistory = [], enableTools = true } = req.body;

    if (!message) {
      throw new AppError('Message is required', 400);
    }

    if (!openai) {
      throw new AppError('OpenAI is not configured', 500);
    }

    // Build messages array
    const messages: any[] = [];

    // Add system prompt with tool instructions
    const basePrompt = systemPrompt || 'You are a helpful voice AI assistant. Keep responses concise and natural for voice conversation.';
    const toolInstructions = enableTools ? `

You have access to the following tools:
- book_appointment: Use this to book appointments when users request scheduling
- check_availability: Use this to check available time slots
- transfer_to_human: Use this when the user asks to speak with a human

When booking appointments:
1. Ask for the date, time, name, and purpose if not provided
2. For EMAIL ADDRESSES - this is CRITICAL for voice conversations:
   - Say: "What is your email address? Please spell it letter by letter, like K I S H O R E at gmail dot com"
   - The system automatically converts: "at" → @, "dot" → ., "you" → u, "are" → r, "see" → c, "bee" → b
   - If the email seems incomplete or unclear, ask them to SPELL IT LETTER BY LETTER
   - ALWAYS confirm the email: "I heard your email as kishore@gmail.com - is that correct?"
   - If they say no, ask: "Please spell it one letter at a time, like K I S H O R E"
   - If they say yes, proceed
3. Confirm ALL details before booking
4. After booking, confirm the appointment details

IMPORTANT EMAIL CAPTURE - Ask users to spell letter by letter:
- Best format: "K I S H O R E at gmail dot com" (letters with spaces)
- Also works: "kishore at gmail dot com"
- Phonetic: "K for King, I for India, S for Sam" → "kis"
- Numbers: "one two three" → "123"
- Common mishearings are auto-fixed: "you" → u, "are" → r, "see" → c, "bee" → b, "gee" → g
- If email looks wrong, ALWAYS ask to spell it again letter by letter` : '';

    messages.push({
      role: 'system',
      content: basePrompt + toolInstructions,
    });

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Preprocess user message for email patterns (same as STT post-processing)
    let processedMessage = message;

    // Handle phonetic alphabet (NATO/common): "U for Umbrella" → "U", "A for Apple" → "A"
    const phoneticMap: Record<string, string> = {
      // Common phonetic words
      'alpha': 'a', 'apple': 'a', 'america': 'a', 'ant': 'a',
      'bravo': 'b', 'ball': 'b', 'boy': 'b', 'bat': 'b',
      'charlie': 'c', 'cat': 'c', 'car': 'c',
      'delta': 'd', 'dog': 'd', 'david': 'd',
      'echo': 'e', 'elephant': 'e', 'egg': 'e',
      'foxtrot': 'f', 'fox': 'f', 'father': 'f',
      'golf': 'g', 'girl': 'g', 'george': 'g',
      'hotel': 'h', 'horse': 'h', 'house': 'h', 'henry': 'h',
      'india': 'i', 'ice': 'i', 'igloo': 'i',
      'juliet': 'j', 'jack': 'j', 'john': 'j',
      'kilo': 'k', 'king': 'k', 'kite': 'k', 'kishore': 'k',
      'lima': 'l', 'lion': 'l', 'love': 'l', 'london': 'l',
      'mike': 'm', 'mother': 'm', 'man': 'm', 'mary': 'm', 'monkey': 'm',
      'november': 'n', 'nancy': 'n', 'number': 'n',
      'oscar': 'o', 'orange': 'o', 'oil': 'o',
      'papa': 'p', 'peter': 'p', 'pink': 'p',
      'quebec': 'q', 'queen': 'q',
      'romeo': 'r', 'red': 'r', 'roger': 'r', 'robert': 'r',
      'sierra': 's', 'sam': 's', 'sugar': 's', 'snake': 's',
      'tango': 't', 'tom': 't', 'tiger': 't', 'talent': 't', 'table': 't',
      'uniform': 'u', 'umbrella': 'u', 'uncle': 'u', 'united': 'u',
      'victor': 'v', 'van': 'v', 'victory': 'v',
      'whiskey': 'w', 'william': 'w', 'water': 'w',
      'xray': 'x', 'x-ray': 'x',
      'yankee': 'y', 'yellow': 'y', 'yes': 'y',
      'zulu': 'z', 'zebra': 'z', 'zero': 'z',
    };

    // Convert phonetic patterns: "U for Umbrella" → "u", "A for Apple" → "a"
    for (const [word, letter] of Object.entries(phoneticMap)) {
      // Match patterns like "U for Umbrella", "you for umbrella", "A as in Apple"
      const patterns = [
        new RegExp(`\\b[${letter.toUpperCase()}${letter}]\\s+(?:for|as\\s+in|like)\\s+${word}\\b`, 'gi'),
        new RegExp(`\\b(?:you|u)\\s+(?:for|as\\s+in|like)\\s+${word}\\b`, 'gi'), // "you for umbrella" → "u"
      ];
      for (const pattern of patterns) {
        processedMessage = processedMessage.replace(pattern, letter);
      }
    }

    // Also handle "capital U", "small a" patterns
    processedMessage = processedMessage.replace(/\b(?:capital|big|upper)\s+([a-zA-Z])\b/gi, (_: string, letter: string) => letter.toUpperCase());
    processedMessage = processedMessage.replace(/\b(?:small|little|lower)\s+([a-zA-Z])\b/gi, (_: string, letter: string) => letter.toLowerCase());

    // Handle common letter mishearings from speech-to-text
    const letterMishearings: Record<string, string> = {
      'be': 'b', 'bee': 'b', 'b as in': 'b',
      'see': 'c', 'sea': 'c', 'c as in': 'c',
      'de': 'd', 'dee': 'd', 'd as in': 'd',
      'ee': 'e', 'e as in': 'e',
      'ef': 'f', 'eff': 'f', 'f as in': 'f',
      'gee': 'g', 'ji': 'g', 'g as in': 'g',
      'aitch': 'h', 'h as in': 'h',
      'eye': 'i', 'i as in': 'i',
      'jay': 'j', 'j as in': 'j',
      'kay': 'k', 'k as in': 'k',
      'el': 'l', 'ell': 'l', 'l as in': 'l',
      'em': 'm', 'm as in': 'm',
      'en': 'n', 'n as in': 'n',
      'oh': 'o', 'o as in': 'o',
      'pee': 'p', 'p as in': 'p',
      'cue': 'q', 'queue': 'q', 'q as in': 'q',
      'are': 'r', 'ar': 'r', 'r as in': 'r',
      'es': 's', 'ess': 's', 's as in': 's',
      'tea': 't', 'tee': 't', 't as in': 't',
      'you': 'u', 'yu': 'u', 'u as in': 'u',
      'vee': 'v', 'v as in': 'v',
      'double you': 'w', 'doubleyou': 'w', 'w as in': 'w',
      'ex': 'x', 'x as in': 'x',
      'why': 'y', 'y as in': 'y',
      'zee': 'z', 'zed': 'z', 'z as in': 'z',
    };

    // Apply letter mishearings (only when surrounded by spaces or at boundaries)
    for (const [mishearing, letter] of Object.entries(letterMishearings)) {
      const pattern = new RegExp(`\\b${mishearing}\\b`, 'gi');
      // Only replace if it looks like spelling context (near other single letters or email patterns)
      if (processedMessage.match(/\b[a-zA-Z]\s+[a-zA-Z]\s+[a-zA-Z]\b/) ||
          processedMessage.match(/email|@|gmail|yahoo|outlook/i)) {
        processedMessage = processedMessage.replace(pattern, letter);
      }
    }

    // Convert email patterns - more variations
    processedMessage = processedMessage.replace(/\s*at\s*the\s*rate\s*(of\s*)?/gi, '@');
    processedMessage = processedMessage.replace(/\s*at\s*rate\s*/gi, '@');
    processedMessage = processedMessage.replace(/\s*@\s*the\s*rate\s*/gi, '@');
    processedMessage = processedMessage.replace(/\s*add\s*the\s*rate\s*/gi, '@');
    processedMessage = processedMessage.replace(/\s*at\s*(?=gmail|yahoo|hotmail|outlook)/gi, '@');
    processedMessage = processedMessage.replace(/\s+at\s+/gi, '@');

    // Handle "dot" variations
    processedMessage = processedMessage.replace(/\s*dot\s*/gi, '.');
    processedMessage = processedMessage.replace(/\s*period\s*/gi, '.');
    processedMessage = processedMessage.replace(/\s*point\s*/gi, '.');
    processedMessage = processedMessage.replace(/\s*full\s*stop\s*/gi, '.');

    // Fix common email domains with various spacings
    processedMessage = processedMessage.replace(/g\s*mail\s*\.?\s*com/gi, 'gmail.com');
    processedMessage = processedMessage.replace(/gee\s*mail\s*\.?\s*com/gi, 'gmail.com');
    processedMessage = processedMessage.replace(/ji\s*mail\s*\.?\s*com/gi, 'gmail.com');
    processedMessage = processedMessage.replace(/gmail\s*\.?\s*com/gi, 'gmail.com');
    processedMessage = processedMessage.replace(/yahoo\s*\.?\s*com/gi, 'yahoo.com');
    processedMessage = processedMessage.replace(/hotmail\s*\.?\s*com/gi, 'hotmail.com');
    processedMessage = processedMessage.replace(/outlook\s*\.?\s*com/gi, 'outlook.com');
    processedMessage = processedMessage.replace(/rediff\s*mail\s*\.?\s*com/gi, 'rediffmail.com');
    processedMessage = processedMessage.replace(/rediff\s*\.?\s*com/gi, 'rediff.com');

    // Handle spelled out letters with spaces: "K I S H O R E" → "kishore"
    // Match 3+ single letters separated by spaces
    processedMessage = processedMessage.replace(/\b([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])(?:\s+([a-zA-Z]))?(?:\s+([a-zA-Z]))?(?:\s+([a-zA-Z]))?(?:\s+([a-zA-Z]))?(?:\s+([a-zA-Z]))?(?:\s+([a-zA-Z]))?(?:\s+([a-zA-Z]))?\b/gi,
      (match: string, ...letters: (string | undefined)[]) => {
        const validLetters = letters.filter((l): l is string => l !== undefined && typeof l === 'string' && l.length === 1);
        if (validLetters.length >= 3) {
          return validLetters.join('').toLowerCase();
        }
        return match;
      }
    );

    // Handle letters with hyphens: "K-I-S-H-O-R-E" → "kishore"
    processedMessage = processedMessage.replace(/\b([a-zA-Z])(?:\s*-\s*([a-zA-Z]))+\b/gi, (match: string) => {
      return match.replace(/[\s-]+/g, '').toLowerCase();
    });

    // Handle numbers in email (spoken as words)
    processedMessage = processedMessage.replace(/\bone\b/gi, '1');
    processedMessage = processedMessage.replace(/\btwo\b/gi, '2');
    processedMessage = processedMessage.replace(/\bthree\b/gi, '3');
    processedMessage = processedMessage.replace(/\bfour\b/gi, '4');
    processedMessage = processedMessage.replace(/\bfive\b/gi, '5');
    processedMessage = processedMessage.replace(/\bsix\b/gi, '6');
    processedMessage = processedMessage.replace(/\bseven\b/gi, '7');
    processedMessage = processedMessage.replace(/\beight\b/gi, '8');
    processedMessage = processedMessage.replace(/\bnine\b/gi, '9');
    processedMessage = processedMessage.replace(/\bzero\b/gi, '0');

    // Remove extra spaces around @ and .
    processedMessage = processedMessage.replace(/\s*@\s*/g, '@');
    processedMessage = processedMessage.replace(/\s*\.\s*/g, '.');

    // Fix double dots or double @
    processedMessage = processedMessage.replace(/\.{2,}/g, '.');
    processedMessage = processedMessage.replace(/@{2,}/g, '@');

    // Try to extract email pattern if present
    const emailMatch = processedMessage.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      console.log('[Chat] Detected email:', emailMatch[0]);
    }

    console.log('[Chat] Original message:', message);
    console.log('[Chat] Processed message:', processedMessage);

    // Add current user message
    messages.push({
      role: 'user',
      content: processedMessage,
    });

    try {
      const completionParams: any = {
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 300,
        temperature: 0.7,
      };

      // Add tools if enabled
      if (enableTools) {
        completionParams.tools = agentTools;
        completionParams.tool_choice = 'auto';
      }

      const completion = await openai.chat.completions.create(completionParams);
      const responseMessage = completion.choices[0]?.message;

      // Check if AI wants to call a function
      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`[Chat] Tool call: ${functionName}`, functionArgs);

        let toolResult = '';
        let responseText = '';

        switch (functionName) {
          case 'book_appointment':
            const appointmentDate = functionArgs.date;
            const appointmentTime = functionArgs.time;
            const customerName = functionArgs.name;
            const customerEmail = functionArgs.email;
            const customerPhone = functionArgs.phone;
            const purpose = functionArgs.purpose;
            const duration = functionArgs.duration || 30;

            // Parse date and time to create start/end times
            const [year, month, day] = appointmentDate.split('-').map(Number);
            const [hours, minutes] = appointmentTime.split(':').map(Number);
            const startTime = new Date(year, month - 1, day, hours, minutes);
            const endTime = new Date(startTime.getTime() + duration * 60000);

            // Try to create a real Google Calendar event
            let calendarResult = null;
            const organizationId = req.user?.organizationId;

            if (organizationId) {
              try {
                const attendeesList = customerEmail ? [{ email: customerEmail, name: customerName }] : [];
                console.log('[Calendar] Creating event with attendees:', JSON.stringify(attendeesList));
                console.log('[Calendar] Customer email extracted:', customerEmail);

                calendarResult = await calendarService.createEvent(organizationId, {
                  title: `${purpose} - ${customerName}`,
                  description: `Appointment booked via Voice AI\n\nName: ${customerName}\nPhone: ${customerPhone || 'Not provided'}\nEmail: ${customerEmail || 'Not provided'}\nPurpose: ${purpose}`,
                  startTime,
                  endTime,
                  attendees: attendeesList,
                  reminders: [
                    { method: 'email', minutes: 60 },
                    { method: 'popup', minutes: 15 },
                  ],
                });

                if (calendarResult) {
                  console.log(`[Calendar] Event created: ${calendarResult.eventId}`);
                }
              } catch (calError: any) {
                console.error('[Calendar] Failed to create event:', calError.message);
              }
            }

            toolResult = JSON.stringify({
              success: true,
              appointmentId: calendarResult?.eventId || `APT-${Date.now()}`,
              calendarLink: calendarResult?.eventLink,
              date: appointmentDate,
              time: appointmentTime,
              name: customerName,
              email: customerEmail,
              phone: customerPhone,
              purpose: purpose,
              duration: duration,
              addedToCalendar: !!calendarResult,
            });

            if (calendarResult) {
              responseText = `Great! I've booked your ${purpose} appointment for ${customerName} on ${appointmentDate} at ${appointmentTime}. The appointment is ${duration} minutes and has been added to your Google Calendar. ${customerEmail ? `A calendar invite has been sent to ${customerEmail}.` : ''} Is there anything else you'd like help with?`;
            } else {
              responseText = `Great! I've noted your ${purpose} appointment for ${customerName} on ${appointmentDate} at ${appointmentTime}. The appointment will be ${duration} minutes. Note: Calendar integration is not set up, so please add this to your calendar manually. Is there anything else you'd like help with?`;
            }
            break;

          case 'check_availability':
            // Simulate checking availability
            const checkDate = functionArgs.date;
            const availableSlots = ['09:00', '10:30', '14:00', '15:30', '16:00'];
            toolResult = JSON.stringify({
              date: checkDate,
              availableSlots: availableSlots,
            });
            responseText = `I have the following slots available on ${checkDate}: ${availableSlots.join(', ')}. Which time works best for you?`;
            break;

          case 'transfer_to_human':
            toolResult = JSON.stringify({ success: true, reason: functionArgs.reason });
            responseText = `I understand. Let me transfer you to a human agent. The reason noted is: ${functionArgs.reason}. Please hold while I connect you.`;
            break;

          default:
            toolResult = JSON.stringify({ error: 'Unknown function' });
            responseText = responseMessage?.content || 'I apologize, something went wrong.';
        }

        res.json({
          success: true,
          data: {
            response: responseText,
            toolCall: {
              name: functionName,
              arguments: functionArgs,
              result: JSON.parse(toolResult),
            },
          },
        });
      } else {
        // Regular text response
        const response = responseMessage?.content || 'I apologize, I could not generate a response.';

        res.json({
          success: true,
          data: {
            response,
          },
        });
      }
    } catch (err: any) {
      console.error('[Chat] OpenAI error:', err);
      throw new AppError('Failed to generate response', 500);
    }
  })
);

export default router;
