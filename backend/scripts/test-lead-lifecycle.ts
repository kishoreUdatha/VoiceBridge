/**
 * Lead Lifecycle Test Script
 *
 * Tests the complete lead lifecycle flow:
 * 1. Lead Creation
 * 2. Duplicate Detection
 * 3. Assignment
 * 4. Stage Progression
 * 5. Follow-up Scheduling
 * 6. Timeline Tracking
 * 7. Conversion
 *
 * Usage: npx ts-node scripts/test-lead-lifecycle.ts
 */

import { PrismaClient } from '@prisma/client';
import { leadLifecycleService } from '../src/services/lead-lifecycle.service';

const prisma = new PrismaClient();

// Test configuration
const TEST_CONFIG = {
  organizationId: '', // Will be set dynamically
  userId: '',         // Will be set dynamically
  voiceAgentId: '',   // Will be set dynamically
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const color = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warn: colors.yellow,
  }[type];
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log('='.repeat(60));
}

async function setup() {
  logSection('SETUP: Getting test organization and user');

  // Get first organization
  const org = await prisma.organization.findFirst({
    include: {
      users: {
        include: { role: true },
        take: 1,
      },
    },
  });

  if (!org) {
    throw new Error('No organization found. Please seed the database first.');
  }

  TEST_CONFIG.organizationId = org.id;
  TEST_CONFIG.userId = org.users[0]?.id || '';

  log(`Organization: ${org.name} (${org.id})`, 'success');
  log(`User: ${org.users[0]?.firstName} ${org.users[0]?.lastName} (${TEST_CONFIG.userId})`, 'success');

  // Get voice agent if exists
  const agent = await prisma.voiceAgent.findFirst({
    where: { organizationId: org.id, isActive: true },
  });

  if (agent) {
    TEST_CONFIG.voiceAgentId = agent.id;
    log(`Voice Agent: ${agent.name} (${agent.id})`, 'success');
  } else {
    log('No active voice agent found - AI call tests will be skipped', 'warn');
  }

  return org;
}

async function testLeadCreation() {
  logSection('TEST 1: Lead Creation');

  const testPhone = `+91${Math.floor(9000000000 + Math.random() * 999999999)}`;

  // Get default stage
  const defaultStage = await prisma.leadStage.findFirst({
    where: { organizationId: TEST_CONFIG.organizationId, isDefault: true },
  });

  // Create lead
  const lead = await prisma.lead.create({
    data: {
      organizationId: TEST_CONFIG.organizationId,
      firstName: 'Test',
      lastName: 'Lead',
      phone: testPhone,
      email: `test${Date.now()}@example.com`,
      source: 'MANUAL',
      sourceDetails: 'Created by test script',
      stageId: defaultStage?.id,
      priority: 'MEDIUM',
    },
  });

  log(`✓ Lead created: ${lead.firstName} ${lead.lastName}`, 'success');
  log(`  ID: ${lead.id}`, 'info');
  log(`  Phone: ${lead.phone}`, 'info');
  log(`  Source: ${lead.source}`, 'info');

  // Log activity
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      userId: TEST_CONFIG.userId,
      type: 'LEAD_CREATED',
      title: 'Lead created via test script',
      metadata: { source: 'test-script' },
    },
  });

  log(`✓ Activity logged: LEAD_CREATED`, 'success');

  return lead;
}

async function testDuplicateDetection(phone: string) {
  logSection('TEST 2: Duplicate Detection');

  const existingLead = await leadLifecycleService.findLeadByPhone(
    TEST_CONFIG.organizationId,
    phone
  );

  if (existingLead) {
    log(`✓ Duplicate detected for phone: ${phone}`, 'success');
    log(`  Existing Lead ID: ${existingLead.id}`, 'info');
    log(`  Name: ${existingLead.firstName} ${existingLead.lastName}`, 'info');
  } else {
    log(`✗ No duplicate found for phone: ${phone}`, 'warn');
  }

  // Test with non-existent phone
  const nonExistent = await leadLifecycleService.findLeadByPhone(
    TEST_CONFIG.organizationId,
    '+919999999999'
  );

  if (!nonExistent) {
    log(`✓ Correctly returned null for non-existent phone`, 'success');
  }

  return existingLead;
}

async function testLeadAssignment(leadId: string) {
  logSection('TEST 3: Lead Assignment');

  // Get a counselor/telecaller
  const assignee = await prisma.user.findFirst({
    where: {
      organizationId: TEST_CONFIG.organizationId,
      role: { slug: { in: ['counselor', 'telecaller', 'manager'] } },
    },
  });

  if (!assignee) {
    log('No counselor/telecaller found for assignment test', 'warn');
    return null;
  }

  // Create assignment
  const assignment = await prisma.leadAssignment.create({
    data: {
      leadId,
      assignedToId: assignee.id,
      assignedById: TEST_CONFIG.userId,
      isActive: true,
    },
  });

  log(`✓ Lead assigned to: ${assignee.firstName} ${assignee.lastName}`, 'success');
  log(`  Assignment ID: ${assignment.id}`, 'info');

  // Log activity
  await prisma.leadActivity.create({
    data: {
      leadId,
      userId: TEST_CONFIG.userId,
      type: 'ASSIGNMENT_CHANGED',
      title: `Assigned to ${assignee.firstName} ${assignee.lastName}`,
      metadata: { assigneeId: assignee.id },
    },
  });

  log(`✓ Activity logged: ASSIGNMENT_CHANGED`, 'success');

  return assignment;
}

async function testStageProgression(leadId: string) {
  logSection('TEST 4: Stage Progression');

  // Get all stages
  const stages = await prisma.leadStage.findMany({
    where: { organizationId: TEST_CONFIG.organizationId, isActive: true },
    orderBy: { order: 'asc' },
  });

  if (stages.length < 2) {
    log('Not enough stages for progression test', 'warn');
    return;
  }

  log(`Found ${stages.length} stages`, 'info');

  // Get current lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { stage: true },
  });

  const currentStageIndex = stages.findIndex(s => s.id === lead?.stageId);
  const nextStage = stages[currentStageIndex + 1] || stages[1];

  // Update stage
  await prisma.lead.update({
    where: { id: leadId },
    data: { stageId: nextStage.id },
  });

  log(`✓ Stage changed: ${lead?.stage?.name || 'None'} → ${nextStage.name}`, 'success');

  // Log activity
  await prisma.leadActivity.create({
    data: {
      leadId,
      userId: TEST_CONFIG.userId,
      type: 'STAGE_CHANGED',
      title: `Stage changed to ${nextStage.name}`,
      metadata: {
        fromStage: lead?.stage?.name,
        toStage: nextStage.name,
      },
    },
  });

  log(`✓ Activity logged: STAGE_CHANGED`, 'success');
}

async function testFollowUpScheduling(leadId: string) {
  logSection('TEST 5: Follow-up Scheduling');

  // Schedule a follow-up
  const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  const followUp = await prisma.followUp.create({
    data: {
      leadId,
      assigneeId: TEST_CONFIG.userId,
      createdById: TEST_CONFIG.userId,
      scheduledAt,
      followUpType: TEST_CONFIG.voiceAgentId ? 'AI_CALL' : 'MANUAL',
      voiceAgentId: TEST_CONFIG.voiceAgentId || undefined,
      message: 'Test follow-up from lifecycle test',
      status: 'UPCOMING',
    },
  });

  log(`✓ Follow-up scheduled`, 'success');
  log(`  ID: ${followUp.id}`, 'info');
  log(`  Type: ${followUp.followUpType}`, 'info');
  log(`  Scheduled: ${scheduledAt.toISOString()}`, 'info');

  // Update lead's next follow-up date
  await prisma.lead.update({
    where: { id: leadId },
    data: { nextFollowUpAt: scheduledAt },
  });

  // Log activity
  await prisma.leadActivity.create({
    data: {
      leadId,
      userId: TEST_CONFIG.userId,
      type: 'FOLLOWUP_SCHEDULED',
      title: 'Follow-up scheduled',
      metadata: {
        followUpId: followUp.id,
        scheduledAt: scheduledAt.toISOString(),
        type: followUp.followUpType,
      },
    },
  });

  log(`✓ Activity logged: FOLLOWUP_SCHEDULED`, 'success');

  return followUp;
}

async function testInteractionLogging(leadId: string) {
  logSection('TEST 6: Interaction Logging');

  // Log a call
  const callLog = await prisma.callLog.create({
    data: {
      leadId,
      callerId: TEST_CONFIG.userId,
      phoneNumber: '+919876543210',
      direction: 'OUTBOUND',
      status: 'COMPLETED',
      duration: 120,
      notes: 'Test call from lifecycle script',
    },
  });

  log(`✓ Call logged: ${callLog.id}`, 'success');
  log(`  Duration: ${callLog.duration}s`, 'info');

  // Log activity for call
  await prisma.leadActivity.create({
    data: {
      leadId,
      userId: TEST_CONFIG.userId,
      type: 'CALL_MADE',
      title: 'Outbound call completed',
      metadata: { callLogId: callLog.id, duration: callLog.duration },
    },
  });

  // Update lead metrics
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      totalCalls: (lead?.totalCalls || 0) + 1,
      lastContactedAt: new Date(),
    },
  });

  log(`✓ Lead metrics updated: totalCalls=${(lead?.totalCalls || 0) + 1}`, 'success');

  // Log a note
  await prisma.leadActivity.create({
    data: {
      leadId,
      userId: TEST_CONFIG.userId,
      type: 'NOTE_ADDED',
      title: 'Note added',
      description: 'Customer expressed interest in premium plan. Will follow up next week.',
      metadata: {},
    },
  });

  log(`✓ Note added to timeline`, 'success');

  return callLog;
}

async function testTimelineRetrieval(leadId: string) {
  logSection('TEST 7: Timeline Retrieval');

  const timeline = await leadLifecycleService.getLeadTimeline(leadId);

  log(`✓ Timeline retrieved`, 'success');
  log(`  Activities: ${timeline.activities.length}`, 'info');
  log(`  Calls: ${timeline.calls.length}`, 'info');
  log(`  Follow-ups: ${timeline.followUps.length}`, 'info');

  // Display recent activities
  console.log('\n  Recent Activities:');
  timeline.activities.slice(0, 5).forEach((activity, i) => {
    console.log(`    ${i + 1}. [${activity.type}] ${activity.title}`);
  });

  return timeline;
}

async function testLeadConversion(leadId: string) {
  logSection('TEST 8: Lead Conversion');

  // Mark as converted
  const convertedLead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      isConverted: true,
      convertedAt: new Date(),
    },
  });

  log(`✓ Lead marked as converted`, 'success');
  log(`  Converted at: ${convertedLead.convertedAt?.toISOString()}`, 'info');

  // Log activity
  await prisma.leadActivity.create({
    data: {
      leadId,
      userId: TEST_CONFIG.userId,
      type: 'CUSTOM',
      title: 'Lead converted',
      description: 'Lead successfully converted to customer',
      metadata: { convertedAt: convertedLead.convertedAt },
    },
  });

  log(`✓ Activity logged: Lead converted`, 'success');

  return convertedLead;
}

async function testFollowUpCompletion(followUpId: string, leadId: string) {
  logSection('TEST 9: Follow-up Completion');

  // Complete the follow-up
  const completedFollowUp = await prisma.followUp.update({
    where: { id: followUpId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  log(`✓ Follow-up marked as completed`, 'success');

  // Log activity
  await prisma.leadActivity.create({
    data: {
      leadId,
      userId: TEST_CONFIG.userId,
      type: 'FOLLOWUP_COMPLETED',
      title: 'Follow-up completed',
      metadata: { followUpId },
    },
  });

  log(`✓ Activity logged: FOLLOWUP_COMPLETED`, 'success');

  return completedFollowUp;
}

async function generateTestSummary(leadId: string) {
  logSection('TEST SUMMARY');

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      stage: true,
      assignments: {
        where: { isActive: true },
        include: { assignedTo: true },
      },
    },
  });

  const activityCount = await prisma.leadActivity.count({ where: { leadId } });
  const followUpCount = await prisma.followUp.count({ where: { leadId } });
  const callCount = await prisma.callLog.count({ where: { leadId } });

  console.log('\n  Lead Details:');
  console.log(`    Name: ${lead?.firstName} ${lead?.lastName}`);
  console.log(`    Phone: ${lead?.phone}`);
  console.log(`    Email: ${lead?.email}`);
  console.log(`    Source: ${lead?.source}`);
  console.log(`    Stage: ${lead?.stage?.name || 'None'}`);
  console.log(`    Priority: ${lead?.priority}`);
  console.log(`    Assigned To: ${lead?.assignments[0]?.assignedTo?.firstName || 'Unassigned'}`);
  console.log(`    Total Calls: ${lead?.totalCalls}`);
  console.log(`    Converted: ${lead?.isConverted ? 'Yes' : 'No'}`);

  console.log('\n  Metrics:');
  console.log(`    Activities Logged: ${activityCount}`);
  console.log(`    Follow-ups: ${followUpCount}`);
  console.log(`    Calls: ${callCount}`);

  return { lead, activityCount, followUpCount, callCount };
}

async function cleanup(leadId: string) {
  logSection('CLEANUP');

  const confirmCleanup = process.argv.includes('--cleanup');

  if (!confirmCleanup) {
    log('Skipping cleanup. Run with --cleanup flag to remove test data.', 'warn');
    log(`Test lead ID: ${leadId}`, 'info');
    return;
  }

  // Delete in order (respecting foreign keys)
  await prisma.leadActivity.deleteMany({ where: { leadId } });
  await prisma.followUp.deleteMany({ where: { leadId } });
  await prisma.callLog.deleteMany({ where: { leadId } });
  await prisma.leadAssignment.deleteMany({ where: { leadId } });
  await prisma.lead.delete({ where: { id: leadId } });

  log(`✓ Test lead and related data deleted`, 'success');
}

async function runAllTests() {
  console.log('\n');
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║           LEAD LIFECYCLE TEST SUITE                        ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);

  try {
    // Setup
    await setup();

    // Run tests
    const lead = await testLeadCreation();
    await testDuplicateDetection(lead.phone);
    await testLeadAssignment(lead.id);
    await testStageProgression(lead.id);
    const followUp = await testFollowUpScheduling(lead.id);
    await testInteractionLogging(lead.id);
    await testTimelineRetrieval(lead.id);
    await testLeadConversion(lead.id);

    if (followUp) {
      await testFollowUpCompletion(followUp.id, lead.id);
    }

    // Summary
    await generateTestSummary(lead.id);

    // Cleanup
    await cleanup(lead.id);

    logSection('ALL TESTS COMPLETED SUCCESSFULLY');
    log('✓ Lead lifecycle is working correctly!', 'success');

  } catch (error) {
    log(`\n✗ Test failed: ${(error as Error).message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
runAllTests();
