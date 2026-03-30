const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // Find a telecaller user
    const user = await prisma.user.findFirst({
      where: {
        role: { name: { in: ['telecaller', 'Telecaller', 'counselor', 'Counselor'] } }
      },
      include: { role: true, organization: true }
    });

    if (!user) {
      console.log('No telecaller found. Checking all users...');
      const allUsers = await prisma.user.findMany({
        take: 5,
        include: { role: true }
      });
      console.log('Users:', allUsers.map(u => ({ id: u.id, email: u.email, role: u.role?.name })));
      return;
    }

    console.log('\n=== Testing Dashboard Stats Data Sources ===\n');
    console.log('User:', user.email, '| Role:', user.role?.name, '| Org:', user.organizationId);

    const userId = user.id;
    const organizationId = user.organizationId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Test all queries
    const [
      assignedLeads,
      assignedRawRecords,
      queueItems,
      todayFollowUps,
      todayCalls,
      totalLeads,
      outcomes,
      activities
    ] = await Promise.all([
      prisma.leadAssignment.count({ where: { assignedToId: userId, isActive: true } }),
      prisma.rawImportRecord.count({ where: { assignedToId: userId, status: { in: ['ASSIGNED', 'PENDING'] } } }),
      prisma.telecallerQueue.count({ where: { assignedToId: userId, status: { in: ['PENDING', 'CLAIMED'] } } }),
      prisma.followUp.count({ where: { assigneeId: userId, status: 'UPCOMING', scheduledAt: { gte: today, lte: todayEnd } } }),
      prisma.telecallerCall.count({ where: { telecallerId: userId, createdAt: { gte: today } } }),
      prisma.lead.count({ where: { organizationId, assignments: { some: { assignedToId: userId, isActive: true } } } }),
      prisma.telecallerCall.groupBy({ by: ['outcome'], where: { telecallerId: userId, outcome: { not: null } }, _count: { outcome: true } }),
      prisma.leadActivity.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 })
    ]);

    console.log('\n--- ASSIGNED DATA (Targets) ---');
    console.log('Assigned Leads:', assignedLeads);
    console.log('Assigned Raw Records:', assignedRawRecords);
    console.log('Queue Items:', queueItems);
    console.log('TOTAL TARGET:', assignedLeads + assignedRawRecords + queueItems);

    console.log('\n--- TODAY STATS ---');
    console.log('Today Calls:', todayCalls);
    console.log('Today Follow-ups Target:', todayFollowUps);

    console.log('\n--- LEAD STATS ---');
    console.log('Total Leads:', totalLeads);

    console.log('\n--- CALL OUTCOMES ---');
    console.log('Outcomes:', outcomes.map(o => ({ [o.outcome]: o._count.outcome })));

    console.log('\n--- RECENT ACTIVITIES ---');
    console.log('Activities:', activities.length);

    console.log('\n✅ All data is coming from DATABASE!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
