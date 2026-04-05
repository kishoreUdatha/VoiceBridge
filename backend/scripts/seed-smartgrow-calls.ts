import { PrismaClient, TelecallerCallStatus, TelecallerCallOutcome } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSmartgrowCalls() {
  console.log('Seeding telecaller calls for Smartgrow Info Tech...');

  const orgId = '41b69d21-b342-4a63-872c-5b454cd23a86'; // Smartgrow Info Tech

  // First, delete old calls
  const deleted = await prisma.telecallerCall.deleteMany({
    where: { organizationId: orgId }
  });
  console.log('Deleted', deleted.count, 'old calls');

  // Get telecaller user (kavya)
  const telecallerRole = await prisma.role.findFirst({
    where: { organizationId: orgId, slug: 'telecaller' }
  });

  if (!telecallerRole) {
    console.log('No telecaller role found');
    return;
  }

  const telecallers = await prisma.user.findMany({
    where: { organizationId: orgId, roleId: telecallerRole.id },
    take: 5
  });

  console.log('Found', telecallers.length, 'telecallers');

  if (telecallers.length === 0) {
    // Create sample telecallers
    const sampleNames = [
      { firstName: 'Priya', lastName: 'Sharma', email: 'priya@smartgrow.com' },
      { firstName: 'Rahul', lastName: 'Kumar', email: 'rahul@smartgrow.com' },
      { firstName: 'Ananya', lastName: 'Reddy', email: 'ananya@smartgrow.com' }
    ];

    for (const name of sampleNames) {
      const t = await prisma.user.create({
        data: {
          organizationId: orgId,
          email: name.email,
          password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.PjE8VYl0Y.qKHi',
          firstName: name.firstName,
          lastName: name.lastName,
          phone: '+91 9876543' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
          roleId: telecallerRole.id,
          isActive: true
        }
      });
      telecallers.push(t);
    }
    console.log('Created 3 sample telecallers');
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

  // Create calls for the past 7 days including TODAY
  const calls = [];
  const now = new Date();

  for (let day = 0; day < 7; day++) {
    const callsPerDay = Math.floor(Math.random() * 10) + 8; // 8-17 calls per day

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
      callDate.setSeconds(Math.floor(Math.random() * 60));

      const duration = status === 'COMPLETED'
        ? Math.floor(Math.random() * 600) + 30 // 30 seconds to 10 minutes
        : status === 'MISSED' ? 0 : Math.floor(Math.random() * 30);

      const startedAt = new Date(callDate);
      const endedAt = new Date(callDate.getTime() + duration * 1000);

      calls.push({
        organizationId: orgId,
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
    where: { organizationId: orgId },
    _count: { _all: true }
  });

  console.log('\nOutcome Summary:');
  summary.forEach(s => {
    console.log(`  ${s.outcome || 'PENDING'}: ${s._count._all} calls`);
  });

  // Check today's calls
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const todayCalls = await prisma.telecallerCall.count({
    where: {
      organizationId: orgId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
  console.log('\nCalls for today:', todayCalls);

  await prisma.$disconnect();
}

seedSmartgrowCalls().catch(console.error);
