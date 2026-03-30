import { prisma } from '../src/config/database';

async function checkAgents() {
  const agents = await prisma.voiceAgent.findMany({
    take: 10,
    select: { id: true, name: true, isActive: true, organizationId: true }
  });

  console.log('Voice Agents in database:', agents.length);
  if (agents.length === 0) {
    console.log('  No agents found!');
  } else {
    agents.forEach(a => {
      console.log('  -', a.name);
      console.log('    ID:', a.id);
      console.log('    Active:', a.isActive);
    });
  }

  await prisma.$disconnect();
}

checkAgents();
