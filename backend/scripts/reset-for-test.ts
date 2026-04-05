import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Reset 50 ASSIGNED records back to PENDING for testing
  const records = await prisma.rawImportRecord.findMany({
    where: {
      organizationId: '32b9a532-41b3-44f0-8b48-eab4b2923deb',
      status: 'ASSIGNED'
    },
    take: 50,
    select: { id: true }
  });

  if (records.length === 0) {
    console.log('No ASSIGNED records found to reset');
    return;
  }

  await prisma.rawImportRecord.updateMany({
    where: { id: { in: records.map(r => r.id) }},
    data: { status: 'PENDING', assignedToId: null, assignedAt: null }
  });

  console.log('✅ Reset', records.length, 'records to PENDING for testing');
  console.log('Now go to the UI and click Run on the schedule!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
