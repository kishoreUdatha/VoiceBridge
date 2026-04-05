import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Check calls by org
  const callsByOrg = await prisma.telecallerCall.groupBy({
    by: ['organizationId'],
    _count: { _all: true }
  });
  console.log('Calls by org:');
  for (const c of callsByOrg) {
    const org = await prisma.organization.findUnique({ where: { id: c.organizationId }, select: { name: true } });
    console.log(`  ${org?.name}: ${c._count._all} calls (${c.organizationId})`);
  }

  // Check current user's org
  const user = await prisma.user.findFirst({
    where: { email: 'kishore.udatha@smartgrowinfotech.com' },
    select: { organizationId: true, organization: { select: { name: true } } }
  });
  console.log('\nCurrent user org:', user?.organization?.name, '(' + user?.organizationId + ')');

  // Check if there are telecallers in user's org
  const telecallerRole = await prisma.role.findFirst({
    where: { organizationId: user?.organizationId, slug: 'telecaller' }
  });

  if (telecallerRole) {
    const telecallers = await prisma.user.findMany({
      where: { organizationId: user?.organizationId, roleId: telecallerRole.id },
      select: { id: true, firstName: true, lastName: true }
    });
    console.log('\nTelecallers in user org:', telecallers);
  } else {
    console.log('\nNo telecaller role found in user org');
  }

  await prisma.$disconnect();
}

check();
