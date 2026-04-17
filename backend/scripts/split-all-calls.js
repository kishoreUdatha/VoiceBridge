/**
 * Split all telecaller call transcripts into Agent/Customer using GPT
 * Processes calls that have transcripts but may not have proper speaker separation
 */

const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
require('dotenv').config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function splitTranscriptWithGPT(transcript, language = 'te') {
  // Detect if transcript is already split (has Agent:/Customer: labels)
  if (transcript.includes('Agent:') && transcript.includes('Customer:')) {
    console.log('  → Already has speaker labels, skipping GPT...');
    return null;
  }

  // Skip if transcript is too short
  if (!transcript || transcript.trim().length < 50) {
    console.log('  → Transcript too short, skipping...');
    return null;
  }

  const languageHints = {
    'te': 'Telugu',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'kn': 'Kannada',
    'en': 'English',
  };
  const langName = languageHints[language] || 'Telugu';

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a speaker diarization assistant for a ${langName} phone sales call.
Split the transcript into Agent and Customer turns.

Rules:
- Agent: introduces company, asks questions, explains products/services, pitches
- Customer: short answers, mentions preferences, asks about fees/details
- Keep EXACT original words, don't translate or modify
- Each turn on new line with "Agent:" or "Customer:" prefix
- First speaker is usually the Agent (they initiate the call)

Return ONLY the split transcript, no other text.`
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('  → GPT error:', error.message);
    return null;
  }
}

function parseTranscriptToMessages(splitTranscript) {
  const lines = splitTranscript.split('\n').filter(l => l.trim());
  const messages = [];

  for (const line of lines) {
    const agentMatch = line.match(/^Agent:\s*(.+)/i);
    const customerMatch = line.match(/^Customer:\s*(.+)/i);

    if (agentMatch) {
      messages.push({ role: 'assistant', content: agentMatch[1].trim(), sentiment: 'neutral' });
    } else if (customerMatch) {
      messages.push({ role: 'user', content: customerMatch[1].trim(), sentiment: 'neutral' });
    }
  }

  return messages;
}

async function processAllCalls() {
  console.log('='.repeat(60));
  console.log('SPLITTING ALL TELECALLER CALL TRANSCRIPTS');
  console.log('='.repeat(60));
  console.log('');

  // Get all calls with transcripts
  const calls = await prisma.telecallerCall.findMany({
    where: {
      transcript: { not: null },
    },
    select: {
      id: true,
      transcript: true,
      enhancedTranscript: true,
      duration: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${calls.length} calls with transcripts`);
  console.log('');

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    console.log(`[${i + 1}/${calls.length}] Processing call ${call.id.substring(0, 8)}...`);

    // Check if already has proper speaker separation in enhancedTranscript
    const existingMessages = call.enhancedTranscript;
    if (existingMessages && Array.isArray(existingMessages)) {
      const hasAgent = existingMessages.some(m => m.role === 'assistant');
      const hasCustomer = existingMessages.some(m => m.role === 'user');
      if (hasAgent && hasCustomer) {
        console.log('  → Already has both Agent and Customer messages, skipping...');
        skipped++;
        continue;
      }
    }

    // Split transcript with GPT
    const splitTranscript = await splitTranscriptWithGPT(call.transcript);

    if (!splitTranscript) {
      skipped++;
      continue;
    }

    // Parse into messages
    const messages = parseTranscriptToMessages(splitTranscript);
    const agentMsgs = messages.filter(m => m.role === 'assistant').length;
    const customerMsgs = messages.filter(m => m.role === 'user').length;

    if (agentMsgs === 0 || customerMsgs === 0) {
      console.log('  → Failed to detect both speakers, skipping...');
      failed++;
      continue;
    }

    console.log(`  → Split into ${agentMsgs} Agent + ${customerMsgs} Customer messages`);

    // Update the call record
    if (!process.argv.includes('--dry-run')) {
      await prisma.telecallerCall.update({
        where: { id: call.id },
        data: {
          transcript: splitTranscript,
          enhancedTranscript: messages,
          customerSpeakingTime: Math.round(customerMsgs * 3),
          agentSpeakingTime: Math.round(agentMsgs * 5),
        }
      });
      console.log('  ✅ Updated!');
    } else {
      console.log('  → [DRY RUN] Would update');
    }

    processed++;

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total calls:     ${calls.length}`);
  console.log(`Processed:       ${processed}`);
  console.log(`Skipped:         ${skipped}`);
  console.log(`Failed:          ${failed}`);
  console.log('');

  if (process.argv.includes('--dry-run')) {
    console.log('This was a DRY RUN. Run without --dry-run to actually update.');
  }

  await prisma.$disconnect();
}

processAllCalls().catch(console.error);
