const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const callId = process.argv[2] || 'ba5ff240-96a4-48e9-8f96-46949397b1dd';

  const call = await prisma.telecallerCall.findUnique({
    where: { id: callId },
    select: {
      transcript: true,
      enhancedTranscript: true,
      agentSpeakingTime: true,
      customerSpeakingTime: true
    }
  });

  if (!call) {
    console.log('Call not found:', callId);
    return;
  }

  console.log('=== RAW TRANSCRIPT (first 1000 chars) ===');
  console.log(call.transcript ? call.transcript.substring(0, 1000) : 'NULL');
  console.log('');

  console.log('=== ENHANCED TRANSCRIPT ===');
  const et = call.enhancedTranscript;
  if (et && Array.isArray(et)) {
    console.log('Total messages:', et.length);
    const agentCount = et.filter(m => m.role === 'assistant').length;
    const customerCount = et.filter(m => m.role === 'user').length;
    console.log('Agent messages:', agentCount);
    console.log('Customer messages:', customerCount);
    console.log('');
    console.log('First 6 messages:');
    et.slice(0, 6).forEach((m, i) => {
      console.log(`${i}: [${m.role}] ${(m.content || '').substring(0, 100)}`);
    });
  } else {
    console.log('No enhanced transcript or not an array');
  }

  console.log('');
  console.log('=== SPEAKING TIMES ===');
  console.log('Agent speaking time:', call.agentSpeakingTime, 'seconds');
  console.log('Customer speaking time:', call.customerSpeakingTime, 'seconds');

  await prisma.$disconnect();
}

main().catch(console.error);
