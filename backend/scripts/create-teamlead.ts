import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTeamLead() {
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

    // Find or create team_lead role
    let role = await prisma.role.findFirst({
      where: { slug: 'team_lead', organizationId: org.id }
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: 'Team Lead',
          slug: 'team_lead',
          organizationId: org.id,
          description: 'Team Lead - manages a team of telecallers',
          permissions: ['read:leads', 'write:leads', 'read:reports', 'read:assignments', 'write:assignments']
        }
      });
      console.log('Created team_lead role');
    } else {
      console.log('team_lead role already exists');
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { email: 'teamlead@demo.com' }
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
      console.log('Email: teamlead@demo.com');
      console.log('Password: Demo@123');
      console.log('========================================');
      return;
    }

    // Create new user
    const hashedPassword = await bcrypt.hash('Demo@123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'teamlead@demo.com',
        password: hashedPassword,
        firstName: 'Rahul',
        lastName: 'Sharma',
        phone: '+919876543210',
        roleId: role.id,
        organizationId: org.id,
        isActive: true
      }
    });

    console.log('');
    console.log('Team Lead user created successfully!');
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

createTeamLead();
