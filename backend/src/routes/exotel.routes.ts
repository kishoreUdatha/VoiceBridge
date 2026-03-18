import { Router, Request, Response } from 'express';
import multer from 'multer';
import { exotelService } from '../integrations/exotel.service';
import { voiceAIService } from '../integrations/voice-ai.service';
import { sarvamService } from '../integrations/sarvam.service';
import { createWhatsAppService } from '../integrations/whatsapp.service';
import { emailService } from '../integrations/email.service';
import { communicationService } from '../services/communication.service';
import { intentDetector } from '../services/intent-detector.service';
import { agentOrchestrator } from '../services/specialized-agents.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import axios from 'axios';
import { config } from '../config';

const router = Router();
const prisma = new PrismaClient();

// Initialize OpenAI only if API key is available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Multer for parsing multipart/form-data from Exotel webhooks
const upload = multer();

// Helper function to replace placeholders in agent prompts with organization settings
const replacePlaceholders = (text: string, orgSettings: any): string => {
  if (!text || !orgSettings?.institution) return text;

  const institution = orgSettings.institution;

  return text
    .replace(/\{\{INSTITUTION_NAME\}\}/g, institution.name || 'Our Institution')
    .replace(/\{\{INSTITUTION_LOCATION\}\}/g, institution.location || '')
    .replace(/\{\{INSTITUTION_WEBSITE\}\}/g, institution.website || '')
    .replace(/\{\{INSTITUTION_DESCRIPTION\}\}/g, institution.description || '')
    .replace(/\{\{INSTITUTION_COURSES\}\}/g, institution.courses || '')
    .replace(/\{\{INSTITUTION_PHONE\}\}/g, institution.phone || '')
    .replace(/\{\{INSTITUTION_EMAIL\}\}/g, institution.email || '');
};

// Helper function to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Send post-call messages (Email, SMS, WhatsApp) based on agent settings
 * Triggers automatically after a voice call ends
 */
async function sendPostCallMessages(params: {
  organizationId: string;
  leadId: string;
  phoneNumber: string;
  email?: string | null;
  firstName: string;
  lastName?: string;
  agentName: string;
  callSummary: string;
  sentiment: string;
  outcome?: string;
}) {
  try {
    const { organizationId, leadId, phoneNumber, email, firstName, lastName, agentName, callSummary, sentiment, outcome } = params;

    // Get organization settings for post-call messaging
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (organization?.settings as any) || {};
    const postCallSettings = settings.postCallMessaging || {};

    const fullName = `${firstName} ${lastName || ''}`.trim();

    // 1. Send Email if enabled
    if (postCallSettings.email?.enabled && email) {
      try {
        const emailTemplate = postCallSettings.email.template ||
          `Hi ${firstName},\n\nThank you for speaking with us today!\n\n${callSummary}\n\nIf you have any questions, please reply to this email.\n\nBest regards,\n${settings.institution?.name || 'Our Team'}`;

        await emailService.sendEmail({
          to: email,
          subject: postCallSettings.email.subject || `Thank you for your call - ${settings.institution?.name || 'VoiceBridge'}`,
          body: emailTemplate.replace(/\{firstName\}/g, firstName).replace(/\{lastName\}/g, lastName || '').replace(/\{summary\}/g, callSummary),
          leadId,
          userId: 'system',
        });

        console.log(`[PostCall] Email sent to ${email} for lead ${leadId}`);
      } catch (emailError) {
        console.error('[PostCall] Failed to send email:', emailError);
      }
    }

    // 2. Send SMS if enabled
    if (postCallSettings.sms?.enabled && phoneNumber) {
      try {
        const smsTemplate = postCallSettings.sms.template ||
          `Hi ${firstName}! Thanks for speaking with ${settings.institution?.name || 'us'}. We'll follow up soon. Questions? Reply to this message.`;

        await communicationService.sendSms({
          to: phoneNumber,
          message: smsTemplate.replace(/\{firstName\}/g, firstName).replace(/\{lastName\}/g, lastName || ''),
          leadId,
          userId: 'system',
        });

        console.log(`[PostCall] SMS sent to ${phoneNumber} for lead ${leadId}`);
      } catch (smsError) {
        console.error('[PostCall] Failed to send SMS:', smsError);
      }
    }

    // 3. Send WhatsApp if enabled
    if (postCallSettings.whatsapp?.enabled && phoneNumber) {
      try {
        const whatsappService = createWhatsAppService(organizationId);
        const isConfigured = await whatsappService.isConfigured();

        if (isConfigured) {
          const whatsappTemplate = postCallSettings.whatsapp.template ||
            `Hi ${firstName}! Thank you for speaking with ${settings.institution?.name || 'us'} today. If you have any questions, feel free to message us here!`;

          await whatsappService.sendMessage({
            to: phoneNumber,
            message: whatsappTemplate.replace(/\{firstName\}/g, firstName).replace(/\{lastName\}/g, lastName || ''),
          });

          console.log(`[PostCall] WhatsApp sent to ${phoneNumber} for lead ${leadId}`);
        }
      } catch (whatsappError) {
        console.error('[PostCall] Failed to send WhatsApp:', whatsappError);
      }
    }

    // Log the post-call messaging attempt
    await prisma.callLog.updateMany({
      where: { leadId },
      data: {
        notes: `AI Call completed. Post-call messages sent. Sentiment: ${sentiment}`,
      },
    });

  } catch (error) {
    console.error('[PostCall] Error sending post-call messages:', error);
  }
}

// Finalize Exotel call - generate summary, create lead
async function finalizeExotelCall(callId: string) {
  try {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) return;

    const transcript = call.transcript ? JSON.parse(call.transcript as string) : [];
    const qualification = call.qualification ? JSON.parse(call.qualification as string) : {};

    // Generate summary using OpenAI
    let summary = '';
    let sentiment = 'neutral';

    if (transcript.length > 0 && openai) {
      try {
        const summaryResponse = await openai.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Summarize this call conversation in 2-3 sentences. Focus on key points discussed and any action items.',
            },
            {
              role: 'user',
              content: transcript.map((t: any) => `${t.role}: ${t.content}`).join('\n'),
            },
          ],
          max_tokens: 150,
        });
        summary = summaryResponse.choices[0]?.message?.content || '';

        // Analyze sentiment
        const sentimentResponse = await openai.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Analyze the sentiment of this conversation. Respond with exactly one word: positive, neutral, or negative.',
            },
            {
              role: 'user',
              content: transcript.map((t: any) => `${t.role}: ${t.content}`).join('\n'),
            },
          ],
          max_tokens: 10,
        });
        sentiment = sentimentResponse.choices[0]?.message?.content?.toLowerCase().trim() || 'neutral';
      } catch (error) {
        console.error('Error generating summary/sentiment:', error);
      }
    }

    // Update call with summary and sentiment
    await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        summary,
        sentiment,
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });

    // Create lead if we have enough qualification data
    if (Object.keys(qualification).length > 0 || call.phoneNumber) {
      // Check if lead already exists with this phone number
      const existingLead = await prisma.lead.findFirst({
        where: {
          phone: call.phoneNumber,
          organizationId: call.agent.organizationId,
        },
      });

      if (existingLead) {
        // Update existing lead with new qualification data
        const existingCustomFields = existingLead.customFields as Record<string, any> || {};
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            customFields: { ...existingCustomFields, ...qualification },
          },
        });

        // Create call log for the lead
        await prisma.callLog.create({
          data: {
            leadId: existingLead.id,
            callerId: call.agentId,
            phoneNumber: call.phoneNumber,
            direction: 'OUTBOUND',
            callType: 'AI',
            status: 'COMPLETED',
            duration: call.duration || 0,
            recordingUrl: call.recordingUrl || undefined,
            transcript: summary,
            notes: `AI Call via Exotel. Sentiment: ${sentiment}`,
            startedAt: call.answeredAt || call.createdAt,
            endedAt: new Date(),
          },
        });

        // Link call to lead
        await prisma.outboundCall.update({
          where: { id: callId },
          data: { leadId: existingLead.id },
        });

        console.log(`Updated existing lead ${existingLead.id} from Exotel call ${callId}`);

        // Send post-call messages (Email, SMS, WhatsApp)
        await sendPostCallMessages({
          organizationId: call.agent.organizationId,
          leadId: existingLead.id,
          phoneNumber: call.phoneNumber,
          email: existingLead.email,
          firstName: existingLead.firstName,
          lastName: existingLead.lastName || undefined,
          agentName: call.agent.name,
          callSummary: summary,
          sentiment,
        });
      } else {
        // Create new lead
        const newLead = await prisma.lead.create({
          data: {
            organizationId: call.agent.organizationId,
            firstName: qualification.name?.split(' ')[0] || 'Unknown',
            lastName: qualification.name?.split(' ').slice(1).join(' ') || '',
            phone: call.phoneNumber,
            email: qualification.email || null,
            source: 'AI_VOICE_AGENT',
            sourceDetails: `Exotel AI Call - ${call.agent.name}`,
            customFields: qualification,
          },
        });

        // Create call log for the new lead
        await prisma.callLog.create({
          data: {
            leadId: newLead.id,
            callerId: call.agentId,
            phoneNumber: call.phoneNumber,
            direction: 'OUTBOUND',
            callType: 'AI',
            status: 'COMPLETED',
            duration: call.duration || 0,
            recordingUrl: call.recordingUrl || undefined,
            transcript: summary,
            notes: `AI Call via Exotel. Sentiment: ${sentiment}`,
            startedAt: call.answeredAt || call.createdAt,
            endedAt: new Date(),
          },
        });

        // Link call to lead
        await prisma.outboundCall.update({
          where: { id: callId },
          data: { leadId: newLead.id },
        });

        // Update campaign stats if applicable
        if (call.campaignId) {
          await prisma.outboundCallCampaign.update({
            where: { id: call.campaignId },
            data: {
              leadsGenerated: { increment: 1 },
              successfulCalls: { increment: 1 },
              completedCalls: { increment: 1 },
            },
          });
        }

        console.log(`Created new lead ${newLead.id} from Exotel call ${callId}`);

        // Send post-call messages (Email, SMS, WhatsApp)
        await sendPostCallMessages({
          organizationId: call.agent.organizationId,
          leadId: newLead.id,
          phoneNumber: call.phoneNumber,
          email: qualification.email || null,
          firstName: qualification.name?.split(' ')[0] || 'Customer',
          lastName: qualification.name?.split(' ').slice(1).join(' ') || undefined,
          agentName: call.agent.name,
          callSummary: summary,
          sentiment,
        });
      }
    }

    // Update contact status if from campaign
    if (call.contactId) {
      await prisma.outboundCallContact.update({
        where: { id: call.contactId },
        data: { status: 'COMPLETED' },
      });
    }

  } catch (error) {
    console.error('Error finalizing Exotel call:', error);
  }
}

// ==================== WEBHOOKS (No Auth - Called by Exotel) ====================

/**
 * Exotel Call Status Webhook
 * Called when call status changes (ringing, in-progress, completed, etc.)
 */
router.post('/webhook/status', upload.none(), async (req: Request, res: Response) => {
  try {
    console.log('Exotel Status Webhook body:', req.body);
    console.log('Exotel Status Webhook query:', req.query);

    const webhookData = exotelService.parseWebhookData(req.body);
    const { callSid, status, duration, recordingUrl, customField } = webhookData;

    // Parse customField to get our internal callId
    let callId: string | undefined;
    if (customField) {
      try {
        const customData = JSON.parse(customField);
        callId = customData.callId;
      } catch {
        callId = customField;
      }
    }

    // Update call in database
    if (callSid) {
      // Try to find by Exotel Call SID
      const call = await prisma.outboundCall.findFirst({
        where: {
          OR: [
            { twilioCallSid: callSid },
            { id: callId },
          ],
        },
      });

      if (call) {
        const updateData: any = {
          status: status,
        };

        if (duration) {
          updateData.duration = duration;
        }

        if (recordingUrl) {
          updateData.recordingUrl = recordingUrl;
        }

        if (status === 'COMPLETED' || status === 'FAILED' || status === 'NO_ANSWER' || status === 'BUSY') {
          updateData.endedAt = new Date();
        }

        if (status === 'IN_PROGRESS' && !call.answeredAt) {
          updateData.answeredAt = new Date();
        }

        await prisma.outboundCall.update({
          where: { id: call.id },
          data: updateData,
        });

        // Update campaign contact status if applicable
        if (call.contactId) {
          const contactStatus = status === 'COMPLETED' ? 'COMPLETED' :
                               status === 'FAILED' || status === 'NO_ANSWER' || status === 'BUSY' ? 'FAILED' :
                               'IN_PROGRESS';

          await prisma.outboundCallContact.update({
            where: { id: call.contactId },
            data: {
              status: contactStatus,
              lastAttemptAt: new Date(),
              attempts: { increment: status !== 'IN_PROGRESS' ? 0 : 1 },
            },
          });
        }

        console.log(`Updated call ${call.id} status to ${status}`);
      }
    }

    // Exotel expects 200 OK
    res.status(200).send('OK');
  } catch (error) {
    console.error('Exotel status webhook error:', error);
    res.status(500).send('Error');
  }
});

/**
 * Exotel Passthru App Webhook (Generic)
 * CRITICAL: Return XML INSTANTLY - no DB operations before response!
 *
 * Flow:
 * 1. call-attempt: Customer's phone is ringing - we return <Dial> with action URL
 * 2. action callback: Customer answered (DialCallDuration > 0) - we play greeting
 */
router.all('/passthru', upload.none(), async (req: Request, res: Response) => {
  // INSTANT RESPONSE - No delays!
  const baseUrl = config.baseUrl;

  // Extract callId from CustomField (fast operation)
  const customField = req.body?.CustomField || req.query?.CustomField || '';
  let callId = 'unknown';
  try {
    if (customField) {
      const data = JSON.parse(customField);
      callId = data.callId || 'unknown';
    }
  } catch {
    callId = customField || 'unknown';
  }

  const callType = req.body?.CallType || req.query?.CallType;
  const dialStatus = req.body?.DialStatus || req.query?.DialStatus;
  const dialCallDuration = req.body?.DialCallDuration || req.query?.DialCallDuration || '0';
  const answered = req.query?.answered === 'true';
  const customerPhone = req.body?.CallFrom || req.query?.CallFrom || req.body?.From || req.query?.From;

  console.log('Exotel Passthru:', { callId, callType, dialStatus, dialCallDuration, answered, customerPhone });

  // Set content type immediately
  res.set('Content-Type', 'text/xml');

  // STEP 1: First hit (call-attempt) - Need to dial the customer
  // At this point, Exotel has initiated the call but customer hasn't answered
  if (!answered && callType === 'call-attempt') {
    console.log('Step 1: Returning Dial command to connect to customer:', customerPhone);

    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${process.env.EXOTEL_CALLER_ID || '04041893301'}" timeout="30" record="true" action="${baseUrl}/api/exotel/passthru?answered=true&amp;callId=${callId}" method="POST">
    <Number>${customerPhone}</Number>
  </Dial>
  <Say voice="female" language="en-IN">The call could not be connected. Goodbye.</Say>
  <Hangup/>
</Response>`);
  }

  // STEP 2: Action callback - Customer answered (or call ended)
  // DialCallDuration > 0 means customer talked, dialStatus tells us the outcome
  console.log('Step 2: Dial action callback - dialStatus:', dialStatus, 'duration:', dialCallDuration);

  // If customer answered, play the greeting
  if (answered || parseInt(dialCallDuration) > 0 || dialStatus === 'completed') {
    console.log('Customer answered! Playing AI greeting...');

    // Fetch agent details for personalized greeting
    let greeting = "Hello! I'm your AI assistant. How can I help you today?";
    let voiceGender = 'female';
    let language = 'en-IN';
    let voiceId = 'nova';

    try {
      const call = await prisma.outboundCall.findUnique({
        where: { id: callId },
        include: { agent: true },
      });

      if (call?.agent) {
        greeting = call.agent.greeting || greeting;
        voiceGender = (call.agent as any).voiceGender || voiceGender;
        language = call.agent.language || language;
        voiceId = call.agent.voiceId || voiceId;

        // Update call status to IN_PROGRESS
        await prisma.outboundCall.update({
          where: { id: callId },
          data: {
            status: 'IN_PROGRESS',
            answeredAt: new Date(),
            transcript: JSON.stringify([{ role: 'assistant', content: greeting, timestamp: new Date().toISOString() }])
          },
        });
      }
    } catch (e) {
      console.error('Error fetching agent for greeting:', e);
    }

    // Exotel natively supports: en-IN, hi-IN for <Say> tag (faster, no latency)
    // For other Indian languages (Telugu, Tamil, etc.), use Sarvam TTS via <Play>
    // For ElevenLabs custom voices, use ElevenLabs TTS API
    const exotelNativeLanguages = ['en-IN', 'en-US', 'hi-IN'];
    const sarvamLanguages = ['te-IN', 'ta-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'bn-IN', 'gu-IN'];

    const useElevenLabs = voiceId.startsWith('elevenlabs_') && process.env.ELEVENLABS_API_KEY;
    const useSarvam = !useElevenLabs && (sarvamLanguages.includes(language) || voiceId.startsWith('sarvam-'));
    const useExotelNative = exotelNativeLanguages.includes(language) && !voiceId.startsWith('sarvam-') && !useElevenLabs;

    // Use ElevenLabs for custom cloned voices
    if (useElevenLabs) {
      const elevenLabsVoiceId = voiceId.replace('elevenlabs_', '');
      console.log(`[Passthru] Using ElevenLabs TTS with voice: ${elevenLabsVoiceId}`);

      try {
        // Generate audio using ElevenLabs API
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: greeting,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();

          // Save audio to file
          const fs = require('fs');
          const path = require('path');
          const audioFileName = `greeting_${callId}_${Date.now()}.mp3`;
          const audioDir = path.join(process.cwd(), 'public', 'audio');

          if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
          }

          const audioPath = path.join(audioDir, audioFileName);
          fs.writeFileSync(audioPath, Buffer.from(audioBuffer));

          const audioUrl = `${baseUrl}/audio/${audioFileName}`;
          console.log(`[Passthru] ElevenLabs audio saved: ${audioUrl}`);

          return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Record maxLength="30" timeout="5" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${callId}" method="POST"/>
  <Say voice="female" language="en-IN">Please go ahead and speak.</Say>
  <Record maxLength="30" timeout="5" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${callId}" method="POST"/>
  <Hangup/>
</Response>`);
        } else {
          console.error(`[Passthru] ElevenLabs TTS failed: ${ttsResponse.status}`);
          // Fall through to Exotel native TTS
        }
      } catch (elevenLabsError) {
        console.error('[Passthru] ElevenLabs error:', elevenLabsError);
        // Fall through to Exotel native TTS
      }
    }

    if (useSarvam) {
      // Use Play with TTS audio endpoint for non-supported Indian languages (Telugu, Tamil, etc.)
      console.log(`Using Sarvam TTS for ${language} with voice ${voiceId}`);
      const audioUrl = `${baseUrl}/api/exotel/tts-audio/${callId}?text=${encodeURIComponent(greeting)}&voice=${voiceId.replace('sarvam-', '')}&language=${language}`;
      const promptText = language === 'te-IN' ? 'Dayyachesi cheppandi' : 'Please speak';
      const promptUrl = `${baseUrl}/api/exotel/tts-audio/${callId}?text=${encodeURIComponent(promptText)}&voice=${voiceId.replace('sarvam-', '')}&language=${language}`;

      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Record maxLength="30" timeout="5" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${callId}" method="POST"/>
  <Play>${promptUrl}</Play>
  <Record maxLength="30" timeout="5" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${callId}" method="POST"/>
  <Hangup/>
</Response>`);
    }

    // Use Exotel's native Say for English and Hindi (much faster - no external API call)
    const sayLanguage = language === 'hi-IN' ? 'hi-IN' : 'en-IN';
    console.log(`Using Exotel native TTS for ${sayLanguage}`);

    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceGender}" language="${sayLanguage}">${escapeXml(greeting)}</Say>
  <Record maxLength="30" timeout="5" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${callId}" method="POST"/>
  <Say voice="${voiceGender}" language="${sayLanguage}">I didn't hear your response. Please go ahead and speak.</Say>
  <Record maxLength="30" timeout="5" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${callId}" method="POST"/>
  <Say voice="${voiceGender}" language="${sayLanguage}">I'm still here if you'd like to continue. Our team will follow up with you shortly. Goodbye!</Say>
  <Hangup/>
</Response>`);
  }

  // Call wasn't answered or failed
  console.log('Call was not answered or failed');
  return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`);
});

/**
 * Exotel AI Start Handler
 * Called when customer answers a direct outbound AI call - plays greeting immediately
 */
router.all('/ai-start/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    console.log(`Exotel AI Start for call ${callId}:`, req.query);

    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      console.log('Call not found for AI start:', callId);
      res.set('Content-Type', 'application/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en-IN">Hello! Thank you for answering. Our team will contact you shortly. Goodbye!</Say>
  <Hangup/>
</Response>`);
    }

    const agent = call.agent;
    const baseUrl = config.baseUrl;
    const language = (agent as any).language || 'en-IN';
    const voiceGender = (agent as any).voiceGender || 'female';
    const greeting = agent.greeting || `Hello! I'm ${agent.name}. How can I help you today?`;

    // Update call status
    await prisma.outboundCall.update({
      where: { id: call.id },
      data: {
        status: 'IN_PROGRESS',
        answeredAt: new Date(),
        transcript: JSON.stringify([{ role: 'assistant', content: greeting, timestamp: new Date().toISOString() }])
      },
    });

    console.log(`Playing AI greeting for agent: ${agent.name}`);

    res.set('Content-Type', 'application/xml');
    const exoml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceGender}" language="${language}">${greeting.replace(/'/g, '&apos;')}</Say>
  <Record
    maxLength="30"
    timeout="3"
    playBeep="false"
    action="${baseUrl}/api/exotel/ai-response/${call.id}"
    method="POST"
  />
  <Say voice="${voiceGender}" language="${language}">I didn't hear anything. Let me repeat.</Say>
  <Redirect method="POST">${baseUrl}/api/exotel/ai-start/${call.id}</Redirect>
</Response>`;
    console.log('Sending AI start ExoML:', exoml);
    return res.send(exoml);

  } catch (error) {
    console.error('Exotel AI start error:', error);
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, an error occurred. Goodbye.</Say>
  <Hangup/>
</Response>`);
  }
});

/**
 * Simple AI Connect endpoint - plays greeting when customer answers
 * Used with Connect API direct URL approach
 */
router.all('/ai-connect/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    console.log(`Exotel AI Connect for call ${callId}:`, {
      method: req.method,
      query: req.query,
      body: req.body
    });

    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      console.log('Call not found:', callId);
      res.set('Content-Type', 'application/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en-IN">Hello! Thank you for answering. Goodbye!</Say>
  <Hangup/>
</Response>`);
    }

    const agent = call.agent;
    const baseUrl = config.baseUrl;
    const greeting = agent.greeting || `Hello! I'm ${agent.name}. How can I help you today?`;
    const voiceId = agent.voiceId || 'sarvam-priya';

    // Update call status
    await prisma.outboundCall.update({
      where: { id: call.id },
      data: {
        status: 'IN_PROGRESS',
        answeredAt: new Date(),
        transcript: JSON.stringify([{ role: 'assistant', content: greeting, timestamp: new Date().toISOString() }])
      },
    });

    console.log(`Playing greeting for agent: ${agent.name}, voiceId: ${voiceId}`);

    let exoml: string;

    // Check if using ElevenLabs custom voice
    if (voiceId.startsWith('elevenlabs_') && process.env.ELEVENLABS_API_KEY) {
      const elevenLabsVoiceId = voiceId.replace('elevenlabs_', '');
      console.log(`[AI-Connect] Using ElevenLabs voice: ${elevenLabsVoiceId}`);

      try {
        // Generate audio using ElevenLabs
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: greeting,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          const audioBase64 = Buffer.from(audioBuffer).toString('base64');
          const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

          // Save audio to file for Exotel to access
          const fs = require('fs');
          const path = require('path');
          const audioFileName = `greeting_${callId}.mp3`;
          const audioDir = path.join(process.cwd(), 'public', 'audio');

          // Create directory if it doesn't exist
          if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
          }

          const audioPath = path.join(audioDir, audioFileName);
          fs.writeFileSync(audioPath, Buffer.from(audioBuffer));

          const audioUrl = `${baseUrl}/audio/${audioFileName}`;
          console.log(`[AI-Connect] ElevenLabs audio saved: ${audioUrl}`);

          exoml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Record maxLength="30" timeout="3" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${call.id}" method="POST"/>
  <Say voice="female" language="en-IN">I didn't catch that. Please call back later. Goodbye!</Say>
  <Hangup/>
</Response>`;
        } else {
          console.error(`[AI-Connect] ElevenLabs TTS failed: ${ttsResponse.status}`);
          // Fallback to Exotel TTS
          exoml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en-IN">${escapeXml(greeting)}</Say>
  <Record maxLength="30" timeout="3" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${call.id}" method="POST"/>
  <Say voice="female" language="en-IN">I didn't catch that. Please call back later. Goodbye!</Say>
  <Hangup/>
</Response>`;
        }
      } catch (elevenLabsError) {
        console.error('[AI-Connect] ElevenLabs error:', elevenLabsError);
        // Fallback to Exotel TTS
        exoml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en-IN">${escapeXml(greeting)}</Say>
  <Record maxLength="30" timeout="3" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${call.id}" method="POST"/>
  <Say voice="female" language="en-IN">I didn't catch that. Please call back later. Goodbye!</Say>
  <Hangup/>
</Response>`;
      }
    } else {
      // Use default Exotel TTS
      exoml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en-IN">${escapeXml(greeting)}</Say>
  <Record maxLength="30" timeout="3" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${call.id}" method="POST"/>
  <Say voice="female" language="en-IN">I didn't catch that. Please call back later. Goodbye!</Say>
  <Hangup/>
</Response>`;
    }

    console.log('Sending AI Connect ExoML:', exoml);
    res.set('Content-Type', 'application/xml');
    return res.send(exoml);

  } catch (error) {
    console.error('Exotel AI connect error:', error);
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, an error occurred. Goodbye.</Say>
  <Hangup/>
</Response>`);
  }
});

/**
 * Exotel AI Greeting Handler (without callId in path)
 * Called when customer answers - extracts callId from CustomField
 */
router.all('/ai-greeting', async (req: Request, res: Response) => {
  try {
    console.log('Exotel AI Greeting (no callId):', req.query);

    // Extract callId from CustomField
    const customFieldStr = (req.body?.CustomField || req.query?.CustomField || '{}') as string;
    let customField: any = {};
    try {
      customField = JSON.parse(customFieldStr);
    } catch (e) {
      console.log('Error parsing CustomField:', e);
    }

    const callId = customField.callId;
    if (!callId) {
      console.log('No callId found in CustomField');
      res.set('Content-Type', 'application/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en-IN">Hello! Thank you for answering. Our team will contact you shortly. Goodbye!</Say>
  <Hangup/>
</Response>`);
    }

    // Redirect to the handler with callId
    return res.redirect(307, `/api/exotel/ai-greeting/${callId}?${new URLSearchParams(req.query as any).toString()}`);
  } catch (error) {
    console.error('Exotel AI greeting (no callId) error:', error);
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, an error occurred. Goodbye.</Say>
  <Hangup/>
</Response>`);
  }
});

/**
 * Exotel AI Greeting Handler
 * Called when customer answers an outbound AI call - plays greeting and starts conversation
 */
router.all('/ai-greeting/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const callType = req.body?.CallType || req.query?.CallType;
    const dialCallDuration = req.body?.DialCallDuration || req.query?.DialCallDuration;
    const answered = req.query?.answered;

    console.log(`Exotel AI Greeting for call ${callId}:`, { callType, dialCallDuration, answered });

    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      console.log('Call not found for AI greeting:', callId);
      res.set('Content-Type', 'application/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en-IN">Hello! Thank you for answering. Our team will contact you shortly. Goodbye!</Say>
  <Hangup/>
</Response>`);
    }

    const agent = call.agent;
    const baseUrl = config.baseUrl;
    const language = (agent as any).language || 'en-IN';
    const voiceGender = (agent as any).voiceGender || 'female';
    const greeting = agent.greeting || `Hello! I'm ${agent.name}. How can I help you today?`;
    const customerPhone = req.query?.CallFrom || req.body?.CallFrom || call.phoneNumber;
    const direction = req.query?.Direction || req.body?.Direction;
    const dialStatus = req.query?.DialStatus || req.body?.DialStatus;

    console.log(`AI Greeting - Direction: ${direction}, CallType: ${callType}, DialStatus: ${dialStatus}, answered: ${answered}`);

    // For outbound calls, DON'T use <Dial> - the customer is already being called
    // Just return the greeting - it will play when customer answers

    // Update call status
    await prisma.outboundCall.update({
      where: { id: call.id },
      data: { status: 'RINGING' },
    });

    // Play greeting directly - this will execute when customer answers
    console.log(`Customer answered - playing greeting for agent: ${agent.name}`);

    // Update call status
    await prisma.outboundCall.update({
      where: { id: call.id },
      data: {
        status: 'IN_PROGRESS',
        answeredAt: new Date(),
        transcript: JSON.stringify([{ role: 'assistant', content: greeting, timestamp: new Date().toISOString() }])
      },
    });

    res.set('Content-Type', 'application/xml');
    const exoml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceGender}" language="${language}">${escapeXml(greeting)}</Say>
  <Record
    maxLength="30"
    timeout="5"
    playBeep="false"
    action="${baseUrl}/api/exotel/ai-response/${call.id}"
    method="POST"
  />
  <Say voice="${voiceGender}" language="${language}">I didn't hear your response. Please go ahead and speak.</Say>
  <Record
    maxLength="30"
    timeout="5"
    playBeep="false"
    action="${baseUrl}/api/exotel/ai-response/${call.id}"
    method="POST"
  />
  <Say voice="${voiceGender}" language="${language}">I'm still here if you'd like to continue. Our team will follow up with you shortly. Goodbye!</Say>
  <Hangup/>
</Response>`;
    console.log('Sending AI greeting ExoML:', exoml);
    return res.send(exoml);

  } catch (error) {
    console.error('Exotel AI greeting error:', error);
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, an error occurred. Goodbye.</Say>
  <Hangup/>
</Response>`);
  }
});

/**
 * Exotel AI Response Handler
 * Called after user speech is recorded - transcribes and generates AI response
 */
router.post('/ai-response/:callId', upload.none(), async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const recordingUrl = req.body?.RecordingUrl || req.query?.RecordingUrl;

    console.log(`Exotel AI Response for call ${callId}:`, req.body);

    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: {
        agent: {
          include: {
            organization: {
              select: { id: true, name: true, settings: true }
            }
          }
        }
      },
    });

    if (!call || !call.agent) {
      res.set('Content-Type', 'application/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en-IN">Sorry, an error occurred. Goodbye.</Say>
  <Hangup/>
</Response>`);
    }

    const agent = call.agent;

    // Replace placeholders with organization settings
    const orgSettings = ((agent as any).organization?.settings as any) || {};
    (agent as any).systemPrompt = replacePlaceholders(agent.systemPrompt, orgSettings);
    (agent as any).greeting = agent.greeting ? replacePlaceholders(agent.greeting, orgSettings) : agent.greeting;
    const baseUrl = config.baseUrl;
    const language = (agent as any).language || 'en-IN';
    const voiceGender = (agent as any).voiceGender || 'female';

    // Get current transcript
    let transcript = call.transcript ? JSON.parse(call.transcript as string) : [];
    let qualification = call.qualification ? JSON.parse(call.qualification as string) : {};

    // Transcribe user speech
    let userText = '';
    if (recordingUrl) {
      try {
        // Download the recording
        const audioResponse = await axios.get(recordingUrl, {
          responseType: 'arraybuffer',
          auth: {
            username: process.env.EXOTEL_API_KEY || '',
            password: process.env.EXOTEL_API_TOKEN || '',
          },
        });

        // Convert to file-like object for OpenAI
        const audioBuffer = Buffer.from(audioResponse.data);
        const audioFile = new File([audioBuffer], 'recording.wav', { type: 'audio/wav' });

        // Transcribe with Whisper
        if (openai) {
          const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: process.env.OPENAI_STT_MODEL || 'whisper-1',
            language: language.split('-')[0], // 'en' from 'en-IN'
          });
          userText = transcription.text.trim();
        } else {
          userText = '[OpenAI not configured]';
        }
        console.log(`Transcribed user speech: "${userText}"`);
      } catch (error) {
        console.error('Error transcribing recording:', error);
        userText = '[Could not transcribe]';
      }
    }

    // Add user message to transcript
    if (userText) {
      transcript.push({ role: 'user', content: userText, timestamp: new Date().toISOString() });
    }

    // Check for end conditions
    const turnCount = transcript.filter((t: any) => t.role === 'user').length;
    const maxTurns = (agent as any).maxTurns || 15;
    const endKeywords = ['bye', 'goodbye', 'thank you', 'thanks', 'no thanks', 'not interested'];
    const shouldEnd = turnCount >= maxTurns || endKeywords.some(kw => userText.toLowerCase().includes(kw));

    if (shouldEnd) {
      const endMessage = (agent as any).endMessage || 'Thank you for your time. Our team will follow up with you shortly. Have a great day!';

      // Save final transcript
      await prisma.outboundCall.update({
        where: { id: callId },
        data: { transcript: JSON.stringify(transcript) },
      });

      // Finalize the call - create lead from qualification data
      await finalizeExotelCall(callId);

      res.set('Content-Type', 'application/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceGender}" language="${language}">${escapeXml(endMessage)}</Say>
  <Hangup/>
</Response>`);
    }

    // ==================== INTENT DETECTION & AGENT HANDOFF ====================
    // Detect if user needs a specialized agent (Sales, Appointment, Payment, Support, Survey)
    const detectedIntent = intentDetector.quickDetect(userText);
    const currentAgentType = (agent as any).agentType || 'VOICE';

    // Check if we should handoff to a specialized agent
    if (intentDetector.shouldHandoff(detectedIntent, currentAgentType)) {
      console.log(`[Intent] Detected ${detectedIntent.intent} intent (${detectedIntent.confidence}) - ${detectedIntent.reason}`);

      // Get specialized agent response
      try {
        const specializedResponse = await agentOrchestrator.handleConversation(
          detectedIntent.intent as any,
          {
            agentId: agent.id,
            organizationId: agent.organizationId,
            leadId: call.leadId || undefined,
            phone: call.phoneNumber,
            firstName: qualification.name?.split(' ')[0] || qualification.firstName,
            conversationHistory: transcript.map((t: any) => ({ role: t.role, content: t.content })),
          },
          userText
        );

        // Use specialized agent's response
        const aiResponse = specializedResponse.message;

        // Add response to transcript
        transcript.push({
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString(),
          agentType: detectedIntent.intent, // Track which agent responded
        });

        // Update call with new transcript
        await prisma.outboundCall.update({
          where: { id: callId },
          data: {
            transcript: JSON.stringify(transcript),
            qualification: JSON.stringify(qualification),
          },
        });

        // Check if specialized agent wants to end the call
        if (specializedResponse.shouldEnd) {
          await finalizeExotelCall(callId);

          res.set('Content-Type', 'application/xml');
          return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceGender}" language="${language}">${escapeXml(aiResponse)}</Say>
  <Hangup/>
</Response>`);
        }

        // Continue conversation with specialized agent response
        res.set('Content-Type', 'application/xml');
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceGender}" language="${language}">${escapeXml(aiResponse)}</Say>
  <Record maxLength="30" timeout="5" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${callId}" method="POST"/>
  <Say voice="${voiceGender}" language="${language}">Please go ahead, I'm listening.</Say>
  <Record maxLength="30" timeout="5" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${callId}" method="POST"/>
  <Hangup/>
</Response>`);
      } catch (specializedError) {
        console.error('[Intent] Specialized agent error, falling back to main agent:', specializedError);
        // Fall through to main agent response
      }
    }

    // ==================== MAIN VOICE AGENT RESPONSE ====================
    // Generate AI response
    let aiResponse = '';
    try {
      // Build conversation context
      const systemPrompt = agent.systemPrompt || `You are ${agent.name}, a helpful assistant. Have a natural conversation and gather information about the caller's needs.`;
      const questions = (agent as any).questions || [];

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add questions context if available
      if (questions.length > 0) {
        const questionsContext = questions.map((q: any, i: number) => `${i + 1}. ${q.question} (Field: ${q.field})`).join('\n');
        messages.push({
          role: 'system',
          content: `Qualification questions to ask naturally during conversation:\n${questionsContext}`,
        });
      }

      // Add conversation history
      for (const t of transcript) {
        messages.push({ role: t.role, content: t.content });
      }

      // Generate response
      if (openai) {
        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
          messages,
          max_tokens: 150,
          temperature: 0.7,
        });

        aiResponse = completion.choices[0]?.message?.content || "I understand. Could you tell me more?";

        // Extract qualification data from the conversation
        if (questions.length > 0 && userText) {
          try {
            const extractionPrompt = `Based on this user response: "${userText}"

Extract any relevant information for these fields (return JSON):
${questions.map((q: any) => `- ${q.field}: ${q.question}`).join('\n')}

Only include fields that have clear answers. Return empty object {} if no clear answers.`;

            const extractionResponse = await openai.chat.completions.create({
              model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'Extract qualification data from user responses. Return valid JSON only.' },
                { role: 'user', content: extractionPrompt },
              ],
              max_tokens: 200,
              response_format: { type: 'json_object' },
            });

            const extractedData = JSON.parse(extractionResponse.choices[0]?.message?.content || '{}');
            qualification = { ...qualification, ...extractedData };
          } catch (error) {
            console.error('Error extracting qualification data:', error);
          }
        }
      } else {
        aiResponse = "Thank you for calling. Our team will contact you shortly.";
      }

    } catch (error) {
      console.error('Error generating AI response:', error);
      aiResponse = "I apologize, I'm having some trouble. Could you please repeat that?";
    }

    // Add AI response to transcript
    transcript.push({ role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() });

    // Update call with new transcript and qualification
    await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        transcript: JSON.stringify(transcript),
        qualification: JSON.stringify(qualification),
        recordingUrl: recordingUrl || call.recordingUrl,
      },
    });

    // Check if this is an Indian language that should use Sarvam TTS
    const voiceId = agent.voiceId || 'nova';
    const indianLanguages = ['te-IN', 'hi-IN', 'ta-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'bn-IN', 'gu-IN'];
    const useSarvam = voiceId.startsWith('sarvam-') || indianLanguages.includes(language);

    // Return ExoML with AI response and continue recording
    res.set('Content-Type', 'application/xml');
    let exoml: string;

    if (useSarvam) {
      // Use Play with Sarvam TTS for Indian languages
      const audioUrl = `${baseUrl}/api/exotel/tts-audio/${callId}?text=${encodeURIComponent(aiResponse)}&voice=${voiceId.replace('sarvam-', '')}&language=${language}`;
      const promptUrl = `${baseUrl}/api/exotel/tts-audio/${callId}?text=${encodeURIComponent("Dayyachesi cheppandi")}&voice=${voiceId.replace('sarvam-', '')}&language=${language}`;

      exoml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  <Record maxLength="30" timeout="5" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${callId}" method="POST"/>
  <Play>${promptUrl}</Play>
  <Record maxLength="30" timeout="5" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${callId}" method="POST"/>
  <Hangup/>
</Response>`;
    } else {
      // Use native Say for English
      exoml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceGender}" language="${language}">${escapeXml(aiResponse)}</Say>
  <Record maxLength="30" timeout="5" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${callId}" method="POST"/>
  <Say voice="${voiceGender}" language="${language}">I didn't hear your response. Please go ahead and speak, I'm listening.</Say>
  <Record maxLength="30" timeout="5" playBeep="false" action="${baseUrl}/api/exotel/ai-response/${callId}" method="POST"/>
  <Say voice="${voiceGender}" language="${language}">It seems we're having trouble hearing you. Our team will follow up with you shortly. Thank you for your time. Goodbye!</Say>
  <Hangup/>
</Response>`;
    }

    console.log(`Sending AI response ExoML for call ${callId}`);
    res.send(exoml);

  } catch (error) {
    console.error('Exotel AI response error:', error);
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en-IN">Sorry, an error occurred. Goodbye.</Say>
  <Hangup/>
</Response>`);
  }
});

/**
 * Exotel Passthru/App Webhook (with CallId)
 * Called when call connects, returns ExoML for IVR flow
 */
router.post('/webhook/passthru/:callId', upload.none(), async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    console.log(`Exotel Passthru for call ${callId}:`);
    console.log('Body:', JSON.stringify(req.body));
    console.log('Query:', JSON.stringify(req.query));

    // Get call details
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: {
        agent: true,
      },
    });

    if (!call) {
      // Return hangup if call not found
      res.set('Content-Type', 'application/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Sorry, this call cannot be processed.</Say>
          <Hangup/>
        </Response>`);
      return;
    }

    // Get the agent's greeting
    const greeting = call.agent.greeting ||
      `Hello! This is ${call.agent.name}. How can I help you today?`;

    // Return ExoML for the call flow
    // This is similar to TwiML but for Exotel
    const baseUrl = config.baseUrl;

    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="female">${greeting}</Say>
        <Record
          maxLength="300"
          transcribe="true"
          transcribeCallback="${baseUrl}/api/exotel/webhook/transcription/${callId}"
          action="${baseUrl}/api/exotel/webhook/speech/${callId}"
          method="POST"
          playBeep="false"
          timeout="5"
        />
      </Response>`);
  } catch (error) {
    console.error('Exotel passthru error:', error);
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Sorry, an error occurred. Goodbye.</Say>
        <Hangup/>
      </Response>`);
  }
});

/**
 * Exotel Speech/Recording Webhook
 * Called after user speaks and recording is captured
 */
router.post('/webhook/speech/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const { RecordingUrl, Digits } = req.body;

    console.log(`Exotel Speech for call ${callId}:`, req.body);

    // For now, thank the user and end the call
    // In production, you'd process the speech and respond with AI
    const baseUrl = config.baseUrl;

    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="female">Thank you for your response. We will get back to you soon.</Say>
        <Hangup/>
      </Response>`);
  } catch (error) {
    console.error('Exotel speech webhook error:', error);
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>An error occurred. Goodbye.</Say>
        <Hangup/>
      </Response>`);
  }
});

/**
 * Exotel Transcription Webhook
 * Called when transcription is ready
 */
router.post('/webhook/transcription/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const { TranscriptionText, RecordingUrl } = req.body;

    console.log(`Exotel Transcription for call ${callId}:`, TranscriptionText);

    // Store transcription
    if (TranscriptionText) {
      await prisma.outboundCall.update({
        where: { id: callId },
        data: {
          transcript: TranscriptionText,
          recordingUrl: RecordingUrl,
        },
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Exotel transcription webhook error:', error);
    res.status(500).send('Error');
  }
});

// ==================== AUTHENTICATED ENDPOINTS ====================

router.use(authenticate);
router.use(tenantMiddleware);

/**
 * Make a call via Exotel
 */
router.post('/call', async (req: TenantRequest, res: Response) => {
  try {
    const { to, agentId, leadId, customData } = req.body;

    if (!to) {
      return ApiResponse.error(res, 'Phone number is required', 400);
    }

    // Verify Exotel is configured
    if (!exotelService.isConfigured()) {
      return ApiResponse.error(res, 'Exotel is not configured. Please set EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_CALLER_ID in environment variables.', 500);
    }

    // Get agent if provided (with organization settings for placeholder replacement)
    let agent = null;
    if (agentId) {
      agent = await prisma.voiceAgent.findUnique({
        where: { id: agentId },
        include: {
          organization: {
            select: { id: true, name: true, settings: true }
          }
        }
      });
    }

    // Create call record in database
    const call = await prisma.outboundCall.create({
      data: {
        agentId: agentId || '',
        phoneNumber: to,
        leadId,
        status: 'INITIATED',
        direction: 'OUTBOUND',
        qualification: customData || {},
      },
    });

    const baseUrl = config.baseUrl;

    // Make the call via Exotel
    const result = await exotelService.makeCall({
      to,
      customField: JSON.stringify({ callId: call.id }),
      statusCallback: `${baseUrl}/api/exotel/webhook/status`,
      timeLimit: 600, // 10 minutes max
      timeOut: 30, // 30 seconds ring timeout
    });

    if (result.success) {
      // Update call with Exotel SID
      await prisma.outboundCall.update({
        where: { id: call.id },
        data: {
          twilioCallSid: result.callSid, // Reusing field for Exotel SID
          status: 'QUEUED',
        },
      });

      ApiResponse.success(res, 'Call initiated via Exotel', {
        callId: call.id,
        exotelCallSid: result.callSid,
        status: result.status,
      });
    } else {
      // Update call as failed
      await prisma.outboundCall.update({
        where: { id: call.id },
        data: { status: 'FAILED' },
      });

      ApiResponse.error(res, result.error || 'Failed to initiate call', 500);
    }
  } catch (error: any) {
    console.error('Exotel call error:', error);
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Connect Agent to Customer (Click-to-Call)
 * First calls the agent, when answered, connects to customer
 */
router.post('/connect', async (req: TenantRequest, res: Response) => {
  try {
    const {
      from, // Agent's phone number
      to, // Customer's phone number
      leadId,
      callType,
      record,
      recordingChannels,
      recordingFormat,
      waitUrl,
      customData
    } = req.body;

    if (!from || !to) {
      return ApiResponse.error(res, 'Both "from" (agent) and "to" (customer) phone numbers are required', 400);
    }

    // Verify Exotel is configured
    if (!exotelService.isConfigured()) {
      return ApiResponse.error(res, 'Exotel is not configured. Please set EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_CALLER_ID in environment variables.', 500);
    }

    // Create call record in database
    const call = await prisma.outboundCall.create({
      data: {
        agentId: req.user?.id || '',
        phoneNumber: to,
        leadId,
        status: 'INITIATED',
        direction: 'OUTBOUND',
        qualification: { ...customData, agentPhone: from, type: 'click-to-call' },
      },
    });

    const baseUrl = config.baseUrl;

    // Connect agent to customer via Exotel
    const result = await exotelService.connectCall({
      from, // Agent's number (called first)
      to, // Customer's number (called second)
      callType: callType || 'trans',
      record: record !== false, // Default to true
      recordingChannels: recordingChannels || 'single',
      recordingFormat: recordingFormat || 'mp3',
      waitUrl,
      timeLimit: 1800, // 30 minutes max
      timeOut: 30, // 30 seconds ring timeout
      statusCallback: `${baseUrl}/api/exotel/webhook/status`,
      customField: JSON.stringify({ callId: call.id }),
    });

    if (result.success) {
      // Update call with Exotel SID
      await prisma.outboundCall.update({
        where: { id: call.id },
        data: {
          twilioCallSid: result.callSid,
          status: 'QUEUED',
        },
      });

      ApiResponse.success(res, 'Call connecting agent to customer', {
        callId: call.id,
        exotelCallSid: result.callSid,
        status: result.status,
        from,
        to,
      });
    } else {
      // Update call as failed
      await prisma.outboundCall.update({
        where: { id: call.id },
        data: { status: 'FAILED' },
      });

      ApiResponse.error(res, result.error || 'Failed to connect call', 500);
    }
  } catch (error: any) {
    console.error('Exotel connect call error:', error);
    ApiResponse.error(res, error.message, 500);
  }
});

// Simple in-memory cache for TTS audio (to reduce latency)
const ttsCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const TTS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * TTS Audio endpoint for Sarvam voices
 * Generates and serves audio for Indian language TTS
 * Includes caching to reduce latency on repeated phrases
 */
router.get('/tts-audio/:callId', async (req: Request, res: Response) => {
  try {
    const { text, voice, language } = req.query;

    if (!text || typeof text !== 'string') {
      return res.status(400).send('Text is required');
    }

    const voiceName = (voice as string) || 'kavya';
    const langCode = (language as string) || 'te-IN';

    // Create cache key
    const cacheKey = `${voiceName}-${langCode}-${text}`;

    // Check cache first
    const cached = ttsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < TTS_CACHE_TTL) {
      console.log(`[TTS Audio] Serving cached audio for "${text.substring(0, 30)}..."`);
      res.set({
        'Content-Type': 'audio/wav',
        'Content-Length': cached.buffer.length,
        'Cache-Control': 'public, max-age=600',
        'X-Cache': 'HIT',
      });
      return res.send(cached.buffer);
    }

    console.log(`[TTS Audio] Generating ${langCode} audio with voice ${voiceName}: "${text.substring(0, 50)}..."`);

    // Generate audio using Sarvam TTS with higher sample rate for better quality
    const audioBuffer = await sarvamService.textToSpeech(
      text,
      voiceName,
      langCode,
      22050 // Higher sample rate for better quality
    );

    // Cache the audio
    ttsCache.set(cacheKey, { buffer: audioBuffer, timestamp: Date.now() });

    // Clean old cache entries periodically
    if (ttsCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of ttsCache.entries()) {
        if (now - value.timestamp > TTS_CACHE_TTL) {
          ttsCache.delete(key);
        }
      }
    }

    // Send audio as WAV
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=600',
      'X-Cache': 'MISS',
    });
    res.send(audioBuffer);
  } catch (error: any) {
    console.error('[TTS Audio] Error:', error.message);
    // Return silent audio on error
    res.status(500).send('TTS generation failed');
  }
});

/**
 * Get Exotel account balance
 */
router.get('/balance', async (req: TenantRequest, res: Response) => {
  try {
    const result = await exotelService.getAccountDetails();

    if (result.success) {
      ApiResponse.success(res, 'Account details retrieved', {
        balance: result.balance,
        account: result.data,
      });
    } else {
      ApiResponse.error(res, result.error || 'Failed to get account details', 500);
    }
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Get call details from Exotel
 */
router.get('/call/:callSid', async (req: TenantRequest, res: Response) => {
  try {
    const { callSid } = req.params;
    const result = await exotelService.getCallDetails(callSid);

    if (result.success) {
      ApiResponse.success(res, 'Call details retrieved', result.data);
    } else {
      ApiResponse.error(res, result.error || 'Call not found', 404);
    }
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Send SMS via Exotel with DLT Template support
 */
router.post('/sms', async (req: TenantRequest, res: Response) => {
  try {
    const { to, body, templateId, entityId, senderId, smsType } = req.body;

    if (!to || !body) {
      return ApiResponse.error(res, 'Phone number and message body are required', 400);
    }

    const result = await exotelService.sendSMS({
      to,
      body,
      templateId,
      entityId,
      senderId,
      smsType: smsType || 'transactional',
    });

    if (result.success) {
      ApiResponse.success(res, 'SMS sent', { messageSid: result.messageSid });
    } else {
      ApiResponse.error(res, result.error || 'Failed to send SMS', 500);
    }
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Send Bulk SMS via Exotel
 */
router.post('/sms/bulk', async (req: TenantRequest, res: Response) => {
  try {
    const { recipients, templateId, entityId, senderId, smsType } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return ApiResponse.error(res, 'Recipients array is required', 400);
    }

    const results = await exotelService.sendBulkSMS({
      recipients,
      templateId,
      entityId,
      senderId,
      smsType: smsType || 'transactional',
    });

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    ApiResponse.success(res, `Bulk SMS completed: ${successful} sent, ${failed} failed`, {
      total: recipients.length,
      successful,
      failed,
      results,
    });
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Get DLT Configuration status
 */
router.get('/sms/config', async (req: TenantRequest, res: Response) => {
  try {
    const config = {
      senderId: process.env.EXOTEL_SMS_SENDER_ID || null,
      entityId: process.env.EXOTEL_DLT_ENTITY_ID || null,
      templateId: process.env.EXOTEL_DLT_TEMPLATE_ID || null,
      isConfigured: !!(process.env.EXOTEL_SMS_SENDER_ID && process.env.EXOTEL_DLT_ENTITY_ID),
    };

    ApiResponse.success(res, 'DLT Configuration', config);
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Check Exotel configuration status
 */
router.get('/status', async (req: TenantRequest, res: Response) => {
  try {
    const isConfigured = exotelService.isConfigured();
    const isWhatsAppConfigured = exotelService.isWhatsAppConfigured();

    if (isConfigured) {
      const accountDetails = await exotelService.getAccountDetails();
      ApiResponse.success(res, 'Exotel is configured', {
        configured: true,
        whatsappConfigured: isWhatsAppConfigured,
        balance: accountDetails.balance,
        accountStatus: accountDetails.success ? 'active' : 'error',
      });
    } else {
      ApiResponse.success(res, 'Exotel is not configured', {
        configured: false,
        whatsappConfigured: isWhatsAppConfigured,
        requiredEnvVars: [
          'EXOTEL_ACCOUNT_SID',
          'EXOTEL_API_KEY',
          'EXOTEL_API_TOKEN',
          'EXOTEL_CALLER_ID',
          'EXOTEL_WHATSAPP_NUMBER (for WhatsApp)',
        ],
      });
    }
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

// ==================== WHATSAPP ENDPOINTS ====================

/**
 * Send WhatsApp message via configured provider (Meta, 360dialog, Gupshup, Wati, or Exotel)
 * Supports text messages and media attachments (images, videos, audio, documents)
 */
router.post('/whatsapp/send', async (req: TenantRequest, res: Response) => {
  try {
    const { to, message, mediaUrl, media, templateName, templateParams, leadId } = req.body;
    const organizationId = req.organizationId!;

    // Allow sending just media without text message
    if (!to || (!message && !media?.length && !mediaUrl)) {
      return ApiResponse.error(res, 'Phone number and either message or media are required', 400);
    }

    // Use organization's WhatsApp config
    const whatsappService = createWhatsAppService(organizationId);
    const isConfigured = await whatsappService.isConfigured();

    if (!isConfigured) {
      return ApiResponse.error(res, 'WhatsApp is not configured. Please configure it in Settings > WhatsApp.', 400);
    }

    // Get provider from config
    const config = await whatsappService.loadConfig();
    const provider = config?.provider?.toUpperCase() || 'UNKNOWN';

    const results: any[] = [];

    // Handle media attachments
    if (media && Array.isArray(media) && media.length > 0) {
      for (const mediaItem of media) {
        try {
          // For media messages, send each media separately
          // Most WhatsApp APIs require separate API calls for each media
          const mediaResult = await whatsappService.sendMessage({
            to,
            message: media.indexOf(mediaItem) === media.length - 1 ? message : '', // Only add caption to last media
            mediaUrl: mediaItem.data, // Base64 data URL
            mediaType: mediaItem.type,
            mediaFilename: mediaItem.filename,
            templateName,
            templateParams,
          });

          results.push({
            type: mediaItem.type,
            filename: mediaItem.filename,
            success: mediaResult.success,
            messageId: mediaResult.messageId,
            error: mediaResult.error,
          });

          if (mediaResult.success) {
            // Log each media message
            await prisma.whatsappLog.create({
              data: {
                leadId: leadId || null,
                userId: req.user?.id || 'system',
                phone: to,
                message: `[${mediaItem.type.toUpperCase()}] ${mediaItem.filename}${message ? ': ' + message : ''}`,
                mediaUrl: mediaItem.data?.substring(0, 100) + '...',
                direction: 'OUTBOUND',
                status: 'SENT',
                providerMsgId: mediaResult.messageId,
                provider,
                sentAt: new Date(),
              },
            });
          }
        } catch (mediaError: any) {
          results.push({
            type: mediaItem.type,
            filename: mediaItem.filename,
            success: false,
            error: mediaError.message,
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (successful > 0) {
        ApiResponse.success(res, `WhatsApp message sent: ${successful} media files${failed > 0 ? `, ${failed} failed` : ''}`, {
          results,
          provider: config?.provider,
        });
      } else {
        ApiResponse.error(res, 'Failed to send all media files', 500, { results });
      }
    } else {
      // Standard text message or single media URL
      const result = await whatsappService.sendMessage({
        to,
        message,
        mediaUrl,
        templateName,
        templateParams,
      });

      if (result.success) {
        // Log WhatsApp message to database
        await prisma.whatsappLog.create({
          data: {
            leadId: leadId || null,
            userId: req.user?.id || 'system',
            phone: to,
            message,
            mediaUrl: mediaUrl || null,
            direction: 'OUTBOUND',
            status: 'SENT',
            providerMsgId: result.messageId,
            provider,
            sentAt: new Date(),
          },
        });

        ApiResponse.success(res, 'WhatsApp message sent', {
          messageId: result.messageId,
          status: result.status,
          provider: config?.provider,
        });
      } else {
        ApiResponse.error(res, result.error || 'Failed to send WhatsApp message', 500);
      }
    }
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Send WhatsApp document via Exotel
 */
router.post('/whatsapp/document', async (req: TenantRequest, res: Response) => {
  try {
    const { to, documentUrl, filename, caption, leadId } = req.body;

    if (!to || !documentUrl) {
      return ApiResponse.error(res, 'Phone number and document URL are required', 400);
    }

    if (!exotelService.isWhatsAppConfigured()) {
      return ApiResponse.error(res, 'Exotel WhatsApp is not configured.', 500);
    }

    const result = await exotelService.sendWhatsAppDocument({
      to,
      documentUrl,
      filename,
      caption,
    });

    if (result.success) {
      // Log WhatsApp document to database
      await prisma.whatsappLog.create({
        data: {
          leadId: leadId || null,
          userId: req.user?.id || 'system',
          phone: to,
          message: caption || `Document: ${filename || 'file'}`,
          mediaUrl: documentUrl,
          direction: 'OUTBOUND',
          status: 'SENT',
          providerMsgId: result.messageId,
          provider: 'EXOTEL',
          sentAt: new Date(),
        },
      });

      ApiResponse.success(res, 'WhatsApp document sent', {
        messageId: result.messageId,
        status: result.status,
      });
    } else {
      ApiResponse.error(res, result.error || 'Failed to send WhatsApp document', 500);
    }
  } catch (error: any) {
    console.error('Exotel WhatsApp document error:', error);
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Send bulk WhatsApp messages via configured provider
 */
router.post('/whatsapp/bulk', async (req: TenantRequest, res: Response) => {
  try {
    const { recipients } = req.body;
    const organizationId = req.organizationId!;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return ApiResponse.error(res, 'Recipients array is required', 400);
    }

    // Use organization's WhatsApp config
    const whatsappService = createWhatsAppService(organizationId);
    const isConfigured = await whatsappService.isConfigured();

    if (!isConfigured) {
      return ApiResponse.error(res, 'WhatsApp is not configured. Please configure it in Settings > WhatsApp.', 400);
    }

    const results = await whatsappService.sendBulk(recipients);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // Get provider from config
    const config = await whatsappService.loadConfig();
    const provider = config?.provider?.toUpperCase() || 'UNKNOWN';

    // Log successful messages
    for (const result of results) {
      if (result.success) {
        const recipient = recipients.find((r: any) => r.to === result.to);
        await prisma.whatsappLog.create({
          data: {
            userId: req.user?.id || 'system',
            phone: result.to,
            message: recipient?.message || '',
            mediaUrl: recipient?.mediaUrl || null,
            direction: 'OUTBOUND',
            status: 'SENT',
            providerMsgId: result.messageId,
            provider,
            sentAt: new Date(),
          },
        });
      }
    }

    ApiResponse.success(res, `Bulk WhatsApp completed: ${successful} sent, ${failed} failed`, {
      total: recipients.length,
      successful,
      failed,
      results,
      provider: config?.provider,
    });
  } catch (error: any) {
    console.error('Bulk WhatsApp error:', error);
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Get WhatsApp configuration status
 */
router.get('/whatsapp/status', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId!;
    const whatsappService = createWhatsAppService(organizationId);
    const config = await whatsappService.loadConfig();
    const isConfigured = await whatsappService.isConfigured();

    ApiResponse.success(res, 'WhatsApp configuration status', {
      configured: isConfigured,
      provider: config?.provider || 'none',
      phoneNumber: config?.phoneNumber || null,
    });
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Exotel WhatsApp Delivery Status Webhook
 * Called by Exotel when message status changes (sent, delivered, read, failed)
 */
router.post('/whatsapp/webhook/status', upload.none(), async (req: Request, res: Response) => {
  try {
    console.log('[Exotel WhatsApp Webhook] Received:', req.body);

    const {
      MessageSid,
      MessageStatus,
      To,
      From,
      ErrorCode,
      ErrorMessage,
      Timestamp,
    } = req.body;

    if (!MessageSid) {
      return res.status(400).json({ error: 'MessageSid is required' });
    }

    // Map Exotel status to internal status
    const statusMap: Record<string, string> = {
      'queued': 'PENDING',
      'sent': 'SENT',
      'delivered': 'DELIVERED',
      'read': 'READ',
      'failed': 'FAILED',
      'undelivered': 'FAILED',
    };

    const normalizedStatus = statusMap[MessageStatus?.toLowerCase()] || 'PENDING';

    // Find and update the message in WhatsApp logs
    const whatsappLog = await prisma.whatsappLog.findFirst({
      where: {
        providerMsgId: MessageSid,
      },
    });

    if (whatsappLog) {
      await prisma.whatsappLog.update({
        where: { id: whatsappLog.id },
        data: {
          status: normalizedStatus as any,
          deliveredAt: normalizedStatus === 'DELIVERED' ? new Date() : undefined,
          readAt: normalizedStatus === 'READ' ? new Date() : undefined,
        },
      });

      console.log(`[Exotel WhatsApp Webhook] Updated message ${MessageSid} to status ${normalizedStatus}`);
    } else {
      console.warn(`[Exotel WhatsApp Webhook] Message not found: ${MessageSid}`);
    }

    // Also try to update in conversation messages if exists
    try {
      const message = await prisma.conversationMessage.findFirst({
        where: { externalId: MessageSid },
      });

      if (message) {
        await prisma.conversationMessage.update({
          where: { id: message.id },
          data: {
            status: normalizedStatus as any,
            providerStatus: MessageStatus,
          },
        });

        // Create status update record
        await prisma.messageStatusUpdate.create({
          data: {
            messageId: message.id,
            status: normalizedStatus as any,
            errorCode: ErrorCode,
            errorMessage: ErrorMessage,
            providerData: req.body,
          },
        });
      }
    } catch (msgError) {
      // Message might not exist in conversations table, that's okay
      console.log('[Exotel WhatsApp Webhook] No conversation message found for:', MessageSid);
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[Exotel WhatsApp Webhook] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Exotel WhatsApp Incoming Message Webhook
 * Called by Exotel when a WhatsApp message is received
 */
router.post('/whatsapp/webhook/incoming', upload.none(), async (req: Request, res: Response) => {
  try {
    console.log('[Exotel WhatsApp Incoming] Received:', req.body);

    const {
      From,
      To,
      Body,
      MessageSid,
      MediaUrl,
      MediaContentType,
    } = req.body;

    // Find lead by phone number
    const phone = From?.replace(/[^0-9+]/g, '');
    const lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { phone },
          { phone: phone?.replace('+91', '') },
          { phone: phone?.replace('+', '') },
        ],
      },
    });

    // Log the incoming message - Note: WhatsappLog requires userId
    // For now we skip logging if there's no user associated
    if (lead) {
      console.log(`[Exotel WhatsApp Incoming] Received message from ${From} for lead ${lead.id}`);
    } else {
      console.log(`[Exotel WhatsApp Incoming] Received message from ${From}, no associated lead found`);
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[Exotel WhatsApp Incoming] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
