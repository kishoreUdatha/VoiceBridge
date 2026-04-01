import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const visits = await prisma.collegeVisit.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, organizationId: true, college: { select: { name: true } } }
  });
  console.log('=== Visit Organization IDs ===');
  visits.forEach(v => console.log('  Visit:', v.college?.name, '| OrgId:', v.organizationId));

  const users = await prisma.user.findMany({
    where: { email: { contains: 'fieldsales' } },
    select: { email: true, organizationId: true, firstName: true }
  });
  console.log('\n=== Field Sales User ===');
  users.forEach(u => console.log('  User:', u.email, '| OrgId:', u.organizationId));

  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true }
  });
  console.log('\n=== Organizations ===');
  orgs.forEach(o => console.log('  OrgId:', o.id, '| Name:', o.name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
