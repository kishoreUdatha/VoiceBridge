import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFlow() {
  console.log('='.repeat(70));
  console.log('TELECALLER CALLS FLOW CHECK');
  console.log('='.repeat(70));

  // 1. Check total calls in database
  const totalCalls = await prisma.telecallerCall.count();
  console.log('\n1. DATABASE CHECK');
  console.log('   Total telecaller calls:', totalCalls);

  // 2. Check Telugu test calls
  const teluguCalls = await prisma.telecallerCall.findMany({
    where: {
      contactName: { in: ['రాజేష్ కుమార్', 'ప్రియ శర్మ', 'సురేష్ రెడ్డి', 'లావణ్య కృష్ణ', 'వెంకట్ నాయుడు'] }
    },
    include: {
      telecaller: true,
      lead: true
    }
  });

  console.log('\n2. TELUGU TEST CALLS:', teluguCalls.length);
  teluguCalls.forEach(call => {
    console.log('   -', call.contactName);
    console.log('     Outcome:', call.outcome, '| Sentiment:', call.sentiment);
    console.log('     AI Analyzed:', call.aiAnalyzed, '| Empathy Score:', call.coachingEmpathyScore);
    console.log('     Telecaller:', call.telecaller?.firstName, call.telecaller?.lastName);
    console.log('     Has Summary:', !!call.summary, '| Has Transcript:', !!call.transcript);
    console.log();
  });

  // 3. Check one call with full details
  if (teluguCalls.length > 0) {
    const sampleCall = teluguCalls[0];

    console.log('3. SAMPLE CALL SUMMARY DATA');
    console.log('   ID:', sampleCall.id);
    console.log('   Contact:', sampleCall.contactName);
    console.log('   Phone:', sampleCall.phoneNumber);
    console.log('   Duration:', sampleCall.duration, 'seconds');
    console.log('   Status:', sampleCall.status);
    console.log('   Outcome:', sampleCall.outcome);
    console.log('   Sentiment:', sampleCall.sentiment);
    console.log('   AI Analyzed:', sampleCall.aiAnalyzed);
    console.log();
    console.log('   SUMMARY (Telugu):');
    console.log('   ', sampleCall.summary);
    console.log();
    console.log('   COACHING SCORES:');
    console.log('     Empathy:', sampleCall.coachingEmpathyScore);
    console.log('     Objection:', sampleCall.coachingObjectionScore);
    console.log('     Closing:', sampleCall.coachingClosingScore);
    console.log();
    console.log('   COACHING SUMMARY (Telugu):');
    console.log('   ', sampleCall.coachingSummary);
    console.log();
    console.log('   TRANSCRIPT PREVIEW:');
    const lines = sampleCall.transcript?.split('\n').slice(0, 3) || [];
    lines.forEach(l => console.log('   ', l));
  }

  console.log('\n' + '='.repeat(70));
  console.log('FRONTEND URLS TO TEST');
  console.log('='.repeat(70));
  console.log('\n1. Telecaller Calls List:');
  console.log('   http://localhost:5174/outbound-calls');
  console.log('   -> Click "Telecaller Calls" tab');
  console.log();
  console.log('2. Individual Call Summaries:');
  teluguCalls.forEach(call => {
    console.log('   ' + call.contactName + ':');
    console.log('   http://localhost:5174/outbound-calls/telecaller-calls/' + call.id + '/summary');
  });

  await prisma.$disconnect();
}

checkFlow().catch(console.error);
