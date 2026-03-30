import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { role: true, organization: true }
  });

  console.log('=== ALL USERS ===');
  users.forEach(u => {
    console.log('User:', u.email, '| Role:', u.role?.name, '| Org:', u.organizationId);
  });

  const roles = await prisma.role.findMany();
  console.log('\n=== ALL ROLES ===');
  roles.forEach(r => {
    console.log('Role:', r.name, '| ID:', r.id);
  });

  await prisma.$disconnect();
}

main();
