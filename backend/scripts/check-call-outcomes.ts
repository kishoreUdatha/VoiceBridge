import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const calls = await prisma.telecallerCall.findMany({
    include: { lead: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('\n=== Recent Calls ===');
  calls.forEach(call => {
    const name = call.lead
      ? `${call.lead.firstName || ''} ${call.lead.lastName || ''}`.trim()
      : call.contactName || 'Unknown';
    console.log(`- ${name}: outcome=${call.outcome || 'NULL'}, status=${call.status}`);
  });

  // Count by outcome
  const counts = await prisma.telecallerCall.groupBy({
    by: ['outcome'],
    _count: { outcome: true }
  });

  console.log('\n=== Outcome Counts ===');
  counts.forEach(c => {
    console.log(`${c.outcome || 'NULL'}: ${c._count.outcome}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
