import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find telecaller@demo.com with role
  const user = await prisma.user.findFirst({
    where: { email: 'telecaller@demo.com' },
    include: { role: true }
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  console.log('=== USER ===');
  console.log('ID:', user.id);
  console.log('Email:', user.email);
  console.log('Role name:', user.role?.name);
  console.log('Role slug:', user.role?.slug);
  console.log('Org:', user.organizationId);

  // Now simulate the exact query the API uses
  const whereClause: any = {
    organizationId: user.organizationId,
    assignments: {
      some: {
        assignedToId: user.id,
        isActive: true,
      },
    },
  };

  console.log('\n=== QUERY WHERE CLAUSE ===');
  console.log(JSON.stringify(whereClause, null, 2));

  const leads = await prisma.lead.findMany({
    where: whereClause,
    include: {
      assignments: {
        where: { isActive: true },
        include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  console.log('\n=== LEADS FOUND ===');
  console.log('Total:', leads.length);
  leads.forEach(l => {
    console.log('-', l.firstName, l.lastName, '|', l.phone);
  });

  await prisma.$disconnect();
}

main();
