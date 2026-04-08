import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Search for users with 'keerti' or 'bharat' in email/name
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'keerti', mode: 'insensitive' } },
        { email: { contains: 'bharat', mode: 'insensitive' } },
        { firstName: { contains: 'keerti', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: { select: { slug: true, name: true } }
    },
    take: 10
  });

  console.log('=== Found Users ===');
  if (users.length === 0) {
    console.log('No users found matching keerti/bharat');
  } else {
    users.forEach(u => {
      console.log(`  - ${u.email} | ${u.firstName} ${u.lastName} | Role: ${u.role?.name}`);
    });
  }

  // Show recent leads
  const recentLeads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      stage: true,
      assignments: {
        where: { isActive: true },
        include: { assignedTo: { select: { firstName: true, lastName: true, email: true } } }
      }
    }
  });

  console.log('\n=== Recent Leads ===');
  recentLeads.forEach((l: any) => {
    const assignee = l.assignments?.[0]?.assignedTo;
    console.log(`  - ${l.firstName} ${l.lastName} | Phone: ${l.phone} | Stage: ${l.stage?.name || 'None'} | Assigned: ${assignee?.email || 'Unassigned'}`);
  });

  // Show recent raw import records
  const recentRecords = await prisma.rawImportRecord.findMany({
    where: { status: { in: ['PENDING', 'ASSIGNED', 'CALLING'] } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      assignedTo: { select: { firstName: true, lastName: true, email: true } }
    }
  });

  console.log('\n=== Pending Raw Records ===');
  recentRecords.forEach(r => {
    console.log(`  - ${r.firstName} ${r.lastName} | Phone: ${r.phone} | Status: ${r.status} | Assigned: ${r.assignedTo?.email || 'Unassigned'}`);
  });

  // List all telecallers
  const telecallers = await prisma.user.findMany({
    where: {
      role: { slug: { in: ['telecaller', 'counselor', 'caller'] } },
      isActive: true
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: { select: { slug: true } }
    },
    take: 10
  });

  console.log('\n=== Active Telecallers ===');
  telecallers.forEach(u => {
    console.log(`  - ${u.email} | ${u.firstName} ${u.lastName} | Role: ${u.role?.slug}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
