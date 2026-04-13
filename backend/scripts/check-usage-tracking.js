const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  console.log(`Current month: ${currentMonth}/${currentYear}`);

  // Check all usage tracking records
  const allUsage = await prisma.usageTracking.findMany();
  console.log(`\nTotal usage tracking records: ${allUsage.length}`);

  if (allUsage.length > 0) {
    console.log('\nAll records:');
    allUsage.forEach(u => {
      console.log(`  Org: ${u.organizationId}, Month: ${u.month}/${u.year}, Leads: ${u.leadsCount}, Calls: ${u.aiCallsCount}`);
    });
  }

  // Check this month's usage
  const thisMonthUsage = await prisma.usageTracking.findMany({
    where: {
      month: currentMonth,
      year: currentYear,
    }
  });
  console.log(`\nThis month's records: ${thisMonthUsage.length}`);

  // Get actual lead counts per organization
  const leadCounts = await prisma.lead.groupBy({
    by: ['organizationId'],
    _count: true,
  });
  console.log('\nActual lead counts by organization:');
  leadCounts.forEach(l => {
    console.log(`  Org ${l.organizationId}: ${l._count} leads`);
  });

  // Get actual call counts
  const callCounts = await prisma.telecallerCall.groupBy({
    by: ['organizationId'],
    _count: true,
  });
  console.log('\nActual telecaller call counts by organization:');
  callCounts.forEach(c => {
    console.log(`  Org ${c.organizationId}: ${c._count} calls`);
  });

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
