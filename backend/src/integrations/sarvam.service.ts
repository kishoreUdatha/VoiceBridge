/**
 * Sarvam AI Integration Service
 *
 * Provides Speech-to-Text (Saarika/Saaras) and Text-to-Speech (Bulbul)
 * optimized for Indian languages.
 *
 * Documentation: https://docs.sarvam.ai/api-reference-docs/
 */

import axios from 'axios';
import FormData from 'form-data';
import { circuitBreakers, CircuitBreakerError } from '../utils/circuitBreaker';
import { API_ENDPOINTS, TIMEOUTS, VOICE_AI } from '../utils/constants';

// Sarvam API Configuration
const SARVAM_API_KEY = process.env.SARVAM_API_KEY || '';
const SARVAM_BASE_URL = API_ENDPOINTS.SARVAM;

// Supported languages
export const SARVAM_LANGUAGES = {
  'hi-IN': 'Hindi',
  'te-IN': 'Telugu',
  'ta-IN': 'Tamil',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'mr-IN': 'Marathi',
  'bn-IN': 'Bengali',
  'gu-IN': 'Gujarati',
  'pa-IN': 'Punjabi',
  'od-IN': 'Odia',
  'en-IN': 'English (Indian)',
  'as-IN': 'Assamese',
};

// Available TTS voices
export const SARVAM_VOICES = {
  male: ['aditya', 'rahul', 'rohan', 'amit', 'dev', 'ratan', 'varun', 'manan', 'sumit', 'kabir', 'aayan', 'shubh', 'ashutosh', 'advait'],
  female: ['ritu', 'priya', 'neha', 'pooja', 'simran', 'kavya', 'ishita', 'shreya', 'roopa', 'amelia', 'sophia'],
};

interface SarvamSTTResponse {
  transcript: string;
  language_code?: string;
  confidence?: number;
}

interface SarvamTTSResponse {
  audio_content: string; // Base64 encoded audio
  sample_rate?: number;
}

class SarvamService {
  private apiKey: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = SARVAM_API_KEY;
    this.isConfigured = !!this.apiKey;

    if (!this.isConfigured) {
      console.warn('[Sarvam] API key not configured. Set SARVAM_API_KEY environment variable.');
    } else {
      console.log('[Sarvam] Service initialized successfully');
    }
  }

  /**
   * Check if Sarvam is configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Speech-to-Text using Saaras v3 model
   * Supports auto language detection and Indian accents
   *
   * @param audioBuffer - PCM audio buffer (8kHz or 16kHz, 16-bit, mono)
   * @param sampleRate - Sample rate of the audio (default: 8000 for telephony)
   * @param language - Language code (optional, auto-detect if not provided)
   */
  async speechToText(
    audioBuffer: Buffer,
    sampleRate: number = 8000,
    language?: string
  ): Promise<{ text: string; detectedLanguage?: string }> {
    if (!this.isConfigured) {
      throw new Error('Sarvam API key not configured');
    }

    try {
      // Create form data with audio file
      const formData = new FormData();

      // Add audio as a file
      formData.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav',
      });

      // Use saaras:v3 for best quality with auto language detection
      formData.append('model', 'saaras:v3');

      // Set mode to transcribe (or translate for translation)
      formData.append('mode', 'transcribe');

      // Specify input codec for PCM
      formData.append('input_audio_codec', 'pcm_s16le');
      formData.append('sample_rate', sampleRate.toString());

      // Optional language hint
      if (language) {
        formData.append('language_code', language);
      }

      const response = await circuitBreakers.sarvam.execute(() =>
        axios.post<SarvamSTTResponse>(
          `${SARVAM_BASE_URL}/speech-to-text`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              'api-subscription-key': this.apiKey,
            },
            timeout: TIMEOUTS.DEFAULT,
          }
        )
      );

      console.log(`[Sarvam STT] Transcribed: "${response.data.transcript}" (lang: ${response.data.language_code})`);

      return {
        text: response.data.transcript || '',
        detectedLanguage: response.data.language_code,
      };
    } catch (error: any) {
      if (error instanceof CircuitBreakerError) {
        console.warn('[Sarvam STT] Circuit breaker OPEN');
        throw new Error('Speech recognition service is temporarily unavailable. Please try again later.');
      }
      console.error('[Sarvam STT] Error:', error.response?.data || error.message);
      throw new Error(`Sarvam STT failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Text-to-Speech using Bulbul v3 model
   * Returns PCM audio optimized for telephony
   *
   * @param text - Text to convert to speech
   * @param voice - Voice name (default: 'priya' for female, 'aditya' for male)
   * @param language - Language code (default: 'hi-IN')
   * @param sampleRate - Output sample rate (default: 8000 for telephony)
   */
  async textToSpeech(
    text: string,
    voice: string = 'priya',
    language: string = 'hi-IN',
    sampleRate: number = 8000
  ): Promise<Buffer> {
    if (!this.isConfigured) {
      throw new Error('Sarvam API key not configured');
    }

    try {
      // Get pace from environment variable
      const pace = parseFloat(process.env.SARVAM_TTS_PACE || '1.10');

      const response = await circuitBreakers.sarvam.execute(() =>
        axios.post<SarvamTTSResponse>(
          `${SARVAM_BASE_URL}/text-to-speech`,
          {
            text: text,
            target_language_code: language,
            speaker: voice,
            model: 'bulbul:v3',
            pace: pace,  // Configurable via SARVAM_TTS_PACE env variable
            sample_rate: sampleRate,  // 8000 for telephony, 22050 for preview
            enable_preprocessing: true,
          },
          {
            headers: {
              'api-subscription-key': this.apiKey,
              'Content-Type': 'application/json',
            },
            timeout: TIMEOUTS.DEFAULT,
          }
        )
      );

      // Decode base64 audio
      const audioBase64 = response.data.audio_content || (response.data as unknown as { audios?: string[] }).audios?.[0];
      if (!audioBase64) {
        throw new Error('No audio content in response');
      }

      const audioBuffer = Buffer.from(audioBase64, 'base64');

      // Log audio format details
      const header = audioBuffer.slice(0, 4).toString('ascii');
      let detectedSampleRate = sampleRate;
      if (header === 'RIFF' && audioBuffer.length > 28) {
        detectedSampleRate = audioBuffer.readUInt32LE(24);
        const bitsPerSample = audioBuffer.readUInt16LE(34);
        const numChannels = audioBuffer.readUInt16LE(22);
        console.log(`[Sarvam TTS] WAV format: ${detectedSampleRate}Hz, ${bitsPerSample}-bit, ${numChannels} channel(s)`);
      } else {
        console.log(`[Sarvam TTS] Non-WAV format, header: "${header}"`);
      }
      console.log(`[Sarvam TTS] Generated ${audioBuffer.length} bytes, requested ${sampleRate}Hz, got ${detectedSampleRate}Hz`);

      return audioBuffer;
    } catch (error: any) {
      if (error instanceof CircuitBreakerError) {
        console.warn('[Sarvam TTS] Circuit breaker OPEN');
        throw new Error('Text-to-speech service is temporarily unavailable. Please try again later.');
      }
      console.error('[Sarvam TTS] Error:', error.response?.data || error.message);
      throw new Error(`Sarvam TTS failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Translate text between Indian languages
   *
   * @param text - Text to translate
   * @param sourceLanguage - Source language code
   * @param targetLanguage - Target language code
   */
  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Sarvam API key not configured');
    }

    try {
      const response = await circuitBreakers.sarvam.execute(() =>
        axios.post(
          `${SARVAM_BASE_URL}/translate`,
          {
            input: text,
            source_language_code: sourceLanguage,
            target_language_code: targetLanguage,
            mode: 'formal',
            model: 'mayura:v1',
            enable_preprocessing: true,
          },
          {
            headers: {
              'api-subscription-key': this.apiKey,
              'Content-Type': 'application/json',
            },
            timeout: TIMEOUTS.MEDIUM,
          }
        )
      );

      return response.data.translated_text || text;
    } catch (error: any) {
      if (error instanceof CircuitBreakerError) {
        console.warn('[Sarvam Translate] Circuit breaker OPEN, returning original text');
      } else {
        console.error('[Sarvam Translate] Error:', error.response?.data || error.message);
      }
      return text; // Return original text on error
    }
  }

  /**
   * Detect language from audio
   *
   * @param audioBuffer - Audio buffer
   * @param sampleRate - Sample rate
   */
  async detectLanguage(audioBuffer: Buffer, sampleRate: number = 8000): Promise<string> {
    try {
      const result = await this.speechToText(audioBuffer, sampleRate);
      return result.detectedLanguage || 'en-IN';
    } catch {
      return 'en-IN'; // Default to English
    }
  }

  /**
   * Get appropriate voice for language
   */
  getVoiceForLanguage(language: string, gender: 'male' | 'female' = 'female'): string {
    const voices = SARVAM_VOICES[gender];

    // Preferred voices by language
    const languageVoices: Record<string, { male: string; female: string }> = {
      'hi-IN': { male: 'aditya', female: 'priya' },
      'te-IN': { male: 'dev', female: 'kavya' },
      'ta-IN': { male: 'rahul', female: 'neha' },
      'kn-IN': { male: 'amit', female: 'pooja' },
      'ml-IN': { male: 'rohan', female: 'simran' },
      'mr-IN': { male: 'varun', female: 'ishita' },
      'bn-IN': { male: 'manan', female: 'shreya' },
      'en-IN': { male: 'kabir', female: 'amelia' },
    };

    return languageVoices[language]?.[gender] || voices[0];
  }
}

// Export singleton instance
export const sarvamService = new SarvamService();
export default sarvamService;
