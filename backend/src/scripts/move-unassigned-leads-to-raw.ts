/**
 * Script to move unassigned leads back to Raw Data (RawImportRecord)
 *
 * This script:
 * 1. Finds all leads with no active LeadAssignment
 * 2. Creates RawImportRecord entries for each
 * 3. Deletes the leads (after backing up to raw data)
 *
 * Run with: npx ts-node src/scripts/move-unassigned-leads-to-raw.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function moveUnassignedLeadsToRawData() {
  console.log('========================================');
  console.log('Moving Unassigned Leads to Raw Data');
  console.log('========================================\n');

  try {
    // Find all leads with no active assignment
    const unassignedLeads = await prisma.lead.findMany({
      where: {
        assignments: {
          none: {
            isActive: true,
          },
        },
      },
      include: {
        organization: true,
        notes: true,
        activities: true,
      },
    });

    console.log(`Found ${unassignedLeads.length} unassigned leads\n`);

    if (unassignedLeads.length === 0) {
      console.log('No unassigned leads to move. Exiting.');
      return;
    }

    // Group leads by organization
    const leadsByOrg = new Map<string, typeof unassignedLeads>();
    for (const lead of unassignedLeads) {
      const orgLeads = leadsByOrg.get(lead.organizationId) || [];
      orgLeads.push(lead);
      leadsByOrg.set(lead.organizationId, orgLeads);
    }

    let totalMoved = 0;
    let totalDeleted = 0;

    for (const [organizationId, leads] of leadsByOrg) {
      console.log(`\nProcessing organization: ${organizationId}`);
      console.log(`  Leads to move: ${leads.length}`);

      // Find or create a "Recovery" bulk import for this organization
      let recoveryImport = await prisma.bulkImport.findFirst({
        where: {
          organizationId,
          fileName: 'RECOVERED_FROM_UNASSIGNED_LEADS',
        },
      });

      if (!recoveryImport) {
        // Get an admin user from this organization to use as uploader
        const adminUser = await prisma.user.findFirst({
          where: {
            organizationId,
            role: {
              slug: { in: ['admin', 'super_admin'] },
            },
          },
        });

        if (!adminUser) {
          console.log(`  ⚠️ No admin user found for org ${organizationId}, skipping...`);
          continue;
        }

        recoveryImport = await prisma.bulkImport.create({
          data: {
            organizationId,
            uploadedById: adminUser.id,
            fileName: 'RECOVERED_FROM_UNASSIGNED_LEADS',
            fileSize: 0,
            mimeType: 'application/recovery',
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            duplicateRows: 0,
            status: 'COMPLETED',
          },
        });
        console.log(`  Created recovery bulk import: ${recoveryImport.id}`);
      }

      // Move each lead to raw data
      for (const lead of leads) {
        try {
          // Check if already exists in raw data (by phone)
          const existingRaw = await prisma.rawImportRecord.findFirst({
            where: {
              organizationId,
              phone: lead.phone,
            },
          });

          if (existingRaw) {
            console.log(`  ⚠️ Lead ${lead.id} (${lead.phone}) already exists in raw data, deleting lead only...`);
          } else {
            // Create RawImportRecord
            await prisma.rawImportRecord.create({
              data: {
                bulkImportId: recoveryImport.id,
                organizationId,
                firstName: lead.firstName,
                lastName: lead.lastName || undefined,
                email: lead.email || undefined,
                phone: lead.phone,
                alternatePhone: lead.alternatePhone || undefined,
                customFields: (lead.customFields as any) || {},
                status: 'PENDING', // Ready to be assigned
                notes: lead.notes.length > 0
                  ? `Recovered from lead. Original notes: ${lead.notes.map(n => n.content).join(' | ')}`
                  : `Recovered from unassigned lead created on ${lead.createdAt.toISOString()}`,
              },
            });
            totalMoved++;
            console.log(`  ✓ Moved lead ${lead.id} (${lead.firstName} ${lead.lastName || ''} - ${lead.phone}) to raw data`);
          }

          // Delete related data first
          await prisma.leadNote.deleteMany({ where: { leadId: lead.id } });
          await prisma.leadActivity.deleteMany({ where: { leadId: lead.id } });
          await prisma.leadAssignment.deleteMany({ where: { leadId: lead.id } });

          // Delete the lead
          await prisma.lead.delete({ where: { id: lead.id } });
          totalDeleted++;

        } catch (error) {
          console.log(`  ❌ Failed to move lead ${lead.id}: ${(error as Error).message}`);
        }
      }

      // Update bulk import counts
      await prisma.bulkImport.update({
        where: { id: recoveryImport.id },
        data: {
          totalRows: { increment: leads.length },
          validRows: { increment: leads.length },
        },
      });
    }

    console.log('\n========================================');
    console.log('Summary:');
    console.log(`  Total unassigned leads found: ${unassignedLeads.length}`);
    console.log(`  Moved to raw data: ${totalMoved}`);
    console.log(`  Leads deleted: ${totalDeleted}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
moveUnassignedLeadsToRawData()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
