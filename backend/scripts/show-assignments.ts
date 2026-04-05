import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orgId = '32b9a532-41b3-44f0-8b48-eab4b2923deb';

  // Get assignment stats grouped by telecaller
  const stats = await prisma.rawImportRecord.groupBy({
    by: ['assignedToId'],
    where: {
      organizationId: orgId,
      assignedToId: { not: null },
    },
    _count: { id: true },
  });

  console.log('\n📊 TELECALLER ASSIGNMENT SUMMARY\n');
  console.log('─'.repeat(50));

  for (const s of stats) {
    if (s.assignedToId) {
      const user = await prisma.user.findUnique({
        where: { id: s.assignedToId },
        select: { firstName: true, lastName: true, email: true }
      });
      console.log(`👤 ${user?.firstName} ${user?.lastName}`);
      console.log(`   Email: ${user?.email}`);
      console.log(`   Assigned: ${s._count.id} leads`);
      console.log('─'.repeat(50));
    }
  }

  const unassigned = await prisma.rawImportRecord.count({
    where: {
      organizationId: orgId,
      status: 'PENDING',
      assignedToId: null,
    },
  });

  console.log(`\n⏳ Unassigned (Pending): ${unassigned} leads`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
