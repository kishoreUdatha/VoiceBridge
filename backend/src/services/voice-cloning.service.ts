/**
 * Voice Cloning Service - Single Responsibility Principle
 * Handles voice cloning functionality using ElevenLabs
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// MIME type to file extension mapping
const MIME_EXT_MAP: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/wav': 'wav',
  'audio/mp3': 'mp3',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/x-m4a': 'm4a',
};

/**
 * Clone voice from audio sample
 */
export async function cloneVoice(params: {
  organizationId: string;
  name: string;
  audioBuffer: Buffer;
  mimeType: string;
}): Promise<{ voiceId: string; name: string; status: string; provider: string }> {
  const { organizationId, name, audioBuffer, mimeType } = params;

  // Create directory for voice samples
  const voicesDir = getVoicesDir(organizationId);
  if (!fs.existsSync(voicesDir)) {
    fs.mkdirSync(voicesDir, { recursive: true });
  }

  const ext = MIME_EXT_MAP[mimeType] || 'webm';
  let voiceId: string;
  let provider: string;
  let elevenLabsVoiceId: string | null = null;

  // Try ElevenLabs first if API key is configured
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      elevenLabsVoiceId = await cloneWithElevenLabs(audioBuffer, name, mimeType);
      voiceId = `elevenlabs_${elevenLabsVoiceId}`;
      provider = 'elevenlabs';
      console.log(`[VoiceCloning] Voice cloned with ElevenLabs: ${voiceId}`);
    } catch (error) {
      console.error('[VoiceCloning] ElevenLabs cloning failed, falling back to local:', error);
      voiceId = `custom_${uuidv4()}`;
      provider = 'local';
    }
  } else {
    voiceId = `custom_${uuidv4()}`;
    provider = 'local';
    console.log('[VoiceCloning] ElevenLabs not configured, using local storage');
  }

  // Save the audio file locally as backup
  const filePath = path.join(voicesDir, `${voiceId}.${ext}`);
  fs.writeFileSync(filePath, audioBuffer);

  // Store voice metadata
  const metadataPath = path.join(voicesDir, `${voiceId}.json`);
  const metadata = {
    voiceId,
    name,
    organizationId,
    filePath,
    mimeType,
    createdAt: new Date().toISOString(),
    status: 'ready',
    provider,
    elevenLabsVoiceId,
  };
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log(`[VoiceCloning] Voice cloned: ${voiceId} for org ${organizationId} (provider: ${provider})`);

  return {
    voiceId,
    name,
    status: 'ready',
    provider,
  };
}

/**
 * Clone voice using ElevenLabs API
 */
async function cloneWithElevenLabs(audioBuffer: Buffer, name: string, mimeType: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const FormData = require('form-data');
  const form = new FormData();

  const ext = MIME_EXT_MAP[mimeType] || 'mp3';

  form.append('name', name);
  form.append('files', audioBuffer, { filename: `voice.${ext}`, contentType: mimeType });
  form.append('description', `Custom voice cloned for CRM - ${name}`);

  const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[ElevenLabs] Voice clone error:', error);
    throw new Error(`ElevenLabs voice cloning failed: ${response.status}`);
  }

  const result = await response.json() as { voice_id: string };
  console.log(`[ElevenLabs] Voice cloned successfully: ${result.voice_id}`);
  return result.voice_id;
}

/**
 * Generate TTS using ElevenLabs
 */
export async function generateElevenLabsTTS(text: string, voiceId: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[ElevenLabs] TTS error:', error);
    throw new Error(`ElevenLabs TTS failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get custom voices for organization
 */
export async function getCustomVoices(organizationId: string): Promise<Array<{
  voiceId: string;
  name: string;
  status: string;
  createdAt: string;
}>> {
  const voicesDir = getVoicesDir(organizationId);

  if (!fs.existsSync(voicesDir)) {
    return [];
  }

  const files = fs.readdirSync(voicesDir).filter(f => f.endsWith('.json'));
  const voices = files.map(file => {
    const content = fs.readFileSync(path.join(voicesDir, file), 'utf-8');
    const metadata = JSON.parse(content);
    return {
      voiceId: metadata.voiceId,
      name: metadata.name,
      status: metadata.status,
      createdAt: metadata.createdAt,
    };
  });

  return voices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Delete custom voice
 */
export async function deleteCustomVoice(voiceId: string, organizationId: string): Promise<void> {
  const voicesDir = getVoicesDir(organizationId);
  const metadataPath = path.join(voicesDir, `${voiceId}.json`);

  if (!fs.existsSync(metadataPath)) {
    throw new Error('Voice not found');
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

  // Delete audio file
  if (fs.existsSync(metadata.filePath)) {
    fs.unlinkSync(metadata.filePath);
  }

  // Delete metadata file
  fs.unlinkSync(metadataPath);

  // Also delete from ElevenLabs if the voice was cloned there
  if (metadata.elevenLabsVoiceId && process.env.ELEVENLABS_API_KEY) {
    try {
      await deleteElevenLabsVoice(metadata.elevenLabsVoiceId);
    } catch (error) {
      console.error('[VoiceCloning] Failed to delete voice from ElevenLabs:', error);
    }
  }

  console.log(`[VoiceCloning] Voice deleted: ${voiceId}`);
}

/**
 * Delete voice from ElevenLabs
 */
async function deleteElevenLabsVoice(voiceId: string): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return;

  const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
    method: 'DELETE',
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    console.error(`[ElevenLabs] Failed to delete voice ${voiceId}: ${response.status}`);
  }
}

/**
 * Get custom voice audio for TTS (returns the stored audio sample)
 */
export async function getCustomVoiceAudio(voiceId: string, organizationId: string): Promise<Buffer | null> {
  const voicesDir = getVoicesDir(organizationId);
  const metadataPath = path.join(voicesDir, `${voiceId}.json`);

  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

  if (fs.existsSync(metadata.filePath)) {
    return fs.readFileSync(metadata.filePath);
  }

  return null;
}

/**
 * Get voice metadata
 */
export async function getVoiceMetadata(voiceId: string, organizationId: string): Promise<any | null> {
  const voicesDir = getVoicesDir(organizationId);
  const metadataPath = path.join(voicesDir, `${voiceId}.json`);

  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
}

/**
 * Check if voice is an ElevenLabs voice
 */
export function isElevenLabsVoice(voiceId: string): boolean {
  return voiceId.startsWith('elevenlabs_');
}

/**
 * Extract ElevenLabs voice ID from custom voice ID
 */
export function getElevenLabsVoiceId(voiceId: string): string | null {
  if (!isElevenLabsVoice(voiceId)) return null;
  return voiceId.replace('elevenlabs_', '');
}

/**
 * Helper: Get voices directory for organization
 */
function getVoicesDir(organizationId: string): string {
  return path.join(__dirname, '../../uploads/voices', organizationId);
}

export const voiceCloningService = {
  cloneVoice,
  generateElevenLabsTTS,
  getCustomVoices,
  deleteCustomVoice,
  getCustomVoiceAudio,
  getVoiceMetadata,
  isElevenLabsVoice,
  getElevenLabsVoiceId,
};

export default voiceCloningService;
