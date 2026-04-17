/**
 * Fix all telecaller calls - add startTimeSeconds to enhancedTranscript messages
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function fixTimestamps() {
  console.log('='.repeat(60));
  console.log('FIXING TIMESTAMPS IN ALL TELECALLER CALLS');
  console.log('='.repeat(60));
  console.log('');

  const calls = await prisma.telecallerCall.findMany({
    where: {
      enhancedTranscript: { not: null }
    },
    select: {
      id: true,
      duration: true,
      enhancedTranscript: true,
    }
  });

  console.log(`Found ${calls.length} calls with enhancedTranscript\n`);

  let fixed = 0;
  let skipped = 0;

  for (const call of calls) {
    const messages = call.enhancedTranscript;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      skipped++;
      continue;
    }

    // Check if timestamps already exist
    const hasTimestamps = messages.every(m => typeof m.startTimeSeconds === 'number' && !isNaN(m.startTimeSeconds));
    if (hasTimestamps) {
      console.log(`[${call.id.substring(0, 8)}] Already has valid timestamps, skipping...`);
      skipped++;
      continue;
    }

    // Estimate timestamps based on message position and call duration
    const callDuration = call.duration || 60; // default to 60 seconds if unknown
    const timePerMessage = callDuration / messages.length;

    const updatedMessages = messages.map((msg, index) => ({
      ...msg,
      startTimeSeconds: Math.round(index * timePerMessage)
    }));

    // Update the call
    await prisma.telecallerCall.update({
      where: { id: call.id },
      data: { enhancedTranscript: updatedMessages }
    });

    console.log(`[${call.id.substring(0, 8)}] Fixed ${messages.length} messages (duration: ${callDuration}s)`);
    fixed++;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total:   ${calls.length}`);
  console.log(`Fixed:   ${fixed}`);
  console.log(`Skipped: ${skipped}`);

  await prisma.$disconnect();
}

fixTimestamps().catch(console.error);
