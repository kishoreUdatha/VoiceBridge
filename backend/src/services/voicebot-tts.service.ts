/**
 * Voicebot TTS (Text-to-Speech) Service - Single Responsibility Principle
 * Handles TTS generation using Sarvam, OpenAI, and ElevenLabs
 */

import * as WebSocket from 'ws';
import OpenAI from 'openai';
import { sarvamService } from '../integrations/sarvam.service';
import { ai4bharatService, AI4BHARAT_LANGUAGES } from '../integrations/ai4bharat.service';
import { resamplePCM, resamplePCMSimple } from './voicebot-audio.service';
import { normalizeLanguageCode } from './voicebot-transcription.service';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// TTS Cache for reducing latency on common phrases
interface TTSCacheEntry {
  buffer: Buffer;
  timestamp: number;
}

const ttsCache = new Map<string, TTSCacheEntry>();
const TTS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const TTS_CACHE_MAX_SIZE = 100; // Max cached items

// Regional Indian languages that need Sarvam (OpenAI doesn't support these)
const REGIONAL_INDIAN_LANGUAGES = [
  'hi-IN', 'te-IN', 'ta-IN', 'kn-IN', 'ml-IN',
  'mr-IN', 'bn-IN', 'gu-IN', 'pa-IN', 'od-IN', 'as-IN'
];

// Voice mapping from Sarvam/custom voices to OpenAI voices
const VOICE_MAPPING: Record<string, string> = {
  // Sarvam voices -> OpenAI equivalents
  'priya': 'nova',
  'kavya': 'shimmer',
  'meera': 'nova',
  'sujata': 'shimmer',
  'dev': 'echo',
  'ravi': 'onyx',
  'arjun': 'echo',
  'vikram': 'onyx',
  // Direct OpenAI voices (pass through)
  'nova': 'nova',
  'shimmer': 'shimmer',
  'echo': 'echo',
  'onyx': 'onyx',
  'fable': 'fable',
  'alloy': 'alloy',
  'ash': 'ash',
  'sage': 'sage',
  'coral': 'coral',
};

/**
 * Get cache key for TTS
 */
function getCacheKey(text: string, language: string, voice: string): string {
  return `v2:${language}:${voice}:${text.substring(0, 100)}`;
}

/**
 * Get cached TTS audio
 */
export function getCachedTTS(text: string, language: string, voice: string): Buffer | null {
  const key = getCacheKey(text, language, voice);
  const cached = ttsCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < TTS_CACHE_TTL) {
    console.log(`[TTS] Cache hit for: "${text.substring(0, 30)}..."`);
    return cached.buffer;
  }
  return null;
}

/**
 * Cache TTS audio
 */
export function setCachedTTS(text: string, language: string, voice: string, buffer: Buffer): void {
  // Only cache short phrases (likely to be repeated)
  if (text.length > 200) return;

  // Evict oldest entries if cache is full
  if (ttsCache.size >= TTS_CACHE_MAX_SIZE) {
    let oldestKey = '';
    let oldestTime = Date.now();
    ttsCache.forEach((v, k) => {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    });
    if (oldestKey) ttsCache.delete(oldestKey);
  }

  const key = getCacheKey(text, language, voice);
  ttsCache.set(key, { buffer, timestamp: Date.now() });
}

/**
 * Check if language is a regional Indian language
 */
export function isRegionalIndianLanguage(language: string): boolean {
  return REGIONAL_INDIAN_LANGUAGES.includes(language);
}

/**
 * Generate TTS using ElevenLabs for custom cloned voices
 * Returns raw PCM audio at 8kHz
 */
export async function generateElevenLabsTTS(text: string, elevenLabsVoiceId: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  console.log(`[TTS] Using ElevenLabs for custom voice: ${elevenLabsVoiceId}`);

  // Request PCM 22050Hz - higher quality for better resampling
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
      output_format: 'pcm_22050', // 22.05kHz 16-bit PCM
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[ElevenLabs] TTS error:', error);
    throw new Error(`ElevenLabs TTS failed: ${response.status}`);
  }

  // Get raw audio buffer - ElevenLabs returns 22.05kHz 16-bit PCM
  const pcmBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`[ElevenLabs] Received ${pcmBuffer.length} bytes PCM at 22050Hz`);

  // Resample from 22050Hz to 8000Hz
  const srcRate = 22050;
  const dstRate = 8000;
  const ratio = srcRate / dstRate;
  const srcSamples = Math.floor(pcmBuffer.length / 2);
  const dstSamples = Math.floor(srcSamples / ratio);
  const pcm8kBuffer = Buffer.alloc(dstSamples * 2);

  for (let i = 0; i < dstSamples; i++) {
    const srcPos = i * ratio;
    const idx = Math.floor(srcPos);
    const frac = srcPos - idx;
    const s1 = idx * 2 < pcmBuffer.length - 1 ? pcmBuffer.readInt16LE(idx * 2) : 0;
    const s2 = (idx + 1) * 2 < pcmBuffer.length - 1 ? pcmBuffer.readInt16LE((idx + 1) * 2) : s1;
    const sample = Math.round(s1 + frac * (s2 - s1));
    pcm8kBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
  }

  console.log(`[ElevenLabs] Resampled to ${pcm8kBuffer.length} bytes PCM at 8kHz`);
  return pcm8kBuffer;
}

/**
 * Generate TTS using OpenAI
 * Returns raw PCM audio at 8kHz
 */
export async function generateOpenAITTS(text: string, voiceId?: string): Promise<Buffer> {
  const agentVoice = voiceId?.toLowerCase() || 'alloy';

  // Check if this is an ElevenLabs custom voice
  if (agentVoice.startsWith('elevenlabs_') && process.env.ELEVENLABS_API_KEY) {
    const elevenLabsVoiceId = agentVoice.replace('elevenlabs_', '');
    try {
      return await generateElevenLabsTTS(text, elevenLabsVoiceId);
    } catch (error) {
      console.error('[TTS] ElevenLabs failed, falling back to OpenAI:', error);
    }
  }

  if (!openai) {
    throw new Error('OpenAI not configured for TTS');
  }

  const openaiVoice = VOICE_MAPPING[agentVoice] || 'alloy';

  // Get TTS settings from environment variables
  const ttsModel = process.env.TTS_MODEL || 'tts-1-hd';
  const ttsSpeed = parseFloat(process.env.TTS_SPEED || '1.0');

  // Validate model and speed
  const validModel = ttsModel === 'tts-1' ? 'tts-1' : 'tts-1-hd';
  const validSpeed = Math.max(0.25, Math.min(4.0, ttsSpeed));

  console.log(`[TTS] Using OpenAI: "${text.substring(0, 50)}..." (voice: ${openaiVoice}, model: ${validModel}, speed: ${validSpeed})`);

  const response = await openai.audio.speech.create({
    model: validModel,
    voice: openaiVoice as any,
    input: text,
    response_format: 'pcm',
    speed: validSpeed,
  });

  // Get audio buffer (OpenAI TTS outputs 24kHz, 16-bit, mono PCM)
  const audioBuffer = Buffer.from(await response.arrayBuffer());

  // Resample from 24kHz to 8kHz for Exotel
  return resamplePCMSimple(audioBuffer, 24000, 8000);
}

/**
 * Generate TTS using Sarvam for Indian languages
 * Returns raw PCM audio at 8kHz
 */
export async function generateSarvamTTS(text: string, language: string, voiceGender: 'male' | 'female' = 'female'): Promise<Buffer> {
  if (!sarvamService.isAvailable()) {
    throw new Error('Sarvam service not available');
  }

  console.log(`[TTS] Using Sarvam for: "${text.substring(0, 50)}..." (${language})`);

  const sarvamVoice = sarvamService.getVoiceForLanguage(language, voiceGender);

  // Request Sarvam TTS at 8000 Hz for telephony
  const audioBuffer = await sarvamService.textToSpeech(text, sarvamVoice, language, 8000);

  // Sarvam returns WAV - read sample rate from header to verify
  let sarvamSampleRate = 22050; // Default to 22050 Hz (Sarvam default)
  const headerCheck = audioBuffer.slice(0, 4).toString('ascii');
  console.log(`[TTS] Sarvam audio header: "${headerCheck}", length: ${audioBuffer.length}`);

  if (headerCheck === 'RIFF' && audioBuffer.length > 28) {
    sarvamSampleRate = audioBuffer.readUInt32LE(24);
    console.log(`[TTS] Sarvam WAV sample rate from header: ${sarvamSampleRate} Hz`);
  } else {
    console.log(`[TTS] Sarvam audio not WAV format, assuming ${sarvamSampleRate} Hz`);
  }

  // Extract PCM (skip 44-byte WAV header if present)
  const pcmAudio = (headerCheck === 'RIFF' && audioBuffer.length > 44) ? audioBuffer.slice(44) : audioBuffer;

  // Always resample to 8kHz for telephony
  if (sarvamSampleRate !== 8000) {
    const resampledAudio = resamplePCM(pcmAudio, sarvamSampleRate, 8000);
    console.log(`[TTS] Sarvam resampled: ${pcmAudio.length} bytes @ ${sarvamSampleRate}Hz -> ${resampledAudio.length} bytes @ 8kHz`);
    return resampledAudio;
  }

  console.log(`[TTS] Sarvam: ${pcmAudio.length} bytes @ 8kHz (no resample needed)`);
  return pcmAudio;
}

/**
 * Generate TTS using AI4Bharat IndicTTS for Indian languages
 * Returns raw PCM audio at 8kHz
 */
export async function generateAI4BharatTTS(
  text: string,
  language: string,
  voiceGender: 'male' | 'female' = 'female'
): Promise<Buffer> {
  if (!ai4bharatService.isAvailable()) {
    throw new Error('AI4Bharat service not available');
  }

  console.log(`[TTS] Using AI4Bharat for: "${text.substring(0, 50)}..." (${language}, ${voiceGender})`);

  const result = await ai4bharatService.synthesize(
    text,
    language as keyof typeof AI4BHARAT_LANGUAGES,
    voiceGender,
    8000 // Request 8kHz for telephony
  );

  // Extract PCM from WAV if needed
  let pcmAudio = result.audio;
  if (result.format === 'wav' && pcmAudio.slice(0, 4).toString() === 'RIFF') {
    pcmAudio = pcmAudio.slice(44); // Skip WAV header
  }

  console.log(`[TTS] AI4Bharat: ${pcmAudio.length} bytes @ 8kHz`);
  return pcmAudio;
}

/**
 * Generate TTS audio based on language and voice settings
 *
 * SIMPLIFIED PROVIDER SELECTION:
 * 1. ElevenLabs custom voice (elevenlabs_xxx) -> ElevenLabs
 * 2. Indian languages -> Sarvam AI (best quality for Indian languages)
 * 3. English/Other -> OpenAI (reliable, good quality)
 *
 * Fallback: Always OpenAI if primary fails
 */
export async function generateTTS(
  text: string,
  language: string,
  voiceId?: string
): Promise<Buffer> {
  const normalizedLang = normalizeLanguageCode(language) || 'en-IN';
  const isRegionalIndian = isRegionalIndianLanguage(normalizedLang);
  const voiceGender = voiceId?.includes('male') ? 'male' : 'female';

  // Determine voice for cache key
  const cacheVoice = isRegionalIndian
    ? sarvamService.getVoiceForLanguage(normalizedLang, voiceGender)
    : (voiceId || 'nova');

  // Check cache first
  const cachedAudio = getCachedTTS(text, normalizedLang, cacheVoice);
  if (cachedAudio) {
    return cachedAudio;
  }

  let resampledAudio: Buffer;

  // ========================================
  // PRIORITY 1: ElevenLabs Custom Voice
  // ========================================
  if (voiceId?.toLowerCase().startsWith('elevenlabs_') && process.env.ELEVENLABS_API_KEY) {
    const elevenLabsVoiceId = voiceId.replace(/^elevenlabs_/i, '');
    try {
      console.log(`[TTS] Using ElevenLabs (custom voice): ${elevenLabsVoiceId}`);
      resampledAudio = await generateElevenLabsTTS(text, elevenLabsVoiceId);
      setCachedTTS(text, normalizedLang, voiceId, resampledAudio);
      return resampledAudio;
    } catch (error) {
      console.error('[TTS] ElevenLabs failed, falling back to OpenAI:', error);
    }
  }

  // ========================================
  // PRIORITY 2: Indian Languages -> Sarvam AI
  // ========================================
  if (isRegionalIndian && sarvamService.isAvailable()) {
    try {
      console.log(`[TTS] Using Sarvam AI (Indian language): ${normalizedLang}`);
      resampledAudio = await generateSarvamTTS(text, normalizedLang, voiceGender);
      setCachedTTS(text, normalizedLang, cacheVoice, resampledAudio);
      return resampledAudio;
    } catch (error) {
      console.error('[TTS] Sarvam failed, falling back to OpenAI:', error);
    }
  }

  // ========================================
  // FALLBACK: OpenAI (English & all fallbacks)
  // ========================================
  console.log(`[TTS] Using OpenAI: "${text.substring(0, 50)}..." (${normalizedLang})`);
  resampledAudio = await generateOpenAITTS(text, voiceId);
  setCachedTTS(text, normalizedLang, voiceId || 'nova', resampledAudio);
  return resampledAudio;
}

/**
 * Send audio chunks via WebSocket to Exotel
 * Supports interruption when user starts speaking
 */
export async function sendAudioChunks(
  ws: WebSocket.WebSocket,
  streamSid: string,
  audioBuffer: Buffer,
  checkInterrupt: () => boolean
): Promise<void> {
  console.log(`[TTS] Sending PCM audio: ${audioBuffer.length} bytes (16-bit, 8kHz)`);

  // Chunk size: 3200 bytes = 100ms of audio at 8kHz, 16-bit
  const CHUNK_SIZE = 3200;

  for (let i = 0; i < audioBuffer.length; i += CHUNK_SIZE) {
    // Check if user interrupted
    if (checkInterrupt()) {
      console.log(`[TTS] Interrupted by user speech at ${Math.round(i / audioBuffer.length * 100)}%`);
      // Send clear message to stop any queued audio
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          event: 'clear',
          streamSid: streamSid,
        }));
      }
      return;
    }

    const chunk = audioBuffer.slice(i, Math.min(i + CHUNK_SIZE, audioBuffer.length));

    // Ensure chunk is multiple of 320 bytes for PCM
    let paddedChunk = chunk;
    const remainder = chunk.length % 320;
    if (remainder !== 0) {
      const padding = Buffer.alloc(320 - remainder, 0x00);
      paddedChunk = Buffer.concat([chunk, padding]);
    }

    const message = {
      event: 'media',
      streamSid: streamSid,
      media: {
        payload: paddedChunk.toString('base64'),
      },
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }

    // Delay between chunks (100ms)
    await sleep(100);
  }

  // Send mark to indicate end of audio
  const markMessage = {
    event: 'mark',
    streamSid: streamSid,
    mark: {
      name: `response_${Date.now()}`,
    },
  };

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(markMessage));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const voicebotTTSService = {
  generateTTS,
  generateOpenAITTS,
  generateSarvamTTS,
  generateElevenLabsTTS,
  generateAI4BharatTTS,
  sendAudioChunks,
  getCachedTTS,
  setCachedTTS,
  isRegionalIndianLanguage,
  VOICE_MAPPING,
};

export default voicebotTTSService;
