import { prisma } from '../src/config/database';

async function checkCallData() {
  // Get organizations
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  console.log('Organizations:');
  orgs.forEach(o => console.log('  -', o.name, ':', o.id));

  // Get admin users
  const admins = await prisma.user.findMany({
    where: { role: { name: 'ADMIN' } },
    select: { id: true, firstName: true, lastName: true, organizationId: true }
  });
  console.log('\nAdmin users:');
  admins.forEach(a => console.log('  -', a.firstName, a.lastName, '| Org:', a.organizationId));

  // Check call data per org
  console.log('\nCall data per organization:');
  for (const org of orgs) {
    const aiCalls = await prisma.outboundCall.count({
      where: { agent: { organizationId: org.id } }
    });
    const humanCalls = await prisma.callLog.count({
      where: { organizationId: org.id }
    });
    const voiceSessions = await prisma.voiceSession.count({
      where: { agent: { organizationId: org.id } }
    });
    console.log('  ', org.name);
    console.log('    AI Outbound Calls:', aiCalls);
    console.log('    Voice Sessions:', voiceSessions);
    console.log('    Human Call Logs:', humanCalls);
  }

  await prisma.$disconnect();
}

checkCallData();
