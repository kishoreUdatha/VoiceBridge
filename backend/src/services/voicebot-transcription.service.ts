/**
 * Voicebot Transcription Service - Single Responsibility Principle
 * Handles speech-to-text using Sarvam (Indian languages) and OpenAI Whisper
 */

import OpenAI from 'openai';
import { sarvamService, SARVAM_LANGUAGES } from '../integrations/sarvam.service';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// TTS provider configuration
const TTS_PROVIDER = process.env.TTS_PROVIDER || process.env.VOICE_PROVIDER || 'auto';
const USE_SARVAM = TTS_PROVIDER === 'sarvam' || (TTS_PROVIDER === 'auto' && sarvamService.isAvailable());

// Language code normalization map
const LANG_CODE_MAP: Record<string, string> = {
  'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN', 'kn': 'kn-IN',
  'ml': 'ml-IN', 'mr': 'mr-IN', 'bn': 'bn-IN', 'gu': 'gu-IN',
  'pa': 'pa-IN', 'en': 'en-IN', 'od': 'od-IN', 'as': 'as-IN',
};

/**
 * Normalize language code to full format (e.g., 'te' -> 'te-IN')
 */
export function normalizeLanguageCode(lang?: string): string {
  if (!lang) return '';
  if (lang.includes('-')) return lang;
  return LANG_CODE_MAP[lang.toLowerCase()] || lang;
}

/**
 * Check if language is an Indian regional language
 */
export function isIndianLanguage(language?: string): boolean {
  if (!language) return false;
  const normalizedLang = normalizeLanguageCode(language);
  return Object.keys(SARVAM_LANGUAGES).some(
    lang => normalizedLang.startsWith(lang.split('-')[0]) || normalizedLang === lang
  );
}

/**
 * Transcribe audio using Sarvam (for Indian languages) or OpenAI Whisper
 * Supports multiple Indian languages: Hindi, Telugu, Tamil, Kannada, Malayalam, etc.
 */
export async function transcribeAudio(wavBuffer: Buffer, language?: string): Promise<string> {
  const normalizedLang = language ? normalizeLanguageCode(language) : undefined;
  const isIndian = normalizedLang && isIndianLanguage(normalizedLang);

  // Use Sarvam for Indian languages when available
  if ((USE_SARVAM || isIndian) && sarvamService.isAvailable()) {
    try {
      console.log(`[Transcription] Using Sarvam STT for language: ${normalizedLang || 'auto-detect'}`);
      const result = await sarvamService.speechToText(wavBuffer, 8000, normalizedLang);
      console.log(`[Transcription] Sarvam transcribed: "${result.text}" (detected: ${result.detectedLanguage})`);
      return result.text || '';
    } catch (error) {
      console.error('[Transcription] Sarvam STT error, falling back to OpenAI:', error);
      // Fall through to OpenAI
    }
  }

  // Fallback to OpenAI Whisper
  return transcribeWithWhisper(wavBuffer, language);
}

/**
 * Transcribe audio using OpenAI Whisper
 */
async function transcribeWithWhisper(wavBuffer: Buffer, language?: string): Promise<string> {
  if (!openai) {
    console.error('[Transcription] OpenAI not configured');
    return '';
  }

  try {
    // Convert Buffer to Uint8Array for File constructor compatibility
    const audioFile = new File([new Uint8Array(wavBuffer)], 'audio.wav', { type: 'audio/wav' });

    const transcriptionOptions: any = {
      file: audioFile,
      model: process.env.OPENAI_STT_MODEL || 'whisper-1',
    };

    // Map language codes to Whisper-supported codes
    // Only Hindi, Bengali, Gujarati, Marathi, Tamil, and English are well-supported
    // For other languages (Telugu, Kannada, Malayalam), let Whisper auto-detect
    if (language) {
      const langMap: Record<string, string | undefined> = {
        'hi': 'hi', 'hi-IN': 'hi', // Hindi - supported
        'bn': 'bn', 'bn-IN': 'bn', // Bengali - supported
        'gu': 'gu', 'gu-IN': 'gu', // Gujarati - supported
        'mr': 'mr', 'mr-IN': 'mr', // Marathi - supported
        'ta': 'ta', 'ta-IN': 'ta', // Tamil - supported
        'pa': 'pa', 'pa-IN': 'pa', // Punjabi - supported
        'en': 'en', 'en-IN': 'en', // English - supported
        // Telugu, Kannada, Malayalam - NOT supported, use auto-detect
        'te': undefined, 'te-IN': undefined,
        'kn': undefined, 'kn-IN': undefined,
        'ml': undefined, 'ml-IN': undefined,
      };
      const mappedLang = langMap[language];
      if (mappedLang !== undefined) {
        transcriptionOptions.language = mappedLang;
      }
    }

    const response = await openai.audio.transcriptions.create(transcriptionOptions);
    console.log(`[Transcription] OpenAI transcribed (${language || 'auto'}): "${response.text}"`);

    return response.text || '';
  } catch (error) {
    console.error('[Transcription] Whisper error:', error);
    return '';
  }
}

/**
 * Detect language from audio content
 */
export async function detectLanguageFromAudio(wavBuffer: Buffer): Promise<string | null> {
  if (sarvamService.isAvailable()) {
    try {
      const result = await sarvamService.speechToText(wavBuffer, 8000);
      return result.detectedLanguage || null;
    } catch (error) {
      console.error('[Transcription] Language detection error:', error);
    }
  }
  return null;
}

export const voicebotTranscriptionService = {
  transcribeAudio,
  normalizeLanguageCode,
  isIndianLanguage,
  detectLanguageFromAudio,
};

export default voicebotTranscriptionService;
