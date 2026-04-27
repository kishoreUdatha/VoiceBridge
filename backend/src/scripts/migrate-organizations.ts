/**
 * Migrate Organizations Script
 * Updates existing organizations to use the new dynamic industry system
 * Run with: npx ts-node src/scripts/migrate-organizations.ts
 *
 * Prerequisites: Run seed-industries.ts first to populate dynamic_industries table
 */

import { prisma } from '../config/database';

/**
 * Convert industry key to slug format
 * e.g., "REAL_ESTATE" -> "real-estate"
 */
function toSlug(key: string): string {
  return key.toLowerCase().replace(/_/g, '-');
}

async function migrateOrganizations() {
  console.log('Starting organization migration...\n');

  // First, ensure dynamic industries have been seeded
  const industriesCount = await prisma.dynamicIndustry.count();
  if (industriesCount === 0) {
    console.error('ERROR: No dynamic industries found in database.');
    console.error('Please run seed-industries.ts first.');
    process.exit(1);
  }
  console.log(`Found ${industriesCount} dynamic industries in database.\n`);

  // Get all organizations with legacy industry field set
  const organizations = await prisma.organization.findMany({
    where: {
      industry: { not: null },
      // Only migrate those not yet migrated
      dynamicIndustryId: null,
    },
    select: {
      id: true,
      name: true,
      industry: true,
    },
  });

  console.log(`Found ${organizations.length} organizations to migrate.\n`);

  let migrated = 0;
  let failed = 0;
  const errors: { orgId: string; orgName: string; error: string }[] = [];

  for (const org of organizations) {
    try {
      if (!org.industry) {
        console.log(`Skipping ${org.name}: No industry set`);
        continue;
      }

      const industrySlug = toSlug(org.industry);

      // Find the corresponding dynamic industry
      const dynamicIndustry = await prisma.dynamicIndustry.findUnique({
        where: { slug: industrySlug },
      });

      if (!dynamicIndustry) {
        console.warn(`Warning: No dynamic industry found for ${org.industry} (${industrySlug})`);
        errors.push({
          orgId: org.id,
          orgName: org.name,
          error: `No dynamic industry found for ${org.industry}`,
        });
        failed++;
        continue;
      }

      // Update the organization with new dynamic industry fields
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          dynamicIndustryId: dynamicIndustry.id,
          industrySlug: dynamicIndustry.slug,
        },
      });

      console.log(`Migrated: ${org.name} -> ${dynamicIndustry.slug}`);
      migrated++;

    } catch (error: any) {
      console.error(`Error migrating ${org.name}:`, error.message);
      errors.push({
        orgId: org.id,
        orgName: org.name,
        error: error.message,
      });
      failed++;
    }
  }

  console.log('\n============================================');
  console.log('      MIGRATION SUMMARY');
  console.log('============================================');
  console.log(`  Organizations migrated: ${migrated}`);
  console.log(`  Organizations failed: ${failed}`);
  console.log(`  Organizations skipped: ${organizations.length - migrated - failed}`);
  console.log('============================================\n');

  if (errors.length > 0) {
    console.log('Errors encountered:');
    for (const err of errors) {
      console.log(`  - ${err.orgName} (${err.orgId}): ${err.error}`);
    }
    console.log('');
  }

  // Show final statistics
  const stats = await prisma.organization.groupBy({
    by: ['industrySlug'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  console.log('Organizations by industry slug:');
  for (const stat of stats) {
    console.log(`  ${stat.industrySlug || '(none)'}: ${stat._count.id}`);
  }

  // Check for organizations still not migrated
  const remaining = await prisma.organization.count({
    where: {
      industry: { not: null },
      dynamicIndustryId: null,
    },
  });

  if (remaining > 0) {
    console.log(`\nWarning: ${remaining} organizations still need migration.`);
  } else {
    console.log('\nAll organizations have been migrated successfully!');
  }
}

// Main execution
migrateOrganizations()
  .then(() => {
    console.log('\nMigration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
