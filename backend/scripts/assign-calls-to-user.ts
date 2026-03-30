import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignCalls() {
  // Find the user
  const user = await prisma.user.findFirst({
    where: { email: 'smartgrowoxrich5@gmail.com' },
    select: { id: true, firstName: true, lastName: true, organizationId: true }
  });

  if (!user) {
    console.log('User not found: smartgrowoxrich5@gmail.com');
    await prisma.$disconnect();
    return;
  }

  console.log('Found user:', user.firstName, user.lastName, '- ID:', user.id);
  console.log('Organization ID:', user.organizationId);

  // Update the Telugu test calls (aiAnalyzed = true)
  const result = await prisma.telecallerCall.updateMany({
    where: { aiAnalyzed: true },
    data: {
      telecallerId: user.id,
      organizationId: user.organizationId
    }
  });

  console.log('\nUpdated', result.count, 'calls');

  // Verify
  const calls = await prisma.telecallerCall.findMany({
    where: { aiAnalyzed: true },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      contactName: true,
      telecaller: { select: { firstName: true, lastName: true, email: true } }
    }
  });

  console.log('\nAssigned calls:');
  calls.forEach(c => {
    console.log(` - ${c.contactName} -> ${c.telecaller?.firstName} ${c.telecaller?.lastName} (${c.telecaller?.email})`);
  });

  await prisma.$disconnect();
}

assignCalls().catch(console.error);
