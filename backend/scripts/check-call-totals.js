const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCalls() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  console.log('=== CALL DATA VERIFICATION ===');
  console.log('Date Range:', thirtyDaysAgo.toISOString().split('T')[0], 'to', now.toISOString().split('T')[0]);
  console.log('');

  // Get call logs
  const callLogs = await prisma.callLog.findMany({
    where: { startedAt: { gte: thirtyDaysAgo, lte: now } },
    select: { id: true, duration: true, startedAt: true, status: true },
  });

  // Get telecaller calls
  const telecallerCalls = await prisma.telecallerCall.findMany({
    where: { startedAt: { gte: thirtyDaysAgo, lte: now } },
    select: { id: true, duration: true, startedAt: true, status: true },
  });

  const callLogTotal = callLogs.reduce((sum, c) => sum + (c.duration || 0), 0);
  const telecallerTotal = telecallerCalls.reduce((sum, c) => sum + (c.duration || 0), 0);

  console.log('CallLog table:');
  console.log('  Count:', callLogs.length);
  console.log('  Total seconds:', callLogTotal);
  console.log('  Total minutes:', (callLogTotal / 60).toFixed(2));
  console.log('');
  console.log('TelecallerCall table:');
  console.log('  Count:', telecallerCalls.length);
  console.log('  Total seconds:', telecallerTotal);
  console.log('  Total minutes:', (telecallerTotal / 60).toFixed(2));
  console.log('');
  console.log('COMBINED TOTAL:', ((callLogTotal + telecallerTotal) / 60).toFixed(2), 'minutes');
  console.log('');

  // Show all telecaller calls with duration
  console.log('All TelecallerCalls with duration > 0:');
  telecallerCalls
    .filter(c => c.duration > 0)
    .sort((a, b) => b.duration - a.duration)
    .forEach(c => {
      const date = c.startedAt ? c.startedAt.toISOString().split('T')[0] : 'N/A';
      console.log(`  ${date} | ${c.duration} sec (${(c.duration/60).toFixed(1)} min) | ${c.status}`);
    });

  await prisma.$disconnect();
}

checkCalls().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
