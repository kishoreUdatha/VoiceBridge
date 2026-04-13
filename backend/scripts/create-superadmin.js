const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createSuperAdmin() {
  const email = 'superadmin@voicebridge.ai';
  const password = 'Admin@123';

  // Check if user already exists
  const existing = await prisma.user.findFirst({
    where: { email }
  });

  if (existing) {
    console.log('User already exists with email:', email);
    console.log('  ID:', existing.id);
    await prisma.$disconnect();
    return;
  }

  // Find or create super_admin role
  let superAdminRole = await prisma.role.findFirst({
    where: { slug: 'super_admin' }
  });

  if (!superAdminRole) {
    console.log('Creating super_admin role...');
    superAdminRole = await prisma.role.create({
      data: {
        name: 'Super Admin',
        slug: 'super_admin',
        description: 'Platform super administrator with full access',
        isSystem: true,
        permissions: {
          all: true,
          super_admin: true
        }
      }
    });
    console.log('Super admin role created:', superAdminRole.id);
  }

  // Find or create a platform organization for super admin
  let platformOrg = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug: 'voicebridge-platform' },
        { name: 'VoiceBridge Platform' }
      ]
    }
  });

  if (!platformOrg) {
    console.log('Creating platform organization...');
    platformOrg = await prisma.organization.create({
      data: {
        name: 'VoiceBridge Platform',
        slug: 'voicebridge-platform',
        email: 'admin@voicebridge.ai',
        industry: 'GENERAL',
        isActive: true
      }
    });
    console.log('Platform organization created:', platformOrg.id);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create super admin user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      roleId: superAdminRole.id,
      organizationId: platformOrg.id,
      isActive: true,
    }
  });

  console.log('');
  console.log('========================================');
  console.log('Super Admin user created successfully!');
  console.log('========================================');
  console.log('  ID:', user.id);
  console.log('  Email:', email);
  console.log('  Password:', password);
  console.log('  Role:', superAdminRole.name);
  console.log('  Organization:', platformOrg.name);
  console.log('========================================');

  await prisma.$disconnect();
}

createSuperAdmin().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
