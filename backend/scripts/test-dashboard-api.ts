import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDashboardStats() {
  const telecaller = await prisma.user.findFirst({
    where: { email: 'telecaller@demo.com' },
    select: { id: true, firstName: true, organizationId: true }
  });

  if (!telecaller) {
    console.log('Telecaller not found');
    return;
  }

  console.log('Testing for user:', telecaller.firstName);
  console.log('User ID:', telecaller.id);
  console.log('Org ID:', telecaller.organizationId);

  const userId = telecaller.id;
  const organizationId = telecaller.organizationId!;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get start of current week (Monday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  startOfWeek.setHours(0, 0, 0, 0);

  console.log('\nToday:', today);
  console.log('Start of week:', startOfWeek);

  // 1. Total leads
  const totalLeads = await prisma.lead.count({
    where: {
      organizationId,
      assignments: { some: { assignedToId: userId, isActive: true } },
    },
  });
  console.log('\n1. Total assigned leads:', totalLeads);

  // 2. Leads by stage
  const leadsWithStages = await prisma.lead.findMany({
    where: {
      organizationId,
      assignments: { some: { assignedToId: userId, isActive: true } },
    },
    select: { stage: { select: { name: true } } },
  });

  const leadsByStage: Record<string, number> = {};
  leadsWithStages.forEach(lead => {
    const stageName = lead.stage?.name || 'New';
    leadsByStage[stageName] = (leadsByStage[stageName] || 0) + 1;
  });
  console.log('2. Leads by stage:', leadsByStage);

  // 3. Today's calls
  const todayCalls = await prisma.telecallerCall.count({
    where: { telecallerId: userId, createdAt: { gte: today } },
  });
  console.log('3. Today calls:', todayCalls);

  // 4. Pending follow-ups
  const pendingFollowUps = await prisma.followUp.count({
    where: {
      assigneeId: userId,
      status: 'UPCOMING',
    },
  });
  console.log('4. Pending follow-ups:', pendingFollowUps);

  // 5. Converted (not New)
  const converted = await prisma.lead.count({
    where: {
      organizationId,
      assignments: { some: { assignedToId: userId, isActive: true } },
      stage: { name: { notIn: ['New', 'NEW', 'new'] } },
    },
  });
  console.log('5. Converted (not New):', converted);

  // 6. Won
  const won = await prisma.lead.count({
    where: {
      organizationId,
      assignments: { some: { assignedToId: userId, isActive: true } },
      stage: { name: { in: ['Won', 'WON', 'Enrolled', 'ENROLLED'] } },
    },
  });
  console.log('6. Won:', won);

  // Calculate rates
  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
  const winRate = totalLeads > 0 ? Math.round((won / totalLeads) * 100) : 0;

  console.log('\n=== EXPECTED DASHBOARD DATA ===');
  console.log({
    leads: {
      total: totalLeads,
      byStage: leadsByStage,
      converted,
      won,
      conversionRate,
      winRate,
    },
    today: {
      calls: todayCalls,
      pendingFollowUps,
    }
  });

  await prisma.$disconnect();
}

testDashboardStats().catch(console.error);
