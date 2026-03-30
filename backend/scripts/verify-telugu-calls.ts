import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  const calls = await prisma.telecallerCall.findMany({
    where: { aiAnalyzed: true },
    orderBy: { startedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      contactName: true,
      outcome: true,
      sentiment: true,
      duration: true,
      transcript: true,
      summary: true,
      coachingEmpathyScore: true,
      coachingObjectionScore: true,
      coachingClosingScore: true,
      coachingSummary: true,
      extractedData: true,
    }
  });

  console.log('='.repeat(70));
  console.log('TELUGU TEST CALLS VERIFICATION');
  console.log('='.repeat(70));

  for (const call of calls) {
    console.log('\n' + '-'.repeat(70));
    console.log('Contact:', call.contactName);
    console.log('Outcome:', call.outcome, '| Sentiment:', call.sentiment);
    console.log('Duration:', call.duration, 'seconds');
    console.log('Scores - Empathy:', call.coachingEmpathyScore,
                '| Objection:', call.coachingObjectionScore,
                '| Closing:', call.coachingClosingScore);
    console.log('\nSummary (Telugu):');
    console.log('  ', call.summary);
    console.log('\nCoaching Summary (Telugu):');
    console.log('  ', call.coachingSummary);
    console.log('\nTranscript Preview (Telugu):');
    const transcriptLines = call.transcript?.split('\n').slice(0, 4) || [];
    transcriptLines.forEach(line => console.log('  ', line));
    console.log('\nExtracted Data:');
    console.log('  ', JSON.stringify(call.extractedData, null, 2));
  }

  console.log('\n' + '='.repeat(70));
  console.log('Total Telugu Test Calls:', calls.length);
  console.log('='.repeat(70));

  await prisma.$disconnect();
}

verify().catch(console.error);
