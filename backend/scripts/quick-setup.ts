import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setup() {
  console.log('Creating demo organization and admin user...');

  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      email: 'admin@demo.com',
      phone: '+919876543210',
      isActive: true,
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
      },
    },
  });
  console.log('Organization created:', org.name);

  // Create admin role
  const role = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'admin' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Admin',
      slug: 'admin',
      description: 'Full system access',
      permissions: ['*'],
    },
  });
  console.log('Role created:', role.name);

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+919876543210',
      organizationId: org.id,
      roleId: role.id,
      isActive: true,
    },
  });
  console.log('User created:', user.email);

  console.log('\n✅ Setup complete!');
  console.log('Login credentials:');
  console.log('  Email: admin@demo.com');
  console.log('  Password: Admin@123');

  await prisma.$disconnect();
}

setup().catch(e => {
  console.error(e);
  process.exit(1);
});
