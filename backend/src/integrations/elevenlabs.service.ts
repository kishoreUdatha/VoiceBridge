/**
 * ElevenLabs Voice AI Integration Service
 *
 * Provides high-quality Text-to-Speech with natural, expressive voices.
 * Documentation: https://elevenlabs.io/docs/api-reference
 */

import axios from 'axios';
import { circuitBreakers, CircuitBreakerError } from '../utils/circuitBreaker';

import { config } from '../config';

const ELEVENLABS_API_KEY = config.elevenlabs.apiKey || '';
const ELEVENLABS_BASE_URL = config.apiUrls.elevenlabs;

// ElevenLabs voice models
export const ELEVENLABS_MODELS = {
  'eleven_multilingual_v2': 'Multilingual v2 (Best quality, 29 languages)',
  'eleven_turbo_v2_5': 'Turbo v2.5 (Fast, low latency)',
  'eleven_turbo_v2': 'Turbo v2 (Fast)',
  'eleven_monolingual_v1': 'English v1 (English only)',
  'eleven_multilingual_v1': 'Multilingual v1 (Legacy)',
};

// Pre-built ElevenLabs voices (free tier voices + popular ones)
export const ELEVENLABS_VOICES = {
  // Female voices
  'Rachel': { id: '21m00Tcm4TlvDq8ikWAM', gender: 'female', accent: 'American', description: 'Calm, young, warm' },
  'Domi': { id: 'AZnzlk1XvdvUeBnXmlld', gender: 'female', accent: 'American', description: 'Strong, confident' },
  'Bella': { id: 'EXAVITQu4vr4xnSDxMaL', gender: 'female', accent: 'American', description: 'Soft, young' },
  'Elli': { id: 'MF3mGyEYCl7XYWbV9V6O', gender: 'female', accent: 'American', description: 'Young, emotional' },
  'Charlotte': { id: 'XB0fDUnXU5powFXDhCwa', gender: 'female', accent: 'British', description: 'Seductive, mature' },
  'Dorothy': { id: 'ThT5KcBeYPX3keUQqHPh', gender: 'female', accent: 'British', description: 'Pleasant, British' },
  'Sarah': { id: 'EXAVITQu4vr4xnSDxMaL', gender: 'female', accent: 'American', description: 'Soft spoken' },
  'Nicole': { id: 'piTKgcLEGmPE4e6mEKli', gender: 'female', accent: 'American', description: 'Whisper, soft' },

  // Male voices
  'Adam': { id: 'pNInz6obpgDQGcFmaJgB', gender: 'male', accent: 'American', description: 'Deep, narrator' },
  'Antoni': { id: 'ErXwobaYiN019PkySvjV', gender: 'male', accent: 'American', description: 'Well-rounded' },
  'Arnold': { id: 'VR6AewLTigWG4xSOukaG', gender: 'male', accent: 'American', description: 'Crisp, professional' },
  'Josh': { id: 'TxGEqnHWrfWFTfGW9XjX', gender: 'male', accent: 'American', description: 'Young, dynamic' },
  'Sam': { id: 'yoZ06aMxZJJ28mfd3POQ', gender: 'male', accent: 'American', description: 'Raspy, young' },
  'Daniel': { id: 'onwK4e9ZLuTAKqWW03F9', gender: 'male', accent: 'British', description: 'Deep, authoritative' },
  'Charlie': { id: 'IKne3meq5aSn9XLyUdCD', gender: 'male', accent: 'Australian', description: 'Casual, natural' },
  'James': { id: 'ZQe5CZNOzWyzPSCn5a3c', gender: 'male', accent: 'Australian', description: 'Calm, mature' },
  'Clyde': { id: '2EiwWnXFnvU5JabPnv8n', gender: 'male', accent: 'American', description: 'War veteran' },
  'Dave': { id: 'CYw3kZ02Hs0563khs1Fj', gender: 'male', accent: 'British', description: 'Conversational' },
  'Ethan': { id: 'g5CIjZEefAph4nQFvHAz', gender: 'male', accent: 'American', description: 'Narrator' },
  'Fin': { id: 'D38z5RcWu1voky8WS1ja', gender: 'male', accent: 'Irish', description: 'Sailor' },
  'George': { id: 'JBFqnCBsd6RMkjVDRZzb', gender: 'male', accent: 'British', description: 'Warm, raspy' },
  'Harry': { id: 'SOYHLrjzK2X1ezoPC6cr', gender: 'male', accent: 'American', description: 'Anxious' },
  'Liam': { id: 'TX3LPaxmHKxFdv7VOQHJ', gender: 'male', accent: 'American', description: 'Articulate, neutral' },
  'Matthew': { id: 'Yko7PKHZNXotIFUBG7I9', gender: 'male', accent: 'British', description: 'Audiobook narrator' },
  'Michael': { id: 'flq6f7yk4E4fJM5XTYuZ', gender: 'male', accent: 'American', description: 'Older, conversational' },
  'Patrick': { id: 'ODq5zmih8GrVes37Dizd', gender: 'male', accent: 'American', description: 'Shouty, video games' },
  'Thomas': { id: 'GBv7mTt0atIp3Br8iCZE', gender: 'male', accent: 'American', description: 'Calm, meditation' },
};

// Indian-specific voices (if available on your account)
export const ELEVENLABS_INDIAN_VOICES = {
  'Diya': { id: 'custom_diya', gender: 'female', accent: 'Indian', description: 'Indian English female' },
  'Arjun': { id: 'custom_arjun', gender: 'male', accent: 'Indian', description: 'Indian English male' },
};

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels?: {
    accent?: string;
    gender?: string;
    age?: string;
    description?: string;
  };
  preview_url?: string;
}

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

class ElevenLabsService {
  private apiKey: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = ELEVENLABS_API_KEY;
    this.isConfigured = !!this.apiKey;

    if (!this.isConfigured) {
      console.warn('[ElevenLabs] API key not configured. Set ELEVENLABS_API_KEY environment variable.');
    } else {
      console.log('[ElevenLabs] Service initialized successfully');
    }
  }

  /**
   * Check if ElevenLabs is configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Get all available voices (pre-built + custom)
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    if (!this.isConfigured) {
      // Return pre-built voices even without API key (for UI display)
      return Object.entries(ELEVENLABS_VOICES).map(([name, info]) => ({
        voice_id: info.id,
        name,
        labels: {
          gender: info.gender,
          accent: info.accent,
          description: info.description,
        },
      }));
    }

    try {
      const response = await axios.get(`${ELEVENLABS_BASE_URL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      return response.data.voices;
    } catch (error: any) {
      console.error('[ElevenLabs] Failed to fetch voices:', error.message);
      // Return pre-built voices as fallback
      return Object.entries(ELEVENLABS_VOICES).map(([name, info]) => ({
        voice_id: info.id,
        name,
        labels: {
          gender: info.gender,
          accent: info.accent,
          description: info.description,
        },
      }));
    }
  }

  /**
   * Get pre-built voices for frontend display
   */
  getPrebuiltVoices() {
    return Object.entries(ELEVENLABS_VOICES).map(([name, info]) => ({
      id: `elevenlabs-${info.id}`,
      name,
      provider: 'elevenlabs' as const,
      gender: info.gender,
      accent: info.accent,
      description: info.description,
      premium: true,
    }));
  }

  /**
   * Text-to-Speech conversion
   *
   * @param text - Text to convert to speech
   * @param voiceId - ElevenLabs voice ID
   * @param modelId - Model to use (default: eleven_turbo_v2_5 for speed)
   * @param settings - Voice settings (stability, similarity_boost)
   */
  async textToSpeech(
    text: string,
    voiceId: string,
    modelId: string = 'eleven_turbo_v2_5',
    settings?: Partial<VoiceSettings>
  ): Promise<Buffer> {
    if (!this.isConfigured) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Clean voice ID if it has prefix
    const cleanVoiceId = voiceId.replace('elevenlabs-', '');

    // Default voice settings optimized for conversational AI
    const voiceSettings: VoiceSettings = {
      stability: settings?.stability ?? 0.5,
      similarity_boost: settings?.similarity_boost ?? 0.75,
      style: settings?.style ?? 0.0,
      use_speaker_boost: settings?.use_speaker_boost ?? true,
    };

    try {
      const response = await circuitBreakers.openai.execute(() =>
        axios.post(
          `${ELEVENLABS_BASE_URL}/text-to-speech/${cleanVoiceId}`,
          {
            text,
            model_id: modelId,
            voice_settings: voiceSettings,
          },
          {
            headers: {
              'xi-api-key': this.apiKey,
              'Content-Type': 'application/json',
              'Accept': 'audio/mpeg',
            },
            responseType: 'arraybuffer',
            timeout: 30000,
          }
        )
      );

      console.log(`[ElevenLabs TTS] Generated ${response.data.length} bytes for "${text.substring(0, 50)}..."`);
      return Buffer.from(response.data);
    } catch (error: any) {
      if (error instanceof CircuitBreakerError) {
        console.warn('[ElevenLabs TTS] Circuit breaker OPEN');
        throw new Error('ElevenLabs service is temporarily unavailable. Please try again later.');
      }
      console.error('[ElevenLabs TTS] Error:', error.response?.data || error.message);
      throw new Error(`ElevenLabs TTS failed: ${error.message}`);
    }
  }

  /**
   * Stream Text-to-Speech (for real-time applications)
   */
  async textToSpeechStream(
    text: string,
    voiceId: string,
    modelId: string = 'eleven_turbo_v2_5'
  ): Promise<NodeJS.ReadableStream> {
    if (!this.isConfigured) {
      throw new Error('ElevenLabs API key not configured');
    }

    const cleanVoiceId = voiceId.replace('elevenlabs-', '');

    const response = await axios.post(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${cleanVoiceId}/stream`,
      {
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        responseType: 'stream',
        timeout: 60000,
      }
    );

    return response.data;
  }

  /**
   * Clone a voice from audio samples
   */
  async cloneVoice(
    name: string,
    audioBuffers: Buffer[],
    description?: string
  ): Promise<{ voiceId: string; name: string }> {
    if (!this.isConfigured) {
      throw new Error('ElevenLabs API key not configured');
    }

    const FormData = require('form-data');
    const form = new FormData();

    form.append('name', name);
    if (description) {
      form.append('description', description);
    }

    // Add audio files
    audioBuffers.forEach((buffer, index) => {
      form.append('files', buffer, {
        filename: `sample_${index}.mp3`,
        contentType: 'audio/mpeg',
      });
    });

    try {
      const response = await axios.post(
        `${ELEVENLABS_BASE_URL}/voices/add`,
        form,
        {
          headers: {
            'xi-api-key': this.apiKey,
            ...form.getHeaders(),
          },
        }
      );

      console.log(`[ElevenLabs] Voice cloned: ${response.data.voice_id}`);
      return {
        voiceId: response.data.voice_id,
        name,
      };
    } catch (error: any) {
      console.error('[ElevenLabs] Voice cloning failed:', error.response?.data || error.message);
      throw new Error(`Voice cloning failed: ${error.message}`);
    }
  }

  /**
   * Delete a cloned voice
   */
  async deleteVoice(voiceId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('ElevenLabs API key not configured');
    }

    const cleanVoiceId = voiceId.replace('elevenlabs-', '');

    try {
      await axios.delete(`${ELEVENLABS_BASE_URL}/voices/${cleanVoiceId}`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });
      console.log(`[ElevenLabs] Voice deleted: ${cleanVoiceId}`);
    } catch (error: any) {
      console.error('[ElevenLabs] Voice deletion failed:', error.response?.data || error.message);
      throw new Error(`Voice deletion failed: ${error.message}`);
    }
  }

  /**
   * Get voice preview audio URL
   */
  getVoicePreviewUrl(voiceId: string): string | null {
    const cleanId = voiceId.replace('elevenlabs-', '');
    // ElevenLabs provides preview URLs in their API response
    // This is a placeholder - actual preview URLs come from the voices API
    return `https://api.elevenlabs.io/v1/voices/${cleanId}/preview`;
  }

  /**
   * Get subscription info (quotas, usage)
   */
  async getSubscriptionInfo(): Promise<{
    characterCount: number;
    characterLimit: number;
    tier: string;
  }> {
    if (!this.isConfigured) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await axios.get(`${ELEVENLABS_BASE_URL}/user/subscription`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      return {
        characterCount: response.data.character_count,
        characterLimit: response.data.character_limit,
        tier: response.data.tier,
      };
    } catch (error: any) {
      console.error('[ElevenLabs] Failed to get subscription:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const elevenlabsService = new ElevenLabsService();
export default elevenlabsService;
