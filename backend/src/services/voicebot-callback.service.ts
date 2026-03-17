/**
 * Voicebot Callback Service - Single Responsibility Principle
 * Handles callback request detection and scheduled callback creation
 */

import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface CallbackRequestResult {
  isCallbackRequested: boolean;
  scheduledAt: Date | null;
  scheduledTimeDescription: string;
}

/**
 * Detect callback request and extract scheduled time
 * Handles phrases like "call me tomorrow", "call at 5 PM", "call next week"
 */
export async function detectCallbackRequest(
  transcript: Array<{ role: string; content: string }>
): Promise<CallbackRequestResult> {
  const defaultResult = {
    isCallbackRequested: false,
    scheduledAt: null,
    scheduledTimeDescription: '',
  };

  if (!openai || transcript.length === 0) {
    return defaultResult;
  }

  try {
    const transcriptText = transcript.map(t => `${t.role}: ${t.content}`).join('\n');
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istNow = new Date(now.getTime() + istOffset);

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze this conversation to detect if the customer requested a callback.
Current date/time (IST): ${istNow.toISOString()}

Look for phrases like:
- "call me tomorrow"
- "call me later"
- "call me at 5 PM"
- "call me next week"
- "call me on Monday"
- "kal phone karna" (Hindi for call tomorrow)
- "baad mein call karo" (Hindi for call later)

Return JSON:
{
  "isCallbackRequested": true/false,
  "scheduledAt": "ISO date string or null",
  "scheduledTimeDescription": "human readable description like 'Tomorrow at 10 AM'"
}

IMPORTANT:
- If they say "tomorrow", use tomorrow's date at 10 AM IST
- If they say "later", schedule for 2 hours from now
- If they say "next week", use next Monday at 10 AM IST
- If they give a specific time, use that time
- If no callback requested, return isCallbackRequested: false`,
        },
        {
          role: 'user',
          content: transcriptText,
        },
      ],
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log('[CallbackService] Callback detection:', result);

    return {
      isCallbackRequested: result.isCallbackRequested || false,
      scheduledAt: result.scheduledAt ? new Date(result.scheduledAt) : null,
      scheduledTimeDescription: result.scheduledTimeDescription || '',
    };
  } catch (error) {
    console.error('[CallbackService] Callback detection error:', error);
    return defaultResult;
  }
}

/**
 * Create a scheduled callback
 */
export async function createScheduledCallback(
  organizationId: string,
  agentId: string,
  phoneNumber: string,
  contactName: string,
  scheduledAt: Date,
  description: string,
  transcriptSummary: string
): Promise<string | null> {
  try {
    if (!organizationId) {
      console.log('[CallbackService] No organization ID, skipping scheduled callback');
      return null;
    }

    const scheduledCall = await prisma.scheduledCall.create({
      data: {
        organizationId,
        agentId,
        phoneNumber,
        contactName: contactName || 'Unknown',
        scheduledAt,
        timezone: 'Asia/Kolkata',
        callType: 'CALLBACK',
        priority: 8, // High priority for customer-requested callbacks
        notes: `Customer requested callback: "${description}". Previous call summary: ${transcriptSummary}`,
        status: 'PENDING',
      },
    });

    console.log(`[CallbackService] Created scheduled callback: ${scheduledCall.id} for ${scheduledAt.toISOString()}`);
    return scheduledCall.id;
  } catch (error) {
    console.error('[CallbackService] Failed to create scheduled callback:', error);
    return null;
  }
}

/**
 * Get pending callbacks for an organization
 */
export async function getPendingCallbacks(organizationId: string): Promise<any[]> {
  try {
    const callbacks = await prisma.scheduledCall.findMany({
      where: {
        organizationId,
        status: 'PENDING',
        scheduledAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      include: {
        agent: true,
      },
    });

    return callbacks;
  } catch (error) {
    console.error('[CallbackService] Error fetching pending callbacks:', error);
    return [];
  }
}

/**
 * Update callback status
 */
export async function updateCallbackStatus(
  callbackId: string,
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED'
): Promise<boolean> {
  try {
    await prisma.scheduledCall.update({
      where: { id: callbackId },
      data: { status },
    });
    return true;
  } catch (error) {
    console.error('[CallbackService] Error updating callback status:', error);
    return false;
  }
}

export const voicebotCallbackService = {
  detectCallbackRequest,
  createScheduledCallback,
  getPendingCallbacks,
  updateCallbackStatus,
};

export default voicebotCallbackService;
