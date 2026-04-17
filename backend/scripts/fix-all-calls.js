/**
 * Fix all telecaller call transcripts - parse existing labels into enhancedTranscript
 * or use GPT to split if no labels exist
 */

const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
require('dotenv').config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function parseTranscriptToMessages(transcript) {
  const lines = transcript.split('\n').filter(l => l.trim());
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

async function splitTranscriptWithGPT(transcript, language = 'te') {
  if (!transcript || transcript.trim().length < 50) {
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

async function fixAllCalls() {
  console.log('='.repeat(60));
  console.log('FIXING ALL TELECALLER CALL TRANSCRIPTS');
  console.log('='.repeat(60));
  console.log('');

  const calls = await prisma.telecallerCall.findMany({
    where: {
      transcript: { not: null },
    },
    select: {
      id: true,
      transcript: true,
      enhancedTranscript: true,
      duration: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${calls.length} calls with transcripts\n`);

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    console.log(`[${i + 1}/${calls.length}] Processing call ${call.id.substring(0, 8)}...`);

    // Check if already has proper speaker separation in enhancedTranscript
    const existingMessages = call.enhancedTranscript;
    if (existingMessages && Array.isArray(existingMessages) && existingMessages.length > 0) {
      const hasAgent = existingMessages.some(m => m.role === 'assistant');
      const hasCustomer = existingMessages.some(m => m.role === 'user');
      if (hasAgent && hasCustomer) {
        console.log('  → Already has both Agent and Customer messages, skipping...');
        skipped++;
        continue;
      }
    }

    // Check if transcript is too short
    if (!call.transcript || call.transcript.length < 50) {
      console.log('  → Transcript too short, skipping...');
      skipped++;
      continue;
    }

    // Check if transcript already has labels
    const hasAgentLabel = call.transcript.includes('Agent:');
    const hasCustomerLabel = call.transcript.includes('Customer:');

    let messages;
    let newTranscript = call.transcript;

    if (hasAgentLabel && hasCustomerLabel) {
      // Parse existing labels
      console.log('  → Parsing existing Agent/Customer labels...');
      messages = parseTranscriptToMessages(call.transcript);
    } else {
      // Need to split with GPT
      console.log('  → No labels found, using GPT to split...');
      newTranscript = await splitTranscriptWithGPT(call.transcript);
      if (!newTranscript) {
        console.log('  → GPT split failed, skipping...');
        failed++;
        continue;
      }
      messages = parseTranscriptToMessages(newTranscript);
    }

    const agentMsgs = messages.filter(m => m.role === 'assistant').length;
    const customerMsgs = messages.filter(m => m.role === 'user').length;

    if (agentMsgs === 0 || customerMsgs === 0) {
      console.log(`  → Only found ${agentMsgs} Agent and ${customerMsgs} Customer messages`);

      // If transcript has labels but parsing failed, might be formatting issue
      if (hasAgentLabel || hasCustomerLabel) {
        console.log('  → Attempting line-by-line repair...');
        // Try more aggressive parsing
        const allLines = call.transcript.split(/[\n\r]+/);
        messages = [];
        for (const line of allLines) {
          const trimmed = line.trim();
          if (trimmed.toLowerCase().startsWith('agent:')) {
            messages.push({ role: 'assistant', content: trimmed.substring(6).trim(), sentiment: 'neutral' });
          } else if (trimmed.toLowerCase().startsWith('customer:')) {
            messages.push({ role: 'user', content: trimmed.substring(9).trim(), sentiment: 'neutral' });
          }
        }
        const agentMsgs2 = messages.filter(m => m.role === 'assistant').length;
        const customerMsgs2 = messages.filter(m => m.role === 'user').length;

        if (agentMsgs2 === 0 || customerMsgs2 === 0) {
          console.log('  → Still failed, skipping...');
          failed++;
          continue;
        }
        console.log(`  → Repaired: ${agentMsgs2} Agent, ${customerMsgs2} Customer`);
      } else {
        failed++;
        continue;
      }
    }

    const finalAgentMsgs = messages.filter(m => m.role === 'assistant').length;
    const finalCustomerMsgs = messages.filter(m => m.role === 'user').length;
    console.log(`  → ${finalAgentMsgs} Agent + ${finalCustomerMsgs} Customer messages`);

    // Update the call record
    if (!process.argv.includes('--dry-run')) {
      await prisma.telecallerCall.update({
        where: { id: call.id },
        data: {
          transcript: newTranscript,
          enhancedTranscript: messages,
          customerSpeakingTime: Math.round(finalCustomerMsgs * 3),
          agentSpeakingTime: Math.round(finalAgentMsgs * 5),
        }
      });
      console.log('  ✅ Updated!');
    } else {
      console.log('  → [DRY RUN] Would update');
    }

    fixed++;

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total calls:     ${calls.length}`);
  console.log(`Fixed:           ${fixed}`);
  console.log(`Skipped:         ${skipped}`);
  console.log(`Failed:          ${failed}`);
  console.log('');

  if (process.argv.includes('--dry-run')) {
    console.log('This was a DRY RUN. Run without --dry-run to actually update.');
  }

  await prisma.$disconnect();
}

fixAllCalls().catch(console.error);
