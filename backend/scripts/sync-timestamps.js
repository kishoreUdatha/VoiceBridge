/**
 * Re-sync transcript timestamps with actual audio using Deepgram
 * Gets accurate word-level timestamps and maps them to messages
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient();

// Import Deepgram
const deepgramSdk = require('@deepgram/sdk');
const createClient = deepgramSdk.createClient;

const callId = process.argv[2];
if (!callId) {
  console.log('Usage: node scripts/sync-timestamps.js <callId>');
  process.exit(1);
}

async function syncTimestamps() {
  console.log('='.repeat(60));
  console.log('SYNCING TRANSCRIPT TIMESTAMPS WITH AUDIO');
  console.log('='.repeat(60));
  console.log('');

  // Get call
  const call = await prisma.telecallerCall.findFirst({
    where: { id: { startsWith: callId } },
    select: {
      id: true,
      recordingUrl: true,
      enhancedTranscript: true,
      duration: true,
    }
  });

  if (!call) {
    console.log('Call not found');
    await prisma.$disconnect();
    return;
  }

  console.log('Call ID:', call.id);
  console.log('Recording:', call.recordingUrl);
  console.log('Duration:', call.duration, 'seconds');
  console.log('');

  if (!call.recordingUrl) {
    console.log('No recording URL');
    await prisma.$disconnect();
    return;
  }

  const filePath = path.join(process.cwd(), call.recordingUrl);
  if (!fs.existsSync(filePath)) {
    console.log('Recording file not found:', filePath);
    await prisma.$disconnect();
    return;
  }

  // Initialize Deepgram
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.log('DEEPGRAM_API_KEY not set');
    await prisma.$disconnect();
    return;
  }

  const deepgram = createClient(apiKey);
  console.log('Transcribing with Deepgram to get timestamps...');

  // Read audio
  const audioBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.m4a': 'audio/m4a',
    '.mp3': 'audio/mp3',
    '.wav': 'audio/wav',
  };

  // Transcribe with word-level timestamps
  const response = await deepgram.listen.prerecorded.transcribeFile(
    audioBuffer,
    {
      model: 'nova-3',
      language: 'te',
      smart_format: true,
      punctuate: true,
      utterances: true,
      mimetype: mimeTypes[ext] || 'audio/mp3',
    }
  );

  const result = response.result || response;
  const utterances = result?.results?.utterances;

  if (!utterances || utterances.length === 0) {
    console.log('No utterances returned from Deepgram');
    await prisma.$disconnect();
    return;
  }

  console.log(`Got ${utterances.length} utterances with timestamps`);
  console.log('');

  // Show utterance timestamps
  console.log('Utterance timestamps:');
  utterances.forEach((u, i) => {
    console.log(`  ${i + 1}. [${u.start.toFixed(1)}s - ${u.end.toFixed(1)}s] ${u.transcript.substring(0, 50)}...`);
  });
  console.log('');

  // Get current messages
  const messages = call.enhancedTranscript;
  if (!messages || !Array.isArray(messages)) {
    console.log('No enhanced transcript to update');
    await prisma.$disconnect();
    return;
  }

  console.log(`Mapping ${utterances.length} utterances to ${messages.length} messages...`);

  // Strategy: Map utterances to messages by finding text overlap
  // Since GPT may have reformatted the text, we need fuzzy matching
  const updatedMessages = [];
  let utteranceIdx = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgWords = msg.content.toLowerCase().split(/\s+/).slice(0, 5); // First 5 words

    // Find matching utterance
    let bestMatch = null;
    let bestScore = 0;

    for (let j = utteranceIdx; j < Math.min(utteranceIdx + 5, utterances.length); j++) {
      const utterance = utterances[j];
      const uttWords = utterance.transcript.toLowerCase().split(/\s+/);

      // Count matching words
      let matchCount = 0;
      for (const word of msgWords) {
        if (uttWords.some(w => w.includes(word) || word.includes(w))) {
          matchCount++;
        }
      }

      const score = matchCount / msgWords.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = utterance;
        if (score > 0.5) {
          utteranceIdx = j + 1;
          break;
        }
      }
    }

    // Use matched timestamp or estimate
    let startTime;
    if (bestMatch && bestScore > 0.3) {
      startTime = Math.round(bestMatch.start);
    } else {
      // Estimate based on position
      startTime = Math.round((i / messages.length) * (call.duration || 60));
    }

    updatedMessages.push({
      ...msg,
      startTimeSeconds: startTime,
    });

    console.log(`  ${i + 1}. [${startTime}s] ${msg.role === 'assistant' ? 'Agent' : 'Customer'}: ${msg.content.substring(0, 40)}...`);
  }

  // Update call
  if (!process.argv.includes('--dry-run')) {
    await prisma.telecallerCall.update({
      where: { id: call.id },
      data: { enhancedTranscript: updatedMessages }
    });
    console.log('');
    console.log('✅ Timestamps updated!');
  } else {
    console.log('');
    console.log('[DRY RUN] Would update timestamps');
  }

  await prisma.$disconnect();
}

syncTimestamps().catch(console.error);
