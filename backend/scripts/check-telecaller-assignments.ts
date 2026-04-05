/**
 * Check what data telecaller1.hyd@smartedu.com can see
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTelecallerData() {
  // Find the telecaller
  const telecaller = await prisma.user.findFirst({
    where: { email: 'telecaller1.hyd@smartedu.com' },
    include: {
      role: true,
      branch: true,
      manager: { select: { firstName: true, lastName: true, email: true } }
    }
  });

  if (!telecaller) {
    console.log('❌ Telecaller not found!');
    return;
  }

  console.log('\n' + '='.repeat(100));
  console.log('TELECALLER DATA CHECK: telecaller1.hyd@smartedu.com');
  console.log('='.repeat(100));

  console.log('\n👤 USER INFO:');
  console.log(`   ID: ${telecaller.id}`);
  console.log(`   Name: ${telecaller.firstName} ${telecaller.lastName}`);
  console.log(`   Email: ${telecaller.email}`);
  console.log(`   Role: ${telecaller.role?.name} (${telecaller.role?.slug})`);
  console.log(`   Branch: ${telecaller.branch?.name} (${telecaller.branch?.code})`);
  console.log(`   Branch ID: ${telecaller.branchId}`);
  console.log(`   Organization ID: ${telecaller.organizationId}`);
  console.log(`   Manager: ${telecaller.manager?.firstName} ${telecaller.manager?.lastName} (${telecaller.manager?.email})`);

  // Check lead assignments
  console.log('\n📋 LEAD ASSIGNMENTS (assigned to this telecaller):');
  const assignments = await prisma.leadAssignment.findMany({
    where: { assignedToId: telecaller.id },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          stage: { select: { name: true } },
          admissionStatus: true,
          orgBranchId: true
        }
      }
    }
  });

  if (assignments.length === 0) {
    console.log('   ❌ NO ASSIGNMENTS FOUND!');
  } else {
    assignments.forEach((a, idx) => {
      const status = a.isActive ? '✅ ACTIVE' : '⏸️ INACTIVE';
      console.log(`   ${idx + 1}. ${status} - ${a.lead.firstName} ${a.lead.lastName} (${a.lead.phone})`);
      console.log(`      Lead ID: ${a.lead.id}`);
      console.log(`      Stage: ${a.lead.stage?.name || 'N/A'}`);
      console.log(`      Lead Branch ID: ${a.lead.orgBranchId}`);
    });
  }

  // Check active assignments only
  console.log('\n📋 ACTIVE ASSIGNMENTS ONLY:');
  const activeAssignments = await prisma.leadAssignment.findMany({
    where: {
      assignedToId: telecaller.id,
      isActive: true
    },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          stage: { select: { name: true } }
        }
      }
    }
  });

  if (activeAssignments.length === 0) {
    console.log('   ❌ NO ACTIVE ASSIGNMENTS!');
  } else {
    activeAssignments.forEach((a, idx) => {
      console.log(`   ${idx + 1}. ${a.lead.firstName} ${a.lead.lastName} - ${a.lead.stage?.name}`);
    });
  }

  // Check leads in the same branch
  console.log('\n📋 ALL LEADS IN SAME BRANCH (HYD-01):');
  const branchLeads = await prisma.lead.findMany({
    where: {
      organizationId: telecaller.organizationId,
      orgBranchId: telecaller.branchId
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      stage: { select: { name: true } },
      admissionStatus: true,
      assignments: {
        where: { isActive: true },
        include: {
          assignedTo: { select: { firstName: true, lastName: true, email: true } }
        }
      }
    }
  });

  branchLeads.forEach((lead, idx) => {
    const assignedTo = lead.assignments[0]?.assignedTo;
    const assignee = assignedTo ? `${assignedTo.firstName} ${assignedTo.lastName}` : 'UNASSIGNED';
    console.log(`   ${idx + 1}. ${lead.firstName} ${lead.lastName} - ${lead.stage?.name} - Assigned to: ${assignee}`);
  });

  // Check all leads in organization
  console.log('\n📋 ALL LEADS IN ORGANIZATION:');
  const allLeads = await prisma.lead.findMany({
    where: { organizationId: telecaller.organizationId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      orgBranch: { select: { code: true } },
      stage: { select: { name: true } },
      assignments: {
        where: { isActive: true },
        include: {
          assignedTo: { select: { firstName: true, lastName: true } }
        }
      }
    }
  });

  allLeads.forEach((lead, idx) => {
    const assignedTo = lead.assignments[0]?.assignedTo;
    const assignee = assignedTo ? `${assignedTo.firstName} ${assignedTo.lastName}` : 'UNASSIGNED';
    console.log(`   ${idx + 1}. [${lead.orgBranch?.code || 'N/A'}] ${lead.firstName} ${lead.lastName} - ${lead.stage?.name} → ${assignee}`);
  });

  console.log('\n' + '='.repeat(100));
  console.log('ISSUE: The telecaller had lead "Rahul Kumar" but it was reassigned during the flow.');
  console.log('The lead went: Telecaller1 → TeamLead → Counselor → Manager');
  console.log('So telecaller1.hyd has NO active assignments now.');
  console.log('='.repeat(100) + '\n');

  await prisma.$disconnect();
}

checkTelecallerData();
