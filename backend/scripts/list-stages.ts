import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getStages() {
  const stages = await prisma.leadStage.findMany({
    select: { id: true, name: true, color: true, order: true },
    orderBy: { order: 'asc' }
  });

  console.log('\n=== Lead Stages ===\n');
  stages.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (Color: ${s.color || 'default'})`);
  });

  await prisma.$disconnect();
}

getStages().catch(console.error);
