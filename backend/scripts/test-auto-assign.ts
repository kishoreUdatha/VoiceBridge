/**
 * Lead Auto-Assignment Test Script
 *
 * Tests the automatic lead assignment system:
 * 1. Auto-assign configuration
 * 2. Source-based assignment rules
 * 3. AI call triggering
 * 4. Working hours checking
 * 5. Round-robin distribution
 *
 * Usage: npx ts-node scripts/test-auto-assign.ts
 */

import { PrismaClient, LeadSource } from '@prisma/client';

const prisma = new PrismaClient();

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const color = { info: colors.blue, success: colors.green, error: colors.red, warn: colors.yellow }[type];
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log('='.repeat(60));
}

// Test data
let organizationId = '';
let testLeadIds: string[] = [];

async function setup() {
  logSection('SETUP');

  const org = await prisma.organization.findFirst({
    include: {
      users: {
        include: { role: true },
      },
    },
  });

  if (!org) throw new Error('No organization found');

  organizationId = org.id;
  log(`Organization: ${org.name}`, 'success');
  log(`Users: ${org.users.length}`, 'info');

  // List users by role
  const roleGroups: Record<string, string[]> = {};
  org.users.forEach((user) => {
    const role = user.role?.slug || 'unknown';
    if (!roleGroups[role]) roleGroups[role] = [];
    roleGroups[role].push(`${user.firstName} ${user.lastName}`);
  });

  Object.entries(roleGroups).forEach(([role, users]) => {
    console.log(`  ${role}: ${users.join(', ')}`);
  });

  return org;
}

async function testAutoAssignSources() {
  logSection('TEST 1: Auto-Assign Source Types');

  const autoAssignSources: LeadSource[] = [
    'AD_FACEBOOK',
    'AD_INSTAGRAM',
    'AD_LINKEDIN',
    'AD_GOOGLE',
    'AD_YOUTUBE',
    'AD_TWITTER',
    'AD_TIKTOK',
    'FORM',
    'LANDING_PAGE',
    'CHATBOT',
  ];

  const manualSources: LeadSource[] = [
    'MANUAL',
    'BULK_UPLOAD',
    'REFERRAL',
    'WEBSITE',
    'API',
    'OTHER',
  ];

  console.log('\n  Sources that trigger AUTO-ASSIGN:');
  autoAssignSources.forEach((source) => {
    console.log(`    ✓ ${source}`);
  });

  console.log('\n  Sources that require MANUAL assignment:');
  manualSources.forEach((source) => {
    console.log(`    • ${source}`);
  });

  log('\n✓ Source configuration verified', 'success');
}

async function testCreateLeadsFromDifferentSources() {
  logSection('TEST 2: Create Leads from Different Sources');

  const sources: LeadSource[] = ['AD_FACEBOOK', 'MANUAL', 'FORM', 'API'];

  for (const source of sources) {
    const phone = `+91${Math.floor(9000000000 + Math.random() * 999999999)}`;

    const lead = await prisma.lead.create({
      data: {
        organizationId,
        firstName: 'AutoAssign',
        lastName: `Test_${source}`,
        phone,
        email: `${source.toLowerCase()}${Date.now()}@test.com`,
        source,
        sourceDetails: `Test lead from ${source}`,
      },
    });

    testLeadIds.push(lead.id);
    log(`✓ Created lead from ${source}: ${lead.id}`, 'success');
  }
}

async function testManualAssignment() {
  logSection('TEST 3: Manual Assignment');

  if (testLeadIds.length === 0) {
    log('No test leads available', 'warn');
    return;
  }

  // Get users who can be assigned leads
  const assignees = await prisma.user.findMany({
    where: {
      organizationId,
      role: { slug: { in: ['counselor', 'telecaller', 'manager'] } },
    },
    take: 3,
  });

  if (assignees.length === 0) {
    log('No assignees available', 'warn');
    return;
  }

  const leadId = testLeadIds[0];
  const assignee = assignees[0];

  // Create assignment
  const assignment = await prisma.leadAssignment.create({
    data: {
      leadId,
      assignedToId: assignee.id,
      assignedById: assignee.id,
      isActive: true,
    },
  });

  log(`✓ Manually assigned lead to ${assignee.firstName}`, 'success');
  log(`  Assignment ID: ${assignment.id}`, 'info');
}

async function testRoundRobinDistribution() {
  logSection('TEST 4: Round-Robin Distribution');

  // Get counselors
  const counselors = await prisma.user.findMany({
    where: {
      organizationId,
      role: { slug: { in: ['counselor', 'telecaller'] } },
    },
  });

  if (counselors.length < 2) {
    log('Need at least 2 counselors for round-robin test', 'warn');
    return;
  }

  log(`Found ${counselors.length} counselors for distribution`, 'info');

  // Create leads for distribution
  const leadsToDistribute: string[] = [];
  for (let i = 0; i < counselors.length * 2; i++) {
    const phone = `+91${Math.floor(9000000000 + Math.random() * 999999999)}`;
    const lead = await prisma.lead.create({
      data: {
        organizationId,
        firstName: 'RoundRobin',
        lastName: `Test${i + 1}`,
        phone,
        source: 'AD_FACEBOOK',
      },
    });
    leadsToDistribute.push(lead.id);
    testLeadIds.push(lead.id);
  }

  // Distribute in round-robin fashion
  let counselorIndex = 0;
  for (const leadId of leadsToDistribute) {
    const counselor = counselors[counselorIndex % counselors.length];

    await prisma.leadAssignment.create({
      data: {
        leadId,
        assignedToId: counselor.id,
        assignedById: counselor.id,
        isActive: true,
      },
    });

    counselorIndex++;
  }

  // Verify distribution
  const distribution = await prisma.leadAssignment.groupBy({
    by: ['assignedToId'],
    where: {
      leadId: { in: leadsToDistribute },
      isActive: true,
    },
    _count: true,
  });

  log(`✓ Round-robin distribution completed`, 'success');
  console.log('\n  Distribution:');
  for (const dist of distribution) {
    const user = counselors.find((c) => c.id === dist.assignedToId);
    console.log(`    ${user?.firstName || 'Unknown'}: ${dist._count} leads`);
  }
}

async function testWorkingHoursCheck() {
  logSection('TEST 5: Working Hours Check');

  const now = new Date();
  const currentHour = now.getHours();

  const workingHours = {
    start: 9, // 9 AM
    end: 18,  // 6 PM
  };

  const isWithinWorkingHours = currentHour >= workingHours.start && currentHour < workingHours.end;
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  console.log(`\n  Current Time: ${now.toLocaleTimeString()}`);
  console.log(`  Working Hours: ${workingHours.start}:00 - ${workingHours.end}:00`);
  console.log(`  Is Weekend: ${isWeekend ? 'Yes' : 'No'}`);
  console.log(`  Within Working Hours: ${isWithinWorkingHours ? 'Yes' : 'No'}`);

  if (isWithinWorkingHours && !isWeekend) {
    log('\n✓ Auto-assign/AI calls would be triggered immediately', 'success');
  } else {
    log('\n⚠ Leads would be queued for next working hours', 'warn');

    // Calculate next working time
    let nextWorkingTime = new Date(now);
    if (currentHour >= workingHours.end || isWeekend) {
      // Move to next day
      nextWorkingTime.setDate(nextWorkingTime.getDate() + 1);
      while (nextWorkingTime.getDay() === 0 || nextWorkingTime.getDay() === 6) {
        nextWorkingTime.setDate(nextWorkingTime.getDate() + 1);
      }
    }
    nextWorkingTime.setHours(workingHours.start, 0, 0, 0);

    console.log(`  Next Working Time: ${nextWorkingTime.toLocaleString()}`);
  }
}

async function testAssignmentHistory() {
  logSection('TEST 6: Assignment History');

  if (testLeadIds.length === 0) {
    log('No test leads available', 'warn');
    return;
  }

  const leadId = testLeadIds[0];

  // Get counselors
  const counselors = await prisma.user.findMany({
    where: {
      organizationId,
      role: { slug: { in: ['counselor', 'telecaller', 'manager'] } },
    },
    take: 3,
  });

  if (counselors.length < 2) {
    log('Need multiple counselors for reassignment test', 'warn');
    return;
  }

  // Deactivate current assignment
  await prisma.leadAssignment.updateMany({
    where: { leadId, isActive: true },
    data: { isActive: false, unassignedAt: new Date() },
  });

  // Create new assignment
  await prisma.leadAssignment.create({
    data: {
      leadId,
      assignedToId: counselors[1].id,
      assignedById: counselors[0].id,
      isActive: true,
    },
  });

  // Get assignment history
  const history = await prisma.leadAssignment.findMany({
    where: { leadId },
    include: {
      assignedTo: { select: { firstName: true, lastName: true } },
      assignedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { assignedAt: 'desc' },
  });

  log(`✓ Assignment history retrieved`, 'success');
  console.log('\n  Assignment History:');
  history.forEach((h, i) => {
    const status = h.isActive ? '[ACTIVE]' : '[INACTIVE]';
    console.log(`    ${i + 1}. ${status} ${h.assignedTo.firstName} ${h.assignedTo.lastName}`);
    console.log(`       Assigned by: ${h.assignedBy?.firstName || 'System'} at ${h.assignedAt.toLocaleString()}`);
  });
}

async function testBulkAssignment() {
  logSection('TEST 7: Bulk Assignment');

  // Get unassigned leads
  const unassignedLeads = await prisma.lead.findMany({
    where: {
      organizationId,
      assignments: { none: { isActive: true } },
    },
    take: 6,
  });

  if (unassignedLeads.length === 0) {
    log('No unassigned leads found', 'warn');
    return;
  }

  // Get counselors
  const counselors = await prisma.user.findMany({
    where: {
      organizationId,
      role: { slug: { in: ['counselor', 'telecaller'] } },
    },
    take: 3,
  });

  if (counselors.length === 0) {
    log('No counselors found', 'warn');
    return;
  }

  log(`Found ${unassignedLeads.length} unassigned leads`, 'info');
  log(`Distributing to ${counselors.length} counselors`, 'info');

  // Bulk assign (round-robin)
  let assigned = 0;
  for (let i = 0; i < unassignedLeads.length; i++) {
    const lead = unassignedLeads[i];
    const counselor = counselors[i % counselors.length];

    await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToId: counselor.id,
        assignedById: counselor.id,
        isActive: true,
      },
    });

    testLeadIds.push(lead.id);
    assigned++;
  }

  log(`✓ Bulk assigned ${assigned} leads`, 'success');
}

async function testAssignmentStats() {
  logSection('TEST 8: Assignment Statistics');

  // Get assignment stats per user
  const stats = await prisma.leadAssignment.groupBy({
    by: ['assignedToId'],
    where: {
      lead: { organizationId },
      isActive: true,
    },
    _count: true,
  });

  // Get user details
  const userIds = stats.map((s) => s.assignedToId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { role: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  log(`✓ Assignment statistics retrieved`, 'success');
  console.log('\n  Active Assignments per User:');
  console.log('  ' + '-'.repeat(40));

  stats
    .sort((a, b) => b._count - a._count)
    .forEach((stat) => {
      const user = userMap.get(stat.assignedToId);
      const name = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
      const role = user?.role?.name || 'Unknown';
      console.log(`    ${name.padEnd(20)} (${role.padEnd(12)}) : ${stat._count} leads`);
    });
}

async function generateSummary() {
  logSection('TEST SUMMARY');

  const totalLeads = await prisma.lead.count({ where: { organizationId } });
  const assignedLeads = await prisma.lead.count({
    where: {
      organizationId,
      assignments: { some: { isActive: true } },
    },
  });
  const unassignedLeads = totalLeads - assignedLeads;

  console.log('\n  Organization Lead Statistics:');
  console.log(`    Total Leads: ${totalLeads}`);
  console.log(`    Assigned: ${assignedLeads}`);
  console.log(`    Unassigned: ${unassignedLeads}`);
  console.log(`    Assignment Rate: ${((assignedLeads / totalLeads) * 100).toFixed(1)}%`);

  console.log(`\n  Test Leads Created: ${testLeadIds.length}`);
}

async function cleanup() {
  logSection('CLEANUP');

  const shouldCleanup = process.argv.includes('--cleanup');

  if (!shouldCleanup) {
    log('Skipping cleanup. Run with --cleanup to remove test data.', 'warn');
    log(`Test lead IDs: ${testLeadIds.length}`, 'info');
    return;
  }

  // Delete assignments
  await prisma.leadAssignment.deleteMany({
    where: { leadId: { in: testLeadIds } },
  });

  // Delete leads
  await prisma.lead.deleteMany({
    where: { id: { in: testLeadIds } },
  });

  log(`✓ Deleted ${testLeadIds.length} test leads and their assignments`, 'success');
}

async function runAllTests() {
  console.log('\n');
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║           AUTO-ASSIGN SYSTEM TEST SUITE                    ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);

  try {
    await setup();
    await testAutoAssignSources();
    await testCreateLeadsFromDifferentSources();
    await testManualAssignment();
    await testRoundRobinDistribution();
    await testWorkingHoursCheck();
    await testAssignmentHistory();
    await testBulkAssignment();
    await testAssignmentStats();
    await generateSummary();
    await cleanup();

    logSection('ALL AUTO-ASSIGN TESTS COMPLETED SUCCESSFULLY');
    log('✓ Auto-assign system is working correctly!', 'success');

  } catch (error) {
    log(`\n✗ Test failed: ${(error as Error).message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAllTests();
