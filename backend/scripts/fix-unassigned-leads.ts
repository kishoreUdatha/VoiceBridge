/**
 * Fix Unassigned Leads Script
 *
 * This script finds leads that have no active assignment and assigns them
 * to the telecaller who qualified them (based on TelecallerCall records).
 *
 * Run with: npx ts-node scripts/fix-unassigned-leads.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUnassignedLeads() {
  console.log('Starting to fix unassigned leads...\n');

  // Find all leads without active assignments
  const unassignedLeads = await prisma.lead.findMany({
    where: {
      assignments: {
        none: {
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      organizationId: true,
      createdAt: true,
    },
  });

  console.log(`Found ${unassignedLeads.length} unassigned leads\n`);

  let fixedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const lead of unassignedLeads) {
    try {
      // Find the telecaller call that qualified this lead (by leadId or phone number)
      const qualifyingCall = await prisma.telecallerCall.findFirst({
        where: {
          organizationId: lead.organizationId,
          OR: [
            { leadId: lead.id },
            { phoneNumber: lead.phone || '' },
          ],
          outcome: {
            in: ['INTERESTED', 'CONVERTED', 'CALLBACK_SCHEDULED'],
          },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          telecallerId: true,
          telecaller: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      if (qualifyingCall && qualifyingCall.telecallerId) {
        // Check if assignment already exists (inactive)
        const existingAssignment = await prisma.leadAssignment.findFirst({
          where: {
            leadId: lead.id,
            assignedToId: qualifyingCall.telecallerId,
          },
        });

        if (existingAssignment) {
          // Reactivate existing assignment
          await prisma.leadAssignment.update({
            where: { id: existingAssignment.id },
            data: { isActive: true },
          });
        } else {
          // Create new assignment
          await prisma.leadAssignment.create({
            data: {
              leadId: lead.id,
              assignedToId: qualifyingCall.telecallerId,
              assignedById: qualifyingCall.telecallerId,
              isActive: true,
            },
          });
        }

        console.log(`✓ Assigned "${lead.firstName} ${lead.lastName}" to ${qualifyingCall.telecaller?.firstName} ${qualifyingCall.telecaller?.lastName}`);
        fixedCount++;
      } else {
        // No qualifying call found - skip
        console.log(`- Skipped "${lead.firstName} ${lead.lastName}" (no qualifying call found)`);
        skippedCount++;
      }
    } catch (error: any) {
      errors.push(`${lead.firstName} ${lead.lastName}: ${error.message}`);
      console.error(`✗ Error fixing "${lead.firstName} ${lead.lastName}": ${error.message}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Total unassigned leads: ${unassignedLeads.length}`);
  console.log(`Fixed: ${fixedCount}`);
  console.log(`Skipped (no qualifying call): ${skippedCount}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e}`));
  }
}

// Also fix duplicate names
async function fixDuplicateNames() {
  console.log('\n\nFixing duplicate names...\n');

  // Find leads with potential duplicate names (lastName appears in firstName)
  const leads = await prisma.lead.findMany({
    where: {
      lastName: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  let fixedCount = 0;

  for (const lead of leads) {
    if (!lead.firstName || !lead.lastName) continue;

    const firstNameUpper = lead.firstName.toUpperCase();
    const lastNameUpper = lead.lastName.toUpperCase();

    // Check if firstName contains lastName (duplicate)
    if (firstNameUpper.includes(lastNameUpper) && firstNameUpper !== lastNameUpper) {
      // Remove the duplicate lastName from firstName
      const cleanFirstName = lead.firstName
        .replace(new RegExp(lead.lastName, 'gi'), '')
        .trim()
        .replace(/\s+/g, ' ');

      if (cleanFirstName && cleanFirstName !== lead.firstName) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { firstName: cleanFirstName },
        });
        console.log(`✓ Fixed name: "${lead.firstName} ${lead.lastName}" -> "${cleanFirstName} ${lead.lastName}"`);
        fixedCount++;
      }
    }
  }

  console.log(`\nFixed ${fixedCount} duplicate names`);
}

// Migrate leads to pipeline stages
async function migrateLeadsToPipeline() {
  console.log('\n\nMigrating leads to pipeline...\n');

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    where: { isActive: true },
  });

  for (const org of organizations) {
    console.log(`Processing organization: ${org.name}`);

    // Get default pipeline
    const pipeline = await prisma.pipeline.findFirst({
      where: {
        organizationId: org.id,
        entityType: 'LEAD',
        isDefault: true,
        isActive: true,
      },
      include: {
        stages: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!pipeline) {
      console.log(`  No default pipeline found for ${org.name}. Run: npx ts-node prisma/seed-pipeline.ts`);
      continue;
    }

    // Get entry stage
    const entryStage = pipeline.stages.find(s => s.stageType === 'entry') || pipeline.stages[0];
    if (!entryStage) {
      console.log(`  Pipeline has no stages for ${org.name}`);
      continue;
    }

    // Find leads without pipeline stage
    const result = await prisma.lead.updateMany({
      where: {
        organizationId: org.id,
        pipelineStageId: null,
      },
      data: {
        pipelineStageId: entryStage.id,
        pipelineEnteredAt: new Date(),
        pipelineDaysInStage: 0,
      },
    });

    console.log(`  Migrated ${result.count} leads to "${entryStage.name}" stage`);
  }
}

async function main() {
  try {
    await fixUnassignedLeads();
    await fixDuplicateNames();
    await migrateLeadsToPipeline();
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
