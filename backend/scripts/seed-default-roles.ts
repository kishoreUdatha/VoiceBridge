/**
 * Seed Default Roles Script
 *
 * This script creates the 6 default roles for a specific organization.
 * Usage: npx ts-node scripts/seed-default-roles.ts <organizationId>
 *
 * Or to seed for all organizations:
 * npx ts-node scripts/seed-default-roles.ts --all
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  {
    name: 'Admin',
    slug: 'admin',
    description: 'Full system access - Can manage users, settings, and all data',
    permissions: ['*'],
  },
  {
    name: 'Manager',
    slug: 'manager',
    description: 'Team management - Can view reports, manage team leads, and campaigns',
    permissions: ['leads:*', 'users:read', 'campaigns:*', 'reports:*', 'forms:read', 'analytics:read'],
  },
  {
    name: 'Team Lead',
    slug: 'team_lead',
    description: 'Team supervision - Can monitor telecallers, view team reports and analytics',
    permissions: ['leads:*', 'users:read', 'reports:read', 'analytics:read'],
  },
  {
    name: 'Counselor',
    slug: 'counselor',
    description: 'Lead counseling - Can manage assigned leads, follow-ups, and notes',
    permissions: ['leads:read', 'leads:update', 'campaigns:read', 'forms:read'],
  },
  {
    name: 'Telecaller',
    slug: 'telecaller',
    description: 'Initial contact - Can call leads and update basic information',
    permissions: ['leads:read', 'leads:update'],
  },
  {
    name: 'Field Sales',
    slug: 'field_sales',
    description: 'Field sales representative - Visits clients, manages deals and expenses',
    permissions: ['leads:*', 'visits:*', 'deals:*', 'expenses:*'],
  },
];

async function seedRolesForOrganization(organizationId: string) {
  console.log(`\nSeeding roles for organization: ${organizationId}`);

  let created = 0;
  let skipped = 0;

  for (const role of DEFAULT_ROLES) {
    const existing = await prisma.role.findFirst({
      where: {
        organizationId,
        slug: role.slug,
      },
    });

    if (existing) {
      console.log(`  ⏭️  ${role.name} (${role.slug}) - already exists`);
      skipped++;
    } else {
      await prisma.role.create({
        data: {
          organizationId,
          name: role.name,
          slug: role.slug,
          description: role.description,
          permissions: role.permissions,
          isSystem: false,
        },
      });
      console.log(`  ✅ ${role.name} (${role.slug}) - created`);
      created++;
    }
  }

  console.log(`  Summary: ${created} created, ${skipped} skipped`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  npx ts-node scripts/seed-default-roles.ts <organizationId>');
    console.log('  npx ts-node scripts/seed-default-roles.ts --all');
    process.exit(1);
  }

  if (args[0] === '--all') {
    console.log('🌱 Seeding default roles for ALL organizations...\n');

    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true },
    });

    console.log(`Found ${organizations.length} organization(s)\n`);

    for (const org of organizations) {
      console.log(`📦 Organization: ${org.name}`);
      await seedRolesForOrganization(org.id);
    }
  } else {
    const organizationId = args[0];

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      console.error(`❌ Organization not found: ${organizationId}`);
      process.exit(1);
    }

    console.log(`🌱 Seeding default roles for: ${org.name}`);
    await seedRolesForOrganization(organizationId);
  }

  console.log('\n✅ Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
