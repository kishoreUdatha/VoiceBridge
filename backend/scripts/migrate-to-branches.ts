/**
 * Migration Script: Multi-Branch Support
 *
 * This script migrates existing organizations to the multi-branch model:
 * 1. Creates a default "Headquarters" branch for each organization
 * 2. Assigns all existing users to the HQ branch
 * 3. Assigns all existing leads to the HQ branch
 * 4. Assigns all existing campaigns to the HQ branch
 * 5. Assigns all existing colleges to the HQ branch
 * 6. Assigns all existing raw import records to the HQ branch
 *
 * Run with: npx ts-node scripts/migrate-to-branches.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
  organizationsProcessed: number;
  branchesCreated: number;
  usersUpdated: number;
  leadsUpdated: number;
  campaignsUpdated: number;
  collegesUpdated: number;
  rawImportsUpdated: number;
  errors: string[];
}

async function migrateToBranches(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    organizationsProcessed: 0,
    branchesCreated: 0,
    usersUpdated: 0,
    leadsUpdated: 0,
    campaignsUpdated: 0,
    collegesUpdated: 0,
    rawImportsUpdated: 0,
    errors: [],
  };

  console.log('Starting multi-branch migration...\n');

  try {
    // Get all organizations
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        _count: {
          select: {
            users: true,
            leads: true,
            campaigns: true,
            colleges: true,
            rawImportRecords: true,
          },
        },
      },
    });

    console.log(`Found ${organizations.length} organizations to process\n`);

    for (const org of organizations) {
      console.log(`Processing: ${org.name} (${org.id})`);
      console.log(`  - Users: ${org._count.users}`);
      console.log(`  - Leads: ${org._count.leads}`);
      console.log(`  - Campaigns: ${org._count.campaigns}`);
      console.log(`  - Colleges: ${org._count.colleges}`);
      console.log(`  - Raw Imports: ${org._count.rawImportRecords}`);

      try {
        // Check if organization already has a branch
        const existingBranch = await prisma.branch.findFirst({
          where: { organizationId: org.id },
        });

        let hqBranchId: string;

        if (existingBranch) {
          console.log(`  - Skipping branch creation (already has branch: ${existingBranch.name})`);
          hqBranchId = existingBranch.id;
        } else {
          // Create headquarters branch
          const hqBranch = await prisma.branch.create({
            data: {
              organizationId: org.id,
              name: 'Headquarters',
              code: 'HQ-001',
              isHeadquarters: true,
              isActive: true,
              address: org.address || 'Main Office',
              city: 'Main City',
              state: 'State',
              country: 'India',
            },
          });

          hqBranchId = hqBranch.id;
          stats.branchesCreated++;
          console.log(`  - Created HQ branch: ${hqBranch.id}`);
        }

        // Update users without a branch
        const usersUpdated = await prisma.user.updateMany({
          where: {
            organizationId: org.id,
            branchId: null,
          },
          data: {
            branchId: hqBranchId,
          },
        });
        stats.usersUpdated += usersUpdated.count;
        console.log(`  - Updated ${usersUpdated.count} users`);

        // Update leads without a branch
        const leadsUpdated = await prisma.lead.updateMany({
          where: {
            organizationId: org.id,
            orgBranchId: null,
          },
          data: {
            orgBranchId: hqBranchId,
          },
        });
        stats.leadsUpdated += leadsUpdated.count;
        console.log(`  - Updated ${leadsUpdated.count} leads`);

        // Update campaigns without a branch
        const campaignsUpdated = await prisma.campaign.updateMany({
          where: {
            organizationId: org.id,
            orgBranchId: null,
          },
          data: {
            orgBranchId: hqBranchId,
          },
        });
        stats.campaignsUpdated += campaignsUpdated.count;
        console.log(`  - Updated ${campaignsUpdated.count} campaigns`);

        // Update colleges without a branch
        const collegesUpdated = await prisma.college.updateMany({
          where: {
            organizationId: org.id,
            orgBranchId: null,
          },
          data: {
            orgBranchId: hqBranchId,
          },
        });
        stats.collegesUpdated += collegesUpdated.count;
        console.log(`  - Updated ${collegesUpdated.count} colleges`);

        // Update raw import records without a branch
        const rawImportsUpdated = await prisma.rawImportRecord.updateMany({
          where: {
            organizationId: org.id,
            orgBranchId: null,
          },
          data: {
            orgBranchId: hqBranchId,
          },
        });
        stats.rawImportsUpdated += rawImportsUpdated.count;
        console.log(`  - Updated ${rawImportsUpdated.count} raw imports`);

        stats.organizationsProcessed++;
        console.log(`  - Done!\n`);
      } catch (error) {
        const errorMsg = `Error processing org ${org.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        stats.errors.push(errorMsg);
        console.error(`  - ERROR: ${errorMsg}\n`);
      }
    }
  } catch (error) {
    const errorMsg = `Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    stats.errors.push(errorMsg);
    console.error(errorMsg);
  }

  return stats;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Multi-Branch Migration Script');
  console.log('='.repeat(60) + '\n');

  const stats = await migrateToBranches();

  console.log('='.repeat(60));
  console.log('Migration Complete!');
  console.log('='.repeat(60));
  console.log('\nSummary:');
  console.log(`  Organizations processed: ${stats.organizationsProcessed}`);
  console.log(`  Branches created: ${stats.branchesCreated}`);
  console.log(`  Users updated: ${stats.usersUpdated}`);
  console.log(`  Leads updated: ${stats.leadsUpdated}`);
  console.log(`  Campaigns updated: ${stats.campaignsUpdated}`);
  console.log(`  Colleges updated: ${stats.collegesUpdated}`);
  console.log(`  Raw imports updated: ${stats.rawImportsUpdated}`);

  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    stats.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  } else {
    console.log('\nNo errors encountered!');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Migration failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
