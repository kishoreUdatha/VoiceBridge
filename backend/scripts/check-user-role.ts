import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRole() {
  const user = await prisma.user.findFirst({
    where: { email: 'fieldsales@demo.com' },
    include: { role: true }
  });

  if (user) {
    console.log('=== User Details ===');
    console.log('Email:', user.email);
    console.log('Name:', user.firstName, user.lastName);
    console.log('Role ID:', user.roleId);
    console.log('Role Name:', user.role?.name);
    console.log('Role Slug:', user.role?.slug);
  } else {
    console.log('User not found');
  }

  await prisma.$disconnect();
}

checkRole();
