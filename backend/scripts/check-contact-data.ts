import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const visit = await prisma.collegeVisit.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { 
      college: { select: { name: true, contacts: true } }
    }
  });
  console.log('Latest Visit Contact Data:');
  console.log('College:', visit?.college?.name);
  console.log('contactsMet type:', typeof visit?.contactsMet);
  console.log('contactsMet:', JSON.stringify(visit?.contactsMet, null, 2));
  
  console.log('\nCollege contacts from college table:');
  console.log('contacts:', JSON.stringify(visit?.college?.contacts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
