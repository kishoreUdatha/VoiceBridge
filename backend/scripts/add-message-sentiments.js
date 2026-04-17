/**
 * Add per-message sentiment analysis to enhancedTranscript
 */

const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
require('dotenv').config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeSentiments(messages) {
  // Create a prompt to analyze sentiment of each message
  const prompt = messages.map((m, i) =>
    `${i + 1}. [${m.role === 'assistant' ? 'Agent' : 'Customer'}]: ${m.content.substring(0, 200)}`
  ).join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze the sentiment of each message in this sales call conversation.
For each message, respond with just the message number and sentiment (positive/negative/neutral).

Guidelines:
- positive: expressing interest, agreement, enthusiasm, satisfaction, "yes", "interested", "okay"
- negative: expressing frustration, rejection, complaints, "no", "not interested", concerns
- neutral: factual information, questions, standard greetings

Response format (one per line):
1: positive
2: neutral
3: negative
...`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const result = response.choices[0].message.content;
    const sentiments = {};

    // Parse response
    result.split('\n').forEach(line => {
      const match = line.match(/^(\d+):\s*(positive|negative|neutral)/i);
      if (match) {
        sentiments[parseInt(match[1]) - 1] = match[2].toLowerCase();
      }
    });

    return sentiments;
  } catch (error) {
    console.error('GPT error:', error.message);
    return {};
  }
}

async function addMessageSentiments() {
  console.log('='.repeat(60));
  console.log('ADDING PER-MESSAGE SENTIMENT ANALYSIS');
  console.log('='.repeat(60));
  console.log('');

  const calls = await prisma.telecallerCall.findMany({
    where: {
      enhancedTranscript: { not: null }
    },
    select: {
      id: true,
      enhancedTranscript: true,
    }
  });

  console.log(`Found ${calls.length} calls\n`);

  let processed = 0;

  for (const call of calls) {
    const messages = call.enhancedTranscript;
    if (!messages || !Array.isArray(messages) || messages.length === 0) continue;

    // Check if already has varied sentiments
    const sentiments = new Set(messages.map(m => m.sentiment));
    if (sentiments.size > 1) {
      console.log(`[${call.id.substring(0, 8)}] Already has varied sentiments, skipping...`);
      continue;
    }

    console.log(`[${call.id.substring(0, 8)}] Analyzing ${messages.length} messages...`);

    // Analyze sentiments
    const sentimentMap = await analyzeSentiments(messages);

    // Update messages with sentiments
    const updatedMessages = messages.map((msg, i) => ({
      ...msg,
      sentiment: sentimentMap[i] || msg.sentiment || 'neutral'
    }));

    // Count sentiments
    const counts = { positive: 0, negative: 0, neutral: 0 };
    updatedMessages.forEach(m => counts[m.sentiment]++);
    console.log(`  → Sentiments: ${counts.positive} positive, ${counts.negative} negative, ${counts.neutral} neutral`);

    // Update call
    await prisma.telecallerCall.update({
      where: { id: call.id },
      data: { enhancedTranscript: updatedMessages }
    });

    processed++;

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`Processed ${processed} calls`);

  await prisma.$disconnect();
}

addMessageSentiments().catch(console.error);
