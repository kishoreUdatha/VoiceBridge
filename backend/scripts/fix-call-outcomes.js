/**
 * Fix call outcomes - calls with transcripts that have both Agent and Customer
 * should not have NO_ANSWER outcome
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function fixCallOutcomes() {
  console.log('='.repeat(60));
  console.log('FIXING CALL OUTCOMES');
  console.log('='.repeat(60));
  console.log('');

  // Find calls with NO_ANSWER outcome but have transcripts with conversation
  const calls = await prisma.telecallerCall.findMany({
    where: {
      outcome: 'NO_ANSWER',
      transcript: { not: null },
      duration: { gt: 30 }, // At least 30 seconds
    },
    select: {
      id: true,
      outcome: true,
      duration: true,
      transcript: true,
      enhancedTranscript: true,
    }
  });

  console.log(`Found ${calls.length} calls with NO_ANSWER outcome\n`);

  let fixed = 0;

  for (const call of calls) {
    // Check if transcript has both Agent and Customer
    const hasAgentLabel = call.transcript?.includes('Agent:');
    const hasCustomerLabel = call.transcript?.includes('Customer:');

    // Or check enhancedTranscript
    const msgs = call.enhancedTranscript;
    const hasAgentMsg = msgs && Array.isArray(msgs) && msgs.some(m => m.role === 'assistant');
    const hasCustomerMsg = msgs && Array.isArray(msgs) && msgs.some(m => m.role === 'user');

    const hasConversation = (hasAgentLabel && hasCustomerLabel) || (hasAgentMsg && hasCustomerMsg);

    if (hasConversation) {
      console.log(`[${call.id.substring(0, 8)}] Has conversation, fixing outcome...`);

      // Update to INTERESTED or CALLBACK based on content
      const newOutcome = call.transcript?.toLowerCase().includes('interested') ||
                         call.transcript?.toLowerCase().includes('visit') ||
                         call.transcript?.toLowerCase().includes('ఇంట్రెస్ట్') // Telugu for interest
        ? 'INTERESTED'
        : 'CALLBACK';

      await prisma.telecallerCall.update({
        where: { id: call.id },
        data: { outcome: newOutcome }
      });

      console.log(`  → Updated outcome to ${newOutcome}`);
      fixed++;
    } else {
      console.log(`[${call.id.substring(0, 8)}] No conversation detected, keeping NO_ANSWER`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`Fixed ${fixed} calls`);
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

fixCallOutcomes().catch(console.error);
