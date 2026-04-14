const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBadCall() {
  // Set duration to 0 since we don't know the actual call length
  const result = await prisma.telecallerCall.update({
    where: { id: '9ff08440-fe68-4e84-bbe8-bbe46a102dad' },
    data: { duration: 0 },
  });
  console.log('Fixed! New duration:', result.duration);

  // Verify new totals
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const calls = await prisma.telecallerCall.findMany({
    where: { startedAt: { gte: thirtyDaysAgo, lte: now } },
    select: { duration: true },
  });
  const callLogs = await prisma.callLog.findMany({
    where: { startedAt: { gte: thirtyDaysAgo, lte: now } },
    select: { duration: true },
  });

  const telecallerTotal = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
  const callLogTotal = callLogs.reduce((sum, c) => sum + (c.duration || 0), 0);

  console.log('');
  console.log('NEW TOTALS:');
  console.log('TelecallerCall:', (telecallerTotal/60).toFixed(2), 'minutes');
  console.log('CallLog:', (callLogTotal/60).toFixed(2), 'minutes');
  console.log('COMBINED:', ((telecallerTotal + callLogTotal)/60).toFixed(2), 'minutes');

  await prisma.$disconnect();
}

fixBadCall().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
