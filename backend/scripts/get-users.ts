import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      firstName: true,
      lastName: true,
      role: { select: { name: true, slug: true } }
    },
    take: 10
  });

  console.log('\nAvailable users in database:');
  console.log('─'.repeat(60));
  users.forEach(u => {
    console.log(`  Email: ${u.email}`);
    console.log(`  Name: ${u.firstName} ${u.lastName}`);
    console.log(`  Role: ${u.role?.name || 'No role'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main();
