import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const visit = await prisma.collegeVisit.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { 
      id: true, 
      visitDate: true, 
      checkInTime: true,
      checkOutTime: true,
      college: { select: { name: true } }
    }
  });
  console.log('Latest Visit:');
  console.log('  College:', visit?.college?.name);
  console.log('  visitDate:', visit?.visitDate?.toISOString());
  console.log('  checkInTime:', visit?.checkInTime?.toISOString());
  console.log('  checkOutTime:', visit?.checkOutTime?.toISOString());
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log('\nToday (00:00):', today.toISOString());
}

main().catch(console.error).finally(() => prisma.$disconnect());
