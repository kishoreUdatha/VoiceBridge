/**
 * End-to-End Test: Education Industry Flow
 * Tests complete admission journey - Success and Failure scenarios
 *
 * Run: npx ts-node scripts/test-education-e2e.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  log: ['error'],
});

// Test data
const TEST_ORG_NAME = 'E2E Test University';
const TEST_ORG_SLUG = 'e2e-test-university';
const TEST_ADMIN_EMAIL = 'admin@e2etest.com';
const TEST_PASSWORD = 'Test@123456';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step: number, message: string) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`STEP ${step}: ${message}`, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

async function cleanup() {
  logStep(0, 'CLEANUP - Removing existing test data');

  try {
    const testOrg = await prisma.organization.findFirst({
      where: { slug: TEST_ORG_SLUG },
    });

    if (testOrg) {
      logInfo(`Found existing test org: ${testOrg.id}`);

      // Delete in correct order
      await prisma.leadActivity.deleteMany({ where: { lead: { organizationId: testOrg.id } } });
      await prisma.followUp.deleteMany({ where: { lead: { organizationId: testOrg.id } } });
      await prisma.leadAssignment.deleteMany({ where: { lead: { organizationId: testOrg.id } } });
      await prisma.lead.deleteMany({ where: { organizationId: testOrg.id } });
      await prisma.leadStage.deleteMany({ where: { organizationId: testOrg.id } });
      await prisma.user.deleteMany({ where: { organizationId: testOrg.id } });
      await prisma.role.deleteMany({ where: { organizationId: testOrg.id } });
      await prisma.organization.delete({ where: { id: testOrg.id } });

      logSuccess('Cleaned up existing test data');
    } else {
      logInfo('No existing test data found');
    }
  } catch (error) {
    logWarning(`Cleanup warning: ${error}`);
  }
}

async function createTestOrganization() {
  logStep(1, 'CREATE TEST ORGANIZATION');

  const org = await prisma.organization.create({
    data: {
      name: TEST_ORG_NAME,
      slug: TEST_ORG_SLUG,
      email: 'contact@e2etest.com',
      phone: '9999000000',
      industry: 'EDUCATION',
      isActive: true,
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
      },
    },
  });

  logSuccess(`Created organization: ${org.name} (${org.id})`);
  logInfo(`Industry: ${org.industry}`);

  return org;
}

async function createRolesAndAdmin(organizationId: string) {
  logStep(2, 'CREATE ROLES AND ADMIN USER');

  const adminRole = await prisma.role.create({
    data: {
      organizationId,
      name: 'Admin',
      slug: 'admin',
      permissions: ['*'],
      isSystem: true,
    },
  });
  logSuccess(`Created Admin role: ${adminRole.id}`);

  const counselorRole = await prisma.role.create({
    data: {
      organizationId,
      name: 'Counselor',
      slug: 'counselor',
      permissions: ['leads:read', 'leads:write'],
      isSystem: true,
    },
  });
  logSuccess(`Created Counselor role: ${counselorRole.id}`);

  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
  const admin = await prisma.user.create({
    data: {
      organizationId,
      email: TEST_ADMIN_EMAIL,
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Admin',
      phone: '9999900000',
      roleId: adminRole.id,
      isActive: true,
    },
  });
  logSuccess(`Created Admin user: ${admin.email}`);

  const counselor = await prisma.user.create({
    data: {
      organizationId,
      email: 'counselor@e2etest.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Counselor',
      phone: '9999900001',
      roleId: counselorRole.id,
      isActive: true,
    },
  });
  logSuccess(`Created Counselor user: ${counselor.email}`);

  return { adminRole, counselorRole, admin, counselor };
}

async function createEducationStages(organizationId: string) {
  logStep(3, 'CREATE EDUCATION LEAD STAGES');

  const stages = [
    { name: 'Inquiry', slug: 'inquiry', color: '#94A3B8', journeyOrder: 1, isDefault: true },
    { name: 'Interested', slug: 'interested', color: '#3B82F6', journeyOrder: 2 },
    { name: 'Visit Scheduled', slug: 'visit-scheduled', color: '#6366F1', journeyOrder: 3 },
    { name: 'Visit Completed', slug: 'visit-completed', color: '#8B5CF6', journeyOrder: 4 },
    { name: 'Documents Pending', slug: 'documents-pending', color: '#F97316', journeyOrder: 5 },
    { name: 'Processing', slug: 'processing', color: '#EAB308', journeyOrder: 6 },
    { name: 'Payment Pending', slug: 'payment-pending', color: '#F59E0B', journeyOrder: 7 },
    { name: 'Admitted', slug: 'admitted', color: '#22C55E', journeyOrder: 8 },
    { name: 'Enrolled', slug: 'enrolled', color: '#10B981', journeyOrder: 9, autoSyncStatus: 'WON' },
    { name: 'Dropped', slug: 'dropped', color: '#EF4444', journeyOrder: -1, autoSyncStatus: 'LOST' },
  ];

  const createdStages: any[] = [];

  for (const stage of stages) {
    const created = await prisma.leadStage.create({
      data: {
        organizationId,
        name: stage.name,
        slug: stage.slug,
        color: stage.color,
        journeyOrder: stage.journeyOrder,
        isDefault: stage.isDefault || false,
        isSystemStage: true,
        autoSyncStatus: stage.autoSyncStatus,
      },
    });
    createdStages.push(created);
    logSuccess(`Created stage: ${stage.name} (Order: ${stage.journeyOrder})`);
  }

  return createdStages;
}

async function testSuccessScenario(
  organizationId: string,
  counselorId: string,
  stages: any[]
) {
  logStep(4, 'SUCCESS SCENARIO - Complete Admission Journey');

  log('\n📚 Scenario: Student Rahul Kumar completes full admission process', colors.magenta);

  const getStage = (slug: string) => stages.find((s: any) => s.slug === slug);

  const inquiryStage = getStage('inquiry');
  const lead = await prisma.lead.create({
    data: {
      organizationId,
      firstName: 'Rahul',
      lastName: 'Kumar',
      email: 'rahul.kumar@test.com',
      phone: '9876543210',
      source: 'WEBSITE',
      stageId: inquiryStage.id,
      customFields: {
        course: 'B.Tech Computer Science',
        preferredBatch: '2024',
      },
    },
  });
  logSuccess(`Created lead: ${lead.firstName} ${lead.lastName} (${lead.id})`);
  logInfo(`Initial stage: ${inquiryStage.name}`);

  await prisma.leadAssignment.create({
    data: {
      leadId: lead.id,
      assignedToId: counselorId,
      assignedById: counselorId,
      isActive: true,
    },
  });
  logSuccess(`Assigned lead to counselor`);

  const journeyStages = [
    { slug: 'interested', note: 'Student showed interest in B.Tech CS program' },
    { slug: 'visit-scheduled', note: 'Campus visit scheduled for next week' },
    { slug: 'visit-completed', note: 'Student visited campus, liked the facilities' },
    { slug: 'documents-pending', note: 'Requested 10th, 12th marksheets and ID proof' },
    { slug: 'processing', note: 'Documents received and verified' },
    { slug: 'payment-pending', note: 'Fee structure shared, awaiting payment' },
    { slug: 'admitted', note: 'First semester fee received, admission confirmed' },
    { slug: 'enrolled', note: 'Student enrolled, ID card issued' },
  ];

  let currentStage = inquiryStage;

  for (const journey of journeyStages) {
    const nextStage = getStage(journey.slug);
    const isWon = nextStage.autoSyncStatus === 'WON';

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stageId: nextStage.id,
        isConverted: isWon,
        convertedAt: isWon ? new Date() : null,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: counselorId,
        type: 'STAGE_CHANGED',
        title: `Stage: ${currentStage.name} → ${nextStage.name}`,
        description: journey.note,
        metadata: {
          fromStage: currentStage.slug,
          toStage: nextStage.slug,
        },
      },
    });

    log(`   ${currentStage.name} → ${nextStage.name}`, colors.yellow);
    logInfo(`   Note: ${journey.note}`);

    currentStage = nextStage;
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const finalLead = await prisma.lead.findUnique({
    where: { id: lead.id },
    include: { stage: true },
  });

  log('\n📊 FINAL STATE:', colors.green);
  logSuccess(`Lead: ${finalLead?.firstName} ${finalLead?.lastName}`);
  logSuccess(`Stage: ${finalLead?.stage?.name}`);
  logSuccess(`Converted: ${finalLead?.isConverted}`);
  logSuccess(`Converted At: ${finalLead?.convertedAt}`);

  const activities = await prisma.leadActivity.count({ where: { leadId: lead.id } });
  logSuccess(`Total Activities: ${activities}`);

  return lead;
}

async function testFailureScenario(
  organizationId: string,
  counselorId: string,
  stages: any[]
) {
  logStep(5, 'FAILURE SCENARIO - Student Drops Out');

  log('\n📚 Scenario: Student Priya Sharma drops out after visit', colors.magenta);

  const getStage = (slug: string) => stages.find((s: any) => s.slug === slug);

  const inquiryStage = getStage('inquiry');
  const lead = await prisma.lead.create({
    data: {
      organizationId,
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@test.com',
      phone: '9876543211',
      source: 'REFERRAL',
      stageId: inquiryStage.id,
      customFields: {
        course: 'MBA',
        referredBy: 'Alumni Network',
      },
    },
  });
  logSuccess(`Created lead: ${lead.firstName} ${lead.lastName} (${lead.id})`);

  await prisma.leadAssignment.create({
    data: {
      leadId: lead.id,
      assignedToId: counselorId,
      assignedById: counselorId,
      isActive: true,
    },
  });

  const partialJourney = [
    { slug: 'interested', note: 'Interested in MBA program' },
    { slug: 'visit-scheduled', note: 'Campus visit scheduled' },
    { slug: 'visit-completed', note: 'Visited but had concerns about fee structure' },
  ];

  let currentStage = inquiryStage;

  for (const journey of partialJourney) {
    const nextStage = getStage(journey.slug);

    await prisma.lead.update({
      where: { id: lead.id },
      data: { stageId: nextStage.id },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: counselorId,
        type: 'STAGE_CHANGED',
        title: `Stage: ${currentStage.name} → ${nextStage.name}`,
        description: journey.note,
        metadata: { fromStage: currentStage.slug, toStage: nextStage.slug },
      },
    });

    log(`   ${currentStage.name} → ${nextStage.name}`, colors.yellow);
    logInfo(`   Note: ${journey.note}`);

    currentStage = nextStage;
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Student drops out
  const droppedStage = getStage('dropped');

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      stageId: droppedStage.id,
      isConverted: false,
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      userId: counselorId,
      type: 'STAGE_CHANGED',
      title: `Lead DROPPED`,
      description: 'Fee too high, chose another college',
      metadata: {
        fromStage: currentStage.slug,
        toStage: 'dropped',
        lostReason: 'Fee too high, chose another college',
      },
    },
  });

  log(`   ${currentStage.name} → ${droppedStage.name} ❌`, colors.red);
  logInfo(`   Reason: Fee too high, chose another college`);

  const finalLead = await prisma.lead.findUnique({
    where: { id: lead.id },
    include: { stage: true },
  });

  log('\n📊 FINAL STATE:', colors.red);
  logError(`Lead: ${finalLead?.firstName} ${finalLead?.lastName}`);
  logError(`Stage: ${finalLead?.stage?.name}`);
  logError(`Converted: ${finalLead?.isConverted}`);

  return lead;
}

async function generateReport(organizationId: string) {
  logStep(6, 'GENERATE TEST REPORT');

  const leads = await prisma.lead.findMany({
    where: { organizationId },
    include: { stage: true },
  });

  const stages = await prisma.leadStage.findMany({
    where: { organizationId },
    orderBy: { journeyOrder: 'asc' },
  });

  log('\n' + '═'.repeat(60), colors.cyan);
  log('                    TEST REPORT', colors.cyan);
  log('═'.repeat(60), colors.cyan);

  log('\n📊 STAGE DISTRIBUTION:', colors.yellow);
  for (const stage of stages) {
    const count = leads.filter((l: any) => l.stageId === stage.id).length;
    const bar = '█'.repeat(count * 5) || '░';
    const color = stage.autoSyncStatus === 'WON' ? colors.green : stage.autoSyncStatus === 'LOST' ? colors.red : colors.blue;
    log(`   ${stage.name.padEnd(20)} ${bar} ${count}`, color);
  }

  log('\n📈 CONVERSION METRICS:', colors.yellow);
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l: any) => l.isConverted).length;
  const droppedLeads = leads.filter((l: any) => l.stage?.autoSyncStatus === 'LOST').length;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0';
  const dropRate = totalLeads > 0 ? ((droppedLeads / totalLeads) * 100).toFixed(1) : '0';

  log(`   Total Leads:      ${totalLeads}`, colors.blue);
  log(`   Converted (WON):  ${convertedLeads} (${conversionRate}%)`, colors.green);
  log(`   Dropped (LOST):   ${droppedLeads} (${dropRate}%)`, colors.red);

  log('\n📋 LEAD DETAILS:', colors.yellow);
  for (const lead of leads) {
    const status = lead.isConverted ? '✅ ENROLLED' : lead.stage?.autoSyncStatus === 'LOST' ? '❌ DROPPED' : '⏳ IN PROGRESS';
    const color = lead.isConverted ? colors.green : lead.stage?.autoSyncStatus === 'LOST' ? colors.red : colors.yellow;
    log(`   ${lead.firstName} ${lead.lastName} - ${lead.stage?.name} - ${status}`, color);
  }

  // Show activity timeline
  log('\n📜 ACTIVITY TIMELINE:', colors.yellow);
  const activities = await prisma.leadActivity.findMany({
    where: { lead: { organizationId } },
    include: { lead: true },
    orderBy: { createdAt: 'asc' },
  });

  for (const activity of activities) {
    log(`   [${activity.lead.firstName}] ${activity.title}`, colors.blue);
  }

  log('\n' + '═'.repeat(60), colors.cyan);
}

async function main() {
  log('\n' + '═'.repeat(60), colors.magenta);
  log('     EDUCATION INDUSTRY - END-TO-END TEST', colors.magenta);
  log('═'.repeat(60), colors.magenta);
  log(`Started at: ${new Date().toISOString()}`, colors.blue);

  try {
    await cleanup();
    const org = await createTestOrganization();
    const { counselor } = await createRolesAndAdmin(org.id);
    const stages = await createEducationStages(org.id);
    await testSuccessScenario(org.id, counselor.id, stages);
    await testFailureScenario(org.id, counselor.id, stages);
    await generateReport(org.id);

    log('\n' + '═'.repeat(60), colors.green);
    log('     ✅ ALL TESTS COMPLETED SUCCESSFULLY', colors.green);
    log('═'.repeat(60), colors.green);

    log('\n📝 Test Account Credentials:', colors.yellow);
    log(`   Organization: ${TEST_ORG_NAME}`, colors.blue);
    log(`   Admin Email:  ${TEST_ADMIN_EMAIL}`, colors.blue);
    log(`   Password:     ${TEST_PASSWORD}`, colors.blue);
    log(`\nYou can login to the app with these credentials to see the test data.`, colors.cyan);

  } catch (error) {
    logError(`Test failed: ${error}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
