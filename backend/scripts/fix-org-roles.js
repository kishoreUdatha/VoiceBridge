const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOrgRoles() {
  try {
    // Find the organization
    const org = await prisma.organization.findFirst({
      where: { name: 'Smartgrow Info Tech' }
    });

    if (!org) {
      console.log('Organization not found');
      return;
    }

    console.log('Organization:', org.name, '(', org.id, ')');

    // Get existing roles for this org
    const existingRoles = await prisma.role.findMany({
      where: { organizationId: org.id }
    });

    console.log('\nExisting roles:');
    existingRoles.forEach(r => console.log('  -', r.name));

    // Define all required roles
    const requiredRoles = [
      { name: 'Admin', slug: 'admin', description: 'Full system access - Can manage users, settings, and all data' },
      { name: 'Manager', slug: 'manager', description: 'Team management - Can view reports, manage team leads, and campaigns' },
      { name: 'Counselor', slug: 'counselor', description: 'Lead counseling - Can manage assigned leads, follow-ups, and notes' },
      { name: 'Telecaller', slug: 'telecaller', description: 'Initial contact - Can call leads and update basic information' },
      { name: 'Student', slug: 'student', description: 'Student role with limited access' }
    ];

    // Add missing roles
    const existingNames = existingRoles.map(r => r.name);
    const missingRoles = requiredRoles.filter(r => !existingNames.includes(r.name));

    if (missingRoles.length === 0) {
      console.log('\nAll roles already exist!');
    } else {
      console.log('\nAdding missing roles:');
      for (const role of missingRoles) {
        await prisma.role.create({
          data: {
            organizationId: org.id,
            name: role.name,
            slug: role.slug,
            description: role.description
          }
        });
        console.log('  + Created:', role.name);
      }
    }

    // Show final roles
    const finalRoles = await prisma.role.findMany({
      where: { organizationId: org.id },
      orderBy: { name: 'asc' }
    });

    console.log('\nFinal roles for organization:');
    finalRoles.forEach(r => console.log('  -', r.name, ':', r.description || ''));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrgRoles();
