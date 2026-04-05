/**
 * Regenerate Telecaller Performance from Real TelecallerCall Data
 * Processes ALL organizations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Regenerating Telecaller Performance Data ===\n');

  // Get all organizations
  const orgs = await prisma.organization.findMany();
  console.log('Organizations found:', orgs.length);

  // Clear ALL existing performance data
  const existingCount = await prisma.telecallerPerformanceDaily.count();
  console.log('Existing telecaller performance records:', existingCount);

  if (existingCount > 0) {
    console.log('Clearing existing telecaller performance data...');
    await prisma.telecallerPerformanceDaily.deleteMany();
    console.log('Cleared', existingCount, 'records');
  }

  let totalRecordsCreated = 0;

  for (const org of orgs) {
    console.log('\n--- Processing organization:', org.name, '---');

    // Get telecaller calls for this org
    const telecallerCalls = await prisma.telecallerCall.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'asc' },
    });
    console.log('Telecaller calls:', telecallerCalls.length);

    if (telecallerCalls.length === 0) {
      console.log('No telecaller calls to process');
      continue;
    }

    // Group calls by telecaller and date
    const groupedCalls: Record<string, Record<string, typeof telecallerCalls>> = {};

    for (const call of telecallerCalls) {
      const dateKey = call.createdAt.toISOString().split('T')[0];
      const telecallerId = call.telecallerId;

      if (!groupedCalls[telecallerId]) {
        groupedCalls[telecallerId] = {};
      }
      if (!groupedCalls[telecallerId][dateKey]) {
        groupedCalls[telecallerId][dateKey] = [];
      }
      groupedCalls[telecallerId][dateKey].push(call);
    }

    // Get telecaller names
    const telecallerIds = Object.keys(groupedCalls);
    const telecallers = await prisma.user.findMany({
      where: { id: { in: telecallerIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const telecallerNameMap: Record<string, string> = {};
    for (const t of telecallers) {
      telecallerNameMap[t.id] = ((t.firstName || '') + ' ' + (t.lastName || '')).trim() || 'Unknown';
    }

    // Create performance records
    let recordsCreated = 0;

    for (const telecallerId of telecallerIds) {
      const telecallerName = telecallerNameMap[telecallerId] || 'Unknown Telecaller';
      const dateGroups = groupedCalls[telecallerId];

      for (const dateKey of Object.keys(dateGroups)) {
        const calls = dateGroups[dateKey];
        const date = new Date(dateKey);
        date.setHours(0, 0, 0, 0);

        const totalCalls = calls.length;
        const answeredCalls = calls.filter((c) => c.status === 'COMPLETED' && c.duration && c.duration > 0).length;
        const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
        const interestedCount = calls.filter((c) => c.outcome === 'INTERESTED').length;
        const convertedCount = calls.filter((c) => c.outcome === 'CONVERTED').length;
        const callbacksRequested = calls.filter((c) => c.outcome === 'CALLBACK').length;
        const noAnswerCount = calls.filter((c) => c.outcome === 'NO_ANSWER').length;
        const wrongNumberCount = calls.filter((c) => c.outcome === 'WRONG_NUMBER').length;
        const busyCount = calls.filter((c) => c.outcome === 'BUSY').length;
        const notInterestedCount = calls.filter((c) => c.outcome === 'NOT_INTERESTED').length;
        const positiveCallsCount = calls.filter((c) => c.sentiment === 'positive').length;
        const negativeCallsCount = calls.filter((c) => c.sentiment === 'negative').length;

        const avgCallDuration = answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0;
        const conversionRate = answeredCalls > 0 ? (convertedCount / answeredCalls) * 100 : 0;
        const answerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;
        const avgSentimentScore = answeredCalls > 0 ? (positiveCallsCount - negativeCallsCount) / answeredCalls : 0;

        await prisma.telecallerPerformanceDaily.create({
          data: {
            organizationId: org.id,
            telecallerId,
            telecallerName,
            date,
            totalCalls,
            answeredCalls,
            avgCallDuration,
            totalTalkTime: totalDuration,
            interestedCount,
            convertedCount,
            callbacksRequested,
            noAnswerCount,
            wrongNumberCount,
            busyCount,
            notInterestedCount,
            avgSentimentScore,
            positiveCallsCount,
            negativeCallsCount,
            conversionRate,
            answerRate,
          },
        });
        recordsCreated++;
      }
    }

    console.log('Created', recordsCreated, 'performance records');
    totalRecordsCreated += recordsCreated;
  }

  console.log('\n=== Summary ===');
  console.log('Total records created:', totalRecordsCreated);

  // Final summary
  const byTelecaller = await prisma.telecallerPerformanceDaily.groupBy({
    by: ['telecallerName'],
    _sum: { totalCalls: true },
    _count: { id: true },
  });

  console.log('\nBy telecaller:');
  for (const t of byTelecaller) {
    console.log('  - ' + t.telecallerName + ': ' + t._sum.totalCalls + ' calls across ' + t._count.id + ' days');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
