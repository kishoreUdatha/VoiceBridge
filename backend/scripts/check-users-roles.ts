import { prisma } from '../src/config/database';

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      organizationId: true,
      role: { select: { name: true } }
    },
    take: 15
  });

  console.log('Users in database:');
  users.forEach(u => {
    console.log('  -', u.firstName, u.lastName);
    console.log('    Email:', u.email);
    console.log('    Role:', u.role?.name || 'No role');
    console.log('    Org ID:', u.organizationId);
    console.log();
  });

  await prisma.$disconnect();
}

checkUsers();
