import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateLeads() {
  // Get telecaller's assigned leads
  const telecaller = await prisma.user.findFirst({
    where: { email: 'telecaller@demo.com' },
    select: { id: true, organizationId: true }
  });

  if (!telecaller) {
    console.log('Telecaller not found!');
    return;
  }

  const assignments = await prisma.leadAssignment.findMany({
    where: { assignedToId: telecaller.id, isActive: true },
    include: { lead: { select: { firstName: true, lastName: true } } }
  });

  console.log('Found', assignments.length, 'leads assigned to telecaller');

  // Get available stages
  const stages = await prisma.leadStage.findMany({
    where: { organizationId: telecaller.organizationId },
    select: { id: true, name: true },
    orderBy: { order: 'asc' }
  });
  console.log('Available stages:', stages.map(s => s.name).join(', '));
  console.log('');

  // Update each lead to a different stage
  const stageNames = ['New', 'Contacted', 'Qualified', 'Negotiation', 'Won'];

  for (let i = 0; i < assignments.length && i < stageNames.length; i++) {
    const stageName = stageNames[i];
    const stage = stages.find(s => s.name === stageName);

    if (stage) {
      const lead = assignments[i].lead;
      await prisma.lead.update({
        where: { id: assignments[i].leadId },
        data: { stageId: stage.id }
      });
      console.log(`✅ ${lead.firstName} ${lead.lastName} → ${stageName}`);
    }
  }

  console.log('\n🎉 Done! Refresh the leads page to see changes.');
  await prisma.$disconnect();
}

updateLeads().catch(console.error);
