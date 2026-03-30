import { prisma } from '../src/config/database';

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: 'admin@demo.com' },
    select: { organizationId: true }
  });

  console.log('Admin organization ID:', user?.organizationId);

  const agents = await prisma.voiceAgent.findMany({
    take: 5,
    select: { id: true, name: true, organizationId: true }
  });

  console.log('\nVoice Agent organization IDs:');
  agents.forEach(a => {
    const match = a.organizationId === user?.organizationId ? '✅ MATCH' : '❌ NO MATCH';
    console.log(`  - ${a.name}: ${a.organizationId} ${match}`);
  });

  // Count agents for admin's org
  const agentCount = await prisma.voiceAgent.count({
    where: { organizationId: user?.organizationId }
  });

  console.log(`\nAgents in admin's org: ${agentCount}`);

  await prisma.$disconnect();
}

check();
