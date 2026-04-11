/**
 * Telecaller Call Finalization Service
 *
 * Processes telecaller call recordings with full AI analysis:
 * - Transcription (Sarvam/Whisper)
 * - Sentiment Analysis (OpenAI)
 * - Outcome Detection (OpenAI)
 * - Summary Generation (OpenAI)
 * - Lead Scoring
 * - Lead Lifecycle Integration
 * - Auto Follow-up Scheduling
 *
 * Works exactly like AI Voice Agent analysis but for human telecaller calls
 */

import OpenAI from 'openai';
import { CallOutcome, LeadGrade } from '@prisma/client';
import { prisma } from '../config/database';
import { sarvamService } from '../integrations/sarvam.service';
import { leadLifecycleService } from './lead-lifecycle.service';
import { leadScoringService } from './lead-scoring.service';
import {
  analyzeCallEnhanced,
  generateCoachingSuggestions,
  extractCallData,
  EnhancedCallAnalysisResult,
  CoachingSuggestions,
  ExtractedCallData,
} from './voicebot-ai.service';
import fs from 'fs';
import path from 'path';


const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Valid call outcomes for AI analysis
const VALID_OUTCOMES: CallOutcome[] = [
  'INTERESTED',
  'NOT_INTERESTED',
  'CALLBACK_REQUESTED',
  'NEEDS_FOLLOWUP',
  'CONVERTED',
  'NO_ANSWER',
  'BUSY',
  'VOICEMAIL',
  'WRONG_NUMBER',
  'DNC_REQUESTED',
];

// TelecallerCallOutcome enum values (subset of CallOutcome)
type TelecallerCallOutcome = 'INTERESTED' | 'NOT_INTERESTED' | 'CALLBACK' | 'CONVERTED' | 'NO_ANSWER' | 'WRONG_NUMBER' | 'BUSY';

// Map CallOutcome to TelecallerCallOutcome
function mapToTelecallerOutcome(outcome: CallOutcome): TelecallerCallOutcome {
  const mapping: Record<string, TelecallerCallOutcome> = {
    'INTERESTED': 'INTERESTED',
    'NOT_INTERESTED': 'NOT_INTERESTED',
    'CALLBACK_REQUESTED': 'CALLBACK',
    'NEEDS_FOLLOWUP': 'CALLBACK',
    'CONVERTED': 'CONVERTED',
    'NO_ANSWER': 'NO_ANSWER',
    'BUSY': 'BUSY',
    'VOICEMAIL': 'NO_ANSWER',
    'WRONG_NUMBER': 'WRONG_NUMBER',
    'DNC_REQUESTED': 'NOT_INTERESTED',
  };
  return mapping[outcome] || 'CALLBACK';
}

class TelecallerCallFinalizationService {
  /**
   * Find a lead stage by searching multiple terms with fallback options
   * @param organizationId - Organization ID to search within
   * @param searchTerms - Array of terms to search for in order of preference
   * @returns The matching stage ID or undefined if not found
   */
  private async findStageByTerms(
    organizationId: string,
    searchTerms: string[]
  ): Promise<string | undefined> {
    for (const term of searchTerms) {
      // Try exact slug match first
      let stage = await prisma.leadStage.findFirst({
        where: {
          organizationId,
          slug: { equals: term, mode: 'insensitive' },
          isActive: true,
        },
      });
      if (stage) return stage.id;

      // Try slug contains
      stage = await prisma.leadStage.findFirst({
        where: {
          organizationId,
          slug: { contains: term, mode: 'insensitive' },
          isActive: true,
        },
      });
      if (stage) return stage.id;

      // Try name contains
      stage = await prisma.leadStage.findFirst({
        where: {
          organizationId,
          name: { contains: term, mode: 'insensitive' },
          isActive: true,
        },
      });
      if (stage) return stage.id;
    }
    return undefined;
  }

  /**
   * Parse string transcript to message array format for AI analysis
   * Telecaller transcripts are plain text, so we split into alternating agent/customer turns
   */
  private parseTranscriptToMessages(transcript: string): Array<{ role: string; content: string }> {
    if (!transcript || transcript.trim().length === 0) {
      return [];
    }

    // Try to detect speaker labels in transcript (Agent:, Customer:, Telecaller:, User:, etc.)
    const speakerPattern = /^(Agent|Telecaller|Assistant|Rep|User|Customer|Caller|Lead):\s*/gmi;
    const hasSpeakerLabels = speakerPattern.test(transcript);

    if (hasSpeakerLabels) {
      // Parse labeled transcript
      const messages: Array<{ role: string; content: string }> = [];
      const lines = transcript.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check for speaker label
        const agentMatch = trimmed.match(/^(Agent|Telecaller|Assistant|Rep):\s*(.+)/i);
        const customerMatch = trimmed.match(/^(User|Customer|Caller|Lead):\s*(.+)/i);

        if (agentMatch) {
          messages.push({ role: 'assistant', content: agentMatch[2] });
        } else if (customerMatch) {
          messages.push({ role: 'user', content: customerMatch[2] });
        } else if (messages.length > 0) {
          // Continuation of previous message
          messages[messages.length - 1].content += ' ' + trimmed;
        } else {
          // No label on first line, treat as user
          messages.push({ role: 'user', content: trimmed });
        }
      }

      return messages;
    }

    // No speaker labels - split by sentences and alternate between agent/customer
    // This is a best-effort approach for raw transcripts
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (sentences.length === 1) {
      // Single block of text - treat entire transcript as customer speech
      return [{ role: 'user', content: transcript.trim() }];
    }

    // Alternate between agent and customer for multi-sentence transcripts
    return sentences.map((sentence, index) => ({
      role: index % 2 === 0 ? 'assistant' : 'user',
      content: sentence.trim(),
    }));
  }

  /**
   * Use GPT to split a raw/unlabeled call transcript into proper agent/customer turns.
   * This gives a real two-sided conversation even when ASR returns a single unlabeled blob.
   * Returns null on failure so the caller can fall back to the heuristic parser.
   */
  private async diarizeTranscriptWithGPT(
    transcript: string,
    language?: string
  ): Promise<Array<{ role: string; content: string }> | null> {
    if (!openai || !transcript || transcript.trim().length < 20) return null;

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a speaker diarization assistant for a phone sales call between a telecaller (agent) and a prospective student/parent (customer).

You will receive a raw transcript that may be unlabeled or mislabeled. Split it into the actual back-and-forth turns.

Rules:
- Agent typically: introduces themselves, explains courses/colleges/fees, asks qualifying questions, pitches admissions, handles objections, schedules callbacks.
- Customer typically: answers questions about themselves (name, class, board, course interested), asks about fees/location/hostel/placements, raises concerns, agrees/disagrees.
- Preserve the ORIGINAL wording and language of every sentence — do NOT translate or paraphrase, just assign each sentence to the correct speaker.
- Break long monologues into multiple turns only where a speaker change clearly happens.
- If a sentence is ambiguous, use surrounding context (questions → agent, answers → customer).
- Never invent content. If the transcript only contains one side, return only that side's turns honestly.
${language ? `- The transcript language is ${language}. Keep it in that language.` : ''}

Return JSON:
{
  "turns": [
    { "role": "assistant", "content": "..." },
    { "role": "user", "content": "..." }
  ]
}
Use "assistant" for the telecaller/agent, and "user" for the customer/student/parent.`,
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0,
        max_tokens: 2500,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed?.turns)) return null;

      const turns = parsed.turns
        .map((t: any) => ({
          role: t?.role === 'user' || t?.role === 'customer' ? 'user' : 'assistant',
          content: typeof t?.content === 'string' ? t.content.trim() : '',
        }))
        .filter((t: { role: string; content: string }) => t.content.length > 0);

      if (turns.length === 0) return null;
      return turns;
    } catch (error) {
      console.warn(`[TelecallerAI] GPT diarization failed:`, (error as any)?.message || error);
      return null;
    }
  }

  /**
   * Build transcript messages with best available strategy:
   * 1. If the transcript already has speaker labels — use them.
   * 2. Otherwise try GPT diarization for a real two-sided conversation.
   * 3. Fall back to the alternating-sentences heuristic.
   */
  private async buildTranscriptMessages(
    transcript: string,
    language?: string
  ): Promise<Array<{ role: string; content: string }>> {
    if (!transcript || transcript.trim().length === 0) return [];

    const labelPattern = /^(Agent|Telecaller|Assistant|Rep|User|Customer|Caller|Lead):\s*/im;
    if (labelPattern.test(transcript)) {
      return this.parseTranscriptToMessages(transcript);
    }

    const diarized = await this.diarizeTranscriptWithGPT(transcript, language);
    if (diarized && diarized.length > 0) {
      console.log(`[TelecallerAI] GPT diarization produced ${diarized.length} turns`);
      return diarized;
    }

    console.log(`[TelecallerAI] Falling back to heuristic sentence-alternation parser`);
    return this.parseTranscriptToMessages(transcript);
  }

  /**
   * Process a telecaller call recording with full AI analysis
   */
  async processRecording(callId: string, filePath: string): Promise<void> {
    console.log(`[TelecallerAI] Starting AI analysis for call ${callId}`);

    try {
      // Get call details with organization's preferred language
      const call = await prisma.telecallerCall.findUnique({
        where: { id: callId },
        include: {
          lead: true,
          telecaller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              organizationId: true,
              organization: {
                select: { preferredLanguage: true, industry: true }
              }
            },
          },
        },
      });

      if (!call) {
        console.error(`[TelecallerAI] Call ${callId} not found`);
        return;
      }

      // Get organization's preferred language (default to Telugu)
      const preferredLanguage = call.telecaller?.organization?.preferredLanguage || 'te-IN';
      console.log(`[TelecallerAI] Using preferred language: ${preferredLanguage}`);

      // Step 1: Transcribe the recording (auto-detect language)
      console.log(`[TelecallerAI] Step 1: Transcribing recording...`);
      const transcribed = await this.transcribeRecording(filePath, preferredLanguage);

      if (!transcribed || !transcribed.text) {
        console.error(`[TelecallerAI] Transcription failed for call ${callId}`);
        await this.updateCallWithError(callId, 'Transcription failed');
        return;
      }
      const transcript = transcribed.text;
      const detectedLanguage = transcribed.detectedLanguage;
      console.log(`[TelecallerAI] Detected language: ${detectedLanguage}`);

      // Step 1b: English translation of the cleaned native transcript (best-effort)
      const englishTranscript =
        (await this.translateTranscriptToEnglish(transcript, detectedLanguage)) || '';

      // Step 1.5: Validate transcript has meaningful conversation
      const validationResult = this.validateTranscript(transcript, call.duration || 0);
      if (!validationResult.isValid) {
        console.log(`[TelecallerAI] No meaningful conversation detected: ${validationResult.reason}`);

        // Update call with no-conversation defaults
        await prisma.telecallerCall.update({
          where: { id: callId },
          data: {
            transcript: transcript || '',
            sentiment: 'neutral',
            outcome: validationResult.suggestedOutcome,
            summary: validationResult.reason,
            qualification: {
              noConversation: true,
              reason: validationResult.reason,
              aiAnalyzedAt: new Date().toISOString(),
            },
            aiAnalyzed: true,
            status: 'COMPLETED',
          },
        });

        console.log(`[TelecallerAI] Call ${callId} marked as ${validationResult.suggestedOutcome} (no conversation)`);
        return;
      }

      // Convert string transcript to message array format for AI analysis.
      // Try GPT diarization first so we get a real two-sided conversation
      // even when Sarvam/Whisper return an unlabeled blob.
      const transcriptMessages = await this.buildTranscriptMessages(transcript, detectedLanguage);

      // Step 2: Run enhanced AI analysis (sentiment, outcome, summary, key questions, issues)
      console.log(`[TelecallerAI] Step 2: Running enhanced AI analysis...`);
      const enhancedAnalysis: EnhancedCallAnalysisResult = await analyzeCallEnhanced(
        transcriptMessages,
        [], // mood history
        'neutral',
        call.duration || 0,
        detectedLanguage
      );
      console.log(`[TelecallerAI] Enhanced analysis complete:`, {
        callQualityScore: enhancedAnalysis.callQualityScore,
        sentiment: enhancedAnalysis.sentiment,
        outcome: enhancedAnalysis.outcome,
        keyQuestionsCount: enhancedAnalysis.keyQuestionsAsked.length,
        keyIssuesCount: enhancedAnalysis.keyIssuesDiscussed.length,
      });

      // Step 3: Generate coaching suggestions with error handling
      console.log(`[TelecallerAI] Step 3: Generating coaching suggestions...`);
      let coachingSuggestions: CoachingSuggestions;
      try {
        coachingSuggestions = await generateCoachingSuggestions(
          transcriptMessages,
          enhancedAnalysis.outcome,
          enhancedAnalysis.sentiment,
          enhancedAnalysis.agentSpeakingTime,
          enhancedAnalysis.customerSpeakingTime,
          detectedLanguage
        );
      } catch (coachingError) {
        console.warn(`[TelecallerAI] Coaching suggestions failed, using defaults:`, coachingError);
        coachingSuggestions = {
          positiveHighlights: [],
          areasToImprove: [],
          nextCallTips: [],
          coachingSummary: 'Coaching analysis unavailable',
          talkListenFeedback: '',
          empathyScore: 50,
          objectionHandlingScore: 50,
          closingScore: 50,
        };
      }
      // Ensure all fields have safe defaults to prevent null reference errors
      coachingSuggestions = {
        positiveHighlights: coachingSuggestions?.positiveHighlights || [],
        areasToImprove: coachingSuggestions?.areasToImprove || [],
        nextCallTips: coachingSuggestions?.nextCallTips || [],
        coachingSummary: coachingSuggestions?.coachingSummary || '',
        talkListenFeedback: coachingSuggestions?.talkListenFeedback || '',
        empathyScore: coachingSuggestions?.empathyScore ?? 50,
        objectionHandlingScore: coachingSuggestions?.objectionHandlingScore ?? 50,
        closingScore: coachingSuggestions?.closingScore ?? 50,
      };
      console.log(`[TelecallerAI] Coaching suggestions generated:`, {
        positiveCount: coachingSuggestions.positiveHighlights.length,
        areasCount: coachingSuggestions.areasToImprove.length,
        empathyScore: coachingSuggestions.empathyScore,
      });

      // Step 4: Extract structured call data with error handling
      console.log(`[TelecallerAI] Step 4: Extracting structured call data...`);
      let extractedData: ExtractedCallData;
      // Prefer the English-translated transcript so GPT gets clean English input
      // regardless of the original call language. Fall back to the native transcript
      // if translation failed or produced something trivial.
      const extractionSource =
        englishTranscript && englishTranscript.trim().length > 20
          ? this.parseTranscriptToMessages(englishTranscript)
          : transcriptMessages;
      const industryForExtraction =
        (call.telecaller?.organization?.industry as string | undefined) || 'EDUCATION';
      console.log(
        `[TelecallerAI] Extracting with industry=${industryForExtraction}, source=${
          extractionSource === transcriptMessages ? 'native' : 'english'
        }`
      );
      try {
        extractedData = await extractCallData(extractionSource, industryForExtraction, 'en');
      } catch (extractError) {
        console.warn(`[TelecallerAI] Data extraction failed, using defaults:`, extractError);
        extractedData = { items: [], summary: '' };
      }
      // Ensure safe defaults
      extractedData = {
        items: extractedData?.items || [],
        summary: extractedData?.summary || '',
      };
      console.log(`[TelecallerAI] Extracted ${extractedData.items.length} data items`);

      // Step 5: Additional qualification and buying signals
      console.log(`[TelecallerAI] Step 5: Extracting qualification data...`);
      const qualificationSource =
        englishTranscript && englishTranscript.trim().length > 20 ? englishTranscript : transcript;
      const qualification = await this.extractQualificationData(qualificationSource);

      // Step 6: Detect buying signals and objections
      console.log(`[TelecallerAI] Step 6: Analyzing buying signals...`);
      const buyingSignals = await this.detectBuyingSignals(transcript);

      // Use enhanced analysis values
      const sentiment = enhancedAnalysis.sentiment;
      const outcome = enhancedAnalysis.outcome as CallOutcome;
      const summary = enhancedAnalysis.summary;
      const callQualityScore = enhancedAnalysis.callQualityScore;
      console.log(`[TelecallerAI] Call quality score: ${callQualityScore}`);

      // Step 7: Update call with AI analysis (including enhanced fields)
      console.log(`[TelecallerAI] Step 7: Updating call record with enhanced analysis...`);
      const telecallerOutcome = mapToTelecallerOutcome(outcome);
      const updatedCall = await prisma.telecallerCall.update({
        where: { id: callId },
        data: {
          transcript,
          sentiment,
          outcome: telecallerOutcome,
          summary,
          callQualityScore,
          // Enhanced analysis fields
          keyQuestionsAsked: enhancedAnalysis.keyQuestionsAsked,
          keyIssuesDiscussed: enhancedAnalysis.keyIssuesDiscussed,
          sentimentIntensity: enhancedAnalysis.sentimentIntensity,
          agentSpeakingTime: enhancedAnalysis.agentSpeakingTime,
          customerSpeakingTime: enhancedAnalysis.customerSpeakingTime,
          nonSpeechTime: enhancedAnalysis.nonSpeechTime,
          enhancedTranscript: enhancedAnalysis.enhancedTranscript as any,
          // Coaching fields
          coachingPositiveHighlights: coachingSuggestions.positiveHighlights as any,
          coachingAreasToImprove: coachingSuggestions.areasToImprove as any,
          coachingNextCallTips: coachingSuggestions.nextCallTips,
          coachingSummary: coachingSuggestions.coachingSummary,
          coachingTalkListenFeedback: coachingSuggestions.talkListenFeedback,
          coachingEmpathyScore: coachingSuggestions.empathyScore,
          coachingObjectionScore: coachingSuggestions.objectionHandlingScore,
          coachingClosingScore: coachingSuggestions.closingScore,
          // Extracted data
          extractedData: extractedData as any,
          qualification: {
            ...qualification,
            buyingSignals: buyingSignals.signals,
            objections: buyingSignals.objections,
            detectedLanguage,
            englishTranscript,
            aiAnalyzedAt: new Date().toISOString(),
          },
          aiAnalyzed: true,
          status: 'COMPLETED',
        },
        include: {
          lead: true,
          telecaller: true,
        },
      });

      // Step 8: Process lead lifecycle (create/update lead, schedule follow-ups)
      console.log(`[TelecallerAI] Step 8: Processing lead lifecycle...`);
      await this.processLeadLifecycle(updatedCall, qualification);

      // Step 9: Calculate and update lead score
      if (updatedCall.leadId) {
        console.log(`[TelecallerAI] Step 9: Calculating lead score...`);
        await this.updateLeadScore(updatedCall);
      }

      // Step 10: Log activity
      await this.logCallActivity(updatedCall);

      console.log(`[TelecallerAI] AI analysis completed for call ${callId}`);
      console.log(`[TelecallerAI] Results: Outcome=${outcome}, Sentiment=${sentiment}`);
    } catch (error) {
      console.error(`[TelecallerAI] Error processing call ${callId}:`, error);
      await this.updateCallWithError(callId, (error as Error).message);
    }
  }

  /**
   * Validate if transcript contains meaningful conversation
   * Returns false for empty, silence-only, or noise transcripts
   */
  private validateTranscript(
    transcript: string,
    duration: number
  ): { isValid: boolean; reason: string; suggestedOutcome: TelecallerCallOutcome } {
    // Trim and normalize transcript
    const cleanTranscript = transcript.trim().toLowerCase();

    // Check 1: Empty or very short transcript
    if (!cleanTranscript || cleanTranscript.length < 10) {
      return {
        isValid: false,
        reason: 'No conversation detected - recording appears to be silent or empty',
        suggestedOutcome: 'NO_ANSWER',
      };
    }

    // Check 2: Very short duration (less than 5 seconds)
    if (duration > 0 && duration < 5) {
      return {
        isValid: false,
        reason: 'Call too short for meaningful conversation',
        suggestedOutcome: 'NO_ANSWER',
      };
    }

    // Check 3: Count actual words (filter out noise markers and single characters)
    const words = cleanTranscript
      .split(/\s+/)
      .filter(word => word.length > 1 && !/^[.…,!?]+$/.test(word));

    if (words.length < 5) {
      return {
        isValid: false,
        reason: 'Transcript contains too few words to analyze - likely noise or silence',
        suggestedOutcome: 'NO_ANSWER',
      };
    }

    // Check 4: Detect common noise/silence patterns from transcription services
    const noisePatterns = [
      /^\.+$/,                    // Just dots
      /^\[.*\]$/,                 // Just bracketed noise markers like [silence], [music]
      /^(uh|um|hmm|ah)+$/,        // Just filler sounds
      /^(music|silence|noise|static|background|inaudible)+$/i,
      /thank you for watching/i,  // Common transcription artifact
      /please subscribe/i,        // Common transcription artifact
    ];

    for (const pattern of noisePatterns) {
      if (pattern.test(cleanTranscript)) {
        return {
          isValid: false,
          reason: 'Recording contains only background noise or silence markers',
          suggestedOutcome: 'NO_ANSWER',
        };
      }
    }

    // Check 5: Ensure there's actual dialogue (at least some greeting or response)
    const conversationIndicators = [
      /hello/i, /hi/i, /hey/i, /good (morning|afternoon|evening)/i,
      /namaskar/i, /namaste/i, /vanakkam/i,
      /yes/i, /no/i, /okay/i, /sure/i,
      /tell me/i, /speak/i, /calling/i, /call/i,
      /sir/i, /ma'?am/i, /madam/i,
      /thank/i, /please/i,
      /interested/i, /information/i, /details/i,
      /price/i, /cost/i, /offer/i,
      /busy/i, /later/i, /callback/i,
      /wrong number/i, /galat/i,
      // Hindi common words
      /haan/i, /nahi/i, /kya/i, /kaun/i, /bol/i, /baat/i,
      /aap/i, /main/i, /mujhe/i, /humko/i,
      // Telugu common words
      /andi/i, /emandi/i, /cheppandi/i, /meeru/i, /nenu/i,
      /avunu/i, /kaadu/i, /ledhu/i, /undi/i, /ledu/i,
      /enti/i, /ela/i, /evaru/i, /ekkada/i,
      /baagundi/i, /manchidi/i, /samajam/i,
      /dhanyavadalu/i, /thanks/i, /namaskaram/i,
      /intrest/i, /kavali/i, /vaddu/i,
      /call cheyandi/i, /tarvata/i, /ippudu/i,
      /rate/i, /price/i, /money/i, /paisa/i,
      /sir/i, /madam/i, /garu/i,
    ];

    const hasConversationIndicator = conversationIndicators.some(pattern =>
      pattern.test(cleanTranscript)
    );

    if (!hasConversationIndicator && words.length < 15) {
      return {
        isValid: false,
        reason: 'No recognizable conversation detected in the recording',
        suggestedOutcome: 'NO_ANSWER',
      };
    }

    // Transcript appears to have meaningful content
    return {
      isValid: true,
      reason: '',
      suggestedOutcome: 'INTERESTED', // Will be determined by AI
    };
  }

  /**
   * Transcribe audio recording using Sarvam or Whisper
   * Supports Telugu, Hindi, and other Indian languages
   *
   * @param filePath - Path to the audio file
   * @param language - Preferred language code (e.g., 'te-IN', 'hi-IN', 'en-IN')
   */
  /**
   * Translate the cleaned native-language transcript into faithful English using GPT.
   * This is more accurate than Whisper's audio→English mode because we feed it the
   * already-cleaned conversation text (with speaker turns), not noisy audio.
   */
  private async translateTranscriptToEnglish(cleanedTranscript: string, sourceLanguage: string): Promise<string | null> {
    if (!openai || !cleanedTranscript || cleanedTranscript.length < 5) return null;
    if (sourceLanguage && sourceLanguage.toLowerCase().startsWith('en')) return cleanedTranscript;
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              `Translate the following ${sourceLanguage} phone-call transcript into clear, natural ` +
              `English. Preserve speaker turns ("Agent:" / "Customer:") exactly. Keep all numbers, ` +
              `names, place names, and specific entities (universities, courses, fees, phone numbers) ` +
              `intact. Do not add commentary, do not summarize, do not use markdown — output ONLY ` +
              `the translated transcript text.`,
          },
          { role: 'user', content: cleanedTranscript },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      });
      const text = response.choices[0]?.message?.content?.trim();
      console.log(`[TelecallerAI] English translation: ${(text || '').substring(0, 100)}...`);
      return text || null;
    } catch (err: any) {
      console.warn(`[TelecallerAI] English translation failed: ${err?.message || err}`);
      return null;
    }
  }

  /**
   * Convert any input audio file to 16kHz mono 16-bit PCM WAV.
   * Sarvam (and most ASR engines) work best with this format. Returns a temp path the
   * caller is responsible for cleaning up. Returns null on failure (so callers fall back).
   */
  private async convertToPcmWav(inputPath: string): Promise<string | null> {
    try {
      const ffmpeg = require('fluent-ffmpeg');
      const ffmpegStatic = require('ffmpeg-static');
      if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

      const outPath = inputPath.replace(/\.[^.]+$/, '') + `-pcm-${Date.now()}.wav`;
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .audioFrequency(16000)
          .audioChannels(1)
          .audioCodec('pcm_s16le')
          .format('wav')
          .on('error', (err: any) => reject(err))
          .on('end', () => resolve())
          .save(outPath);
      });
      return outPath;
    } catch (err: any) {
      console.warn(`[TelecallerAI] ffmpeg conversion failed: ${err?.message || err}`);
      return null;
    }
  }

  /**
   * Split a WAV file into N-second chunks. Returns the chunk paths in order.
   * Used to work around Sarvam's 30s sync-STT limit.
   */
  /**
   * Split a WAV file into overlapping chunks. Each chunk is `chunkSeconds` long
   * and starts `overlapSeconds` before the previous one ended, so a word that
   * straddles a chunk boundary appears (in some form) in both chunks. The cleanup
   * GPT pass then merges and de-duplicates the boundary text.
   */
  private async splitWavIntoChunks(
    wavPath: string,
    chunkSeconds: number = 28,
    overlapSeconds: number = 2,
  ): Promise<string[]> {
    try {
      const ffmpeg = require('fluent-ffmpeg');
      const ffmpegStatic = require('ffmpeg-static');
      if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

      // Compute duration directly from the WAV header (we know it's 16kHz mono 16-bit PCM
      // because we just generated it with convertToPcmWav). Avoids needing ffprobe binary.
      const stats = fs.statSync(wavPath);
      const dataBytes = Math.max(0, stats.size - 44);
      const duration = dataBytes / (16000 * 2);
      console.log(`[TelecallerAI] WAV duration ~${duration.toFixed(1)}s (size=${stats.size})`);
      if (!duration || duration <= chunkSeconds) return [wavPath];

      const chunks: string[] = [];
      const stride = chunkSeconds - overlapSeconds;
      let i = 0;
      for (let start = 0; start < duration; start += stride) {
        const out = wavPath.replace(/\.wav$/, `-chunk${i}.wav`);
        const dur = Math.min(chunkSeconds, duration - start);
        if (dur < 1) break;
        await new Promise<void>((resolve, reject) => {
          ffmpeg(wavPath)
            .setStartTime(start)
            .setDuration(dur)
            .audioFrequency(16000)
            .audioChannels(1)
            .audioCodec('pcm_s16le')
            .format('wav')
            .on('error', reject)
            .on('end', () => resolve())
            .save(out);
        });
        chunks.push(out);
        i += 1;
        if (start + chunkSeconds >= duration) break;
      }
      console.log(`[TelecallerAI] Split ${duration.toFixed(1)}s audio into ${chunks.length} overlapping chunks (${chunkSeconds}s, ${overlapSeconds}s overlap)`);
      return chunks;
    } catch (err: any) {
      console.warn(`[TelecallerAI] Audio chunking failed: ${err?.message || err}`);
      return [wavPath];
    }
  }

  /**
   * Use GPT to clean up an ASR transcript: fix obvious mis-recognitions, repair word
   * boundaries, drop noise/filler. Output is in the SAME language as the input.
   * Falls back to the raw transcript on any failure.
   */
  private async cleanupTranscript(rawTranscript: string, language: string): Promise<string> {
    if (!openai || !rawTranscript || rawTranscript.length < 10) return rawTranscript;
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              `You are an expert ASR post-processor for telecaller phone calls. The input is a raw ` +
              `speech-to-text transcript in ${language} from a MONO recording. The recording may ` +
              `contain ONE speaker (the agent only — because the customer's voice came through the ` +
              `phone earpiece and was not captured) OR BOTH speakers (if recording was via OEM call ` +
              `recorder or speakerphone). It may also contain artifacts from automatic chunking with ` +
              `overlap, garbled spellings, missing word boundaries, filler sounds, and mis-detected ` +
              `words. Reconstruct a clean, faithful, well-punctuated rendering of the actual ` +
              `conversation in the SAME language and native script.\n\n` +
              `STRICT RULES:\n` +
              `1. Output ONLY the cleaned transcript — no commentary, no headings, no markdown fences.\n` +
              `2. NEVER invent content. Only fix what is implied by the surrounding text.\n` +
              `3. Speaker labeling — VERY IMPORTANT:\n` +
              `   a. Each conversational turn must be on its own line, prefixed with "Agent:" or "Customer:".\n` +
              `   b. NEVER mix an agent statement and a customer reply into the same line.\n` +
              `   c. Identify each turn by SEMANTICS, not by line breaks in the input:\n` +
              `      - AGENT lines: introductions, qualifying questions ("Are you...?", "Did you...?", ` +
              `"Which branch?", "Are you interested in..?"), explanations of services, calls to action, ` +
              `pitch language, "Sir/Madam" address, mentions of the company name.\n` +
              `      - CUSTOMER lines: short answers ("Yes", "No", "Okay"), personal info ("I am...", ` +
              `"My name is..."), preferences ("I want...", "I am thinking..."), questions back to the ` +
              `agent about the offering.\n` +
              `   d. If a sentence contains BOTH a customer answer and an agent follow-up (e.g. "Yes sir, ` +
              `okay. Are you thinking BTech or Degree?"), SPLIT it into two separate lines:\n` +
              `      Customer: Yes sir, okay.\n` +
              `      Agent: Are you thinking BTech or Degree?\n` +
              `   e. If you genuinely cannot tell who is speaking for a fragment, label it "Agent:" ` +
              `(default) — never guess "Customer:" without strong evidence.\n` +
              `   f. If the entire audio appears to contain only the agent's voice (a long monologue ` +
              `of questions with no clear customer responses), label everything as "Agent:" — do NOT ` +
              `fabricate "Customer:" turns.\n` +
              `4. Merge duplicate sentences caused by chunk overlap — keep the more complete version.\n` +
              `5. Preserve numbers, money amounts, names, university/college names, dates, phone ` +
              `numbers and any factual entities EXACTLY as said.\n` +
              `6. Remove pure filler ("umm", "ah", repeated "okay okay") but keep meaningful "okay"s.\n` +
              `7. Add proper punctuation (commas, full stops, question marks) appropriate for ${language}.\n` +
              `8. If a word looks garbled but you can infer the intended word from context, replace it.\n\n` +
              `EXAMPLE of correct splitting (English for clarity):\n` +
              `Input: "Hello sir am I speaking with Raju yes sir okay you recently completed intermediate yes sir which branch are you thinking BTech sir"\n` +
              `Output:\n` +
              `Agent: Hello sir, am I speaking with Raju?\n` +
              `Customer: Yes sir.\n` +
              `Agent: Okay. You recently completed intermediate?\n` +
              `Customer: Yes sir.\n` +
              `Agent: Which branch are you thinking?\n` +
              `Customer: BTech sir.`,
          },
          { role: 'user', content: rawTranscript },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      });
      const cleaned = response.choices[0]?.message?.content?.trim();
      if (cleaned && cleaned.length > 5) {
        console.log(`[TelecallerAI] Transcript cleaned (${cleaned.length} chars)`);
        return cleaned;
      }
    } catch (err: any) {
      console.warn(`[TelecallerAI] Transcript cleanup failed: ${err?.message || err}`);
    }
    return rawTranscript;
  }

  private async transcribeRecording(
    filePath: string,
    _language: string = 'te-IN'
  ): Promise<{ text: string; detectedLanguage: string } | null> {
    let pcmPath: string | null = null;
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`[TelecallerAI] Recording file not found: ${filePath}`);
        return null;
      }

      const stats = fs.statSync(filePath);
      console.log(`[TelecallerAI] Recording file size: ${stats.size} bytes`);
      if (stats.size < 1000) {
        console.error(`[TelecallerAI] Recording file too small (${stats.size} bytes), likely empty`);
        return null;
      }

      // Convert any input format to 16kHz mono PCM WAV — this is what Sarvam expects and
      // gives much better results for Indic languages than feeding raw m4a.
      pcmPath = await this.convertToPcmWav(filePath);
      const sttSourcePath = pcmPath || filePath;
      console.log(`[TelecallerAI] STT source: ${pcmPath ? 'converted PCM WAV' : 'original (conversion failed)'}`);

      // 1) Sarvam first — Saaras v3 with auto language detection (best for Indic).
      // Sarvam's sync STT only accepts up to 30s, so we chunk if needed.
      const chunkPaths: string[] = pcmPath
        ? await this.splitWavIntoChunks(pcmPath, 28)
        : [sttSourcePath];
      try {
        const sarvamFormat: 'wav' | 'm4a' | 'mp3' = pcmPath ? 'wav' : 'm4a';
        console.log(`[TelecallerAI] Sarvam STT (${chunkPaths.length} chunk(s), format=${sarvamFormat}, sr=16000)`);
        const pieces: string[] = [];
        let detected = 'unknown';
        for (const chunk of chunkPaths) {
          const audioBuffer = fs.readFileSync(chunk);
          const result = await sarvamService.speechToText(audioBuffer, 16000, undefined, sarvamFormat);
          if (result?.text) {
            pieces.push(result.text.trim());
            if (result.detectedLanguage && detected === 'unknown') detected = result.detectedLanguage;
          }
        }
        const merged = pieces.filter(Boolean).join(' ');
        if (merged.length > 0) {
          console.log(`[TelecallerAI] Sarvam OK (${pieces.length} chunks), lang=${detected}: ${merged.substring(0, 100)}...`);
          const cleaned = await this.cleanupTranscript(merged, detected);
          // Clean up chunk files (but not the master PCM, that happens in finally)
          if (chunkPaths.length > 1) {
            for (const c of chunkPaths) { try { fs.unlinkSync(c); } catch {} }
          }
          return { text: cleaned, detectedLanguage: detected };
        }
        console.log('[TelecallerAI] Sarvam returned empty transcript, falling back to Whisper');
      } catch (sarvamError: any) {
        console.log(`[TelecallerAI] Sarvam failed: ${sarvamError?.message || 'Unknown error'}, trying Whisper...`);
      } finally {
        if (chunkPaths.length > 1) {
          for (const c of chunkPaths) { try { fs.unlinkSync(c); } catch {} }
        }
      }

      // 2) Whisper auto-detect via verbose_json
      if (openai) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Whisper transcription timeout (60s)')), 60000);
        });

        try {
          const response: any = await Promise.race([
            openai.audio.transcriptions.create({
              file: fs.createReadStream(sttSourcePath),
              model: 'whisper-1',
              response_format: 'verbose_json',
            }),
            timeoutPromise,
          ]);
          const detected = response.language || 'unknown';
          console.log(`[TelecallerAI] Whisper OK, lang=${detected}: ${(response.text || '').substring(0, 100)}...`);
          const cleaned = await this.cleanupTranscript(response.text || '', detected);
          return { text: cleaned, detectedLanguage: detected };
        } catch (whisperError: any) {
          console.error(`[TelecallerAI] Whisper transcription failed: ${whisperError?.message || 'Unknown error'}`);
          return null;
        }
      }

      console.error('[TelecallerAI] OpenAI client not initialized - missing OPENAI_API_KEY');
      return null;
    } catch (error: any) {
      console.error(`[TelecallerAI] Transcription error: ${error?.message || error}`);
      return null;
    } finally {
      // Clean up the temp PCM file if we made one.
      if (pcmPath) {
        try { fs.unlinkSync(pcmPath); } catch {}
      }
    }
  }

  /**
   * Analyze sentiment using OpenAI
   * Supports Indian languages (Telugu, Hindi, Tamil, etc.) and English
   */
  private async analyzeSentiment(transcript: string): Promise<string> {
    if (!openai) return 'neutral';

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze the customer's sentiment in this phone conversation.
The conversation may be in any Indian language (Telugu, Hindi, Tamil, Kannada, etc.) or English.
Consider their tone, word choice, and overall attitude.
Reply with ONLY one word: positive, neutral, or negative.`,
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0,
        max_tokens: 10,
      });

      const result = completion.choices[0]?.message?.content?.toLowerCase().trim();
      return ['positive', 'neutral', 'negative'].includes(result || '') ? result! : 'neutral';
    } catch (error) {
      console.error('[TelecallerAI] Sentiment analysis error:', error);
      return 'neutral';
    }
  }

  /**
   * Calculate call quality score using OpenAI
   * Analyzes communication quality, professionalism, and effectiveness
   * Returns a score from 0-100
   */
  private async calculateCallQualityScore(transcript: string, duration: number): Promise<number> {
    // If no conversation or very short, return 0
    if (!transcript || transcript.trim().length < 20 || duration < 10) {
      return 0;
    }

    if (!openai) return 50; // Default if no OpenAI

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze this phone call transcript and rate the overall call quality on a scale of 0-100.
The conversation may be in any Indian language (Telugu, Hindi, Tamil, Kannada, etc.) or English.

Consider these factors:
- Communication clarity and professionalism
- Rapport building with the customer
- How well the caller explained the product/service
- Objection handling (if any objections arose)
- Overall conversation flow and engagement
- Whether key information was gathered
- Customer engagement level

SCORING RULES:
- 90-100: Excellent - Outstanding communication, built strong rapport, handled all concerns professionally
- 70-89: Good - Clear communication, addressed main points well, minor areas for improvement
- 50-69: Average - Basic needs met but lacked engagement or missed some opportunities
- 30-49: Below Average - Poor engagement, missed key opportunities, unprofessional elements
- 0-29: Poor - Very short conversation, no real engagement, or major communication issues

Reply with ONLY a number between 0 and 100.`,
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0,
        max_tokens: 10,
      });

      const result = completion.choices[0]?.message?.content?.trim();
      const score = parseInt(result || '50', 10);

      // Ensure score is within valid range
      if (isNaN(score) || score < 0) return 0;
      if (score > 100) return 100;

      return score;
    } catch (error) {
      console.error('[TelecallerAI] Call quality score calculation error:', error);
      return 50; // Default on error
    }
  }

  /**
   * Determine call outcome using OpenAI
   * Supports Indian languages (Telugu, Hindi, Tamil, etc.) and English
   */
  private async determineOutcome(transcript: string): Promise<CallOutcome> {
    if (!openai) return 'NEEDS_FOLLOWUP';

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze this phone call and determine the outcome.
The conversation may be in any Indian language (Telugu, Hindi, Tamil, Kannada, etc.) or English.

Reply with ONLY one of these outcomes:
- INTERESTED: Customer showed interest in the product/service
- NOT_INTERESTED: Customer clearly not interested
- CALLBACK_REQUESTED: Customer asked to be called back later
- NEEDS_FOLLOWUP: Conversation incomplete, needs follow-up
- CONVERTED: Customer agreed to purchase/sign up
- NO_ANSWER: Call was not answered
- BUSY: Customer was busy, couldn't talk
- VOICEMAIL: Left a voicemail
- WRONG_NUMBER: Wrong number reached
- DNC_REQUESTED: Customer requested to not be called again`,
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0,
        max_tokens: 20,
      });

      const result = completion.choices[0]?.message?.content?.toUpperCase().trim() as CallOutcome;
      return VALID_OUTCOMES.includes(result) ? result : 'NEEDS_FOLLOWUP';
    } catch (error) {
      console.error('[TelecallerAI] Outcome determination error:', error);
      return 'NEEDS_FOLLOWUP';
    }
  }

  /**
   * Generate call summary using OpenAI
   */
  private async generateSummary(transcript: string): Promise<string> {
    if (!openai) return transcript.substring(0, 200);

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Summarize this phone call in 2-3 sentences.
Focus on:
- Main topic discussed
- Customer's response/attitude
- Any commitments or next steps agreed
- Key objections raised (if any)

Be concise and actionable.`,
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      return completion.choices[0]?.message?.content || transcript.substring(0, 200);
    } catch (error) {
      console.error('[TelecallerAI] Summary generation error:', error);
      return transcript.substring(0, 200);
    }
  }

  /**
   * Extract qualification data from transcript
   */
  private async extractQualificationData(transcript: string): Promise<Record<string, any>> {
    if (!openai) return {};

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are extracting structured lead qualification data from a phone call transcript between a telecaller and a prospective student/parent (education / admissions domain).

Return a JSON object. Include ONLY the keys for which the information was actually mentioned in the conversation — never guess, never invent, never echo the telecaller's pitch as if the customer said it.

Keys you may return (all optional):
{
  "fullName": "student's full name if given",
  "firstName": "first name only",
  "lastName": "last name only",
  "name": "same as fullName, for backward compatibility",
  "phone": "student phone number if spoken",
  "email": "email address if spoken",
  "currentClass": "e.g. 12th, Intermediate 2nd year, B.Tech 3rd year",
  "board": "CBSE / ICSE / State / IB",
  "courseInterested": "course they asked about, e.g. B.Tech CSE, MBA, MBBS",
  "specialization": "specialization/branch if discussed",
  "collegesInterested": ["array of every college or university name the student/parent mentioned interest in"],
  "otherCollegesConsidered": ["array of competitor colleges they are also evaluating"],
  "preferredLocation": "city or state preference",
  "budget": "overall budget range",
  "feeStructure": "specific fee amounts discussed (tuition, hostel, total, scholarship, EMI)",
  "interestLevel": "High | Medium | Low (based on enthusiasm and concrete next steps)",
  "timeline": "admission year / when they want to join / decision deadline",
  "entranceExamScore": "JEE / NEET / EAMCET / CAT / GATE rank or score with exam name",
  "hostelRequired": "Yes | No",
  "parentName": "parent/guardian name if spoken",
  "parentPhone": "parent/guardian phone if spoken",
  "decisionMaker": "who makes the final call (student / parent / both)",
  "reasonForInterest": "why this course/college",
  "requirements": "specific requirements mentioned",
  "painPoints": ["list of concerns the student/parent raised"]
}

Rules:
- Omit any key that was not mentioned. Empty object {} is valid.
- "collegesInterested" must be an array of strings, each string one college name.
- "interestLevel" must be exactly "High", "Medium", or "Low" if you include it.
- Do not include commentary or any field not in the list above.`,
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0,
        max_tokens: 700,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      return content ? JSON.parse(content) : {};
    } catch (error) {
      console.error('[TelecallerAI] Qualification extraction error:', error);
      return {};
    }
  }

  /**
   * Detect buying signals and objections
   */
  private async detectBuyingSignals(transcript: string): Promise<{ signals: string[]; objections: string[] }> {
    if (!openai) return { signals: [], objections: [] };

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze this sales call for buying signals and objections.

Return JSON:
{
  "signals": ["list of phrases/statements showing purchase intent"],
  "objections": ["list of concerns or hesitations expressed"]
}

Examples of buying signals:
- "How much does it cost?"
- "When can we start?"
- "Can you send me more information?"
- "That sounds interesting"

Examples of objections:
- "It's too expensive"
- "I need to think about it"
- "We're happy with our current solution"
- "Not the right time"`,
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          signals: parsed.signals || [],
          objections: parsed.objections || [],
        };
      }
      return { signals: [], objections: [] };
    } catch (error) {
      console.error('[TelecallerAI] Buying signals detection error:', error);
      return { signals: [], objections: [] };
    }
  }

  /**
   * Process lead lifecycle - create/update lead, schedule follow-ups
   */
  private async processLeadLifecycle(call: any, qualification: Record<string, any>): Promise<void> {
    try {
      const organizationId = call.telecaller?.organizationId;
      if (!organizationId) return;

      // If call has a linked lead, update it
      if (call.leadId) {
        await this.updateExistingLead(call, qualification);
      } else {
        // Try to find existing lead by phone or create new one
        const existingLead = await prisma.lead.findFirst({
          where: {
            organizationId,
            phone: call.phoneNumber,
          },
        });

        if (existingLead) {
          // Link call to existing lead and update
          await prisma.telecallerCall.update({
            where: { id: call.id },
            data: { leadId: existingLead.id },
          });
          call.leadId = existingLead.id;
          await this.updateExistingLead(call, qualification);
        } else if (
          call.outcome === 'INTERESTED' ||
          call.outcome === 'CONVERTED' ||
          call.outcome === 'CALLBACK_REQUESTED'
        ) {
          // Create new lead for interested customers
          await this.createLeadFromCall(call, qualification, organizationId);
        }
      }

      // Schedule follow-up if needed
      await this.scheduleFollowUp(call);
    } catch (error) {
      console.error('[TelecallerAI] Lead lifecycle error:', error);
    }
  }

  /**
   * Update existing lead with call data
   */
  private async updateExistingLead(call: any, qualification: Record<string, any>): Promise<void> {
    if (!call.leadId) return;

    try {
      const lead = await prisma.lead.findUnique({
        where: { id: call.leadId },
      });

      if (!lead) return;

      // Merge qualification data
      const existingCustomFields = (lead.customFields as object) || {};
      const mergedFields = {
        ...existingCustomFields,
        ...qualification,
        lastTelecallerCall: {
          callId: call.id,
          outcome: call.outcome,
          sentiment: call.sentiment,
          summary: call.summary,
          telecaller: `${call.telecaller?.firstName} ${call.telecaller?.lastName}`,
          timestamp: new Date().toISOString(),
        },
      };

      // Determine stage update based on outcome
      let stageUpdate: { stageId?: string } = {};
      if (call.outcome === 'INTERESTED' || call.outcome === 'CONVERTED' || call.outcome === 'CALLBACK_REQUESTED') {
        // Find appropriate stage for the outcome with multiple fallback options
        const stageSearchTerms = call.outcome === 'CONVERTED'
          ? ['won', 'closed-won', 'converted', 'customer', 'closed']
          : ['qualified', 'hot', 'interested', 'opportunity', 'engaged'];

        const stageId = await this.findStageByTerms(lead.organizationId, stageSearchTerms);
        if (stageId) {
          stageUpdate = { stageId };
        } else {
          console.warn(`[TelecallerFinalization] No matching stage found for outcome ${call.outcome} in org ${lead.organizationId}`);
        }
      }

      // Update lead with stage progression and conversion flag
      await prisma.lead.update({
        where: { id: call.leadId },
        data: {
          customFields: mergedFields,
          lastContactedAt: new Date(),
          totalCalls: { increment: 1 },
          ...(qualification.email && !lead.email && { email: qualification.email }),
          ...stageUpdate,
          // Set conversion flag when outcome is CONVERTED
          ...(call.outcome === 'CONVERTED' && {
            isConverted: true,
            convertedAt: new Date(),
          }),
        },
      });

      // Create stage change activity if stage was updated
      if (stageUpdate.stageId && stageUpdate.stageId !== lead.stageId) {
        await prisma.leadActivity.create({
          data: {
            leadId: call.leadId,
            type: 'STAGE_CHANGED',
            title: `Stage updated based on call outcome: ${call.outcome}`,
            description: `Lead stage automatically updated after telecaller call`,
            userId: call.telecallerId,
            metadata: {
              callId: call.id,
              outcome: call.outcome,
              previousStageId: lead.stageId,
              newStageId: stageUpdate.stageId,
            },
          },
        });
      }

      // Create call log
      await prisma.callLog.create({
        data: {
          organizationId: lead.organizationId,
          leadId: call.leadId,
          callerId: call.telecallerId,
          phoneNumber: call.phoneNumber,
          direction: 'OUTBOUND',
          callType: 'MANUAL',
          status: 'COMPLETED',
          duration: call.duration || 0,
          recordingUrl: call.recordingUrl,
          transcript: call.transcript,
          notes: call.summary,
          startedAt: call.startedAt || call.createdAt,
          endedAt: call.endedAt || new Date(),
        },
      });

      // Create note with AI summary
      if (call.summary) {
        await prisma.leadNote.create({
          data: {
            leadId: call.leadId,
            userId: call.telecallerId,
            content: `**Telecaller Call Summary (AI Generated)**

${call.summary}

**Sentiment:** ${call.sentiment}
**Outcome:** ${call.outcome}
**Telecaller:** ${call.telecaller?.firstName} ${call.telecaller?.lastName}
**Duration:** ${call.duration || 0} seconds`,
            isPinned: call.outcome === 'INTERESTED' || call.outcome === 'CONVERTED',
          },
        });
      }
    } catch (error) {
      console.error('[TelecallerAI] Update lead error:', error);
    }
  }

  /**
   * Create new lead from call
   */
  private async createLeadFromCall(
    call: any,
    qualification: Record<string, any>,
    organizationId: string
  ): Promise<void> {
    try {
      // Find appropriate stage based on outcome with multiple fallback options
      const stageSearchTerms = call.outcome === 'CONVERTED'
        ? ['won', 'closed-won', 'converted', 'customer', 'closed']
        : call.outcome === 'INTERESTED'
          ? ['qualified', 'hot', 'interested', 'opportunity', 'engaged']
          : ['new', 'fresh', 'uncontacted', 'lead'];

      const stageId = await this.findStageByTerms(organizationId, stageSearchTerms);

      if (!stageId) {
        console.warn(`[TelecallerFinalization] No matching stage found for new lead with outcome ${call.outcome} in org ${organizationId}`);
      }

      const lead = await prisma.lead.create({
        data: {
          organizationId,
          firstName: qualification.name?.split(' ')[0] || call.contactName || 'Lead',
          lastName: qualification.name?.split(' ').slice(1).join(' ') || '',
          phone: call.phoneNumber,
          email: qualification.email || null,
          source: 'MANUAL',
          sourceDetails: `Telecaller: ${call.telecaller?.firstName} ${call.telecaller?.lastName}`,
          priority: call.outcome === 'CONVERTED' ? 'HIGH' : call.outcome === 'INTERESTED' ? 'HIGH' : 'MEDIUM',
          customFields: {
            ...qualification,
            createdFromCall: call.id,
            callOutcome: call.outcome,
            callSentiment: call.sentiment,
          },
          totalCalls: 1,
          lastContactedAt: new Date(),
          // Set stage based on outcome
          ...(stageId && { stageId }),
          // Set conversion flag when outcome is CONVERTED
          ...(call.outcome === 'CONVERTED' && {
            isConverted: true,
            convertedAt: new Date(),
          }),
        },
      });

      // Link call to new lead
      await prisma.telecallerCall.update({
        where: { id: call.id },
        data: { leadId: lead.id },
      });

      // Create initial note
      if (call.summary) {
        await prisma.leadNote.create({
          data: {
            leadId: lead.id,
            userId: call.telecallerId,
            content: `**Lead Created from Telecaller Call**

${call.summary}

**Sentiment:** ${call.sentiment}
**Outcome:** ${call.outcome}`,
            isPinned: true,
          },
        });
      }

      // Create activity
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'LEAD_CREATED',
          title: 'Lead Created from Telecaller Call',
          description: `Created from call with outcome: ${call.outcome}`,
          userId: call.telecallerId,
          metadata: {
            callId: call.id,
            outcome: call.outcome,
            sentiment: call.sentiment,
          },
        },
      });

      console.log(`[TelecallerAI] Created new lead ${lead.id} from call ${call.id}`);
    } catch (error) {
      console.error('[TelecallerAI] Create lead error:', error);
    }
  }

  /**
   * Schedule follow-up based on outcome
   */
  private async scheduleFollowUp(call: any): Promise<void> {
    if (!call.leadId || !call.telecallerId) return;

    const needsFollowUp = [
      'INTERESTED',
      'CALLBACK_REQUESTED',
      'NEEDS_FOLLOWUP',
      'BUSY',
      'NO_ANSWER',
      'VOICEMAIL',
    ].includes(call.outcome);

    if (!needsFollowUp) return;

    try {
      // Calculate follow-up date based on outcome
      const scheduledAt = new Date();
      switch (call.outcome) {
        case 'CALLBACK_REQUESTED':
          scheduledAt.setHours(scheduledAt.getHours() + 4);
          break;
        case 'INTERESTED':
          scheduledAt.setDate(scheduledAt.getDate() + 1);
          break;
        case 'BUSY':
          scheduledAt.setHours(scheduledAt.getHours() + 2);
          break;
        case 'NO_ANSWER':
        case 'VOICEMAIL':
          scheduledAt.setHours(scheduledAt.getHours() + 4);
          break;
        default:
          scheduledAt.setDate(scheduledAt.getDate() + 1);
      }

      await prisma.followUp.create({
        data: {
          leadId: call.leadId,
          createdById: call.telecallerId,
          assigneeId: call.telecallerId,
          scheduledAt,
          followUpType: 'HUMAN_CALL',
          status: 'UPCOMING',
          message: this.getFollowUpMessage(call.outcome, call.summary),
          notes: `Auto-scheduled based on call outcome: ${call.outcome}`,
        },
      });

      // Update lead with next follow-up date
      await prisma.lead.update({
        where: { id: call.leadId },
        data: { nextFollowUpAt: scheduledAt },
      });

      console.log(`[TelecallerAI] Scheduled follow-up for lead ${call.leadId}`);
    } catch (error) {
      console.error('[TelecallerAI] Schedule follow-up error:', error);
    }
  }

  /**
   * Get appropriate follow-up message
   */
  private getFollowUpMessage(outcome: string, summary: string | null): string {
    const messages: Record<string, string> = {
      CALLBACK_REQUESTED: 'Customer requested callback - follow up as promised',
      INTERESTED: 'Customer showed interest - continue conversation and close',
      NEEDS_FOLLOWUP: 'Conversation incomplete - continue discussion',
      BUSY: 'Customer was busy - call back at a better time',
      NO_ANSWER: 'No answer - try calling again',
      VOICEMAIL: 'Left voicemail - follow up to confirm receipt',
    };

    let message = messages[outcome] || 'Follow up on previous call';
    if (summary) {
      message += `\n\nPrevious call summary: ${summary}`;
    }
    return message;
  }

  /**
   * Update lead score based on call analysis
   */
  private async updateLeadScore(call: any): Promise<void> {
    if (!call.leadId) return;

    try {
      // Calculate scores based on call data
      const engagementScore = this.calculateEngagementScore(call.duration || 0);
      const sentimentScore = this.calculateSentimentScore(call.sentiment);
      const intentScore = this.calculateIntentScore(call.outcome);
      const qualification = (call.qualification as any) || {};
      const qualificationScore = this.calculateQualificationScore(qualification);

      // Weighted overall score
      const overallScore = Math.round(
        engagementScore * 0.2 +
        qualificationScore * 0.25 +
        sentimentScore * 0.25 +
        intentScore * 0.3
      );

      // Determine grade
      const grade = this.determineGrade(overallScore);

      // Determine priority
      const priority = this.determinePriority(call.outcome, overallScore);

      // Get existing lead score to calculate rolling average for avgCallDuration
      const existingScore = await prisma.leadScore.findUnique({
        where: { leadId: call.leadId },
        select: { callCount: true, avgCallDuration: true },
      });

      const currentDuration = call.duration || 0;
      let newAvgCallDuration: number;

      if (existingScore) {
        // Calculate rolling average: ((oldAvg * oldCount) + newValue) / newCount
        const oldCount = existingScore.callCount || 0;
        const oldAvg = existingScore.avgCallDuration || 0;
        const newCount = oldCount + 1;
        newAvgCallDuration = Math.round(((oldAvg * oldCount) + currentDuration) / newCount);
      } else {
        newAvgCallDuration = currentDuration;
      }

      // Upsert lead score
      await prisma.leadScore.upsert({
        where: { leadId: call.leadId },
        create: {
          leadId: call.leadId,
          overallScore,
          engagementScore,
          qualificationScore,
          sentimentScore,
          intentScore,
          grade,
          priority,
          buyingSignals: qualification.buyingSignals || [],
          objections: qualification.objections || [],
          callCount: 1,
          avgCallDuration: currentDuration,
          lastInteraction: new Date(),
          aiClassification: this.getAIClassification(overallScore),
          classificationConfidence: 0.85,
        },
        update: {
          overallScore,
          engagementScore,
          qualificationScore,
          sentimentScore,
          intentScore,
          grade,
          priority,
          buyingSignals: qualification.buyingSignals || [],
          objections: qualification.objections || [],
          callCount: { increment: 1 },
          avgCallDuration: newAvgCallDuration,
          lastInteraction: new Date(),
          aiClassification: this.getAIClassification(overallScore),
        },
      });

      console.log(`[TelecallerAI] Updated lead score for ${call.leadId}: ${overallScore} (${grade})`);
    } catch (error) {
      console.error('[TelecallerAI] Update lead score error:', error);
    }
  }

  private calculateEngagementScore(duration: number): number {
    if (duration > 300) return 100;
    if (duration > 180) return 80;
    if (duration > 60) return 60;
    if (duration > 30) return 40;
    return 20;
  }

  private calculateSentimentScore(sentiment: string): number {
    switch (sentiment) {
      case 'positive': return 85;
      case 'negative': return 25;
      default: return 50;
    }
  }

  private calculateIntentScore(outcome: string): number {
    const scores: Record<string, number> = {
      CONVERTED: 100,
      INTERESTED: 85,
      CALLBACK_REQUESTED: 70,
      NEEDS_FOLLOWUP: 55,
      BUSY: 40,
      NO_ANSWER: 30,
      VOICEMAIL: 30,
      NOT_INTERESTED: 20,
      WRONG_NUMBER: 10,
      DNC_REQUESTED: 0,
    };
    return scores[outcome] || 50;
  }

  private calculateQualificationScore(qualification: any): number {
    const fields = ['name', 'email', 'company', 'budget', 'timeline', 'requirements'];
    let score = 0;
    fields.forEach(field => {
      if (qualification[field]) score += 15;
    });
    return Math.min(score, 100);
  }

  private determineGrade(score: number): LeadGrade {
    if (score >= 90) return 'A_PLUS';
    if (score >= 75) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 25) return 'D';
    return 'F';
  }

  private determinePriority(outcome: string, score: number): number {
    if (outcome === 'CALLBACK_REQUESTED') return 1;
    if (outcome === 'CONVERTED') return 1;
    if (score >= 80) return 2;
    if (score >= 60) return 3;
    if (score >= 40) return 5;
    return 7;
  }

  private getAIClassification(score: number): string {
    if (score >= 75) return 'hot_lead';
    if (score >= 50) return 'warm_lead';
    if (score >= 25) return 'cold_lead';
    return 'not_qualified';
  }

  /**
   * Log call activity
   */
  private async logCallActivity(call: any): Promise<void> {
    if (!call.leadId) return;

    try {
      await prisma.leadActivity.create({
        data: {
          leadId: call.leadId,
          type: 'CALL_MADE',
          title: 'Telecaller Call Completed (AI Analyzed)',
          description: call.summary || `Call duration: ${call.duration || 0} seconds`,
          userId: call.telecallerId,
          metadata: {
            callId: call.id,
            outcome: call.outcome,
            sentiment: call.sentiment,
            aiAnalyzed: true,
            recordingUrl: call.recordingUrl,
            telecaller: `${call.telecaller?.firstName} ${call.telecaller?.lastName}`,
          },
        },
      });
    } catch (error) {
      console.error('[TelecallerAI] Log activity error:', error);
    }
  }

  /**
   * Update call with error status
   */
  private async updateCallWithError(callId: string, error: string): Promise<void> {
    try {
      await prisma.telecallerCall.update({
        where: { id: callId },
        data: {
          qualification: {
            aiError: error,
            aiAnalyzedAt: new Date().toISOString(),
          },
          aiAnalyzed: false,
        },
      });
    } catch (e) {
      console.error('[TelecallerAI] Error updating call with error:', e);
    }
  }

  /**
   * Process recording for Raw Import Record (Assigned Data workflow)
   *
   * This method handles AI analysis for telecaller calls to raw import records:
   * - Transcribes the recording
   * - Analyzes sentiment and outcome
   * - Auto-updates the raw import record status
   * - Auto-converts to lead if customer is interested
   */
  async processRecordingForRawImport(
    callId: string,
    filePath: string,
    rawImportRecordId: string
  ): Promise<void> {
    console.log(`[TelecallerAI] Processing raw import call ${callId} for record ${rawImportRecordId}`);

    try {
      // Get call and raw import record details with organization's preferred language
      const [call, rawRecord] = await Promise.all([
        prisma.telecallerCall.findUnique({
          where: { id: callId },
          include: {
            telecaller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                organizationId: true,
                organization: {
                  select: { preferredLanguage: true, industry: true }
                }
              },
            },
          },
        }),
        prisma.rawImportRecord.findUnique({
          where: { id: rawImportRecordId },
          include: {
            bulkImport: true,
          },
        }),
      ]);

      if (!call) {
        console.error(`[TelecallerAI] Call ${callId} not found`);
        return;
      }

      if (!rawRecord) {
        console.error(`[TelecallerAI] Raw import record ${rawImportRecordId} not found`);
        return;
      }

      const organizationId = call.telecaller?.organizationId;
      if (!organizationId) {
        console.error(`[TelecallerAI] No organization found for telecaller`);
        return;
      }

      // Get organization's preferred language (default to Telugu)
      const preferredLanguage = call.telecaller?.organization?.preferredLanguage || 'te-IN';
      console.log(`[TelecallerAI] Using preferred language: ${preferredLanguage}`);

      // Step 1: Transcribe the recording (auto-detect language)
      console.log(`[TelecallerAI] Step 1: Transcribing recording...`);
      const transcribed = await this.transcribeRecording(filePath, preferredLanguage);

      if (!transcribed || !transcribed.text) {
        console.error(`[TelecallerAI] Transcription failed for call ${callId}`);
        await this.updateRawImportCallError(callId, rawImportRecordId, 'Transcription failed');
        return;
      }
      const transcript = transcribed.text;
      const detectedLanguage = transcribed.detectedLanguage;
      console.log(`[TelecallerAI] Detected language: ${detectedLanguage}`);

      // Step 1b: English translation of the cleaned native transcript (best-effort)
      const englishTranscript =
        (await this.translateTranscriptToEnglish(transcript, detectedLanguage)) || '';

      // Step 1.5: Validate transcript has meaningful conversation
      const validationResult = this.validateTranscript(transcript, call.duration || 0);
      if (!validationResult.isValid) {
        console.log(`[TelecallerAI] No meaningful conversation detected: ${validationResult.reason}`);

        // Update call with no-conversation defaults
        await prisma.telecallerCall.update({
          where: { id: callId },
          data: {
            transcript: transcript || '',
            sentiment: 'neutral',
            outcome: validationResult.suggestedOutcome,
            summary: validationResult.reason,
            qualification: {
              noConversation: true,
              reason: validationResult.reason,
              aiAnalyzedAt: new Date().toISOString(),
            },
            aiAnalyzed: true,
            status: 'COMPLETED',
          },
        });

        // Update raw import record with no-conversation status
        await prisma.rawImportRecord.update({
          where: { id: rawImportRecordId },
          data: {
            status: 'NO_ANSWER',
            callSummary: validationResult.reason,
            callSentiment: 'neutral',
            lastCallAt: new Date(),
            callAttempts: { increment: 1 },
            customFields: {
              ...(rawRecord.customFields as object || {}),
              lastCallId: callId,
              noConversation: true,
              lastCallOutcome: validationResult.suggestedOutcome,
            },
          },
        });

        console.log(`[TelecallerAI] Raw import call ${callId} marked as ${validationResult.suggestedOutcome} (no conversation)`);
        return;
      }

      // Convert string transcript to message array format for AI analysis.
      // Try GPT diarization first so we get a real two-sided conversation
      // even when Sarvam/Whisper return an unlabeled blob.
      const transcriptMessages = await this.buildTranscriptMessages(transcript, detectedLanguage);

      // Step 2: Run enhanced AI analysis (sentiment, outcome, summary, key questions, issues)
      console.log(`[TelecallerAI] Step 2: Running enhanced AI analysis...`);
      const enhancedAnalysis: EnhancedCallAnalysisResult = await analyzeCallEnhanced(
        transcriptMessages,
        [], // mood history
        'neutral',
        call.duration || 0,
        detectedLanguage
      );
      console.log(`[TelecallerAI] Enhanced analysis complete:`, {
        callQualityScore: enhancedAnalysis.callQualityScore,
        sentiment: enhancedAnalysis.sentiment,
        outcome: enhancedAnalysis.outcome,
        keyQuestionsCount: enhancedAnalysis.keyQuestionsAsked.length,
        keyIssuesCount: enhancedAnalysis.keyIssuesDiscussed.length,
      });

      // Step 3: Generate coaching suggestions with error handling
      console.log(`[TelecallerAI] Step 3: Generating coaching suggestions...`);
      let coachingSuggestions: CoachingSuggestions;
      try {
        coachingSuggestions = await generateCoachingSuggestions(
          transcriptMessages,
          enhancedAnalysis.outcome,
          enhancedAnalysis.sentiment,
          enhancedAnalysis.agentSpeakingTime,
          enhancedAnalysis.customerSpeakingTime,
          detectedLanguage
        );
      } catch (coachingError) {
        console.warn(`[TelecallerAI] Coaching suggestions failed, using defaults:`, coachingError);
        coachingSuggestions = {
          positiveHighlights: [],
          areasToImprove: [],
          nextCallTips: [],
          coachingSummary: 'Coaching analysis unavailable',
          talkListenFeedback: '',
          empathyScore: 50,
          objectionHandlingScore: 50,
          closingScore: 50,
        };
      }
      // Ensure all fields have safe defaults to prevent null reference errors
      coachingSuggestions = {
        positiveHighlights: coachingSuggestions?.positiveHighlights || [],
        areasToImprove: coachingSuggestions?.areasToImprove || [],
        nextCallTips: coachingSuggestions?.nextCallTips || [],
        coachingSummary: coachingSuggestions?.coachingSummary || '',
        talkListenFeedback: coachingSuggestions?.talkListenFeedback || '',
        empathyScore: coachingSuggestions?.empathyScore ?? 50,
        objectionHandlingScore: coachingSuggestions?.objectionHandlingScore ?? 50,
        closingScore: coachingSuggestions?.closingScore ?? 50,
      };
      console.log(`[TelecallerAI] Coaching suggestions generated:`, {
        positiveCount: coachingSuggestions.positiveHighlights.length,
        areasCount: coachingSuggestions.areasToImprove.length,
        empathyScore: coachingSuggestions.empathyScore,
      });

      // Step 4: Extract structured call data with error handling
      console.log(`[TelecallerAI] Step 4: Extracting structured call data...`);
      let extractedData: ExtractedCallData;
      // Prefer the English-translated transcript so GPT gets clean English input
      // regardless of the original call language. Fall back to the native transcript
      // if translation failed or produced something trivial.
      const extractionSource =
        englishTranscript && englishTranscript.trim().length > 20
          ? this.parseTranscriptToMessages(englishTranscript)
          : transcriptMessages;
      const industryForExtraction =
        (call.telecaller?.organization?.industry as string | undefined) || 'EDUCATION';
      console.log(
        `[TelecallerAI] Extracting with industry=${industryForExtraction}, source=${
          extractionSource === transcriptMessages ? 'native' : 'english'
        }`
      );
      try {
        extractedData = await extractCallData(extractionSource, industryForExtraction, 'en');
      } catch (extractError) {
        console.warn(`[TelecallerAI] Data extraction failed, using defaults:`, extractError);
        extractedData = { items: [], summary: '' };
      }
      // Ensure safe defaults
      extractedData = {
        items: extractedData?.items || [],
        summary: extractedData?.summary || '',
      };
      console.log(`[TelecallerAI] Extracted ${extractedData.items.length} data items`);

      // Step 5: Additional qualification and buying signals
      console.log(`[TelecallerAI] Step 5: Extracting qualification data...`);
      const qualificationSource =
        englishTranscript && englishTranscript.trim().length > 20 ? englishTranscript : transcript;
      const qualification = await this.extractQualificationData(qualificationSource);

      // Step 6: Detect buying signals and objections
      console.log(`[TelecallerAI] Step 6: Analyzing buying signals...`);
      const buyingSignals = await this.detectBuyingSignals(transcript);

      // Use enhanced analysis values
      const sentiment = enhancedAnalysis.sentiment;
      const outcome = enhancedAnalysis.outcome as CallOutcome;
      const summary = enhancedAnalysis.summary;
      const callQualityScore = enhancedAnalysis.callQualityScore;
      console.log(`[TelecallerAI] Call quality score: ${callQualityScore}`);

      // Map CallOutcome to RawImportRecord status
      const rawImportStatus = this.mapOutcomeToRawImportStatus(outcome);

      // Step 7: Update the telecaller call with enhanced analysis
      const telecallerOutcome = mapToTelecallerOutcome(outcome);
      await prisma.telecallerCall.update({
        where: { id: callId },
        data: {
          transcript,
          sentiment,
          outcome: telecallerOutcome,
          summary,
          callQualityScore,
          // Enhanced analysis fields
          keyQuestionsAsked: enhancedAnalysis.keyQuestionsAsked,
          keyIssuesDiscussed: enhancedAnalysis.keyIssuesDiscussed,
          sentimentIntensity: enhancedAnalysis.sentimentIntensity,
          agentSpeakingTime: enhancedAnalysis.agentSpeakingTime,
          customerSpeakingTime: enhancedAnalysis.customerSpeakingTime,
          nonSpeechTime: enhancedAnalysis.nonSpeechTime,
          enhancedTranscript: enhancedAnalysis.enhancedTranscript as any,
          // Coaching fields
          coachingPositiveHighlights: coachingSuggestions.positiveHighlights as any,
          coachingAreasToImprove: coachingSuggestions.areasToImprove as any,
          coachingNextCallTips: coachingSuggestions.nextCallTips,
          coachingSummary: coachingSuggestions.coachingSummary,
          coachingTalkListenFeedback: coachingSuggestions.talkListenFeedback,
          coachingEmpathyScore: coachingSuggestions.empathyScore,
          coachingObjectionScore: coachingSuggestions.objectionHandlingScore,
          coachingClosingScore: coachingSuggestions.closingScore,
          // Extracted data
          extractedData: extractedData as any,
          qualification: {
            ...qualification,
            buyingSignals: buyingSignals.signals,
            objections: buyingSignals.objections,
            rawImportRecordId,
            aiAnalyzedAt: new Date().toISOString(),
          },
          aiAnalyzed: true,
          status: 'COMPLETED',
        },
      });

      // Step 8: Update the raw import record status
      console.log(`[TelecallerAI] Step 8: Updating raw import record status to ${rawImportStatus}...`);
      await prisma.rawImportRecord.update({
        where: { id: rawImportRecordId },
        data: {
          status: rawImportStatus,
          callSummary: summary,
          callSentiment: sentiment,
          interestLevel: outcome === 'INTERESTED' || outcome === 'CONVERTED' ? 'high' :
                         outcome === 'CALLBACK_REQUESTED' ? 'medium' : 'low',
          lastCallAt: new Date(),
          customFields: {
            ...(rawRecord.customFields as object || {}),
            lastCallId: callId,
            lastCallOutcome: outcome,
            aiAnalyzed: true,
            aiAnalyzedAt: new Date().toISOString(),
            buyingSignals: buyingSignals.signals,
            objections: buyingSignals.objections,
            qualificationData: qualification,
          },
        },
      });

      // Step 9: Auto-convert to lead if INTERESTED or CONVERTED
      if (outcome === 'INTERESTED' || outcome === 'CONVERTED' || outcome === 'CALLBACK_REQUESTED') {
        console.log(`[TelecallerAI] Step 9: Auto-converting to lead (outcome: ${outcome})...`);
        await this.autoConvertRawImportToLead(
          rawRecord,
          call,
          qualification,
          organizationId,
          outcome,
          sentiment,
          summary
        );
      }

      console.log(`[TelecallerAI] Raw import AI analysis completed for call ${callId}`);
      console.log(`[TelecallerAI] Results: Outcome=${outcome}, Sentiment=${sentiment}, Status=${rawImportStatus}`);
    } catch (error) {
      console.error(`[TelecallerAI] Error processing raw import call ${callId}:`, error);
      await this.updateRawImportCallError(callId, rawImportRecordId, (error as Error).message);
    }
  }

  /**
   * Map CallOutcome to RawImportRecord status
   */
  private mapOutcomeToRawImportStatus(outcome: CallOutcome): string {
    const mapping: Record<string, string> = {
      INTERESTED: 'INTERESTED',
      NOT_INTERESTED: 'NOT_INTERESTED',
      CALLBACK_REQUESTED: 'CALLBACK_REQUESTED',
      NEEDS_FOLLOWUP: 'CALLBACK_REQUESTED',
      CONVERTED: 'INTERESTED', // Will be converted to lead
      NO_ANSWER: 'NO_ANSWER',
      BUSY: 'CALLBACK_REQUESTED',
      VOICEMAIL: 'NO_ANSWER',
      WRONG_NUMBER: 'NOT_INTERESTED',
      DNC_REQUESTED: 'NOT_INTERESTED',
    };
    // Default to CALLBACK_REQUESTED (a valid end state) instead of CALLING
    return mapping[outcome] || 'CALLBACK_REQUESTED';
  }

  /**
   * Auto-convert raw import record to lead
   */
  private async autoConvertRawImportToLead(
    rawRecord: any,
    call: any,
    qualification: Record<string, any>,
    organizationId: string,
    outcome: string,
    sentiment: string,
    summary: string
  ): Promise<void> {
    try {
      // Extract data from raw record - use direct fields and customFields
      const customData = rawRecord.customFields as Record<string, any> || {};

      // Find phone/email from raw record fields or qualification
      const phone = rawRecord.phone || qualification.phone || call.phoneNumber;
      const email = rawRecord.email || qualification.email;
      const name = qualification.name || `${rawRecord.firstName || ''} ${rawRecord.lastName || ''}`.trim();
      const firstName = rawRecord.firstName || name.split(' ')[0] || 'Lead';
      const lastName = rawRecord.lastName || name.split(' ').slice(1).join(' ') || '';

      // Check if lead with this phone already exists
      const existingLead = await prisma.lead.findFirst({
        where: {
          organizationId,
          phone,
        },
      });

      if (existingLead) {
        console.log(`[TelecallerAI] Lead already exists for phone ${phone}, updating...`);

        // Update existing lead
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            lastContactedAt: new Date(),
            totalCalls: { increment: 1 },
            customFields: {
              ...(existingLead.customFields as object || {}),
              ...qualification,
              rawImportRecordId: rawRecord.id,
              lastCallOutcome: outcome,
              lastCallSentiment: sentiment,
            },
          },
        });

        // Link call to lead
        await prisma.telecallerCall.update({
          where: { id: call.id },
          data: { leadId: existingLead.id },
        });

        // Mark raw import record as converted
        await prisma.rawImportRecord.update({
          where: { id: rawRecord.id },
          data: {
            status: 'CONVERTED',
            convertedLeadId: existingLead.id,
          },
        });

        return;
      }

      // Create new lead - goes to UNASSIGNED POOL for manager to assign
      const lead = await prisma.lead.create({
        data: {
          organizationId,
          firstName,
          lastName,
          phone,
          email,
          alternatePhone: rawRecord.alternatePhone || null,
          source: rawRecord.bulkImport?.source || 'BULK_UPLOAD',
          sourceDetails: `Qualified by Telecaller: ${call.telecaller?.firstName} ${call.telecaller?.lastName}`,
          priority: outcome === 'CONVERTED' ? 'HIGH' : (outcome === 'INTERESTED' ? 'HIGH' : 'MEDIUM'),
          status: 'NEW', // New lead waiting for counselor assignment
          customFields: {
            ...customData,
            ...qualification,
            rawImportRecordId: rawRecord.id,
            convertedAt: new Date().toISOString(),
            qualifiedBy: call.telecallerId,
            qualifiedByName: `${call.telecaller?.firstName} ${call.telecaller?.lastName}`,
            conversionOutcome: outcome,
            conversionSentiment: sentiment,
            callSummary: summary,
            // Flag for manager to see this needs assignment
            needsAssignment: true,
          },
          totalCalls: 1,
          lastContactedAt: new Date(),
        },
      });

      // Link call to new lead
      await prisma.telecallerCall.update({
        where: { id: call.id },
        data: { leadId: lead.id },
      });

      // DO NOT assign to telecaller - leave unassigned for manager to assign to counselor
      // Manager will see this in "Unassigned Leads" and assign to appropriate counselor

      // Create initial note with AI summary - helps counselor understand context
      if (summary) {
        await prisma.leadNote.create({
          data: {
            leadId: lead.id,
            userId: call.telecallerId,
            content: `**Lead Qualified by Telecaller - Waiting for Counselor Assignment**

**Call Summary:**
${summary}

**Customer Sentiment:** ${sentiment}
**Outcome:** ${outcome}
**Qualified by:** ${call.telecaller?.firstName} ${call.telecaller?.lastName}
**Call Date:** ${new Date().toLocaleDateString()}

⚠️ **Action Required:** Manager needs to assign this lead to a counselor for follow-up.`,
            isPinned: true,
          },
        });
      }

      // Create activity
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'LEAD_CREATED',
          title: 'Lead Qualified - Pending Counselor Assignment',
          description: `Telecaller ${call.telecaller?.firstName} qualified this lead. AI detected ${outcome} outcome with ${sentiment} sentiment. Waiting for manager to assign to counselor.`,
          userId: call.telecallerId,
          metadata: {
            callId: call.id,
            rawImportRecordId: rawRecord.id,
            outcome,
            sentiment,
            aiConverted: true,
            qualifiedBy: call.telecallerId,
            needsAssignment: true,
          },
        },
      });

      // Mark raw import record as converted
      await prisma.rawImportRecord.update({
        where: { id: rawRecord.id },
        data: {
          status: 'CONVERTED',
          convertedLeadId: lead.id,
          convertedById: call.telecallerId,
          convertedAt: new Date(),
        },
      });

      // Create a follow-up reminder for managers to assign this lead
      // Schedule for 2 hours from now to give manager time to see new leads
      const followUpDate = new Date();
      followUpDate.setHours(followUpDate.getHours() + 2);

      await prisma.followUp.create({
        data: {
          leadId: lead.id,
          organizationId,
          scheduledFor: followUpDate,
          type: 'TASK',
          title: `🔔 New Qualified Lead - Needs Assignment: ${firstName} ${lastName}`,
          description: `Lead qualified by telecaller ${call.telecaller?.firstName} ${call.telecaller?.lastName}.
Outcome: ${outcome} | Sentiment: ${sentiment}

Please assign this lead to a counselor for follow-up.`,
          priority: outcome === 'CONVERTED' || outcome === 'INTERESTED' ? 'HIGH' : 'MEDIUM',
          status: 'PENDING',
          // No assignedToId - will show in manager's unassigned follow-ups
          metadata: {
            needsAssignment: true,
            qualifiedBy: call.telecallerId,
            callId: call.id,
            rawImportRecordId: rawRecord.id,
          },
        },
      });

      // Create notification for organization admins/managers
      const managers = await prisma.user.findMany({
        where: {
          organizationId,
          role: { in: ['ADMIN', 'MANAGER'] },
          isActive: true,
        },
        select: { id: true },
      });

      // Create notifications for each manager
      for (const manager of managers) {
        await prisma.notification.create({
          data: {
            userId: manager.id,
            type: 'LEAD_QUALIFIED',
            title: 'New Qualified Lead Needs Assignment',
            message: `Telecaller ${call.telecaller?.firstName} qualified lead "${firstName} ${lastName}". Please assign to a counselor.`,
            data: {
              leadId: lead.id,
              callId: call.id,
              outcome,
              sentiment,
            },
          },
        });
      }

      console.log(`[TelecallerAI] Created lead ${lead.id} from raw import ${rawRecord.id} - notified ${managers.length} managers`);
    } catch (error) {
      console.error(`[TelecallerAI] Auto-convert to lead error:`, error);
      // Log the error to database for tracking
      try {
        await prisma.leadActivity.create({
          data: {
            leadId: call.leadId || undefined,
            type: 'ERROR',
            title: 'Auto-conversion failed',
            description: `Failed to auto-convert raw import to lead: ${(error as Error).message}`,
            userId: call.telecallerId,
            metadata: {
              callId: call.id,
              rawImportRecordId: rawRecord.id,
              error: (error as Error).message,
            },
          },
        });
      } catch (logError) {
        console.error('[TelecallerAI] Failed to log auto-convert error:', logError);
      }
    }
  }

  /**
   * Update call and raw import record with error
   */
  private async updateRawImportCallError(
    callId: string,
    rawImportRecordId: string,
    error: string
  ): Promise<void> {
    try {
      // Get current customFields first
      const record = await prisma.rawImportRecord.findUnique({
        where: { id: rawImportRecordId },
        select: { customFields: true },
      });

      await Promise.all([
        prisma.telecallerCall.update({
          where: { id: callId },
          data: {
            qualification: {
              aiError: error,
              aiAnalyzedAt: new Date().toISOString(),
            },
            aiAnalyzed: false,
          },
        }),
        prisma.rawImportRecord.update({
          where: { id: rawImportRecordId },
          data: {
            customFields: {
              ...(record?.customFields as object || {}),
              aiError: error,
              aiAnalyzedAt: new Date().toISOString(),
            },
          },
        }),
      ]);
    } catch (e) {
      console.error('[TelecallerAI] Error updating raw import call with error:', e);
    }
  }
}

export const telecallerCallFinalizationService = new TelecallerCallFinalizationService();
export default telecallerCallFinalizationService;
