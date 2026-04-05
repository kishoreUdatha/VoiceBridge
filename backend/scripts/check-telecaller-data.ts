/**
 * Check Telecaller Calls Data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Telecaller Calls Analysis ===\n');

  // Check telecaller calls
  const telecallerCalls = await prisma.telecallerCall.count();
  console.log('Total telecaller calls:', telecallerCalls);

  if (telecallerCalls > 0) {
    // Get telecaller breakdown
    const byTelecaller = await prisma.telecallerCall.groupBy({
      by: ['telecallerId'],
      _count: { id: true },
      _sum: { duration: true },
    });

    console.log('\nTelecaller call breakdown:');
    for (const t of byTelecaller) {
      const user = await prisma.user.findUnique({
        where: { id: t.telecallerId },
        select: { firstName: true, lastName: true },
      });
      const userName = user ? `${user.firstName} ${user.lastName}`.trim() : t.telecallerId.slice(0, 8);
      console.log(`  - ${userName}: ${t._count.id} calls, ${t._sum.duration || 0}s total`);
    }

    // Check outcomes
    const outcomes = await prisma.telecallerCall.groupBy({
      by: ['outcome'],
      _count: { id: true },
    });
    console.log('\nOutcomes:');
    outcomes.forEach((o) => console.log(`  - ${o.outcome || 'null'}: ${o._count.id}`));

    // Date range
    const dateRange = await prisma.telecallerCall.aggregate({
      _min: { createdAt: true },
      _max: { createdAt: true },
    });
    console.log(
      `\nDate range: ${dateRange._min.createdAt?.toISOString().split('T')[0]} to ${dateRange._max.createdAt?.toISOString().split('T')[0]}`
    );
  } else {
    console.log('\nNo telecaller calls found in the database.');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
