const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Total users
  const totalUsers = await prisma.user.count();
  console.log('Total users:', totalUsers);

  // Active users (isActive = true)
  const activeUsers = await prisma.user.count({ where: { isActive: true } });
  console.log('Active users (isActive=true):', activeUsers);

  // Inactive users
  const inactiveUsers = await prisma.user.count({ where: { isActive: false } });
  console.log('Inactive users (isActive=false):', inactiveUsers);

  // Sample users with their isActive status
  const sampleUsers = await prisma.user.findMany({
    take: 10,
    select: {
      email: true,
      isActive: true,
      lastLoginAt: true,
      organization: { select: { name: true, isActive: true } }
    }
  });

  console.log('\nSample users:');
  sampleUsers.forEach(u => {
    console.log(`  ${u.email} - isActive: ${u.isActive}, lastLogin: ${u.lastLoginAt}, org: ${u.organization?.name} (orgActive: ${u.organization?.isActive})`);
  });

  // Organizations
  const allOrgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      _count: { select: { users: true } }
    }
  });

  console.log('\nAll organizations:');
  allOrgs.forEach(o => {
    console.log(`  ${o.name} - isActive: ${o.isActive}, users: ${o._count.users}`);
  });

  const totalOrgs = await prisma.organization.count();
  const activeOrgs = await prisma.organization.count({ where: { isActive: true } });
  console.log('\nTotal organizations:', totalOrgs);
  console.log('Active organizations (isActive=true):', activeOrgs);

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
