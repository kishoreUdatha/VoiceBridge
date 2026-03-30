import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find the test lead
  const lead = await prisma.lead.findFirst({
    where: { phone: '8919301736' }
  });

  if (!lead) {
    console.log('Lead not found!');
    return;
  }

  console.log('Found lead:', lead.id);

  // Find all telecallers
  const telecallers = await prisma.user.findMany({
    where: {
      role: { name: 'Telecaller' }
    }
  });

  console.log('Found', telecallers.length, 'telecallers');

  // Assign to all telecallers
  for (const telecaller of telecallers) {
    // Check if already assigned
    const existing = await prisma.leadAssignment.findFirst({
      where: {
        leadId: lead.id,
        assignedToId: telecaller.id
      }
    });

    if (existing) {
      // Update to active
      await prisma.leadAssignment.update({
        where: { id: existing.id },
        data: { isActive: true }
      });
      console.log('Updated existing assignment for:', telecaller.email);
    } else {
      // Create new assignment
      await prisma.leadAssignment.create({
        data: {
          leadId: lead.id,
          assignedToId: telecaller.id,
          assignedById: telecaller.id,
          isActive: true
        }
      });
      console.log('Created new assignment for:', telecaller.email);
    }
  }

  console.log('\nSUCCESS: Lead assigned to all telecallers!');
  console.log('Now refresh the Leads screen in the app.');

  await prisma.$disconnect();
}

main();
