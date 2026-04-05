import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const calls = await prisma.telecallerCall.findMany({
    where: { organizationId: '41b69d21-b342-4a63-872c-5b454cd23a86' },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('Latest 10 calls in Smartgrow:');
  calls.forEach(c => console.log('  ', c.createdAt));

  const total = await prisma.telecallerCall.count({
    where: { organizationId: '41b69d21-b342-4a63-872c-5b454cd23a86' }
  });
  console.log('\nTotal calls:', total);

  // Check what the frontend would query (today)
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  console.log('\nFrontend date range:');
  console.log('  From:', startOfDay.toISOString());
  console.log('  To:', endOfDay.toISOString());

  const todayCalls = await prisma.telecallerCall.count({
    where: {
      organizationId: '41b69d21-b342-4a63-872c-5b454cd23a86',
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
  console.log('  Calls in range:', todayCalls);

  await prisma.$disconnect();
}

check();
