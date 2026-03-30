import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.lead.findFirst({
    where: { phone: '8919301736' }
  });

  console.log('=== LEAD DETAILS ===');
  console.log('ID:', lead?.id);
  console.log('Name:', lead?.firstName, lead?.lastName);
  console.log('Phone:', lead?.phone);
  console.log('stageId:', lead?.stageId);
  console.log('isConverted:', lead?.isConverted);
  console.log('organizationId:', lead?.organizationId);
  console.log('createdAt:', lead?.createdAt);

  await prisma.$disconnect();
}

main();
