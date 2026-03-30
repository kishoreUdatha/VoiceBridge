import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showLeadActivity() {
  // Get a sample lead with activities
  const lead = await prisma.lead.findFirst({
    include: {
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      assignments: {
        include: { assignedTo: { select: { firstName: true, lastName: true } } }
      },
      stage: true
    }
  });

  if (lead) {
    console.log('\n=== Sample Lead Tracking ===');
    console.log('Lead:', lead.firstName, lead.lastName);
    console.log('Stage:', lead.stage?.name);
    console.log('Assigned To:', lead.assignments.map(a => `${a.assignedTo?.firstName} ${a.assignedTo?.lastName}`).join(', ') || 'Unassigned');

    console.log('\nActivities:');
    if (lead.activities.length > 0) {
      lead.activities.forEach(a => {
        console.log(`  - ${a.type}: ${a.title} (${a.createdAt.toLocaleString()})`);
      });
    } else {
      console.log('  No activities recorded');
    }
  }

  // Check telecaller calls
  const calls = await prisma.telecallerCall.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      telecaller: { select: { firstName: true, lastName: true } },
      lead: { select: { firstName: true, lastName: true } }
    }
  });

  console.log('\n=== Recent Telecaller Calls ===');
  if (calls.length > 0) {
    calls.forEach(c => {
      const leadName = c.lead ? `${c.lead.firstName} ${c.lead.lastName}` : c.contactName;
      console.log(`  - ${leadName} | Called by: ${c.telecaller?.firstName} | Status: ${c.status} | ${c.createdAt.toLocaleString()}`);
    });
  } else {
    console.log('  No calls recorded yet');
  }

  // Show activity types available
  const activityTypes = await prisma.leadActivity.groupBy({
    by: ['type'],
    _count: { type: true }
  });

  console.log('\n=== Activity Types in System ===');
  activityTypes.forEach(a => {
    console.log(`  - ${a.type}: ${a._count.type} records`);
  });

  await prisma.$disconnect();
}

showLeadActivity().catch(console.error);
