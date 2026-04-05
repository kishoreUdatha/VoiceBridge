/**
 * Seed script for Conversion Funnel data
 * Creates lead stages and sample leads at different stages
 *
 * Run: npx ts-node scripts/seed-funnel-data.ts
 */

import { PrismaClient, LeadSource, LeadPriority } from '@prisma/client';

const prisma = new PrismaClient();

// Funnel stages with realistic conversion rates
const FUNNEL_STAGES = [
  { name: 'New', slug: 'new', order: 1, color: '#3B82F6' },
  { name: 'Contacted', slug: 'contacted', order: 2, color: '#8B5CF6' },
  { name: 'Qualified', slug: 'qualified', order: 3, color: '#F59E0B' },
  { name: 'Negotiation', slug: 'negotiation', order: 4, color: '#10B981' },
  { name: 'Won', slug: 'won', order: 5, color: '#22C55E' },
  { name: 'Lost', slug: 'lost', order: 6, color: '#EF4444' },
];

// Distribution of leads across stages (simulates a real funnel)
// 100 new -> 75 contacted -> 45 qualified -> 25 negotiation -> 15 won
const LEAD_DISTRIBUTION = {
  new: 100,
  contacted: 75,
  qualified: 45,
  negotiation: 25,
  won: 15,
  lost: 10,
};

const FIRST_NAMES = [
  'Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rohit', 'Pooja',
  'Suresh', 'Kavita', 'Arun', 'Deepa', 'Sanjay', 'Meera', 'Kiran', 'Neha',
  'Rajesh', 'Swati', 'Manish', 'Sunita', 'Nikhil', 'Ritu', 'Vivek', 'Anita',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Kumar', 'Verma', 'Gupta', 'Reddy', 'Rao',
  'Joshi', 'Mishra', 'Agarwal', 'Mehta', 'Iyer', 'Nair', 'Pillai', 'Das',
];

const SOURCES: LeadSource[] = [
  'AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_GOOGLE', 'FORM', 'MANUAL', 'API', 'REFERRAL'
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
  return `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@${getRandomElement(domains)}`;
}

async function main() {
  console.log('Starting funnel data seed...\n');

  // Get the first organization (or create one if needed)
  let organization = await prisma.organization.findFirst({
    where: { isActive: true },
  });

  if (!organization) {
    console.log('No organization found. Please create an organization first.');
    return;
  }

  const organizationId = organization.id;
  console.log(`Using organization: ${organization.name} (${organizationId})\n`);

  // Step 1: Create Lead Stages
  console.log('Creating lead stages...');
  const stageMap: Record<string, string> = {};

  for (const stage of FUNNEL_STAGES) {
    const existingStage = await prisma.leadStage.findFirst({
      where: { organizationId, slug: stage.slug },
    });

    if (existingStage) {
      stageMap[stage.slug] = existingStage.id;
      console.log(`  Stage "${stage.name}" already exists`);
    } else {
      const newStage = await prisma.leadStage.create({
        data: {
          organizationId,
          name: stage.name,
          slug: stage.slug,
          order: stage.order,
          color: stage.color,
          isActive: true,
          isDefault: stage.slug === 'new',
        },
      });
      stageMap[stage.slug] = newStage.id;
      console.log(`  Created stage: ${stage.name}`);
    }
  }

  // Step 2: Create sample leads at different stages
  console.log('\nCreating sample leads...');
  let totalCreated = 0;

  for (const [stageName, count] of Object.entries(LEAD_DISTRIBUTION)) {
    const stageId = stageMap[stageName];
    if (!stageId) {
      console.log(`  Skipping stage "${stageName}" - not found`);
      continue;
    }

    console.log(`  Creating ${count} leads at "${stageName}" stage...`);

    for (let i = 0; i < count; i++) {
      const firstName = getRandomElement(FIRST_NAMES);
      const lastName = getRandomElement(LAST_NAMES);

      // Check if lead already exists (by phone)
      const phone = generatePhone();
      const existingLead = await prisma.lead.findFirst({
        where: { organizationId, phone },
      });

      if (existingLead) continue;

      // Create lead with random date in last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      await prisma.lead.create({
        data: {
          organizationId,
          firstName,
          lastName,
          phone,
          email: generateEmail(firstName, lastName),
          source: getRandomElement(SOURCES),
          stageId,
          priority: getRandomElement(['LOW', 'MEDIUM', 'HIGH'] as LeadPriority[]),
          isConverted: stageName === 'won',
          createdAt,
          updatedAt: createdAt,
        },
      });
      totalCreated++;
    }
  }

  console.log(`\nTotal leads created: ${totalCreated}`);

  // Step 3: Create some funnel events for tracking
  console.log('\nCreating funnel events...');

  // Get some leads to track their journey
  const leads = await prisma.lead.findMany({
    where: { organizationId },
    take: 50,
    include: { stage: true },
  });

  let eventsCreated = 0;
  for (const lead of leads) {
    if (!lead.stage) continue;

    // Track the lead entering their current stage
    const existingEvent = await prisma.funnelEvent.findFirst({
      where: { leadId: lead.id, stageName: lead.stage.slug },
    });

    if (!existingEvent) {
      await prisma.funnelEvent.create({
        data: {
          organizationId,
          leadId: lead.id,
          funnelName: 'sales',
          stageName: lead.stage.slug,
          stageOrder: lead.stage.order,
          enteredAt: lead.createdAt,
        },
      });
      eventsCreated++;
    }
  }

  console.log(`Funnel events created: ${eventsCreated}`);

  // Summary
  console.log('\n=== Seed Complete ===');
  console.log('Lead Stages:', Object.keys(stageMap).length);
  console.log('Leads Created:', totalCreated);
  console.log('Funnel Events:', eventsCreated);
  console.log('\nYou can now view the funnel at /analytics/funnel');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
