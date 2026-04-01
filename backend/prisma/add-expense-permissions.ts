/**
 * Migration script to add expense permissions to existing roles
 *
 * Run with: npx ts-node prisma/add-expense-permissions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXPENSE_PERMISSIONS = {
  admin: ['expenses.approve', 'expenses.reject', 'expenses.mark_paid'],
  owner: ['expenses.approve', 'expenses.reject', 'expenses.mark_paid'],
  manager: ['expenses.approve', 'expenses.reject'],
};

async function addExpensePermissions() {
  console.log('Starting expense permissions migration...\n');

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
  });

  console.log(`Found ${organizations.length} organization(s)\n`);

  for (const org of organizations) {
    console.log(`Processing organization: ${org.name} (${org.id})`);

    // Get roles that should have expense permissions
    const roles = await prisma.role.findMany({
      where: {
        organizationId: org.id,
        slug: { in: ['admin', 'owner', 'manager'] },
      },
    });

    for (const role of roles) {
      const currentPermissions = (role.permissions as string[]) || [];
      const permissionsToAdd = EXPENSE_PERMISSIONS[role.slug as keyof typeof EXPENSE_PERMISSIONS] || [];

      // Filter out permissions that already exist
      const newPermissions = permissionsToAdd.filter(
        (p) => !currentPermissions.includes(p)
      );

      if (newPermissions.length === 0) {
        console.log(`  - ${role.name} (${role.slug}): Already has all expense permissions`);
        continue;
      }

      // Update role with new permissions
      const updatedPermissions = [...currentPermissions, ...newPermissions];

      await prisma.role.update({
        where: { id: role.id },
        data: { permissions: updatedPermissions },
      });

      console.log(`  - ${role.name} (${role.slug}): Added permissions: ${newPermissions.join(', ')}`);
    }

    // Check if manager role exists, create if not
    const managerRole = await prisma.role.findFirst({
      where: {
        organizationId: org.id,
        slug: 'manager',
      },
    });

    if (!managerRole) {
      await prisma.role.create({
        data: {
          organizationId: org.id,
          name: 'Manager',
          slug: 'manager',
          permissions: [
            'users.read',
            'leads.read',
            'leads.write',
            'leads.assign',
            'campaigns.read',
            'campaigns.write',
            'payments.read',
            'payments.write',
            'reports.read',
            'expenses.approve',
            'expenses.reject',
          ],
        },
      });
      console.log(`  - Created new Manager role with expense permissions`);
    }

    console.log('');
  }

  console.log('Migration completed successfully!');
}

addExpensePermissions()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
