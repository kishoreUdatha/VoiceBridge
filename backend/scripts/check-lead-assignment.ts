import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find the test lead
  const lead = await prisma.lead.findFirst({
    where: { phone: '8919301736' },
    include: {
      assignments: {
        include: {
          assignedTo: true
        }
      }
    }
  });

  if (!lead) {
    console.log('Lead not found!');
    return;
  }

  console.log('=== TEST LEAD ===');
  console.log('ID:', lead.id);
  console.log('Name:', lead.firstName, lead.lastName);
  console.log('Phone:', lead.phone);
  console.log('Org:', lead.organizationId);

  console.log('\n=== ASSIGNMENTS ===');
  lead.assignments.forEach(a => {
    console.log('- Assigned to:', a.assignedTo?.email, '| Active:', a.isActive);
  });

  // Find all telecallers
  console.log('\n=== ALL TELECALLERS ===');
  const telecallers = await prisma.user.findMany({
    where: {
      role: { name: 'Telecaller' }
    }
  });

  telecallers.forEach(t => {
    console.log('- ID:', t.id, '| Email:', t.email);
  });

  await prisma.$disconnect();
}

main();
