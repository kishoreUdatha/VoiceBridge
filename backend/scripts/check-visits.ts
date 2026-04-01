import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const visits = await prisma.collegeVisit.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      college: { select: { name: true, city: true } },
      user: { select: { firstName: true, lastName: true, email: true } }
    }
  });

  console.log('=== Recent Visits ===\n');
  visits.forEach((v, i) => {
    console.log(`--- Visit ${i+1} ---`);
    console.log('ID:', v.id);
    console.log('College:', v.college?.name, '-', v.college?.city);
    console.log('User:', v.user?.firstName, v.user?.lastName, `(${v.user?.email})`);
    console.log('Purpose:', v.purpose);
    console.log('Check In:', v.checkInTime?.toLocaleString());
    console.log('Check Out:', v.checkOutTime?.toLocaleString());
    console.log('Duration:', v.duration, 'mins');
    console.log('Outcome:', v.outcome);
    console.log('Summary:', v.summary || '(none)');
    console.log('Contacts Met:', v.contactsMet || '(none)');
    console.log('');
  });

  const total = await prisma.collegeVisit.count();
  console.log('Total visits in database:', total);
}

main().catch(console.error).finally(() => prisma.$disconnect());
