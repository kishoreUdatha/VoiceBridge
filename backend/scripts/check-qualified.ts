import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const telecaller = await prisma.user.findFirst({
    where: { email: 'telecaller@demo.com' },
    select: { id: true, firstName: true }
  });
  console.log('Telecaller:', telecaller);

  // Check leads with qualifiedBy
  const leads = await prisma.lead.findMany({
    where: {
      customFields: { path: ['qualifiedBy'], equals: telecaller?.id }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      customFields: true,
      stage: { select: { name: true } }
    }
  });

  console.log('\nLeads with qualifiedBy:', leads.length);
  leads.forEach((l: any) => {
    console.log('-', l.firstName, l.lastName, '| Stage:', l.stage?.name, '| qualifiedBy:', l.customFields?.qualifiedBy);
  });

  // Now check with the exact filter from the route (excluding NEW)
  console.log('\n--- Testing with NEW excluded ---');
  const filteredLeads = await prisma.lead.findMany({
    where: {
      customFields: { path: ['qualifiedBy'], equals: telecaller?.id },
      stage: {
        name: { notIn: ['New', 'NEW', 'new'] }
      }
    },
    select: {
      id: true,
      firstName: true,
      stage: { select: { name: true } }
    }
  });
  console.log('Filtered leads (excluding NEW):', filteredLeads.length);
  filteredLeads.forEach((l: any) => {
    console.log('-', l.firstName, '| Stage:', l.stage?.name);
  });

  await prisma.$disconnect();
}

check().catch(console.error);
