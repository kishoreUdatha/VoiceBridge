import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get some scheduled visits
  const visits = await prisma.collegeVisit.findMany({
    where: {
      checkOutTime: null,
    },
    take: 5,
    orderBy: { visitDate: 'desc' },
  });

  console.log(`Found ${visits.length} visits to complete`);

  const outcomes = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'DECISION_PENDING', 'DEAL_WON'];
  const summaries = [
    'Had a productive meeting with the principal. They showed strong interest in our program.',
    'Discussed requirements and pricing. They need time to review the proposal.',
    'Met with department heads. Some concerns about implementation timeline.',
    'Good initial conversation. Need to follow up with more details next week.',
    'Presented the demo successfully. Decision pending from management.',
  ];

  for (let i = 0; i < visits.length; i++) {
    const visit = visits[i];
    const checkInTime = new Date(visit.visitDate);
    checkInTime.setHours(10, 30, 0, 0);

    const checkOutTime = new Date(checkInTime);
    checkOutTime.setHours(checkOutTime.getHours() + 1 + Math.floor(Math.random() * 2));
    checkOutTime.setMinutes(Math.floor(Math.random() * 60));

    const duration = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000);

    await prisma.collegeVisit.update({
      where: { id: visit.id },
      data: {
        checkInTime,
        checkOutTime,
        duration,
        outcome: outcomes[i % outcomes.length] as any,
        summary: summaries[i % summaries.length],
        locationVerified: true,
      },
    });

    console.log(`Completed visit ${i + 1}: ${outcomes[i % outcomes.length]}`);
  }

  console.log('\nDone! Visits have been marked as completed with outcomes.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
