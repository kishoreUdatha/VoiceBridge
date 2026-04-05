/**
 * Regenerate Agent Performance from Real Outbound Calls
 * Clears seeded data and recalculates from actual call records
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Regenerating Agent Performance from Real Calls ===\n');

  // Step 1: Clear seeded data
  console.log('Step 1: Clearing seeded agent performance data...');
  const deleted = await prisma.agentPerformanceDaily.deleteMany({});
  console.log(`Deleted ${deleted.count} seeded records\n`);

  // Step 2: Get all organizations with outbound calls
  console.log('Step 2: Finding organizations with outbound calls...');
  const orgs = await prisma.outboundCall.findMany({
    select: { agent: { select: { organizationId: true } } },
    distinct: ['agentId'],
  });
  const orgIds = [...new Set(orgs.map((o) => o.agent?.organizationId).filter(Boolean))] as string[];
  console.log(`Organizations with calls: ${orgIds.length}`);

  // Step 3: Get date range of calls
  const dateRange = await prisma.outboundCall.aggregate({
    _min: { createdAt: true },
    _max: { createdAt: true },
  });
  console.log(
    `Call date range: ${dateRange._min.createdAt?.toISOString().split('T')[0]} to ${dateRange._max.createdAt?.toISOString().split('T')[0]}\n`
  );

  // Step 4: Aggregate performance for each org and each day
  console.log('Step 3: Aggregating real call data...');
  let totalRecords = 0;

  for (const orgId of orgIds) {
    // Get all voice agents for this org
    const agents = await prisma.voiceAgent.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true },
    });

    console.log(`\nProcessing org ${orgId.slice(0, 8)}... with ${agents.length} agents`);

    // Get all dates with calls
    const calls = await prisma.outboundCall.findMany({
      where: { agent: { organizationId: orgId } },
      select: { createdAt: true },
    });

    const dates = [...new Set(calls.map((c) => c.createdAt.toISOString().split('T')[0]))];
    console.log(`  Days with calls: ${dates.length}`);

    for (const dateStr of dates) {
      const date = new Date(dateStr);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      for (const agent of agents) {
        // Get calls for this agent on this day
        const dayCalls = await prisma.outboundCall.findMany({
          where: {
            agentId: agent.id,
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        });

        if (dayCalls.length === 0) continue;

        const totalCalls = dayCalls.length;
        const answeredCalls = dayCalls.filter((c) => c.status === 'COMPLETED' && c.duration && c.duration > 0).length;
        const totalDuration = dayCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
        const interestedCount = dayCalls.filter((c) => c.outcome === 'INTERESTED').length;
        const appointmentsBooked = dayCalls.filter((c) => c.outcome === 'APPOINTMENT_BOOKED').length;
        const paymentsCollected = dayCalls.filter((c) => c.outcome === 'PAYMENT_COLLECTED').length;
        const leadsGenerated = dayCalls.filter((c) => c.leadGenerated).length;
        const callbacksRequested = dayCalls.filter((c) => c.outcome === 'CALLBACK_REQUESTED').length;
        const positiveCallsCount = dayCalls.filter((c) => c.sentiment === 'positive').length;
        const negativeCallsCount = dayCalls.filter((c) => c.sentiment === 'negative').length;

        const avgCallDuration = answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0;
        const conversionRate = answeredCalls > 0 ? (interestedCount / answeredCalls) * 100 : 0;
        const answerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;
        const sentimentTotal = positiveCallsCount - negativeCallsCount;
        const avgSentimentScore = answeredCalls > 0 ? sentimentTotal / answeredCalls : 0;

        await prisma.agentPerformanceDaily.upsert({
          where: {
            organizationId_agentId_date: { organizationId: orgId, agentId: agent.id, date: startOfDay },
          },
          create: {
            organizationId: orgId,
            agentId: agent.id,
            agentName: agent.name,
            date: startOfDay,
            totalCalls,
            answeredCalls,
            avgCallDuration,
            totalTalkTime: totalDuration,
            interestedCount,
            appointmentsBooked,
            paymentsCollected,
            leadsGenerated,
            callbacksRequested,
            avgSentimentScore,
            positiveCallsCount,
            negativeCallsCount,
            conversionRate,
            answerRate,
          },
          update: {
            agentName: agent.name,
            totalCalls,
            answeredCalls,
            avgCallDuration,
            totalTalkTime: totalDuration,
            interestedCount,
            appointmentsBooked,
            paymentsCollected,
            leadsGenerated,
            callbacksRequested,
            avgSentimentScore,
            positiveCallsCount,
            negativeCallsCount,
            conversionRate,
            answerRate,
          },
        });
        totalRecords++;
      }
    }
  }

  // Step 5: Summary
  console.log('\n=== Results ===');
  const newCount = await prisma.agentPerformanceDaily.count();
  console.log(`New records created: ${newCount}`);

  const summary = await prisma.agentPerformanceDaily.groupBy({
    by: ['agentName'],
    _sum: { totalCalls: true, answeredCalls: true, interestedCount: true, appointmentsBooked: true },
    _count: { id: true },
  });

  console.log('\nAgent Performance (from real calls):');
  console.log('─'.repeat(70));
  summary.forEach((a) => {
    if (a._sum.totalCalls && a._sum.totalCalls > 0) {
      console.log(
        `  ${a.agentName}: ${a._sum.totalCalls} calls, ${a._sum.answeredCalls} answered, ${a._sum.interestedCount} interested, ${a._sum.appointmentsBooked} appts`
      );
    }
  });
  console.log('─'.repeat(70));
  console.log('\nDone! Refresh the Agent Performance page to see real data.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
