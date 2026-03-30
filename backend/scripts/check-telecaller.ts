import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Get telecaller user
  const telecaller = await prisma.user.findFirst({
    where: { email: 'telecaller@demo.com' },
    select: { id: true, email: true, organizationId: true, role: { select: { slug: true, name: true } } }
  });

  if (!telecaller) {
    console.log('Telecaller not found!');
    return;
  }

  console.log('=== Telecaller Info ===');
  console.log('ID:', telecaller.id);
  console.log('Email:', telecaller.email);
  console.log('Role:', telecaller.role?.slug, '/', telecaller.role?.name);
  console.log('Organization ID:', telecaller.organizationId);

  // Get leads assigned to this telecaller
  const assignments = await prisma.leadAssignment.findMany({
    where: { assignedToId: telecaller.id, isActive: true },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          stage: { select: { name: true } }
        }
      }
    },
    take: 10
  });

  console.log('\n=== Assigned Leads ===');
  console.log('Count:', assignments.length);

  if (assignments.length > 0) {
    assignments.forEach((a, i) => {
      console.log(`${i+1}. ${a.lead.firstName} ${a.lead.lastName} - ${a.lead.phone} - Stage: ${a.lead.stage?.name || 'No stage'}`);
    });
  } else {
    console.log('No leads assigned to this telecaller!');
  }

  // Get total leads in org
  const totalLeads = await prisma.lead.count({
    where: { organizationId: telecaller.organizationId }
  });
  console.log('\n=== Organization Stats ===');
  console.log('Total leads in org:', totalLeads);

  // Get unassigned leads
  const unassignedLeads = await prisma.lead.count({
    where: {
      organizationId: telecaller.organizationId,
      assignments: { none: {} }
    }
  });
  console.log('Unassigned leads:', unassignedLeads);

  await prisma.$disconnect();
}

check().catch(console.error);
