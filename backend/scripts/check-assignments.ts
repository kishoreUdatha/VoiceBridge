import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Get assignment summary by telecaller for your organization
  const assignments = await prisma.rawImportRecord.groupBy({
    by: ['assignedToId'],
    where: {
      organizationId: '32b9a532-41b3-44f0-8b48-eab4b2923deb',
      status: 'ASSIGNED',
      assignedToId: { not: null }
    },
    _count: true
  });

  console.log('\n📊 ASSIGNMENT SUMMARY BY TELECALLER\n');
  console.log('─'.repeat(60));

  for (const a of assignments) {
    if (a.assignedToId) {
      const user = await prisma.user.findUnique({
        where: { id: a.assignedToId },
        select: { name: true, email: true }
      });
      console.log(`👤 ${user?.name || 'Unknown'}`);
      console.log(`   Email: ${user?.email}`);
      console.log(`   Assigned Leads: ${a._count}`);
      console.log('─'.repeat(60));
    }
  }

  // Show recent assignments with details
  console.log('\n📋 RECENT ASSIGNMENTS (Last 10)\n');

  const recentAssignments = await prisma.rawImportRecord.findMany({
    where: {
      organizationId: '32b9a532-41b3-44f0-8b48-eab4b2923deb',
      status: 'ASSIGNED',
      assignedToId: { not: null }
    },
    orderBy: { assignedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      data: true,
      assignedAt: true,
      assignedTo: {
        select: { name: true, email: true }
      }
    }
  });

  recentAssignments.forEach((r, i) => {
    const data = r.data as any;
    const name = data?.name || data?.Name || data?.student_name || 'N/A';
    const phone = data?.phone || data?.Phone || data?.mobile || 'N/A';
    console.log(`${i + 1}. Lead: ${name} | Phone: ${phone}`);
    console.log(`   Assigned to: ${r.assignedTo?.name} (${r.assignedTo?.email})`);
    console.log(`   Assigned at: ${r.assignedAt?.toLocaleString() || 'N/A'}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
