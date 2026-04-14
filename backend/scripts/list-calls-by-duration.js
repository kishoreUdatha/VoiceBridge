const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listCalls() {
  const calls = await prisma.telecallerCall.findMany({
    where: { duration: { gt: 0 } },
    select: {
      id: true,
      duration: true,
      startedAt: true,
      endedAt: true,
      phoneNumber: true,
      contactName: true,
      status: true,
      outcome: true,
      telecaller: { select: { firstName: true, lastName: true } },
    },
    orderBy: { duration: 'desc' },
    take: 30,
  });

  console.log('=== ALL TELECALLER CALLS BY DURATION (Highest First) ===\n');

  let total = 0;
  calls.forEach((c, i) => {
    const mins = (c.duration / 60).toFixed(1);
    total += c.duration;
    const telecaller = c.telecaller ? `${c.telecaller.firstName} ${c.telecaller.lastName || ''}`.trim() : 'Unknown';
    const date = c.startedAt ? c.startedAt.toISOString().split('T')[0] : 'N/A';
    const time = c.startedAt ? c.startedAt.toISOString().split('T')[1].substring(0, 5) : '';

    console.log(`${i + 1}. ${c.duration} sec (${mins} min) | ${date} ${time} | ${telecaller}`);
    console.log(`   Phone: ${c.phoneNumber} | ${c.contactName || 'No name'}`);
    console.log(`   Status: ${c.status} | Outcome: ${c.outcome || '-'}`);
    console.log(`   ID: ${c.id}`);
    console.log('');
  });

  console.log('---');
  console.log(`Total duration of these ${calls.length} calls: ${(total / 60).toFixed(2)} minutes`);

  await prisma.$disconnect();
}

listCalls().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
