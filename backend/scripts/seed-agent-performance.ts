/**
 * Seed script for Agent Performance data
 * Creates voice agents and their daily performance records
 *
 * Run: npx ts-node scripts/seed-agent-performance.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AGENT_NAMES = [
  'Sales Pro',
  'Lead Hunter',
  'Appointment Setter',
  'Customer Care',
  'Follow-up Expert',
  'Demo Specialist',
];

const INDUSTRIES = ['REAL_ESTATE', 'EDUCATION', 'FINANCE', 'HEALTHCARE', 'IT_RECRUITMENT', 'ECOMMERCE'] as const;

async function main() {
  console.log('Starting agent performance seed...\n');

  // Get the first organization
  const organization = await prisma.organization.findFirst({
    where: { isActive: true },
  });

  if (!organization) {
    console.log('No organization found. Please create an organization first.');
    return;
  }

  const organizationId = organization.id;
  console.log(`Using organization: ${organization.name} (${organizationId})\n`);

  // Step 1: Create Voice Agents
  console.log('Creating voice agents...');
  const agents: { id: string; name: string }[] = [];

  for (let i = 0; i < AGENT_NAMES.length; i++) {
    const name = AGENT_NAMES[i];
    const industry = INDUSTRIES[i % INDUSTRIES.length];

    // Check if agent exists
    let agent = await prisma.voiceAgent.findFirst({
      where: { organizationId, name },
    });

    if (!agent) {
      agent = await prisma.voiceAgent.create({
        data: {
          organizationId,
          name,
          description: `AI agent for ${name.toLowerCase()} tasks`,
          industry,
          agentType: 'VOICE',
          callDirection: 'OUTBOUND',
          isActive: true,
          status: 'PUBLISHED',
          systemPrompt: `You are ${name}, a professional AI voice agent.`,
          voiceId: 'alloy',
          language: 'en',
          temperature: 0.7,
          llmProvider: 'openai',
          llmModel: 'gpt-4o-mini',
        },
      });
      console.log(`  Created agent: ${name}`);
    } else {
      console.log(`  Agent exists: ${name}`);
    }

    agents.push({ id: agent.id, name: agent.name });
  }

  // Step 2: Create performance data for last 30 days
  console.log('\nCreating daily performance records...');
  let recordsCreated = 0;

  for (const agent of agents) {
    // Generate different performance profiles for each agent
    const agentIndex = agents.indexOf(agent);
    const baseCallsPerDay = 30 + agentIndex * 10; // 30-80 calls per day
    const baseAnswerRate = 0.55 + agentIndex * 0.05; // 55-80% answer rate
    const baseConversionRate = 0.08 + agentIndex * 0.03; // 8-23% conversion

    for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      date.setHours(0, 0, 0, 0);

      // Check if record exists
      const existing = await prisma.agentPerformanceDaily.findFirst({
        where: {
          organizationId,
          agentId: agent.id,
          date,
        },
      });

      if (existing) continue;

      // Generate random variations
      const variation = 0.8 + Math.random() * 0.4; // 80-120% variation
      const totalCalls = Math.floor(baseCallsPerDay * variation);
      const answerRate = Math.min(1, baseAnswerRate * (0.9 + Math.random() * 0.2));
      const answeredCalls = Math.floor(totalCalls * answerRate);
      const conversionRate = Math.min(0.5, baseConversionRate * (0.8 + Math.random() * 0.4));
      const interestedCount = Math.floor(answeredCalls * conversionRate * 1.5);
      const appointmentsBooked = Math.floor(answeredCalls * conversionRate);
      const avgCallDuration = 120 + Math.floor(Math.random() * 180); // 2-5 minutes
      const totalTalkTime = answeredCalls * avgCallDuration;

      await prisma.agentPerformanceDaily.create({
        data: {
          organizationId,
          agentId: agent.id,
          agentName: agent.name,
          date,
          totalCalls,
          answeredCalls,
          avgCallDuration,
          totalTalkTime,
          interestedCount,
          appointmentsBooked,
          paymentsCollected: Math.floor(appointmentsBooked * 0.3),
          paymentsAmount: Math.floor(appointmentsBooked * 0.3 * (500 + Math.random() * 2000)),
          leadsGenerated: interestedCount,
          callbacksRequested: Math.floor(answeredCalls * 0.1),
          avgSentimentScore: 0.3 + Math.random() * 0.5,
          avgQualityScore: 6 + Math.random() * 3,
          positiveCallsCount: Math.floor(answeredCalls * 0.6),
          negativeCallsCount: Math.floor(answeredCalls * 0.1),
          conversionRate: conversionRate * 100,
          answerRate: answerRate * 100,
          avgLeadScore: 50 + Math.random() * 40,
        },
      });
      recordsCreated++;
    }
  }

  console.log(`Performance records created: ${recordsCreated}`);

  // Summary
  const totalAgents = await prisma.voiceAgent.count({ where: { organizationId } });
  const totalRecords = await prisma.agentPerformanceDaily.count({ where: { organizationId } });

  console.log('\n=== Seed Complete ===');
  console.log('Voice Agents:', totalAgents);
  console.log('Performance Records:', totalRecords);
  console.log('\nYou can now view agent performance at /analytics/agents');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
