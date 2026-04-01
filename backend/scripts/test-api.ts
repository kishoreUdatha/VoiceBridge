import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Simulate what the API does
  const organizationId = '32b9a532-41b3-44f0-8b48-eab4b2923deb';

  const where = {
    organizationId: organizationId,
  };

  const visits = await prisma.collegeVisit.findMany({
    where,
    include: {
      college: {
        select: { id: true, name: true, city: true },
      },
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { visitDate: 'desc' },
    take: 10,
  });

  console.log('API would return', visits.length, 'visits:');
  visits.forEach((v, i) => {
    console.log((i+1) + '. ' + v.college?.name + ' - ' + v.visitDate.toLocaleDateString());
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
