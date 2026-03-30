import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find telecaller@demo.com
  const user = await prisma.user.findFirst({
    where: { email: 'telecaller@demo.com' }
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  console.log('=== USER ===');
  console.log('ID:', user.id);
  console.log('Email:', user.email);
  console.log('Org:', user.organizationId);

  // Find leads assigned to this user (same query the API uses)
  const assignments = await prisma.leadAssignment.findMany({
    where: {
      assignedToId: user.id,
      isActive: true
    },
    include: {
      lead: true
    }
  });

  console.log('\n=== ASSIGNED LEADS ===');
  console.log('Total assignments:', assignments.length);

  assignments.forEach(a => {
    console.log('- Lead:', a.lead?.firstName, a.lead?.lastName, '| Phone:', a.lead?.phone, '| ID:', a.leadId);
  });

  // Check test lead specifically
  const testLead = await prisma.lead.findFirst({
    where: { phone: '8919301736' }
  });

  if (testLead) {
    console.log('\n=== TEST LEAD ===');
    console.log('ID:', testLead.id);
    console.log('Org:', testLead.organizationId);
    console.log('User Org matches:', testLead.organizationId === user.organizationId);

    const testAssignment = await prisma.leadAssignment.findFirst({
      where: {
        leadId: testLead.id,
        assignedToId: user.id
      }
    });

    console.log('Assignment exists:', !!testAssignment);
    console.log('Assignment active:', testAssignment?.isActive);
  }

  await prisma.$disconnect();
}

main();
