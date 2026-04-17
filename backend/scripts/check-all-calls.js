/**
 * Check all telecaller calls for proper speaker separation
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkAllCalls() {
  console.log('='.repeat(60));
  console.log('CHECKING ALL TELECALLER CALL TRANSCRIPTS');
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
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${calls.length} calls with transcripts\n`);

  let needsFix = [];
  let good = [];
  let noTranscript = [];

  for (const call of calls) {
    const messages = call.enhancedTranscript;
    const hasAgentInMessages = messages && Array.isArray(messages) && messages.some(m => m.role === 'assistant');
    const hasCustomerInMessages = messages && Array.isArray(messages) && messages.some(m => m.role === 'user');

    const transcriptHasAgent = call.transcript?.includes('Agent:');
    const transcriptHasCustomer = call.transcript?.includes('Customer:');

    const status = {
      id: call.id.substring(0, 8),
      duration: call.duration || 0,
      transcriptLength: call.transcript?.length || 0,
      messagesCount: messages?.length || 0,
      hasAgentInMessages,
      hasCustomerInMessages,
      transcriptHasLabels: transcriptHasAgent && transcriptHasCustomer,
    };

    if (!call.transcript || call.transcript.length < 50) {
      noTranscript.push(status);
    } else if (hasAgentInMessages && hasCustomerInMessages) {
      good.push(status);
    } else {
      needsFix.push(status);
    }
  }

  console.log('✅ GOOD (both speakers in enhancedTranscript):');
  console.log('-'.repeat(60));
  for (const c of good) {
    console.log(`  ${c.id}... | ${c.duration}s | ${c.messagesCount} msgs | Labels: ${c.transcriptHasLabels}`);
  }
  console.log(`  Total: ${good.length}\n`);

  console.log('⚠️  NEEDS FIX (missing speaker separation):');
  console.log('-'.repeat(60));
  for (const c of needsFix) {
    console.log(`  ${c.id}... | ${c.duration}s | ${c.messagesCount} msgs | Agent: ${c.hasAgentInMessages}, Customer: ${c.hasCustomerInMessages}`);
  }
  console.log(`  Total: ${needsFix.length}\n`);

  console.log('📝 TOO SHORT OR NO TRANSCRIPT:');
  console.log('-'.repeat(60));
  for (const c of noTranscript) {
    console.log(`  ${c.id}... | ${c.duration}s | ${c.transcriptLength} chars`);
  }
  console.log(`  Total: ${noTranscript.length}\n`);

  // Show details of calls needing fix
  if (needsFix.length > 0) {
    console.log('='.repeat(60));
    console.log('DETAILS OF CALLS NEEDING FIX:');
    console.log('='.repeat(60));

    for (const c of needsFix) {
      const fullCall = calls.find(call => call.id.startsWith(c.id));
      console.log(`\nCall ${c.id}:`);
      console.log('Transcript preview:', fullCall.transcript?.substring(0, 200) + '...');
      console.log('Enhanced messages:', JSON.stringify(fullCall.enhancedTranscript?.slice(0, 2)));
    }
  }

  await prisma.$disconnect();
}

checkAllCalls().catch(console.error);
