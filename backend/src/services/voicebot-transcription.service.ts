/**
 * Voicebot Transcription Service - Single Responsibility Principle
 *
 * SIMPLIFIED STT CONFIGURATION:
 * - Indian languages: Sarvam AI (best accuracy for Indian accents)
 * - English/Other: OpenAI Whisper (reliable, universal fallback)
 */

import OpenAI from 'openai';
import { sarvamService, SARVAM_LANGUAGES } from '../integrations/sarvam.service';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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
  // Check Sarvam supported languages
  return Object.keys(SARVAM_LANGUAGES).some(
    lang => normalizedLang.startsWith(lang.split('-')[0]) || normalizedLang === lang
  );
}

/**
 * Transcribe audio using Sarvam (Indian languages) or OpenAI Whisper
 * Supports multiple Indian languages: Hindi, Telugu, Tamil, Kannada, Malayalam, etc.
 *
 * SIMPLIFIED PROVIDER SELECTION:
 * 1. Indian languages -> Sarvam AI (best accuracy for Indian accents)
 * 2. English/Other -> OpenAI Whisper (reliable, universal)
 *
 * Fallback: Always OpenAI Whisper if Sarvam fails
 */
export async function transcribeAudio(wavBuffer: Buffer, language?: string): Promise<string> {
  const normalizedLang = language ? normalizeLanguageCode(language) : undefined;
  const isIndian = normalizedLang && isIndianLanguage(normalizedLang);

  // ========================================
  // PRIORITY 1: Indian Languages -> Sarvam AI
  // ========================================
  if (isIndian && sarvamService.isAvailable()) {
    try {
      console.log(`[STT] Using Sarvam AI (Indian language): ${normalizedLang || 'auto-detect'}`);
      const result = await sarvamService.speechToText(wavBuffer, 8000, normalizedLang);
      console.log(`[STT] Sarvam transcribed: "${result.text}" (detected: ${result.detectedLanguage})`);
      return result.text || '';
    } catch (error) {
      console.error('[STT] Sarvam failed, falling back to OpenAI Whisper:', error);
    }
  }

  // ========================================
  // FALLBACK: OpenAI Whisper (English & all fallbacks)
  // ========================================
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
 * Detect language from audio content using Sarvam
 */
export async function detectLanguageFromAudio(wavBuffer: Buffer): Promise<string | null> {
  if (sarvamService.isAvailable()) {
    try {
      const result = await sarvamService.speechToText(wavBuffer, 8000);
      return result.detectedLanguage || null;
    } catch (error) {
      console.error('[STT] Language detection error:', error);
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
