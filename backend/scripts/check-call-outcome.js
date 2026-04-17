const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
  const call = await prisma.telecallerCall.findUnique({
    where: { id: 'ba5ff240-96a4-48e9-8f96-46949397b1dd' },
    select: {
      id: true,
      outcome: true,
      status: true,
      duration: true,
      transcript: true,
      summary: true,
      callQualityScore: true,
      coachingSummary: true,
    }
  });

  console.log('Outcome:', call?.outcome);
  console.log('Status:', call?.status);
  console.log('Duration:', call?.duration);
  console.log('Has Transcript:', call?.transcript ? 'Yes' : 'No');
  console.log('Has Summary:', call?.summary ? 'Yes' : 'No');
  console.log('Call Quality Score:', call?.callQualityScore);
  console.log('Has Coaching Summary:', call?.coachingSummary ? 'Yes' : 'No');

  // Check wasAnswered logic
  const unansweredOutcomes = ['NO_ANSWER', 'BUSY', 'FAILED', 'CANCELLED', 'VOICEMAIL'];
  const wasAnswered = !unansweredOutcomes.includes(call?.outcome);
  const hasConversation = call?.duration > 0 && (call?.transcript || call?.summary);
  console.log('');
  console.log('wasAnswered:', wasAnswered);
  console.log('hasConversation:', hasConversation);

  await prisma.$disconnect();
}
main();
