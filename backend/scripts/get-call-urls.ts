import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getCallIds() {
  const calls = await prisma.telecallerCall.findMany({
    where: { aiAnalyzed: true },
    orderBy: { startedAt: 'desc' },
    take: 5,
    select: { id: true, contactName: true }
  });

  console.log('\nTELUGU TEST CALL URLS:');
  console.log('='.repeat(70));
  calls.forEach(call => {
    console.log(`\n${call.contactName}:`);
    console.log(`  http://localhost:5174/outbound-calls/telecaller-calls/${call.id}/summary`);
  });
  console.log('\n' + '='.repeat(70));

  await prisma.$disconnect();
}

getCallIds().catch(console.error);
