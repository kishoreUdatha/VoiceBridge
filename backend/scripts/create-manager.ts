import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createManager() {
  try {
    // Find organization
    const org = await prisma.organization.findFirst({
      where: { slug: 'smartgrow-edu' }
    }) || await prisma.organization.findFirst();

    if (!org) {
      console.log('No organization found');
      return;
    }

    console.log('Organization:', org.name);

    // Find or create manager role
    let role = await prisma.role.findFirst({
      where: { slug: 'manager', organizationId: org.id }
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: 'Manager',
          slug: 'manager',
          organizationId: org.id,
          description: 'Manager - full access to organization features',
          permissions: ['read:all', 'write:all', 'manage:users', 'manage:settings']
        }
      });
      console.log('Created manager role');
    } else {
      console.log('manager role already exists');
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { email: 'manager@demo.com' }
    });

    if (existingUser) {
      const hashedPassword = await bcrypt.hash('Demo@123', 10);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword, roleId: role.id }
      });
      console.log('');
      console.log('User already exists. Updated role and password.');
      console.log('========================================');
      console.log('Email: manager@demo.com');
      console.log('Password: Demo@123');
      console.log('========================================');
      return;
    }

    // Create new user
    const hashedPassword = await bcrypt.hash('Demo@123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'manager@demo.com',
        password: hashedPassword,
        firstName: 'Vikram',
        lastName: 'Patel',
        phone: '+919988776655',
        roleId: role.id,
        organizationId: org.id,
        isActive: true
      }
    });

    console.log('');
    console.log('Manager user created successfully!');
    console.log('========================================');
    console.log('Name:', user.firstName, user.lastName);
    console.log('Email:', user.email);
    console.log('Password: Demo@123');
    console.log('========================================');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createManager();
