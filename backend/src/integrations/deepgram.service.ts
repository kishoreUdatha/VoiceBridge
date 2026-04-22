/**
 * Deepgram Integration Service
 *
 * Provides speech-to-text with speaker diarization for telecaller calls.
 * Deepgram can identify different speakers in the audio and label them.
 *
 * Free tier: 12,500 minutes/month
 * Get API key at: https://console.deepgram.com/
 */

// Use require for Deepgram SDK to avoid ESM/CJS module resolution issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const deepgramSdk = require('@deepgram/sdk');
const createClient = deepgramSdk.createClient;
import fs from 'fs';
import path from 'path';

type DeepgramClientType = ReturnType<typeof createClient>;

interface DiarizedSegment {
  speaker: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

interface DiarizedTranscript {
  segments: DiarizedSegment[];
  fullText: string;
  speakers: number[];
  detectedLanguage: string;
}

interface TranscriptMessage {
  role: 'assistant' | 'user';
  content: string;
  startTimeSeconds: number;
}

class DeepgramService {
  private client: DeepgramClientType | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (apiKey) {
      this.client = createClient(apiKey);
      this.isConfigured = true;
      console.log('[Deepgram] Service initialized successfully');
    } else {
      console.log('[Deepgram] API key not configured - speaker diarization unavailable');
      console.log('[Deepgram] Get free API key at: https://console.deepgram.com/');
    }
  }

  /**
   * Check if Deepgram is available
   */
  isAvailable(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Transcribe audio file with speaker diarization
   * Returns transcript with speakers labeled (Speaker 0, Speaker 1, etc.)
   */
  async transcribeWithDiarization(
    filePath: string,
    language: string = 'te'
  ): Promise<DiarizedTranscript | null> {
    if (!this.client) {
      console.warn('[Deepgram] Client not initialized');
      return null;
    }

    try {
      console.log(`[Deepgram] Transcribing with diarization: ${filePath}`);

      // Read audio file
      const audioBuffer = fs.readFileSync(filePath);

      // Determine MIME type
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.m4a': 'audio/m4a',
        '.mp3': 'audio/mp3',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.webm': 'audio/webm',
        '.flac': 'audio/flac',
      };
      const mimetype = mimeTypes[ext] || 'audio/mp3';

      // Map language code to Deepgram format
      const languageMap: Record<string, string> = {
        'te': 'te',      // Telugu
        'te-IN': 'te',
        'hi': 'hi',      // Hindi
        'hi-IN': 'hi',
        'ta': 'ta',      // Tamil
        'ta-IN': 'ta',
        'kn': 'kn',      // Kannada
        'kn-IN': 'kn',
        'ml': 'ml',      // Malayalam
        'ml-IN': 'ml',
        'en': 'en',      // English
        'en-IN': 'en-IN',
        'en-US': 'en-US',
      };
      const dgLanguage = languageMap[language] || 'te';

      // Call Deepgram with diarization enabled
      // Use nova-3 for Indian languages (te, hi, ta, kn, ml), nova-2 for others
      const indianLanguages = ['te', 'hi', 'ta', 'kn', 'ml'];
      const model = indianLanguages.includes(dgLanguage) ? 'nova-3' : 'nova-2';
      console.log(`[Deepgram] Using model: ${model} for language: ${dgLanguage}`);

      const response = await this.client.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model,
          language: dgLanguage,
          smart_format: true,
          diarize: true,           // Enable speaker diarization
          punctuate: true,
          utterances: true,        // Get utterance-level data with speakers
          mimetype,
        }
      );

      // v3 SDK returns { result } directly
      const result = (response as any).result || response;

      if (!result?.results?.utterances) {
        console.warn('[Deepgram] No utterances in response');
        console.log('[Deepgram] Response structure:', JSON.stringify(result, null, 2).substring(0, 500));
        return null;
      }

      // Process utterances into segments with speaker labels
      const segments: DiarizedSegment[] = result.results.utterances.map((utterance: any) => ({
        speaker: utterance.speaker ?? 0,
        text: utterance.transcript || '',
        start: utterance.start || 0,
        end: utterance.end || 0,
        confidence: utterance.confidence || 0,
      }));

      // Get unique speakers
      const speakers = [...new Set(segments.map(s => s.speaker))].sort();

      // Build full text with speaker labels
      const fullText = segments
        .map(s => `Speaker ${s.speaker}: ${s.text}`)
        .join('\n');

      // Detect language from response
      const detectedLanguage = result.results.channels?.[0]?.detected_language || dgLanguage;

      console.log(`[Deepgram] Transcription complete: ${segments.length} segments, ${speakers.length} speakers`);
      console.log(`[Deepgram] Detected language: ${detectedLanguage}`);

      return {
        segments,
        fullText,
        speakers,
        detectedLanguage,
      };
    } catch (error: any) {
      console.error('[Deepgram] Transcription failed:', error?.message || error);
      return null;
    }
  }

  /**
   * Convert diarized transcript to message array format
   * Maps the agent speaker → assistant, other speaker → user
   *
   * Heuristics for speaker assignment (outbound calls):
   * 1. Semantic detection: Look for agent intro phrases ("calling from", "Good morning", etc.)
   * 2. Position fallback: Customer answers first, Agent speaks second
   */
  convertToMessages(diarized: DiarizedTranscript): TranscriptMessage[] {
    if (!diarized || !diarized.segments || diarized.segments.length === 0) {
      return [];
    }

    // Agent intro phrases (case-insensitive) - works for English, Hindi, Telugu
    const agentPhrases = [
      'calling from', 'call from', 'this is', 'i am calling', 'my name is',
      'good morning', 'good afternoon', 'good evening', 'namaste', 'namaskar',
      'speaking from', 'from career', 'from myleadx', 'abroad education',
      'interested in', 'are you looking', 'would you like', 'can i speak',
      // Telugu phrases
      'నా పేరు', 'నేను', 'మీకు', 'చెప్పాలనుకుంటున్నాను',
      // Hindi phrases
      'मेरा नाम', 'मैं बात कर रहा', 'क्या आप'
    ];

    // Try to identify agent by intro phrases (semantic detection)
    let agentSpeaker: number | null = null;
    for (const seg of diarized.segments) {
      const textLower = seg.text.toLowerCase();
      const hasAgentPhrase = agentPhrases.some(phrase => textLower.includes(phrase.toLowerCase()));
      if (hasAgentPhrase) {
        agentSpeaker = seg.speaker;
        console.log(`[Deepgram] Agent identified by phrase: "${seg.text.substring(0, 50)}..." → Speaker ${agentSpeaker}`);
        break;
      }
    }

    // Fallback: For outbound calls, first speaker = customer, second = agent
    if (agentSpeaker === null) {
      const firstSpeaker = diarized.segments[0]?.speaker ?? 0;
      const uniqueSpeakers = [...new Set(diarized.segments.map(s => s.speaker))];

      if (uniqueSpeakers.length >= 2) {
        // Second speaker is agent (customer answers first in outbound calls)
        agentSpeaker = diarized.segments.find(s => s.speaker !== firstSpeaker)?.speaker ?? firstSpeaker;
        console.log(`[Deepgram] Agent fallback (second speaker): ${agentSpeaker}, First speaker (customer): ${firstSpeaker}`);
      } else {
        // Only 1 speaker - default to speaker 0 as agent
        agentSpeaker = firstSpeaker;
        console.log(`[Deepgram] Single speaker detected, defaulting to agent: ${agentSpeaker}`);
      }
    }

    // Count words per speaker for logging
    const wordCounts: Record<number, number> = {};
    for (const seg of diarized.segments) {
      const words = seg.text.split(/\s+/).length;
      wordCounts[seg.speaker] = (wordCounts[seg.speaker] || 0) + words;
    }
    console.log(`[Deepgram] Final speaker assignment - Agent: Speaker ${agentSpeaker}, Word counts:`, wordCounts);

    // Convert segments to messages with timestamps
    const messages: TranscriptMessage[] = diarized.segments.map(seg => ({
      role: seg.speaker === agentSpeaker ? 'assistant' : 'user',
      content: seg.text.trim(),
      startTimeSeconds: Math.round(seg.start),
    }));

    // Merge consecutive messages from same speaker, keeping first timestamp
    const merged: TranscriptMessage[] = [];
    for (const msg of messages) {
      const last = merged[merged.length - 1];
      if (last && last.role === msg.role) {
        // Merge with previous, keep original timestamp
        last.content += ' ' + msg.content;
      } else {
        merged.push({ ...msg });
      }
    }

    return merged;
  }

  /**
   * Get labeled transcript string (Agent:/Customer: format)
   */
  getLabeledTranscript(diarized: DiarizedTranscript): string {
    const messages = this.convertToMessages(diarized);
    return messages
      .map(m => `${m.role === 'assistant' ? 'Agent' : 'Customer'}: ${m.content}`)
      .join('\n');
  }
}

// Export singleton instance
export const deepgramService = new DeepgramService();
export { DiarizedTranscript, DiarizedSegment, TranscriptMessage };
