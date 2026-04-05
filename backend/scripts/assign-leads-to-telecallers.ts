/**
 * Assign unassigned leads to telecallers so they have data to work with
 */

import { PrismaClient, ActivityType } from '@prisma/client';

const prisma = new PrismaClient();

async function assignLeadsToTelecallers() {
  const org = await prisma.organization.findFirst({
    where: { email: 'admin@smartedu.com' }
  });

  if (!org) {
    console.log('❌ Organization not found!');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('ASSIGNING UNASSIGNED LEADS TO TELECALLERS');
  console.log('='.repeat(80));

  // Get all branches
  const branches = await prisma.branch.findMany({
    where: { organizationId: org.id }
  });

  for (const branch of branches) {
    console.log(`\n📍 Processing Branch: ${branch.name} (${branch.code})`);

    // Find telecallers in this branch
    const telecallers = await prisma.user.findMany({
      where: {
        organizationId: org.id,
        branchId: branch.id,
        role: { slug: 'telecaller' }
      },
      include: { role: true }
    });

    console.log(`   Found ${telecallers.length} telecallers`);

    // Find unassigned leads in this branch
    const unassignedLeads = await prisma.lead.findMany({
      where: {
        organizationId: org.id,
        orgBranchId: branch.id,
        assignments: {
          none: { isActive: true }
        }
      }
    });

    console.log(`   Found ${unassignedLeads.length} unassigned leads`);

    // Assign leads round-robin to telecallers
    for (let i = 0; i < unassignedLeads.length; i++) {
      const lead = unassignedLeads[i];
      const telecaller = telecallers[i % telecallers.length];

      if (!telecaller) continue;

      // Create assignment
      await prisma.leadAssignment.create({
        data: {
          leadId: lead.id,
          assignedToId: telecaller.id,
          isActive: true
        }
      });

      // Log activity
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: telecaller.id,
          type: ActivityType.ASSIGNMENT_CHANGED,
          title: 'Lead assigned to telecaller',
          description: `${telecaller.firstName} ${telecaller.lastName} assigned for outreach`,
          metadata: { assignedTo: telecaller.id, assignedBy: 'system' }
        }
      });

      console.log(`   ✅ Assigned ${lead.firstName} ${lead.lastName} → ${telecaller.firstName} ${telecaller.lastName}`);
    }
  }

  // Now show the updated assignments
  console.log('\n' + '='.repeat(80));
  console.log('UPDATED LEAD ASSIGNMENTS');
  console.log('='.repeat(80));

  const allLeads = await prisma.lead.findMany({
    where: { organizationId: org.id },
    include: {
      orgBranch: { select: { code: true } },
      stage: { select: { name: true } },
      assignments: {
        where: { isActive: true },
        include: {
          assignedTo: { select: { firstName: true, lastName: true, email: true } }
        }
      }
    }
  });

  console.log('\n📋 All Leads with Assignments:\n');
  allLeads.forEach((lead, idx) => {
    const assignee = lead.assignments[0]?.assignedTo;
    const assignedTo = assignee ? `${assignee.firstName} ${assignee.lastName} (${assignee.email})` : 'UNASSIGNED';
    console.log(`   ${idx + 1}. [${lead.orgBranch?.code}] ${lead.firstName} ${lead.lastName}`);
    console.log(`      Stage: ${lead.stage?.name} | Assigned To: ${assignedTo}`);
  });

  // Show telecaller summary
  console.log('\n' + '='.repeat(80));
  console.log('TELECALLER LEAD COUNT');
  console.log('='.repeat(80));

  const telecallers = await prisma.user.findMany({
    where: {
      organizationId: org.id,
      role: { slug: 'telecaller' }
    },
    include: {
      branch: { select: { code: true } }
    }
  });

  for (const tc of telecallers) {
    const activeLeads = await prisma.leadAssignment.count({
      where: {
        assignedToId: tc.id,
        isActive: true
      }
    });
    console.log(`   📞 ${tc.firstName} ${tc.lastName} [${tc.branch?.code || 'N/A'}]: ${activeLeads} active leads`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ DONE! Telecallers now have leads assigned.');
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

assignLeadsToTelecallers();
