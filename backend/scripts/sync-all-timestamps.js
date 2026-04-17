/**
 * Sync timestamps for all calls with recordings
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient();
const deepgramSdk = require('@deepgram/sdk');
const createClient = deepgramSdk.createClient;

async function syncAllTimestamps() {
  console.log('='.repeat(60));
  console.log('SYNCING ALL CALL TIMESTAMPS WITH AUDIO');
  console.log('='.repeat(60));
  console.log('');

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.log('DEEPGRAM_API_KEY not set');
    await prisma.$disconnect();
    return;
  }

  const deepgram = createClient(apiKey);

  // Get calls with recordings and transcripts
  const calls = await prisma.telecallerCall.findMany({
    where: {
      recordingUrl: { not: null },
      enhancedTranscript: { not: null },
    },
    select: {
      id: true,
      recordingUrl: true,
      enhancedTranscript: true,
      duration: true,
    }
  });

  console.log(`Found ${calls.length} calls with recordings\n`);

  let synced = 0;
  let failed = 0;

  for (const call of calls) {
    const messages = call.enhancedTranscript;
    if (!messages || !Array.isArray(messages) || messages.length === 0) continue;

    const filePath = path.join(process.cwd(), call.recordingUrl);
    if (!fs.existsSync(filePath)) {
      console.log(`[${call.id.substring(0, 8)}] Recording not found, skipping`);
      failed++;
      continue;
    }

    console.log(`[${call.id.substring(0, 8)}] Syncing ${messages.length} messages...`);

    try {
      const audioBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = { '.m4a': 'audio/m4a', '.mp3': 'audio/mp3', '.wav': 'audio/wav' };

      const response = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-3',
          language: 'te',
          smart_format: true,
          utterances: true,
          mimetype: mimeTypes[ext] || 'audio/mp3',
        }
      );

      const result = response.result || response;
      const utterances = result?.results?.utterances || [];

      if (utterances.length === 0) {
        console.log(`  → No utterances, using duration-based estimation`);
        // Fall back to duration-based estimation
        const duration = call.duration || 60;
        const updatedMessages = messages.map((msg, i) => ({
          ...msg,
          startTimeSeconds: Math.round((i / messages.length) * duration)
        }));
        await prisma.telecallerCall.update({
          where: { id: call.id },
          data: { enhancedTranscript: updatedMessages }
        });
        synced++;
        continue;
      }

      // Map utterances to messages
      const updatedMessages = [];
      let uttIdx = 0;

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const msgWords = msg.content.toLowerCase().split(/\s+/).slice(0, 5);

        let bestMatch = null;
        let bestScore = 0;

        for (let j = uttIdx; j < Math.min(uttIdx + 5, utterances.length); j++) {
          const utt = utterances[j];
          const uttWords = utt.transcript.toLowerCase().split(/\s+/);

          let matchCount = 0;
          for (const word of msgWords) {
            if (uttWords.some(w => w.includes(word) || word.includes(w))) matchCount++;
          }

          const score = matchCount / Math.max(msgWords.length, 1);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = utt;
            if (score > 0.5) { uttIdx = j + 1; break; }
          }
        }

        const startTime = bestMatch && bestScore > 0.3
          ? Math.round(bestMatch.start)
          : Math.round((i / messages.length) * (call.duration || 60));

        updatedMessages.push({ ...msg, startTimeSeconds: startTime });
      }

      await prisma.telecallerCall.update({
        where: { id: call.id },
        data: { enhancedTranscript: updatedMessages }
      });

      console.log(`  ✅ Synced with ${utterances.length} utterances`);
      synced++;

      // Rate limit
      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      console.log(`  → Error: ${error.message}`);
      failed++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`Synced: ${synced}, Failed: ${failed}`);

  await prisma.$disconnect();
}

syncAllTimestamps().catch(console.error);
