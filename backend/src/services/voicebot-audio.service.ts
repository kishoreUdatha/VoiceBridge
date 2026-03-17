/**
 * Voicebot Audio Processing Service - Single Responsibility Principle
 * Handles all audio format conversions, resampling, and voice activity detection
 */

// Audio settings constants
export const SAMPLE_RATE = 8000;
export const BITS_PER_SAMPLE = 16;
export const CHANNELS = 1;
export const AUDIO_ENERGY_THRESHOLD = 400; // RMS threshold for voice activity detection

/**
 * Voice Activity Detection - check if audio chunk contains speech
 * Returns the RMS energy level of the audio
 */
export function detectVoiceActivity(audioData: Buffer): number {
  // Calculate RMS energy for 16-bit PCM
  let sumSquares = 0;
  const samples = audioData.length / 2; // 16-bit = 2 bytes per sample

  for (let i = 0; i < audioData.length; i += 2) {
    // Read 16-bit little-endian sample
    const sample = audioData.readInt16LE(i);
    sumSquares += sample * sample;
  }

  const rms = Math.sqrt(sumSquares / samples);
  return rms;
}

/**
 * Check if audio chunk contains speech based on energy threshold
 */
export function isSpeechDetected(audioData: Buffer): boolean {
  return detectVoiceActivity(audioData) > AUDIO_ENERGY_THRESHOLD;
}

/**
 * Convert raw PCM to WAV format for Whisper
 */
export function pcmToWav(pcmData: Buffer, sampleRate: number, bitsPerSample: number, channels: number): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;

  const header = Buffer.alloc(headerSize);

  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

/**
 * Resample PCM audio using cubic interpolation for better quality
 * Improved algorithm that preserves more audio clarity than linear interpolation
 */
export function resamplePCM(input: Buffer, inputRate: number, outputRate: number): Buffer {
  if (inputRate === outputRate) return input;

  const ratio = inputRate / outputRate;
  const inputSamples = input.length / 2;
  const outputSamples = Math.floor(inputSamples / ratio);
  const output = Buffer.alloc(outputSamples * 2);

  // Helper to read sample with bounds checking
  const getSample = (index: number): number => {
    if (index < 0) return input.readInt16LE(0);
    if (index >= inputSamples) return input.readInt16LE((inputSamples - 1) * 2);
    return input.readInt16LE(index * 2);
  };

  for (let i = 0; i < outputSamples; i++) {
    const srcIndex = i * ratio;
    const srcFloor = Math.floor(srcIndex);
    const fraction = srcIndex - srcFloor;

    // Cubic interpolation using 4 points for smoother audio
    const s0 = getSample(srcFloor - 1);
    const s1 = getSample(srcFloor);
    const s2 = getSample(srcFloor + 1);
    const s3 = getSample(srcFloor + 2);

    // Catmull-Rom spline interpolation
    const a0 = -0.5 * s0 + 1.5 * s1 - 1.5 * s2 + 0.5 * s3;
    const a1 = s0 - 2.5 * s1 + 2 * s2 - 0.5 * s3;
    const a2 = -0.5 * s0 + 0.5 * s2;
    const a3 = s1;

    const t = fraction;
    const interpolated = Math.round(a0 * t * t * t + a1 * t * t + a2 * t + a3);

    output.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
  }

  return output;
}

/**
 * Simple linear interpolation resampling - clean and fast
 * Original working implementation without extra processing
 */
export function resamplePCMSimple(input: Buffer, inputRate: number, outputRate: number): Buffer {
  if (inputRate === outputRate) return input;

  const ratio = inputRate / outputRate;
  const inputSamples = input.length / 2;
  const outputSamples = Math.floor(inputSamples / ratio);
  const output = Buffer.alloc(outputSamples * 2);

  for (let i = 0; i < outputSamples; i++) {
    const srcIndex = i * ratio;
    const srcFloor = Math.floor(srcIndex);
    const srcCeil = Math.min(srcFloor + 1, inputSamples - 1);
    const fraction = srcIndex - srcFloor;

    const sample1 = input.readInt16LE(srcFloor * 2);
    const sample2 = input.readInt16LE(srcCeil * 2);
    const interpolated = Math.round(sample1 + (sample2 - sample1) * fraction);

    output.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
  }

  return output;
}

/**
 * Simple low-pass filter to reduce high frequencies before downsampling
 * Prevents aliasing artifacts when converting 24kHz to 8kHz
 * Uses a moving average filter for simplicity and efficiency
 */
export function lowPassFilter(input: Buffer, sampleRate: number, cutoffFreq: number): Buffer {
  const output = Buffer.alloc(input.length);
  const inputSamples = input.length / 2;

  // Calculate filter window size based on cutoff frequency
  // Higher cutoff = smaller window, lower cutoff = larger window
  const windowSize = Math.max(3, Math.min(7, Math.round(sampleRate / cutoffFreq / 2)));

  for (let i = 0; i < inputSamples; i++) {
    let sum = 0;
    let count = 0;

    // Average samples in window
    for (let j = -Math.floor(windowSize / 2); j <= Math.floor(windowSize / 2); j++) {
      const idx = i + j;
      if (idx >= 0 && idx < inputSamples) {
        sum += input.readInt16LE(idx * 2);
        count++;
      }
    }

    const filtered = Math.round(sum / count);
    output.writeInt16LE(Math.max(-32768, Math.min(32767, filtered)), i * 2);
  }

  return output;
}

/**
 * Normalize PCM audio to prevent clipping and maximize clarity
 * Adjusts volume to use full dynamic range without distortion
 */
export function normalizePCM(buffer: Buffer, targetPeakDb: number = -3): Buffer {
  const output = Buffer.alloc(buffer.length);

  // Find peak amplitude
  let maxAmplitude = 0;
  for (let i = 0; i < buffer.length; i += 2) {
    const sample = Math.abs(buffer.readInt16LE(i));
    if (sample > maxAmplitude) maxAmplitude = sample;
  }

  if (maxAmplitude === 0) return buffer;

  // Calculate normalization factor
  // Target peak in linear scale (e.g., -3dB = 0.707)
  const targetPeak = Math.pow(10, targetPeakDb / 20) * 32767;
  const gain = targetPeak / maxAmplitude;

  // Apply normalization
  for (let i = 0; i < buffer.length; i += 2) {
    let sample = buffer.readInt16LE(i);
    sample = Math.round(sample * gain);
    sample = Math.max(-32768, Math.min(32767, sample));
    output.writeInt16LE(sample, i);
  }

  console.log(`[AudioService] Audio normalized: peak ${maxAmplitude} -> ${Math.round(maxAmplitude * gain)}, gain: ${gain.toFixed(2)}x`);
  return output;
}

/**
 * Amplify PCM audio for better telephony clarity
 * @param buffer - PCM 16-bit audio buffer
 * @param gain - Volume multiplier (1.0 = no change, 1.5 = 50% louder)
 */
export function amplifyPCM(buffer: Buffer, gain: number): Buffer {
  const output = Buffer.alloc(buffer.length);

  for (let i = 0; i < buffer.length; i += 2) {
    let sample = buffer.readInt16LE(i);
    sample = Math.round(sample * gain);
    // Clamp to prevent clipping
    sample = Math.max(-32768, Math.min(32767, sample));
    output.writeInt16LE(sample, i);
  }

  return output;
}

/**
 * Encode PCM (16-bit signed) to mulaw (8-bit)
 * Exotel WebSocket expects mulaw encoded audio
 */
export function pcmToMulaw(pcmBuffer: Buffer): Buffer {
  const mulawBuffer = Buffer.alloc(pcmBuffer.length / 2);

  for (let i = 0; i < pcmBuffer.length / 2; i++) {
    const sample = pcmBuffer.readInt16LE(i * 2);
    mulawBuffer[i] = linearToMulaw(sample);
  }

  return mulawBuffer;
}

/**
 * Convert a 16-bit linear PCM sample to 8-bit mulaw
 */
export function linearToMulaw(sample: number): number {
  const MULAW_MAX = 0x1FFF;
  const MULAW_BIAS = 33;
  const sign = (sample >> 8) & 0x80;

  if (sign !== 0) sample = -sample;
  if (sample > MULAW_MAX) sample = MULAW_MAX;

  sample = sample + MULAW_BIAS;

  let exponent = 7;
  for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}

  const mantissa = (sample >> (exponent + 3)) & 0x0F;
  const mulawByte = ~(sign | (exponent << 4) | mantissa);

  return mulawByte & 0xFF;
}

/**
 * Convert μ-law byte to 16-bit PCM sample
 */
export function mulawToPCM(mulawByte: number): number {
  mulawByte = ~mulawByte;
  const sign = (mulawByte & 0x80) ? -1 : 1;
  const exponent = (mulawByte >> 4) & 0x07;
  const mantissa = mulawByte & 0x0F;
  const sample = sign * ((mantissa << 3) + 0x84) * (1 << exponent) - 0x84;
  return Math.max(-32768, Math.min(32767, sample));
}

export const voicebotAudioService = {
  detectVoiceActivity,
  isSpeechDetected,
  pcmToWav,
  resamplePCM,
  resamplePCMSimple,
  lowPassFilter,
  normalizePCM,
  amplifyPCM,
  pcmToMulaw,
  linearToMulaw,
  mulawToPCM,
  SAMPLE_RATE,
  BITS_PER_SAMPLE,
  CHANNELS,
  AUDIO_ENERGY_THRESHOLD,
};

export default voicebotAudioService;
