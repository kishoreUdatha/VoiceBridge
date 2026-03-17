/**
 * Voicebot AI Service - Single Responsibility Principle
 * Handles AI response generation, language switching, and call analysis
 */

import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { detectUserMood, getMoodResponseStyle } from './voicebot-mood.service';
import { normalizeLanguageCode } from './voicebot-transcription.service';

const prisma = new PrismaClient();

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Language name mapping
const LANGUAGE_NAMES: Record<string, string> = {
  'hi': 'Hindi', 'hi-IN': 'Hindi',
  'te': 'Telugu', 'te-IN': 'Telugu',
  'ta': 'Tamil', 'ta-IN': 'Tamil',
  'kn': 'Kannada', 'kn-IN': 'Kannada',
  'ml': 'Malayalam', 'ml-IN': 'Malayalam',
  'mr': 'Marathi', 'mr-IN': 'Marathi',
  'bn': 'Bengali', 'bn-IN': 'Bengali',
  'gu': 'Gujarati', 'gu-IN': 'Gujarati',
  'pa': 'Punjabi', 'pa-IN': 'Punjabi',
  'od': 'Odia', 'od-IN': 'Odia',
  'as': 'Assamese', 'as-IN': 'Assamese',
  'en': 'English (Indian accent)', 'en-IN': 'English (Indian accent)',
};

// Language switch acknowledgments
const LANGUAGE_ACKNOWLEDGMENTS: Record<string, string> = {
  'hi': `Bilkul! Ab main Hindi mein baat karungi. Aap kya jaanna chahte hain?`,
  'te': `Tappakunda! Ippudu nenu Telugu lo matladutanu. Meeku emi kavali?`,
  'ta': `Niraiyaga! Ippothu naan Tamil-il pesuvean. Enakku enna venum?`,
  'kn': `Khachitavagi! Naan eega Kannada-dalli maataladuttene. Neemage enu beku?`,
  'ml': `Theerchayayum! Enikku ippol Malayalam-il samsarikkaam. Ningalkku enthu venam?`,
  'mr': `Nakki! Aata mi Marathi madhe bolto. Tumhala kay hava?`,
  'bn': `Oboshyoi! Ami ekhon Bangla-y kotha bolbo. Apnar ki dorkar?`,
  'gu': `Bilkul! Hu have Gujarati ma vaat karish. Tamne shu joie?`,
  'pa': `Bilkul! Main hun Punjabi vich gall karanga. Tuhanu ki chahida?`,
  'en': `Of course! I'll speak in English now. How can I help you?`,
};

export interface LanguageSwitchResult {
  switchRequested: boolean;
  newLanguage: string | null;
  languageName: string;
}

export interface CallAnalysisResult {
  summary: string;
  sentiment: string;
  outcome: string;
  keyPoints: string[];
  leadScore: number;
  nextAction: string;
  moodJourney: string;
  dominantMood: string;
}

/**
 * Detect if user is requesting a language switch
 */
export async function detectLanguageSwitch(userMessage: string): Promise<LanguageSwitchResult> {
  const defaultResult = { switchRequested: false, newLanguage: null, languageName: '' };

  if (!openai) {
    return defaultResult;
  }

  // Quick check for common language switch phrases
  const switchPatterns = [
    /speak\s+(in\s+)?(\w+)/i,
    /talk\s+(in\s+)?(\w+)/i,
    /(\w+)\s+mein\s+bolo/i,
    /(\w+)\s+lo\s+cheppu/i,
    /can\s+you\s+speak\s+(\w+)/i,
    /please\s+speak\s+(\w+)/i,
    /switch\s+to\s+(\w+)/i,
    /change\s+to\s+(\w+)/i,
    /(\w+)\s+language/i,
  ];

  const hasLanguageKeyword = switchPatterns.some(p => p.test(userMessage));
  if (!hasLanguageKeyword) {
    return defaultResult;
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Detect if the user is requesting to switch the conversation language.

Return JSON:
{
  "switchRequested": true/false,
  "newLanguage": "language code or null",
  "languageName": "human readable language name"
}

Language codes:
- "hi" for Hindi
- "te" for Telugu
- "ta" for Tamil
- "kn" for Kannada
- "ml" for Malayalam
- "mr" for Marathi
- "bn" for Bengali
- "gu" for Gujarati
- "pa" for Punjabi
- "en" for English

Examples:
- "Can you speak in Telugu?" → {"switchRequested": true, "newLanguage": "te", "languageName": "Telugu"}
- "Hindi mein baat karo" → {"switchRequested": true, "newLanguage": "hi", "languageName": "Hindi"}
- "Telugu lo cheppu" → {"switchRequested": true, "newLanguage": "te", "languageName": "Telugu"}
- "Please speak English" → {"switchRequested": true, "newLanguage": "en", "languageName": "English"}
- "What is the price?" → {"switchRequested": false, "newLanguage": null, "languageName": ""}`,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log(`[AIService] Language switch detection:`, result);
    return {
      switchRequested: result.switchRequested || false,
      newLanguage: result.newLanguage || null,
      languageName: result.languageName || '',
    };
  } catch (error) {
    console.error('[AIService] Language switch detection error:', error);
    return defaultResult;
  }
}

/**
 * Get language switch acknowledgment
 */
export function getLanguageAcknowledgment(language: string, languageName: string): string {
  return LANGUAGE_ACKNOWLEDGMENTS[language] || `Sure, I'll speak in ${languageName} now. How can I help you?`;
}

/**
 * Build system prompt for AI response generation
 */
function buildSystemPrompt(
  agent: any,
  currentLanguage: string,
  moodResult: { mood: string; intensity: string },
  moodStyle: string
): string {
  const currentLanguageName = LANGUAGE_NAMES[currentLanguage] || 'English (Indian accent)';
  const isHindi = currentLanguage.startsWith('hi');
  const isTelugu = currentLanguage.startsWith('te');
  const isTamil = currentLanguage.startsWith('ta');
  const isKannada = currentLanguage.startsWith('kn');
  const isMalayalam = currentLanguage.startsWith('ml');
  const isMarathi = currentLanguage.startsWith('mr');
  const isBengali = currentLanguage.startsWith('bn');
  const isGujarati = currentLanguage.startsWith('gu');
  const isPunjabi = currentLanguage.startsWith('pa');
  const isIndianLanguage = isHindi || isTelugu || isTamil || isKannada || isMalayalam ||
    isMarathi || isBengali || isGujarati || isPunjabi || currentLanguage.includes('IN');

  let systemPrompt = agent?.systemPrompt || '';

  // Add human-like conversation guidelines
  systemPrompt += `

CRITICAL CONVERSATION RULES - YOU MUST FOLLOW:
1. Speak like a REAL HUMAN, not a robot. Use natural pauses, fillers like "hmm", "actually", "you know"
2. Keep responses SHORT - 1-2 sentences max. This is a phone call, not a chat.
3. Sound warm, friendly, and empathetic. Mirror the caller's energy.
4. Use the caller's name if they provide it
5. Ask ONE question at a time, never multiple questions
6. Acknowledge what they said before asking the next question
7. Don't sound scripted - vary your responses

USER'S CURRENT MOOD: ${moodResult.mood.toUpperCase()} (intensity: ${moodResult.intensity})
RESPONSE STYLE: ${moodStyle}

MOOD-BASED BEHAVIOR:
- If user sounds ANGRY or FRUSTRATED: Stay calm, apologize if needed, focus on solutions immediately
- If user sounds SAD or WORRIED: Be gentle, empathetic, offer reassurance
- If user sounds HAPPY or EXCITED: Match their energy, be enthusiastic
- If user sounds CONFUSED: Slow down, explain clearly, use simple words
- Always acknowledge their feelings before proceeding with business`;

  // Add language-specific instructions
  systemPrompt += `

CURRENT CONVERSATION LANGUAGE: ${currentLanguageName}
YOU MUST respond in ${currentLanguageName}. This is very important!`;

  if (isIndianLanguage) {
    systemPrompt += `

LANGUAGE INSTRUCTIONS:
- Respond ONLY in ${currentLanguageName} (use Roman/English script for readability)
- Use respectful terms: "aap", "ji", "sir", "madam"
- Be culturally appropriate and polite
- If user switches language mid-conversation, acknowledge and switch`;
  }

  // Add language-specific examples
  const languageExamples: Record<string, string> = {
    'hi': `- Respond in Hindi using Roman script: "Namaste, aap kaise hain?"
- Example: "Ji bilkul, main aapki madad kar sakti hoon"`,
    'te': `- Respond in Telugu using Roman script: "Namaskaram, meeru ela unnaru?"
- Example: "Avunu, nenu mee ki help chestanu"`,
    'ta': `- Respond in Tamil using Roman script: "Vanakkam, eppadi irukkeengal?"
- Example: "Aama, naan ungalukku udavi seiya mudiyum"`,
    'kn': `- Respond in Kannada using Roman script: "Namaskara, hegiddira?"
- Example: "Houdu, naanu nimage sahaya maadaballenu"`,
    'ml': `- Respond in Malayalam using Roman script: "Namaskkaram, sukham aano?"
- Example: "Aanu, enikku ningale sahayikkan kazhiyum"`,
    'mr': `- Respond in Marathi using Roman script: "Namaskar, kase aahat?"
- Example: "Ho, mi tumhala madad karu shakto"`,
    'bn': `- Respond in Bengali using Roman script: "Nomoshkar, kemon achen?"
- Example: "Hyan, ami apnake sahajyo korte pari"`,
    'gu': `- Respond in Gujarati using Roman script: "Kem cho? Shu khabar?"
- Example: "Haa, hu tamne madad kari shaku"`,
    'pa': `- Respond in Punjabi using Roman script: "Sat Sri Akal, ki haal hai?"
- Example: "Haan ji, main tuhadi madad kar sakda haan"`,
  };

  const langKey = Object.keys(languageExamples).find(k => currentLanguage.startsWith(k));
  if (langKey) {
    systemPrompt += `\n${languageExamples[langKey]}`;
  }

  // Add agent's questions context
  const questions = agent?.questions || agent?.qualificationQuestions || [];
  if (questions.length > 0) {
    const questionsText = questions.map((q: any, i: number) =>
      `${i + 1}. ${q.question || q} (collect: ${q.field || 'info'})`
    ).join('\n');
    systemPrompt += `

INFORMATION TO COLLECT (ask naturally, one at a time):
${questionsText}

Remember: Don't interrogate! Ask casually like a friend would.`;
  }

  // Add FAQs
  const faqs = agent?.faqs || [];
  if (faqs.length > 0) {
    const faqsText = faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
    systemPrompt += `\n\nFAQs (use these to answer questions):\n${faqsText}`;
  }

  return systemPrompt;
}

/**
 * Generate AI response using the agent's personality and context
 */
export async function generateAIResponse(
  agent: any,
  transcript: Array<{ role: string; content: string }>,
  userMessage: string,
  currentLanguage: string,
  userMood: string,
  onLanguageChange?: (newLanguage: string) => void
): Promise<string> {
  if (!openai) {
    return "Thank you for calling. Our team will get back to you shortly.";
  }

  try {
    // Check if user wants to switch language
    const languageSwitch = await detectLanguageSwitch(userMessage);
    if (languageSwitch.switchRequested && languageSwitch.newLanguage) {
      console.log(`[AIService] Language switched to ${languageSwitch.newLanguage} (${languageSwitch.languageName})`);
      if (onLanguageChange) {
        onLanguageChange(languageSwitch.newLanguage);
      }
      return getLanguageAcknowledgment(languageSwitch.newLanguage, languageSwitch.languageName);
    }

    // Detect user's mood
    const conversationContext = transcript.slice(-5).map(t => `${t.role}: ${t.content}`).join('\n');
    const moodResult = await detectUserMood(userMessage, conversationContext);
    const moodStyle = getMoodResponseStyle(moodResult.mood, moodResult.intensity);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(agent, currentLanguage, moodResult, moodStyle);

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (last 10 turns)
    const recentTranscript = transcript.slice(-10);
    for (const turn of recentTranscript) {
      messages.push({ role: turn.role, content: turn.content });
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: 150,
      temperature: 0.8,
    });

    return response.choices[0]?.message?.content || "I understand. How else can I help you?";
  } catch (error) {
    console.error('[AIService] AI response error:', error);
    return "I apologize, could you please repeat that?";
  }
}

/**
 * Extract qualification data from user responses
 */
export async function extractQualificationData(
  userMessage: string,
  transcript: Array<{ role: string; content: string }>,
  agent: any
): Promise<Record<string, any>> {
  if (!openai) return {};

  try {
    const questions = agent?.questions || agent?.qualificationQuestions || [];
    const customFields = questions.map((q: any) => q.field || 'info').join(', ');
    const standardFields = 'name, firstName, lastName, email, phone, company, designation, budget, timeline, interest, location, city, requirements';

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are extracting lead information from a phone conversation.
Extract any of these fields if mentioned: ${standardFields}${customFields ? ', ' + customFields : ''}

IMPORTANT:
- Extract names in both English and transliterated form
- If someone says "mera naam Rahul hai" extract name: "Rahul"
- If someone says "I work at TCS" extract company: "TCS"
- If they mention a budget like "50 lakhs" extract budget: "50 lakhs"
- If they mention location like "Hyderabad" extract city: "Hyderabad"
- Return ONLY valid JSON with extracted fields
- Return {} if nothing relevant found`,
        },
        {
          role: 'user',
          content: `Conversation context:\n${transcript.slice(-5).map(t => `${t.role}: ${t.content}`).join('\n')}\n\nLatest message: ${userMessage}`,
        },
      ],
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const extracted = JSON.parse(response.choices[0]?.message?.content || '{}');

    if (Object.keys(extracted).length > 0) {
      console.log('[AIService] Extracted lead data:', extracted);
    }

    return extracted;
  } catch (error) {
    console.error('[AIService] Lead extraction error:', error);
    return {};
  }
}

/**
 * Analyze call and generate detailed insights
 */
export async function analyzeCall(
  transcript: Array<{ role: string; content: string }>,
  moodHistory: Array<{ mood: string; timestamp: string }>,
  userMood: string
): Promise<CallAnalysisResult> {
  const defaultResult: CallAnalysisResult = {
    summary: '',
    sentiment: 'neutral',
    outcome: 'NEEDS_FOLLOWUP',
    keyPoints: [],
    leadScore: 0,
    nextAction: 'Follow up with the lead',
    moodJourney: 'neutral',
    dominantMood: userMood || 'neutral',
  };

  if (!openai || transcript.length === 0) {
    return defaultResult;
  }

  try {
    const transcriptText = transcript.map(t => `${t.role}: ${t.content}`).join('\n');
    const moodHistoryText = moodHistory.map(m => `${m.mood} at ${m.timestamp}`).join(' → ') || 'neutral throughout';

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze this phone call and provide insights in JSON format:
{
  "summary": "2-3 sentence summary of the call",
  "sentiment": "positive/neutral/negative",
  "outcome": "INTERESTED/NOT_INTERESTED/CALLBACK_REQUESTED/NEEDS_FOLLOWUP/CONVERTED/NO_ANSWER/VOICEMAIL",
  "keyPoints": ["key point 1", "key point 2"],
  "leadScore": 0-100 (how likely to convert),
  "nextAction": "recommended next action",
  "moodJourney": "description of how customer's mood changed during call",
  "dominantMood": "the overall/most frequent mood"
}

OUTCOME CLASSIFICATION RULES:
- INTERESTED: Customer asked questions, showed curiosity, requested more info
- NOT_INTERESTED: Customer explicitly declined, said no, not interested
- CALLBACK_REQUESTED: Customer asked to be called back later
- CONVERTED: Customer agreed to purchase, signed up, booked appointment
- NO_ANSWER: Call was not answered (very short transcript)
- VOICEMAIL: Reached voicemail
- NEEDS_FOLLOWUP: ONLY when none of the above apply

Mood history during call: ${moodHistoryText}
Current mood: ${userMood}`,
        },
        {
          role: 'user',
          content: transcriptText,
        },
      ],
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log('[AIService] Call analysis:', analysis);

    // Refine outcome from keywords if needed
    let outcome = analysis.outcome || 'NEEDS_FOLLOWUP';
    if (outcome === 'NEEDS_FOLLOWUP') {
      outcome = refineOutcomeFromKeywords(transcriptText, transcript);
    }

    return {
      summary: analysis.summary || '',
      sentiment: analysis.sentiment || 'neutral',
      outcome,
      keyPoints: analysis.keyPoints || [],
      leadScore: analysis.leadScore || 0,
      nextAction: analysis.nextAction || 'Follow up with the lead',
      moodJourney: analysis.moodJourney || 'neutral throughout',
      dominantMood: analysis.dominantMood || userMood || 'neutral',
    };
  } catch (error) {
    console.error('[AIService] Call analysis error:', error);
    return defaultResult;
  }
}

/**
 * Refine outcome based on keyword analysis
 */
function refineOutcomeFromKeywords(
  fullText: string,
  transcript: Array<{ role: string; content: string }>
): string {
  const lowerText = fullText.toLowerCase();

  // Check for clear interest signals
  if (lowerText.includes('yes') || lowerText.includes('interested') ||
      lowerText.includes('tell me more') || lowerText.includes('how much') ||
      lowerText.includes('price') || lowerText.includes('cost') ||
      lowerText.includes('sounds good') || lowerText.includes('i want')) {
    return 'INTERESTED';
  }

  // Check for not interested signals
  if (lowerText.includes('not interested') || lowerText.includes('no thanks') ||
      lowerText.includes('don\'t call') || lowerText.includes('stop calling') ||
      lowerText.includes('remove me') || lowerText.includes('no need')) {
    return 'NOT_INTERESTED';
  }

  // Check for callback requests
  if (lowerText.includes('call me later') || lowerText.includes('call back') ||
      lowerText.includes('call tomorrow') || lowerText.includes('busy right now')) {
    return 'CALLBACK_REQUESTED';
  }

  // Check for very short conversations
  if (transcript.filter(t => t.role === 'user').length <= 1) {
    return 'NO_ANSWER';
  }

  return 'NEEDS_FOLLOWUP';
}

export const voicebotAIService = {
  generateAIResponse,
  extractQualificationData,
  analyzeCall,
  detectLanguageSwitch,
  getLanguageAcknowledgment,
  LANGUAGE_NAMES,
  LANGUAGE_ACKNOWLEDGMENTS,
};

export default voicebotAIService;
