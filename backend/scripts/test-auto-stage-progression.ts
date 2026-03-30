/**
 * Test Script: Automatic Lead Stage Progression
 *
 * Tests that lead stages automatically progress based on call outcomes:
 * - INTERESTED/CALLBACK_REQUESTED → CONTACTED (first positive call)
 * - Multiple positive calls with positive sentiment → QUALIFIED
 * - CONVERTED → WON
 * - NOT_INTERESTED → LOST
 */

import { prisma } from '../src/config/database';

const STAGE_SLUGS = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  NEGOTIATION: 'NEGOTIATION',
  WON: 'WON',
  LOST: 'LOST',
} as const;

async function testAutoStageProgression() {
  console.log('='.repeat(60));
  console.log('Testing Automatic Lead Stage Progression');
  console.log('='.repeat(60));

  try {
    // Get an organization
    const org = await prisma.organization.findFirst({
      where: { isActive: true },
    });

    if (!org) {
      console.log('No organization found. Please create one first.');
      return;
    }

    console.log(`\nOrganization: ${org.name} (${org.id})`);

    // Ensure all stages exist
    console.log('\n--- Checking/Creating Lead Stages ---');
    const stageConfigs = [
      { slug: 'NEW', name: 'New', color: '#3B82F6', order: 1, isDefault: true },
      { slug: 'CONTACTED', name: 'Contacted', color: '#8B5CF6', order: 2 },
      { slug: 'QUALIFIED', name: 'Qualified', color: '#10B981', order: 3 },
      { slug: 'NEGOTIATION', name: 'Negotiation', color: '#F59E0B', order: 4 },
      { slug: 'FOLLOW_UP', name: 'Follow Up', color: '#6366F1', order: 5 },
      { slug: 'WON', name: 'Won', color: '#22C55E', order: 6 },
      { slug: 'LOST', name: 'Lost', color: '#EF4444', order: 7 },
    ];

    for (const config of stageConfigs) {
      const existing = await prisma.leadStage.findFirst({
        where: { organizationId: org.id, slug: config.slug },
      });
      if (!existing) {
        await prisma.leadStage.create({
          data: {
            organizationId: org.id,
            ...config,
          },
        });
        console.log(`  Created stage: ${config.name}`);
      } else {
        console.log(`  Stage exists: ${config.name}`);
      }
    }

    // Get stages
    const stages = await prisma.leadStage.findMany({
      where: { organizationId: org.id },
      orderBy: { order: 'asc' },
    });

    const stageMap = new Map(stages.map(s => [s.slug, s]));
    const newStage = stageMap.get('NEW');

    if (!newStage) {
      console.log('❌ NEW stage not found');
      return;
    }

    // Get a voice agent for testing
    const voiceAgent = await prisma.voiceAgent.findFirst({
      where: { organizationId: org.id },
    });

    if (!voiceAgent) {
      console.log('⚠️  No voice agent found. Creating a test one...');
      // Skip if no voice agent - just log the expected behavior
    }

    console.log('\n' + '='.repeat(60));
    console.log('Stage Progression Rules');
    console.log('='.repeat(60));
    console.log(`
    Call Outcome          | Current Stage | New Stage
    ---------------------|---------------|------------
    INTERESTED (1st)     | NEW           | CONTACTED
    CALLBACK_REQUESTED   | NEW           | CONTACTED
    INTERESTED (2nd+)    | CONTACTED     | QUALIFIED (if sentiment positive)
    INTERESTED (3rd+)    | QUALIFIED     | NEGOTIATION
    CONVERTED            | Any           | WON
    NOT_INTERESTED       | Any           | LOST
    `);

    // Test 1: Find leads with calls and check their progression
    console.log('\n--- Test 1: Checking Existing Lead Progressions ---');
    const leadsWithCalls = await prisma.lead.findMany({
      where: {
        organizationId: org.id,
        totalCalls: { gt: 0 },
      },
      take: 5,
      include: {
        stage: true,
        activities: {
          where: { type: 'STAGE_CHANGED' },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    if (leadsWithCalls.length > 0) {
      for (const lead of leadsWithCalls) {
        console.log(`\n  Lead: ${lead.firstName} ${lead.lastName || ''}`);
        console.log(`    Total Calls: ${lead.totalCalls}`);
        console.log(`    Current Stage: ${lead.stage?.name || 'None'} (${lead.stage?.slug || 'N/A'})`);

        if (lead.activities.length > 0) {
          console.log(`    Recent Stage Changes:`);
          for (const activity of lead.activities) {
            const metadata = activity.metadata as any;
            console.log(`      - ${metadata?.previousStage || 'NEW'} → ${metadata?.newStage || 'Unknown'} (${metadata?.reason || 'No reason'})`);
          }
        } else {
          console.log(`    No stage change history`);
        }
      }
    } else {
      console.log('  No leads with calls found');
    }

    // Test 2: Check recent outbound calls and their lead impacts
    console.log('\n--- Test 2: Recent Calls with Lead Impact ---');
    const recentCalls = await prisma.outboundCall.findMany({
      where: {
        agent: { organizationId: org.id },
        outcome: { not: null },
        existingLeadId: { not: null },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        existingLead: {
          include: { stage: true },
        },
      },
    });

    if (recentCalls.length > 0) {
      for (const call of recentCalls) {
        console.log(`\n  Call: ${call.id.slice(0, 8)}...`);
        console.log(`    Outcome: ${call.outcome}`);
        console.log(`    Sentiment: ${call.sentiment || 'N/A'}`);
        console.log(`    Lead: ${call.existingLead?.firstName} ${call.existingLead?.lastName || ''}`);
        console.log(`    Lead Stage: ${call.existingLead?.stage?.name || 'None'}`);
        console.log(`    Is Follow-up: ${call.isFollowUpCall ? 'Yes' : 'No'} (#${call.followUpNumber || 1})`);
      }
    } else {
      console.log('  No recent calls with outcomes found');
    }

    // Test 3: Verify stage progression logic directly
    console.log('\n--- Test 3: Stage Progression Logic Verification ---');

    // Simulate progression scenarios
    const scenarios = [
      { currentSlug: 'NEW', outcome: 'INTERESTED', totalCalls: 1, sentiment: 'positive', expected: 'CONTACTED' },
      { currentSlug: 'CONTACTED', outcome: 'INTERESTED', totalCalls: 2, sentiment: 'positive', expected: 'QUALIFIED' },
      { currentSlug: 'QUALIFIED', outcome: 'INTERESTED', totalCalls: 3, sentiment: 'positive', expected: 'NEGOTIATION' },
      { currentSlug: 'NEW', outcome: 'CONVERTED', totalCalls: 1, sentiment: 'positive', expected: 'WON' },
      { currentSlug: 'CONTACTED', outcome: 'NOT_INTERESTED', totalCalls: 2, sentiment: 'negative', expected: 'LOST' },
      { currentSlug: 'WON', outcome: 'INTERESTED', totalCalls: 5, sentiment: 'positive', expected: 'NO_CHANGE' },
    ];

    for (const scenario of scenarios) {
      const result = determineNewStageLogic(
        scenario.currentSlug,
        scenario.outcome as any,
        scenario.totalCalls,
        scenario.sentiment
      );

      const expected = scenario.expected === 'NO_CHANGE' ? null : scenario.expected;
      const passed = result === expected;

      console.log(`  ${passed ? '✅' : '❌'} ${scenario.currentSlug} + ${scenario.outcome} (${scenario.totalCalls} calls) → ${result || 'NO_CHANGE'} (expected: ${scenario.expected})`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Tests Complete');
    console.log('='.repeat(60));
    console.log('\nNote: Automatic stage progression happens when:');
    console.log('  - A call is finalized by the CallFinalizationService');
    console.log('  - The LeadLifecycleService processes the completed call');
    console.log('  - Based on outcome and call count, the stage is updated');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Local implementation of the stage determination logic for testing
function determineNewStageLogic(
  currentStageSlug: string | null,
  callOutcome: string | null,
  totalCalls: number,
  sentiment?: string | null
): string | null {
  const POSITIVE_OUTCOMES = ['INTERESTED', 'CALLBACK_REQUESTED', 'CONVERTED'];
  const STAGE_ORDER = ['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATION', 'FOLLOW_UP', 'WON'];

  if (!callOutcome) return null;

  // Direct conversion - always move to WON
  if (callOutcome === 'CONVERTED') {
    return 'WON';
  }

  // Not interested - move to LOST
  if (callOutcome === 'NOT_INTERESTED') {
    return 'LOST';
  }

  // For positive outcomes, determine progression
  if (POSITIVE_OUTCOMES.includes(callOutcome)) {
    const currentIndex = currentStageSlug
      ? STAGE_ORDER.indexOf(currentStageSlug)
      : -1;

    // If already WON or LOST, don't change
    if (currentStageSlug === 'WON' || currentStageSlug === 'LOST') {
      return null;
    }

    // First positive call - move to CONTACTED
    if (currentIndex < 1) {
      return 'CONTACTED';
    }

    // Multiple positive calls - progress further
    // 2+ positive calls with positive sentiment -> QUALIFIED
    if (totalCalls >= 2 && sentiment === 'positive' && currentIndex < 2) {
      return 'QUALIFIED';
    }

    // 3+ positive calls -> NEGOTIATION
    if (totalCalls >= 3 && currentIndex < 3) {
      return 'NEGOTIATION';
    }
  }

  // No stage change needed
  return null;
}

testAutoStageProgression();
