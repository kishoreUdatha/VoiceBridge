/**
 * One-time script to fix duplicate names in leads
 * Run with: npx ts-node scripts/fix-duplicate-names-once.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDuplicateNames() {
  console.log('Finding leads with duplicate names...\n');

  // Find all leads where lastName might be duplicated in firstName
  const leads = await prisma.lead.findMany({
    where: {
      firstName: { not: null },
      lastName: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log(`Checking ${leads.length} leads...\n`);

  let fixedCount = 0;

  for (const lead of leads) {
    if (!lead.firstName || !lead.lastName) continue;

    const firstNameUpper = lead.firstName.toUpperCase().trim();
    const lastNameUpper = lead.lastName.toUpperCase().trim();

    // If firstName contains lastName, it's a duplicate
    if (firstNameUpper.includes(lastNameUpper) || firstNameUpper.endsWith(lastNameUpper)) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastName: null },
      });
      console.log(`✓ Fixed: "${lead.firstName} ${lead.lastName}" -> "${lead.firstName}"`);
      fixedCount++;
    }
    // If lastName contains firstName and is longer, swap
    else if (lastNameUpper.includes(firstNameUpper) && lastNameUpper.length > firstNameUpper.length) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { firstName: lead.lastName, lastName: null },
      });
      console.log(`✓ Fixed: "${lead.firstName} ${lead.lastName}" -> "${lead.lastName}"`);
      fixedCount++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total leads checked: ${leads.length}`);
  console.log(`Fixed: ${fixedCount}`);
}

fixDuplicateNames()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
