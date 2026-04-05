import { PrismaClient, TelecallerCallStatus, TelecallerCallOutcome } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTelecallerCalls() {
  console.log('Seeding telecaller calls...');

  // Get organization
  const org = await prisma.organization.findFirst({
    where: { isActive: true }
  });

  if (!org) {
    console.log('No active organization found');
    return;
  }

  console.log('Organization:', org.name);

  // Get telecaller role
  const telecallerRole = await prisma.role.findFirst({
    where: {
      organizationId: org.id,
      slug: 'telecaller'
    }
  });

  if (!telecallerRole) {
    console.log('No telecaller role found');
    return;
  }

  // Get telecaller users
  const telecallers = await prisma.user.findMany({
    where: {
      organizationId: org.id,
      roleId: telecallerRole.id,
      isActive: true
    },
    take: 5
  });

  console.log('Found', telecallers.length, 'telecallers');

  if (telecallers.length === 0) {
    console.log('No telecallers found. Creating a sample telecaller...');

    // Create a sample telecaller if none exists
    const sampleTelecaller = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: 'telecaller1@demo.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.PjE8VYl0Y.qKHi', // admin123
        firstName: 'Priya',
        lastName: 'Sharma',
        phone: '+91 9876543210',
        roleId: telecallerRole.id,
        isActive: true
      }
    });
    telecallers.push(sampleTelecaller);
  }

  // Sample contact names
  const contacts = [
    { name: 'Rahul Kumar', phone: '+91 98765 43210' },
    { name: 'Sneha Reddy', phone: '+91 87654 32109' },
    { name: 'Arun Nair', phone: '+91 76543 21098' },
    { name: 'Pooja Mehta', phone: '+91 65432 10987' },
    { name: 'Vijay Pillai', phone: '+91 54321 09876' },
    { name: 'Lakshmi Iyer', phone: '+91 43210 98765' },
    { name: 'Manish Verma', phone: '+91 32109 87654' },
    { name: 'Anita Desai', phone: '+91 21098 76543' },
    { name: 'Sanjay Gupta', phone: '+91 10987 65432' },
    { name: 'Meera Krishnan', phone: '+91 09876 54321' },
    { name: 'Arjun Bhat', phone: '+91 98712 34567' },
    { name: 'Divya Menon', phone: '+91 87612 34567' },
    { name: 'Kiran Rao', phone: '+91 76512 34567' },
    { name: 'Neha Singh', phone: '+91 65412 34567' },
    { name: 'Prakash Joshi', phone: '+91 54312 34567' },
  ];

  const outcomes: TelecallerCallOutcome[] = [
    'INTERESTED',
    'NOT_INTERESTED',
    'CALLBACK',
    'CONVERTED',
    'NO_ANSWER',
    'WRONG_NUMBER',
    'BUSY'
  ];

  const statuses: TelecallerCallStatus[] = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'MISSED', 'FAILED'];

  // Create calls for the past 7 days
  const calls = [];
  const now = new Date();

  for (let day = 0; day < 7; day++) {
    const callsPerDay = Math.floor(Math.random() * 8) + 5; // 5-12 calls per day

    for (let i = 0; i < callsPerDay; i++) {
      const telecaller = telecallers[Math.floor(Math.random() * telecallers.length)];
      const contact = contacts[Math.floor(Math.random() * contacts.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const outcome = status === 'COMPLETED'
        ? outcomes[Math.floor(Math.random() * outcomes.length)]
        : null;

      const callDate = new Date(now);
      callDate.setDate(callDate.getDate() - day);
      callDate.setHours(9 + Math.floor(Math.random() * 9)); // 9 AM to 6 PM
      callDate.setMinutes(Math.floor(Math.random() * 60));

      const duration = status === 'COMPLETED'
        ? Math.floor(Math.random() * 600) + 30 // 30 seconds to 10 minutes
        : status === 'MISSED' ? 0 : Math.floor(Math.random() * 30);

      const startedAt = new Date(callDate);
      const endedAt = new Date(callDate.getTime() + duration * 1000);

      calls.push({
        organizationId: org.id,
        telecallerId: telecaller.id,
        phoneNumber: contact.phone,
        contactName: contact.name,
        status,
        outcome,
        duration,
        startedAt,
        endedAt,
        createdAt: callDate,
        sentiment: outcome === 'INTERESTED' || outcome === 'CONVERTED' ? 'positive'
          : outcome === 'NOT_INTERESTED' ? 'negative' : 'neutral',
        summary: outcome === 'INTERESTED'
          ? 'Customer showed interest in the product. Requested more information.'
          : outcome === 'CONVERTED'
          ? 'Successfully converted the lead. Customer agreed to purchase.'
          : outcome === 'CALLBACK'
          ? 'Customer requested a callback at a later time.'
          : outcome === 'NOT_INTERESTED'
          ? 'Customer declined the offer.'
          : null
      });
    }
  }

  // Insert calls
  const result = await prisma.telecallerCall.createMany({
    data: calls,
    skipDuplicates: true
  });

  console.log('Created', result.count, 'telecaller calls');

  // Show summary
  const summary = await prisma.telecallerCall.groupBy({
    by: ['outcome'],
    where: { organizationId: org.id },
    _count: { _all: true }
  });

  console.log('\nOutcome Summary:');
  summary.forEach(s => {
    console.log(`  ${s.outcome || 'PENDING'}: ${s._count._all} calls`);
  });

  const telecallerSummary = await prisma.telecallerCall.groupBy({
    by: ['telecallerId'],
    where: { organizationId: org.id },
    _count: { _all: true }
  });

  console.log('\nCalls by Telecaller:');
  for (const s of telecallerSummary) {
    const user = await prisma.user.findUnique({ where: { id: s.telecallerId }, select: { firstName: true, lastName: true } });
    console.log(`  ${user?.firstName} ${user?.lastName}: ${s._count._all} calls`);
  }

  await prisma.$disconnect();
}

seedTelecallerCalls().catch(console.error);
