const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupSystemRoles() {
  try {
    // Step 1: Get all unique roles from existing organizations (learn from DB, not hardcode)
    const existingRoles = await prisma.role.findMany({
      where: { organizationId: { not: null } },
      distinct: ['name'],
      select: { name: true, slug: true, description: true }
    });

    console.log('=== Discovered Role Types from Database ===');
    existingRoles.forEach(r => console.log('  -', r.name, '| slug:', r.slug));

    // Step 2: Create system-level roles (organizationId = null) if they don't exist
    console.log('\n=== Creating System-Level Roles ===');
    for (const role of existingRoles) {
      const existing = await prisma.role.findFirst({
        where: {
          organizationId: null,
          slug: role.slug
        }
      });

      if (!existing) {
        await prisma.role.create({
          data: {
            organizationId: null,
            name: role.name,
            slug: role.slug,
            description: role.description || `${role.name} role`,
            isSystem: true,
            permissions: []
          }
        });
        console.log('  + Created system role:', role.name);
      } else {
        console.log('  - Already exists:', role.name);
      }
    }

    // Step 3: Add missing roles to Smartgrow Info Tech
    const org = await prisma.organization.findFirst({
      where: { name: 'Smartgrow Info Tech' }
    });

    if (org) {
      console.log('\n=== Adding Missing Roles to', org.name, '===');

      const orgRoles = await prisma.role.findMany({
        where: { organizationId: org.id }
      });
      const orgRoleNames = orgRoles.map(r => r.name);

      // Get system roles to copy
      const systemRoles = await prisma.role.findMany({
        where: { organizationId: null, isSystem: true }
      });

      for (const sysRole of systemRoles) {
        if (!orgRoleNames.includes(sysRole.name)) {
          await prisma.role.create({
            data: {
              organizationId: org.id,
              name: sysRole.name,
              slug: sysRole.slug,
              description: sysRole.description,
              isSystem: false,
              permissions: sysRole.permissions || []
            }
          });
          console.log('  + Added:', sysRole.name);
        } else {
          console.log('  - Already has:', sysRole.name);
        }
      }
    }

    // Step 4: Show final state
    const finalOrgRoles = await prisma.role.findMany({
      where: { organizationId: org?.id },
      orderBy: { name: 'asc' }
    });

    console.log('\n=== Final Roles for Organization ===');
    finalOrgRoles.forEach(r => console.log('  -', r.name));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupSystemRoles();
