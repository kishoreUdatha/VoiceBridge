import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const telecaller = await prisma.user.findFirst({
    where: { email: 'telecaller@demo.com' },
    select: { id: true, firstName: true, organizationId: true }
  });
  console.log('Telecaller:', telecaller);

  if (!telecaller) {
    console.log('No telecaller found');
    return;
  }

  // Check assigned leads
  const leads = await prisma.lead.count({
    where: {
      organizationId: telecaller.organizationId!,
      assignments: { some: { assignedToId: telecaller.id, isActive: true } }
    }
  });
  console.log('\nAssigned leads count:', leads);

  // Check leads by stage
  const leadsWithStages = await prisma.lead.findMany({
    where: {
      organizationId: telecaller.organizationId!,
      assignments: { some: { assignedToId: telecaller.id, isActive: true } }
    },
    select: {
      firstName: true,
      lastName: true,
      stage: { select: { name: true } }
    }
  });
  console.log('\nLeads with stages:');
  leadsWithStages.forEach(l => console.log(' -', l.firstName, l.lastName, '| Stage:', l.stage?.name));

  // Count by stage
  const byStage: Record<string, number> = {};
  leadsWithStages.forEach(l => {
    const stage = l.stage?.name || 'New';
    byStage[stage] = (byStage[stage] || 0) + 1;
  });
  console.log('\nBy Stage:', byStage);

  // Check converted (not New)
  const converted = await prisma.lead.count({
    where: {
      organizationId: telecaller.organizationId!,
      assignments: { some: { assignedToId: telecaller.id, isActive: true } },
      stage: { name: { notIn: ['New', 'NEW', 'new'] } }
    }
  });
  console.log('\nConverted (not New):', converted);

  // Check won
  const won = await prisma.lead.count({
    where: {
      organizationId: telecaller.organizationId!,
      assignments: { some: { assignedToId: telecaller.id, isActive: true } },
      stage: { name: { in: ['Won', 'WON', 'Enrolled', 'ENROLLED'] } }
    }
  });
  console.log('Won:', won);

  await prisma.$disconnect();
}

test().catch(console.error);
