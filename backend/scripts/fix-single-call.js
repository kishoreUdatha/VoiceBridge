/**
 * Fix a single call by using GPT to split the transcript
 */

const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
require('dotenv').config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const callId = process.argv[2];
if (!callId) {
  console.log('Usage: node scripts/fix-single-call.js <callId> [--update]');
  process.exit(1);
}

async function fixCall() {
  console.log('Fetching call:', callId);

  const call = await prisma.telecallerCall.findFirst({
    where: { id: { startsWith: callId } },
    select: { id: true, transcript: true }
  });

  if (!call) {
    console.log('Call not found');
    await prisma.$disconnect();
    return;
  }

  console.log('Full ID:', call.id);
  console.log('');

  // Get raw transcript (strip existing labels if any)
  let rawText = call.transcript;
  rawText = rawText.replace(/^(Agent|Customer):\s*/gim, '');

  console.log('Raw transcript:');
  console.log(rawText.substring(0, 500));
  console.log('...');
  console.log('');

  console.log('Using GPT to split transcript...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a speaker diarization assistant for a Telugu phone sales call about college admissions.

Split this transcript into Agent and Customer turns. This is a REAL conversation between two people.

CRITICAL RULES:
1. Agent: The caller from the education company who:
   - Introduces themselves ("మేము స్మార్ట్ గ్రో ఇన్పోటెక్ కంపెనీ నుంచి")
   - Asks questions ending with సార్?, అండి?, కదా?
   - Explains colleges, courses, admission process
   - Makes pitch about available colleges

2. Customer: The person being called who:
   - Gives short confirmations: అవునండి, ఉందండి, ఓకే, ఆ
   - Mentions their preferences (branch, college, city)
   - Asks about fees or details
   - Says things like "చెన్నై సైడ్" (Chennai side), "దన్లక్ష్మీ యూనివర్సిటీ" (interested in specific college)
   - Confirms interest: "ఇంట్రెస్టెడ్ేనా"

3. Keep EXACT Telugu words - do not translate or modify
4. Each turn on new line with "Agent:" or "Customer:" prefix
5. Look for conversation flow - questions followed by answers

Return ONLY the split transcript, no other text.`
      },
      {
        role: 'user',
        content: rawText
      }
    ],
    temperature: 0.1,
    max_tokens: 4000,
  });

  const splitTranscript = response.choices[0].message.content;
  console.log('');
  console.log('='.repeat(60));
  console.log('SPLIT TRANSCRIPT:');
  console.log('='.repeat(60));
  console.log(splitTranscript);
  console.log('');

  // Parse into messages
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

  const agentMsgs = messages.filter(m => m.role === 'assistant').length;
  const customerMsgs = messages.filter(m => m.role === 'user').length;

  console.log(`Agent messages: ${agentMsgs}`);
  console.log(`Customer messages: ${customerMsgs}`);
  console.log('');

  if (process.argv.includes('--update')) {
    console.log('Updating call record...');
    await prisma.telecallerCall.update({
      where: { id: call.id },
      data: {
        transcript: splitTranscript,
        enhancedTranscript: messages,
        customerSpeakingTime: Math.round(customerMsgs * 3),
        agentSpeakingTime: Math.round(agentMsgs * 5),
      }
    });
    console.log('✅ Updated!');
  } else {
    console.log('Run with --update to save changes');
  }

  await prisma.$disconnect();
}

fixCall().catch(console.error);
