/**
 * Voicebot AI Service - Single Responsibility Principle
 * Handles AI response generation, language switching, and call analysis
 * Enhanced with RAG-powered knowledge retrieval
 */

import OpenAI from 'openai';
import { prisma } from '../config/database';
import { detectUserMood, getMoodResponseStyle } from './voicebot-mood.service';
import { normalizeLanguageCode } from './voicebot-transcription.service';
import { ragService } from './rag.service';


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

export interface EnhancedTranscriptMessage {
  role: 'assistant' | 'user';
  content: string;
  startTimeSeconds: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface EnhancedCallAnalysisResult extends CallAnalysisResult {
  callQualityScore: number;
  keyQuestionsAsked: string[];
  keyIssuesDiscussed: string[];
  sentimentIntensity: 'low' | 'medium' | 'high';
  agentSpeakingTime: number;
  customerSpeakingTime: number;
  nonSpeechTime: number;
  enhancedTranscript: EnhancedTranscriptMessage[];
}

// AI Coaching Types
export interface CoachingHighlight {
  text: string;
  timestamp?: number; // seconds into call
}

export interface CoachingImprovement {
  issue: string;
  suggestion: string;
  timestamp?: number;
}

export interface CoachingSuggestions {
  // What the agent did well
  positiveHighlights: CoachingHighlight[];
  // Areas that need improvement with suggestions
  areasToImprove: CoachingImprovement[];
  // Specific tips for next call with this lead
  nextCallTips: string[];
  // Overall coaching summary
  coachingSummary: string;
  // Talk-to-listen ratio feedback
  talkListenFeedback: string;
  // Empathy score (0-100)
  empathyScore: number;
  // Objection handling score (0-100)
  objectionHandlingScore: number;
  // Closing technique score (0-100)
  closingScore: number;
}

// Smart Call Prep Types
export interface CallPrepSuggestions {
  // Recommended opening line
  recommendedOpening: string;
  // Things to avoid in this call
  thingsToAvoid: string[];
  // Key talking points to cover
  talkingPoints: string[];
  // Objection handling prep
  objectionPrep: Array<{
    objection: string;
    suggestedResponse: string;
  }>;
  // Lead context summary
  leadContext: {
    interestLevel: 'low' | 'medium' | 'high';
    mainConcerns: string[];
    decisionMakerStatus: string;
    preferredChannel: string;
    bestTimeToCall: string;
  };
  // Previous call summary
  previousCallsSummary: string;
  // Confidence score for this prep
  confidenceScore: number;
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
 * @param ragContext - Optional RAG-retrieved context to include instead of full FAQs
 */
function buildSystemPrompt(
  agent: any,
  currentLanguage: string,
  moodResult: { mood: string; intensity: string },
  moodStyle: string,
  ragContext?: string
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

  // Add knowledge context - prefer RAG context if available
  if (ragContext && ragContext.trim().length > 0) {
    systemPrompt += `\n\nRELEVANT KNOWLEDGE (retrieved based on the conversation):\n${ragContext}`;
  } else {
    // Fallback to full FAQs if no RAG context
    const faqs = agent?.faqs || [];
    if (faqs.length > 0) {
      const faqsText = faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
      systemPrompt += `\n\nFAQs (use these to answer questions):\n${faqsText}`;
    }
  }

  return systemPrompt;
}

/**
 * Check if message is conversational (greetings, confirmations, etc.)
 * These don't need RAG lookup - saves ~300-500ms latency
 */
function isConversationalMessage(message: string): boolean {
  // Patterns that indicate conversational/non-knowledge messages
  const conversationalPatterns = [
    // Greetings
    /^(hi|hello|hey|namaste|namaskar|good\s*(morning|afternoon|evening|night))[\s!.,?]*$/i,
    // Confirmations
    /^(yes|yeah|yep|yup|ok|okay|sure|alright|fine|haan|ji|theek|accha)[\s!.,?]*$/i,
    // Negations
    /^(no|nope|nah|nahi|nahin)[\s!.,?]*$/i,
    // Thanks
    /^(thanks|thank\s*you|dhanyavaad|shukriya)[\s!.,?]*$/i,
    // Farewells
    /^(bye|goodbye|see\s*you|alvida|phir\s*milenge)[\s!.,?]*$/i,
    // Simple acknowledgments
    /^(hmm|hm+|ah|oh|i\s*see|got\s*it|understood)[\s!.,?]*$/i,
    // Short responses (less than 3 words, no question words)
    /^[a-z\s]{1,15}$/i,
  ];

  // Question indicators that DO need RAG
  const questionIndicators = [
    'what', 'how', 'why', 'when', 'where', 'which', 'who', 'whom',
    'tell me', 'explain', 'describe', 'kya', 'kaise', 'kyun', 'kab',
    'price', 'cost', 'fee', 'scholarship', 'admission', 'course',
    'program', 'visa', 'eligibility', 'requirement', 'document',
    '?'
  ];

  // If contains question indicators, it's NOT conversational
  const hasQuestionIndicator = questionIndicators.some(q => message.includes(q));
  if (hasQuestionIndicator) {
    return false;
  }

  // Check if matches conversational patterns
  return conversationalPatterns.some(pattern => pattern.test(message));
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

    // Retrieve RAG context if available (with smart bypass for conversational messages)
    let ragContext: string | undefined;
    try {
      if (agent?.id) {
        // Smart bypass: Skip RAG for simple conversational messages
        const lowerMessage = userMessage.toLowerCase().trim();
        const isConversational = isConversationalMessage(lowerMessage);

        if (!isConversational) {
          const ragSettings = (agent.ragSettings as any) || {};
          const topK = ragSettings.topK || 5;
          const similarityThreshold = ragSettings.similarityThreshold || 0.5;

          // Check if agent has indexed knowledge
          const indexStatus = await ragService.getIndexStatus(agent.id);

          if (indexStatus.indexed && indexStatus.totalChunks > 0) {
            // Use RAG retrieval based on the user message
            const results = await ragService.hybridSearch(agent.id, userMessage, {
              topK,
              similarityThreshold,
            });

            if (results.length > 0) {
              ragContext = ragService.buildContextFromResults(results, 1500);
              console.log(`[AIService] RAG retrieved ${results.length} relevant chunks`);
            }
          }
        } else {
          console.log(`[AIService] Skipping RAG for conversational message: "${lowerMessage.substring(0, 30)}..."`);
        }
      }
    } catch (error) {
      console.error('[AIService] RAG retrieval error:', error);
      // Continue without RAG context - will fall back to full FAQs
    }

    // Build system prompt with RAG context
    const systemPrompt = buildSystemPrompt(agent, currentLanguage, moodResult, moodStyle, ragContext);

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

    const appointmentFields = 'appointmentTime, preferredDate, preferredTime';

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are extracting lead information from a phone conversation.
Extract any of these fields if mentioned: ${standardFields}, ${appointmentFields}${customFields ? ', ' + customFields : ''}

IMPORTANT:
- Extract names in both English and transliterated form
- If someone says "mera naam Rahul hai" extract name: "Rahul"
- If someone says "I work at TCS" extract company: "TCS"
- If they mention a budget like "50 lakhs" extract budget: "50 lakhs"
- If they mention location like "Hyderabad" extract city: "Hyderabad"
- APPOINTMENT/SCHEDULING: If the user mentions ANY date, time, or scheduling preference for a meeting/appointment/demo/call, extract it to "appointmentTime" field. Capture the exact phrasing they used.
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
 * Estimate speaking time based on transcript content
 * Uses average speaking rates: ~150 words per minute
 */
function estimateSpeakingTimes(
  transcript: Array<{ role: string; content: string }>,
  totalDuration: number
): { agentTime: number; customerTime: number; nonSpeechTime: number } {
  const wordsPerMinute = 150;
  const secondsPerWord = 60 / wordsPerMinute;

  let agentWords = 0;
  let customerWords = 0;

  for (const turn of transcript) {
    const wordCount = turn.content.split(/\s+/).filter(w => w.length > 0).length;
    if (turn.role === 'assistant') {
      agentWords += wordCount;
    } else {
      customerWords += wordCount;
    }
  }

  const agentTime = Math.round(agentWords * secondsPerWord);
  const customerTime = Math.round(customerWords * secondsPerWord);
  const estimatedSpeechTime = agentTime + customerTime;
  const nonSpeechTime = Math.max(0, totalDuration - estimatedSpeechTime);

  return { agentTime, customerTime, nonSpeechTime };
}

/**
 * Enhanced call analysis with detailed metrics for call summary page
 */
export async function analyzeCallEnhanced(
  transcript: Array<{ role: string; content: string }>,
  moodHistory: Array<{ mood: string; timestamp: string }>,
  userMood: string,
  totalDuration: number = 0
): Promise<EnhancedCallAnalysisResult> {
  // Get basic analysis first
  const basicAnalysis = await analyzeCall(transcript, moodHistory, userMood);

  // Calculate speaking times
  const speakingTimes = estimateSpeakingTimes(transcript, totalDuration || 120);

  const defaultResult: EnhancedCallAnalysisResult = {
    ...basicAnalysis,
    callQualityScore: 50,
    keyQuestionsAsked: [],
    keyIssuesDiscussed: [],
    sentimentIntensity: 'medium',
    agentSpeakingTime: speakingTimes.agentTime,
    customerSpeakingTime: speakingTimes.customerTime,
    nonSpeechTime: speakingTimes.nonSpeechTime,
    enhancedTranscript: [],
  };

  if (!openai || transcript.length === 0) {
    return defaultResult;
  }

  try {
    const transcriptText = transcript.map(t => `${t.role}: ${t.content}`).join('\n');

    // Enhanced analysis prompt
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze this phone call transcript and provide enhanced insights in JSON format:
{
  "callQualityScore": 0-100 (based on: clarity of communication, rapport building, objection handling, professionalism),
  "keyQuestionsAsked": ["list of important questions the AGENT asked"],
  "keyIssuesDiscussed": ["list of main topics/concerns discussed"],
  "sentimentIntensity": "low/medium/high" (how emotionally charged was the conversation),
  "messagesSentiment": [
    {"index": 0, "sentiment": "positive/neutral/negative"},
    {"index": 1, "sentiment": "positive/neutral/negative"}
  ]
}

CALL QUALITY SCORING RULES:
- 90-100: Excellent communication, built strong rapport, handled all concerns professionally
- 70-89: Good communication, addressed main points, some room for improvement
- 50-69: Adequate communication, basic needs met but lacked engagement
- 30-49: Below average, missed opportunities, poor engagement
- 0-29: Poor communication, unprofessional, failed to address needs

KEY QUESTIONS: Extract questions the AGENT asked to understand customer needs
KEY ISSUES: Extract main topics, concerns, or pain points discussed
SENTIMENT per message: Analyze each message's emotional tone`,
        },
        {
          role: 'user',
          content: transcriptText,
        },
      ],
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const enhanced = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log('[AIService] Enhanced call analysis:', enhanced);

    // Build enhanced transcript with timestamps and sentiment
    const avgMessageDuration = totalDuration > 0 ? totalDuration / transcript.length : 10;
    const enhancedTranscript: EnhancedTranscriptMessage[] = transcript.map((msg, index) => {
      const messageSentiment = enhanced.messagesSentiment?.find((m: any) => m.index === index);
      return {
        role: msg.role as 'assistant' | 'user',
        content: msg.content,
        startTimeSeconds: Math.round(index * avgMessageDuration),
        sentiment: messageSentiment?.sentiment || 'neutral',
      };
    });

    return {
      ...basicAnalysis,
      callQualityScore: enhanced.callQualityScore || 50,
      keyQuestionsAsked: enhanced.keyQuestionsAsked || [],
      keyIssuesDiscussed: enhanced.keyIssuesDiscussed || [],
      sentimentIntensity: enhanced.sentimentIntensity || 'medium',
      agentSpeakingTime: speakingTimes.agentTime,
      customerSpeakingTime: speakingTimes.customerTime,
      nonSpeechTime: speakingTimes.nonSpeechTime,
      enhancedTranscript,
    };
  } catch (error) {
    console.error('[AIService] Enhanced call analysis error:', error);
    return defaultResult;
  }
}

/**
 * Generate AI coaching suggestions for agent improvement
 * Analyzes the call and provides actionable feedback
 */
export async function generateCoachingSuggestions(
  transcript: Array<{ role: string; content: string }>,
  outcome: string,
  sentiment: string,
  agentSpeakingTime: number,
  customerSpeakingTime: number
): Promise<CoachingSuggestions> {
  const defaultResult: CoachingSuggestions = {
    positiveHighlights: [],
    areasToImprove: [],
    nextCallTips: [],
    coachingSummary: 'Unable to generate coaching suggestions.',
    talkListenFeedback: '',
    empathyScore: 50,
    objectionHandlingScore: 50,
    closingScore: 50,
  };

  if (!openai || transcript.length === 0) {
    return defaultResult;
  }

  try {
    const transcriptText = transcript.map((t, i) =>
      `[${i}] ${t.role === 'assistant' ? 'AGENT' : 'CUSTOMER'}: ${t.content}`
    ).join('\n');

    // Calculate talk ratio
    const totalTime = agentSpeakingTime + customerSpeakingTime;
    const agentRatio = totalTime > 0 ? Math.round((agentSpeakingTime / totalTime) * 100) : 50;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert sales coach analyzing a phone call between an AI agent and a customer.
Analyze the conversation and provide constructive feedback to help the agent improve.

Call outcome: ${outcome}
Customer sentiment: ${sentiment}
Agent talk ratio: ${agentRatio}% (ideal is 40-50%)

Return JSON:
{
  "positiveHighlights": [
    {"text": "What agent did well", "timestamp": message_index_number}
  ],
  "areasToImprove": [
    {"issue": "Problem identified", "suggestion": "How to improve", "timestamp": message_index_number}
  ],
  "nextCallTips": ["Specific tip for next call with this lead"],
  "coachingSummary": "2-3 sentence overall coaching summary",
  "talkListenFeedback": "Feedback on talk-to-listen ratio",
  "empathyScore": 0-100,
  "objectionHandlingScore": 0-100,
  "closingScore": 0-100
}

COACHING GUIDELINES:
- positiveHighlights: Find 2-4 things the agent did well (rapport building, addressing concerns, professionalism)
- areasToImprove: Find 2-4 areas with specific suggestions (be constructive, not critical)
- nextCallTips: 2-3 actionable tips for the next call based on customer's preferences/concerns
- Scores: Be realistic - 70+ is good, 50-70 is average, below 50 needs work
- If outcome is NOT_INTERESTED, focus on what could have been done differently
- If outcome is INTERESTED/CONVERTED, highlight what worked well`,
        },
        {
          role: 'user',
          content: transcriptText,
        },
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const coaching = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log('[AIService] Coaching suggestions generated:', {
      positiveCount: coaching.positiveHighlights?.length || 0,
      improvementCount: coaching.areasToImprove?.length || 0,
      empathyScore: coaching.empathyScore,
    });

    return {
      positiveHighlights: coaching.positiveHighlights || [],
      areasToImprove: coaching.areasToImprove || [],
      nextCallTips: coaching.nextCallTips || [],
      coachingSummary: coaching.coachingSummary || 'Analysis complete.',
      talkListenFeedback: coaching.talkListenFeedback || `Agent spoke ${agentRatio}% of the time.`,
      empathyScore: coaching.empathyScore || 50,
      objectionHandlingScore: coaching.objectionHandlingScore || 50,
      closingScore: coaching.closingScore || 50,
    };
  } catch (error) {
    console.error('[AIService] Coaching suggestions error:', error);
    return defaultResult;
  }
}

/**
 * Generate Smart Call Prep suggestions based on previous call history
 * Analyzes past conversations to provide personalized guidance for the next call
 */
export async function generateCallPrepSuggestions(
  leadName: string,
  phoneNumber: string,
  previousCalls: Array<{
    transcript: Array<{ role: string; content: string }>;
    summary: string;
    sentiment: string;
    outcome: string;
    createdAt: Date;
    duration: number;
  }>
): Promise<CallPrepSuggestions> {
  const defaultResult: CallPrepSuggestions = {
    recommendedOpening: `Hi, this is your agent calling. How are you doing today?`,
    thingsToAvoid: [],
    talkingPoints: [],
    objectionPrep: [],
    leadContext: {
      interestLevel: 'medium',
      mainConcerns: [],
      decisionMakerStatus: 'Unknown',
      preferredChannel: 'Phone',
      bestTimeToCall: 'Anytime',
    },
    previousCallsSummary: 'No previous calls found.',
    confidenceScore: 50,
  };

  if (!openai || previousCalls.length === 0) {
    return defaultResult;
  }

  try {
    // Build context from all previous calls
    const callsContext = previousCalls.map((call, idx) => {
      const transcriptText = call.transcript
        .map(t => `${t.role === 'assistant' ? 'AGENT' : 'CUSTOMER'}: ${t.content}`)
        .join('\n');

      return `
--- CALL ${idx + 1} (${new Date(call.createdAt).toLocaleDateString()}) ---
Duration: ${Math.round(call.duration / 60)} minutes
Outcome: ${call.outcome}
Sentiment: ${call.sentiment}
Summary: ${call.summary}

Transcript:
${transcriptText}
`;
    }).join('\n\n');

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert sales coach preparing an agent for a follow-up call.
Analyze the previous call history and generate personalized suggestions.

Lead Name: ${leadName}
Phone: ${phoneNumber}
Total Previous Calls: ${previousCalls.length}

Return JSON:
{
  "recommendedOpening": "A personalized opening line referencing the last conversation",
  "thingsToAvoid": ["Things the agent should NOT say or do based on past interactions"],
  "talkingPoints": ["Key points to cover based on customer's interests and concerns"],
  "objectionPrep": [
    {"objection": "Likely objection", "suggestedResponse": "How to handle it"}
  ],
  "leadContext": {
    "interestLevel": "low/medium/high",
    "mainConcerns": ["Customer's main concerns or objections"],
    "decisionMakerStatus": "Is this person the decision maker? Do they need approval?",
    "preferredChannel": "Preferred communication method mentioned",
    "bestTimeToCall": "Best time to reach them based on conversation"
  },
  "previousCallsSummary": "Brief 2-3 sentence summary of all previous interactions",
  "confidenceScore": 0-100 (how confident are we in these suggestions)
}

GUIDELINES:
- recommendedOpening: Reference something specific from the last call to show you remember them
- thingsToAvoid: Based on negative reactions or sensitive topics from previous calls
- talkingPoints: Focus on what interested them, address unresolved concerns
- objectionPrep: Prepare for objections they raised or are likely to raise
- Be specific and actionable, not generic`,
        },
        {
          role: 'user',
          content: callsContext,
        },
      ],
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });

    const prep = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log('[AIService] Call prep suggestions generated for:', leadName);

    return {
      recommendedOpening: prep.recommendedOpening || defaultResult.recommendedOpening,
      thingsToAvoid: prep.thingsToAvoid || [],
      talkingPoints: prep.talkingPoints || [],
      objectionPrep: prep.objectionPrep || [],
      leadContext: {
        interestLevel: prep.leadContext?.interestLevel || 'medium',
        mainConcerns: prep.leadContext?.mainConcerns || [],
        decisionMakerStatus: prep.leadContext?.decisionMakerStatus || 'Unknown',
        preferredChannel: prep.leadContext?.preferredChannel || 'Phone',
        bestTimeToCall: prep.leadContext?.bestTimeToCall || 'Anytime',
      },
      previousCallsSummary: prep.previousCallsSummary || 'Previous interactions analyzed.',
      confidenceScore: prep.confidenceScore || 70,
    };
  } catch (error) {
    console.error('[AIService] Call prep generation error:', error);
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

// Extracted Call Data Types
export interface ExtractedDataItem {
  label: string;
  value: string;
  category: 'contact' | 'interest' | 'timeline' | 'other';
}

export interface ExtractedCallData {
  items: ExtractedDataItem[];
  callbackRequested: boolean;
  callbackDate?: string;
  callbackTime?: string;
  callbackNotes?: string;
}

/**
 * Extract structured information from call transcript
 * Captures contact details, interests, preferences, and callback info
 */
export async function extractCallData(
  transcript: Array<{ role: string; content: string }>,
  agentIndustry?: string
): Promise<ExtractedCallData> {
  const defaultResult: ExtractedCallData = {
    items: [],
    callbackRequested: false,
  };

  if (!openai || transcript.length === 0) {
    return defaultResult;
  }

  const fullText = transcript.map(t => `${t.role}: ${t.content}`).join('\n');

  // Industry-specific extraction prompts
  const industryPrompts: Record<string, string> = {
    // Education & Training
    education: `Extract education-related data: student name, parent/guardian name, current class/grade, board (CBSE/ICSE/State), course interested in, preferred college/university, entrance exam scores (JEE/NEET/etc), budget range, decision timeline, parent/guardian involvement, other institutions being considered, hostel requirement.`,
    EDUCATION: `Extract education-related data: student name, parent/guardian name, current class/grade, board (CBSE/ICSE/State), course interested in, preferred college/university, entrance exam scores (JEE/NEET/etc), budget range, decision timeline, parent/guardian involvement, other institutions being considered, hostel requirement.`,

    // Real Estate
    real_estate: `Extract real estate data: buyer/renter name, property type (flat/villa/plot), location preference, budget range, number of bedrooms/BHK, timeline to move, current living situation, financing/loan status, preferred amenities, possession timeline.`,
    REAL_ESTATE: `Extract real estate data: buyer/renter name, property type (flat/villa/plot), location preference, budget range, number of bedrooms/BHK, timeline to move, current living situation, financing/loan status, preferred amenities, possession timeline.`,

    // Healthcare
    healthcare: `Extract healthcare data: patient name, age, symptoms/health issues discussed, preferred appointment date/time, insurance provider, doctor/specialist preference, urgency level, medical history mentioned, current medications.`,
    HEALTHCARE: `Extract healthcare data: patient name, age, symptoms/health issues discussed, preferred appointment date/time, insurance provider, doctor/specialist preference, urgency level, medical history mentioned, current medications.`,

    // Insurance
    insurance: `Extract insurance data: prospect name, age, current insurance status, coverage type interested in (life/health/vehicle/home), sum assured needed, premium budget, family members to cover, pre-existing conditions, policy term preference.`,
    INSURANCE: `Extract insurance data: prospect name, age, current insurance status, coverage type interested in (life/health/vehicle/home), sum assured needed, premium budget, family members to cover, pre-existing conditions, policy term preference.`,

    // Finance & Banking
    finance: `Extract financial data: prospect name, loan type interested in (home/personal/business/vehicle), loan amount needed, income range, employment type (salaried/self-employed), company name, existing loans/EMIs, property details if home loan, CIBIL score if mentioned.`,
    FINANCE: `Extract financial data: prospect name, loan type interested in (home/personal/business/vehicle), loan amount needed, income range, employment type (salaried/self-employed), company name, existing loans/EMIs, property details if home loan, CIBIL score if mentioned.`,

    // IT Recruitment
    it_recruitment: `Extract recruitment data: candidate name, current company, current role/designation, total experience (years), relevant skills/technologies, current CTC, expected CTC, notice period, preferred location, reason for job change, availability for interview.`,
    IT_RECRUITMENT: `Extract recruitment data: candidate name, current company, current role/designation, total experience (years), relevant skills/technologies, current CTC, expected CTC, notice period, preferred location, reason for job change, availability for interview.`,

    // Technical Interview
    technical_interview: `Extract interview data: candidate name, position applied for, technical skills discussed, years of experience, projects mentioned, strengths identified, areas of concern, overall assessment, recommended next steps.`,
    TECHNICAL_INTERVIEW: `Extract interview data: candidate name, position applied for, technical skills discussed, years of experience, projects mentioned, strengths identified, areas of concern, overall assessment, recommended next steps.`,

    // E-commerce
    ecommerce: `Extract e-commerce data: customer name, product interested in, order number if mentioned, issue/query type, preferred resolution, delivery address concerns, payment method preference, return/exchange request details.`,
    ECOMMERCE: `Extract e-commerce data: customer name, product interested in, order number if mentioned, issue/query type, preferred resolution, delivery address concerns, payment method preference, return/exchange request details.`,

    // Customer Care / Support
    customer_care: `Extract support data: customer name, account/order number, issue category, issue description, previous ticket references, resolution provided, escalation needed, satisfaction level, follow-up required.`,
    CUSTOMER_CARE: `Extract support data: customer name, account/order number, issue category, issue description, previous ticket references, resolution provided, escalation needed, satisfaction level, follow-up required.`,

    // Travel & Hospitality
    travel: `Extract travel data: traveler name, destination, travel dates, number of travelers, budget range, accommodation preference, travel class, special requirements, passport/visa status.`,
    TRAVEL: `Extract travel data: traveler name, destination, travel dates, number of travelers, budget range, accommodation preference, travel class, special requirements, passport/visa status.`,

    // Automotive
    automotive: `Extract automotive data: customer name, vehicle interested in (make/model), new or used preference, budget range, financing needed, trade-in vehicle, preferred color/variant, test drive requested, timeline to purchase.`,
    AUTOMOTIVE: `Extract automotive data: customer name, vehicle interested in (make/model), new or used preference, budget range, financing needed, trade-in vehicle, preferred color/variant, test drive requested, timeline to purchase.`,

    // Default fallback
    default: `Extract any mentioned: person's name, contact details, product/service interested in, budget/price range, timeline/urgency, decision makers, competitor mentions, specific requirements, callback preferences.`,
    CUSTOM: `Extract any mentioned: person's name, contact details, product/service interested in, budget/price range, timeline/urgency, decision makers, competitor mentions, specific requirements, callback preferences.`
  };

  const industryPrompt = industryPrompts[agentIndustry || 'default'] || industryPrompts.default;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a data extraction assistant. Extract key information mentioned by the customer in this call transcript.

${industryPrompt}

Return JSON format:
{
  "items": [
    {"label": "Field Name", "value": "extracted value", "category": "contact|interest|timeline|other"}
  ],
  "callbackRequested": true/false,
  "callbackDate": "mentioned date or null",
  "callbackTime": "mentioned time or null",
  "callbackNotes": "any callback-related notes or null"
}

Categories:
- contact: Name, phone, email, address, personal details
- interest: Products, services, features, preferences, budget
- timeline: Deadlines, dates, urgency, decision timeframe
- other: Anything else important

Only extract information that was explicitly mentioned. Do not invent data.
If no relevant data found, return empty items array.`
        },
        {
          role: 'user',
          content: fullText
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return defaultResult;

    const parsed = JSON.parse(content);

    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      callbackRequested: !!parsed.callbackRequested,
      callbackDate: parsed.callbackDate || undefined,
      callbackTime: parsed.callbackTime || undefined,
      callbackNotes: parsed.callbackNotes || undefined,
    };
  } catch (error) {
    console.error('[AI] Error extracting call data:', error);
    return defaultResult;
  }
}

export const voicebotAIService = {
  generateAIResponse,
  extractQualificationData,
  analyzeCall,
  analyzeCallEnhanced,
  generateCoachingSuggestions,
  generateCallPrepSuggestions,
  extractCallData,
  detectLanguageSwitch,
  getLanguageAcknowledgment,
  LANGUAGE_NAMES,
  LANGUAGE_ACKNOWLEDGMENTS,
};

export default voicebotAIService;
