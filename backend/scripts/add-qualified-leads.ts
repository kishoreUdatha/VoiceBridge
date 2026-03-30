import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addQualifiedLeads() {
  // Get telecaller user
  const telecaller = await prisma.user.findFirst({
    where: { email: 'telecaller@demo.com' },
    select: { id: true, firstName: true, organizationId: true }
  });

  if (!telecaller) {
    console.log('Telecaller not found!');
    return;
  }

  console.log('Telecaller:', telecaller.firstName, '- ID:', telecaller.id);

  // Get leads assigned to this telecaller
  const assignedLeads = await prisma.lead.findMany({
    where: {
      organizationId: telecaller.organizationId,
      assignments: {
        some: { assignedToId: telecaller.id, isActive: true }
      }
    },
    select: { id: true, firstName: true, lastName: true, customFields: true },
  });

  console.log('\nAssigned leads:', assignedLeads.length);

  // Update leads to mark them as qualified by this telecaller
  for (const lead of assignedLeads) {
    const currentCustomFields = (lead.customFields as Record<string, any>) || {};

    // Only update if not already set
    if (!currentCustomFields.qualifiedBy) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          customFields: {
            ...currentCustomFields,
            qualifiedBy: telecaller.id,
            qualifiedByName: telecaller.firstName,
            qualifiedAt: new Date().toISOString(),
          }
        }
      });
      console.log(`✅ Marked ${lead.firstName} ${lead.lastName} as qualified by telecaller`);
    } else {
      console.log(`⏭️  ${lead.firstName} ${lead.lastName} already has qualifiedBy`);
    }
  }

  console.log('\n🎉 Done! Refresh the Qualified Leads page to see data.');
  await prisma.$disconnect();
}

addQualifiedLeads().catch(console.error);
