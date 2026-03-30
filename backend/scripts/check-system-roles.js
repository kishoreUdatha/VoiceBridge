const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSystemRoles() {
  try {
    // Check for system-level roles (organizationId is null or isSystem is true)
    const systemRoles = await prisma.role.findMany({
      where: {
        OR: [
          { organizationId: null },
          { isSystem: true }
        ]
      }
    });

    console.log('=== System-level Roles ===');
    console.log('Total:', systemRoles.length);
    systemRoles.forEach(r => console.log('  -', r.name, '| slug:', r.slug, '| isSystem:', r.isSystem));

    // Check all unique role names across all organizations
    const allRoles = await prisma.role.findMany({
      select: { name: true, slug: true, organizationId: true, isSystem: true }
    });

    const uniqueNames = [...new Set(allRoles.map(r => r.name))];
    console.log('\n=== Unique Role Names in System ===');
    uniqueNames.forEach(name => console.log('  -', name));

    // Check specific org roles
    const org = await prisma.organization.findFirst({
      where: { name: 'Smartgrow Info Tech' },
      include: { roles: true }
    });

    if (org) {
      console.log('\n=== Roles for', org.name, '===');
      org.roles.forEach(r => console.log('  -', r.name, '| slug:', r.slug));
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSystemRoles();
