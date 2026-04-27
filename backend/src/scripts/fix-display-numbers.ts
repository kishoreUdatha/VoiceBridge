/**
 * Script to populate displayNumber for existing PhoneNumber records
 * Run with: npx ts-node src/scripts/fix-display-numbers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Format phone number for display
function formatDisplayNumber(phoneNumber: string): string {
  // Remove any non-digit except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // Indian number: +91 XXXXX XXXXX
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    return `+91 ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`;
  }

  // US/Canada: +1 (XXX) XXX-XXXX
  if (cleaned.startsWith('+1') && cleaned.length === 12) {
    return `+1 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  }

  // Default: just add spaces every 4 digits
  return cleaned;
}

async function fixDisplayNumbers() {
  console.log('Fixing displayNumber for existing phone records...\n');

  try {
    // Find all phone numbers without displayNumber
    const numbersToFix = await prisma.phoneNumber.findMany({
      where: {
        OR: [
          { displayNumber: null },
          { displayNumber: '' },
        ],
      },
    });

    console.log(`Found ${numbersToFix.length} numbers without displayNumber\n`);

    if (numbersToFix.length === 0) {
      console.log('All numbers already have displayNumber. Nothing to fix.');
      return;
    }

    let fixed = 0;
    for (const num of numbersToFix) {
      const displayNumber = formatDisplayNumber(num.number);

      await prisma.phoneNumber.update({
        where: { id: num.id },
        data: { displayNumber },
      });

      console.log(`Fixed: ${num.number} -> ${displayNumber}`);
      fixed++;
    }

    console.log(`\nDone! Fixed ${fixed} records.`);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixDisplayNumbers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
