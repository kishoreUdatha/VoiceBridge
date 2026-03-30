const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getRoles() {
  try {
    // Check roles table
    const roles = await prisma.role.findMany({
      select: { id: true, name: true, description: true, organizationId: true }
    });
    console.log('=== Roles in database ===');
    console.log('Total:', roles.length);
    roles.forEach(r => console.log('  -', r.name, ':', r.description || 'No description'));

    // Check user role enum distribution
    const userRoles = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });
    console.log('\n=== User role distribution ===');
    userRoles.forEach(r => console.log('  -', r.role, ':', r._count.role, 'users'));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

getRoles();
