/**
 * Voicebot Document Service - Single Responsibility Principle
 * Handles document request detection and WhatsApp document sharing
 */

import OpenAI from 'openai';
import { exotelService } from '../integrations/exotel.service';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Document types that can be shared via WhatsApp
export interface AgentDocument {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'document';
  url: string;
  description: string;
  keywords: string[];
}

export interface DocumentRequestResult {
  isDocumentRequest: boolean;
  matchedDocuments: AgentDocument[];
  confirmationMessage: string;
}

// Document request keywords (multilingual)
const DOCUMENT_KEYWORDS = [
  'send', 'share', 'whatsapp', 'document', 'brochure', 'pdf', 'image', 'photo', 'picture',
  'fee', 'fees', 'structure', 'price', 'pricing', 'cost', 'charges',
  'syllabus', 'curriculum', 'course', 'program', 'details',
  'campus', 'college', 'building', 'infrastructure', 'facility', 'facilities',
  'admission', 'form', 'application', 'prospectus',
  'placement', 'result', 'achievement',
  // Hindi keywords
  'bhejo', 'bhej do', 'dikha', 'dikhao', 'photo', 'fees', 'syllabus',
  // Telugu keywords
  'pampu', 'pampandi', 'chupinchu', 'photo', 'fees',
];

/**
 * Detect if user is requesting documents/brochures/images
 * Returns matched documents and confirmation message
 */
export async function detectDocumentRequest(
  userMessage: string,
  documents: AgentDocument[]
): Promise<DocumentRequestResult> {
  const defaultResult: DocumentRequestResult = {
    isDocumentRequest: false,
    matchedDocuments: [],
    confirmationMessage: '',
  };

  if (!documents || documents.length === 0) {
    return defaultResult;
  }

  // Quick keyword check for document requests
  const lowerMessage = userMessage.toLowerCase();
  const hasDocumentKeyword = DOCUMENT_KEYWORDS.some(kw => lowerMessage.includes(kw));

  if (!hasDocumentKeyword) {
    return defaultResult;
  }

  // Use AI to match documents
  if (!openai) {
    // Fallback: simple keyword matching
    const matchedDocs = documents.filter(doc => {
      const docKeywords = [...(doc.keywords || []), doc.name, doc.description].join(' ').toLowerCase();
      return DOCUMENT_KEYWORDS.some(kw => lowerMessage.includes(kw) && docKeywords.includes(kw));
    });

    if (matchedDocs.length > 0) {
      return {
        isDocumentRequest: true,
        matchedDocuments: matchedDocs,
        confirmationMessage: `I'll send you the ${matchedDocs.map(d => d.name).join(' and ')} on WhatsApp right away.`,
      };
    }
    return defaultResult;
  }

  try {
    const documentList = documents.map(d => ({
      id: d.id,
      name: d.name,
      description: d.description,
      keywords: d.keywords,
    }));

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are analyzing a customer's message to determine if they are requesting documents or media to be sent to them.

Available documents:
${JSON.stringify(documentList, null, 2)}

Return JSON:
{
  "isDocumentRequest": true/false,
  "matchedDocumentIds": ["id1", "id2"],
  "confirmationMessage": "Natural confirmation message in the same language as user"
}

Examples:
- "Can you send me the fee structure?" → match fee-related documents
- "I want to see college photos" → match campus/building images
- "Send brochure on WhatsApp" → match brochure/prospectus
- "Syllabus bhej do" (Hindi: send syllabus) → match syllabus/curriculum
- "Fees details pampandi" (Telugu: send fees details) → match fee structure

If user asks for something not in the available documents, return isDocumentRequest: false.`,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log('[DocumentService] Document request detection:', result);

    if (result.isDocumentRequest && result.matchedDocumentIds?.length > 0) {
      const matchedDocs = documents.filter(d => result.matchedDocumentIds.includes(d.id));
      return {
        isDocumentRequest: true,
        matchedDocuments: matchedDocs,
        confirmationMessage: result.confirmationMessage || `I'll send you the requested documents on WhatsApp.`,
      };
    }

    return defaultResult;
  } catch (error) {
    console.error('[DocumentService] Document detection error:', error);
    return defaultResult;
  }
}

/**
 * Send documents to user via WhatsApp (using Exotel)
 */
export async function sendDocumentsViaWhatsApp(
  phoneNumber: string,
  documents: AgentDocument[],
  agentName: string
): Promise<boolean> {
  try {
    // Check if Exotel WhatsApp is configured
    if (!exotelService.isWhatsAppConfigured()) {
      console.log('[DocumentService] Exotel WhatsApp not configured, cannot send documents');
      return false;
    }

    // Format phone number for WhatsApp
    let formattedPhone = phoneNumber.replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) {
      // Assume India if no country code
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+91' + formattedPhone.substring(1);
      } else {
        formattedPhone = '+91' + formattedPhone;
      }
    }

    // Send each document
    for (const doc of documents) {
      const message = `📄 *${doc.name}*\n\n${doc.description}\n\n_Sent by ${agentName}_`;

      // Use Exotel WhatsApp to send document
      if (doc.url) {
        // Send as document with media
        await exotelService.sendWhatsAppDocument({
          to: formattedPhone,
          documentUrl: doc.url,
          filename: doc.name,
          caption: message,
        });
      } else {
        // Send as text message if no URL
        await exotelService.sendWhatsApp({
          to: formattedPhone,
          message: message,
        });
      }

      console.log(`[DocumentService] Sent document "${doc.name}" to ${formattedPhone} via Exotel WhatsApp`);
    }

    return true;
  } catch (error) {
    console.error('[DocumentService] Failed to send documents via WhatsApp:', error);
    return false;
  }
}

/**
 * Format phone number for WhatsApp
 */
export function formatPhoneForWhatsApp(phoneNumber: string): string {
  let formattedPhone = phoneNumber.replace(/\s+/g, '');
  if (!formattedPhone.startsWith('+')) {
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+91' + formattedPhone.substring(1);
    } else {
      formattedPhone = '+91' + formattedPhone;
    }
  }
  return formattedPhone;
}

export const voicebotDocumentService = {
  detectDocumentRequest,
  sendDocumentsViaWhatsApp,
  formatPhoneForWhatsApp,
  DOCUMENT_KEYWORDS,
};

export default voicebotDocumentService;
