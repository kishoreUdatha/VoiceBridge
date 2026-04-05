import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const userOrgId = '41b69d21-b342-4a63-872c-5b454cd23a86';

  // Check all roles in user's org
  const roles = await prisma.role.findMany({
    where: { organizationId: userOrgId },
    select: { id: true, name: true, slug: true }
  });
  console.log('Roles in Smartgrow Info Tech:');
  roles.forEach(r => console.log('  -', r.name, '(' + r.slug + ')', r.id));

  // Check users in org
  const users = await prisma.user.findMany({
    where: { organizationId: userOrgId },
    select: { id: true, firstName: true, lastName: true, role: { select: { name: true, slug: true } } }
  });
  console.log('\nUsers in Smartgrow Info Tech:');
  users.forEach(u => console.log('  -', u.firstName, u.lastName, '-', u.role?.name || 'No role'));

  // Check who made the calls
  const calls = await prisma.telecallerCall.findMany({
    where: { organizationId: userOrgId },
    select: { telecallerId: true },
    distinct: ['telecallerId']
  });
  console.log('\nUnique telecaller IDs in calls:', calls.map(c => c.telecallerId));

  // Check if those telecaller IDs exist
  for (const call of calls) {
    const user = await prisma.user.findUnique({
      where: { id: call.telecallerId },
      select: { firstName: true, lastName: true, organizationId: true }
    });
    console.log('  Telecaller', call.telecallerId, ':', user?.firstName, user?.lastName, '- Org:', user?.organizationId);
  }

  await prisma.$disconnect();
}

check();
