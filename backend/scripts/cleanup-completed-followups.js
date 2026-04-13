/**
 * Cleanup script to:
 * 1. Auto-complete pending follow-ups for leads in completed stages
 * 2. Remove "Follow Up" tag from leads in completed stages
 * Run this once to fix existing data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COMPLETED_STAGES = ['Won', 'WON', 'Lost', 'LOST', 'Closed', 'CLOSED', 'Admitted', 'ADMITTED', 'Enrolled', 'ENROLLED', 'Dropped', 'DROPPED'];

async function cleanupCompletedFollowups() {
  console.log('Starting cleanup for completed leads...\n');

  // PART 1: Clean up pending follow-up records
  console.log('PART 1: Cleaning pending follow-up records...');
  console.log('-'.repeat(50));

  const leadsWithPendingFollowups = await prisma.lead.findMany({
    where: {
      stage: {
        name: { in: COMPLETED_STAGES }
      },
      followUps: {
        some: { status: 'UPCOMING' }
      }
    },
    include: {
      stage: { select: { name: true } },
      followUps: {
        where: { status: 'UPCOMING' },
        select: { id: true, scheduledAt: true }
      }
    }
  });

  console.log(`Found ${leadsWithPendingFollowups.length} leads with pending follow-up records\n`);

  let totalFollowupsCompleted = 0;

  for (const lead of leadsWithPendingFollowups) {
    const followupCount = lead.followUps.length;
    console.log(`Lead: ${lead.firstName} ${lead.lastName || ''}`);
    console.log(`  Stage: ${lead.stage?.name}, Follow-ups: ${followupCount}`);

    await prisma.followUp.updateMany({
      where: { leadId: lead.id, status: 'UPCOMING' },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes: `Auto-completed: Lead is in "${lead.stage?.name}" stage`
      }
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: { nextFollowUpAt: null }
    });

    totalFollowupsCompleted += followupCount;
    console.log(`  ✓ Completed ${followupCount} follow-ups\n`);
  }

  // PART 2: Remove "Follow Up" tag from completed leads
  console.log('\nPART 2: Removing "Follow Up" tag from completed leads...');
  console.log('-'.repeat(50));

  // Find the "Follow Up" tag
  const followUpTag = await prisma.leadTag.findFirst({
    where: {
      OR: [
        { name: 'Follow Up' },
        { name: 'follow up' },
        { name: 'Follow-Up' },
        { name: 'FollowUp' },
        { name: { contains: 'Follow', mode: 'insensitive' } }
      ]
    }
  });

  let totalTagsRemoved = 0;

  if (followUpTag) {
    console.log(`Found "Follow Up" tag: ${followUpTag.name} (${followUpTag.id})\n`);

    // Find leads in completed stages with this tag
    const leadsWithFollowUpTag = await prisma.lead.findMany({
      where: {
        stage: {
          name: { in: COMPLETED_STAGES }
        },
        tagAssignments: {
          some: { tagId: followUpTag.id }
        }
      },
      include: {
        stage: { select: { name: true } },
        tagAssignments: {
          where: { tagId: followUpTag.id },
          include: { tag: { select: { name: true } } }
        }
      }
    });

    console.log(`Found ${leadsWithFollowUpTag.length} completed leads with "Follow Up" tag\n`);

    for (const lead of leadsWithFollowUpTag) {
      console.log(`Lead: ${lead.firstName} ${lead.lastName || ''}`);
      console.log(`  Stage: ${lead.stage?.name}`);

      // Remove the tag assignment
      await prisma.leadTagAssignment.deleteMany({
        where: {
          leadId: lead.id,
          tagId: followUpTag.id
        }
      });

      totalTagsRemoved++;
      console.log(`  ✓ Removed "Follow Up" tag\n`);
    }
  } else {
    console.log('No "Follow Up" tag found in the system.\n');
  }

  console.log('='.repeat(50));
  console.log('Cleanup complete!');
  console.log(`Follow-up records completed: ${totalFollowupsCompleted}`);
  console.log(`"Follow Up" tags removed: ${totalTagsRemoved}`);
}

cleanupCompletedFollowups()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
