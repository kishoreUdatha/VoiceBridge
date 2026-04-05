import { prisma } from '../src/config/database';

async function seedDemo() {
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'Demo' } }
  });

  if (!org) {
    console.log('Demo org not found');
    await prisma.$disconnect();
    return;
  }

  console.log('Seeding calls for:', org.name, '(', org.id, ')');

  // Get or create voice agents
  let agents = await prisma.voiceAgent.findMany({
    where: { organizationId: org.id },
    take: 3
  });

  if (agents.length === 0) {
    console.log('Creating voice agents...');
    await prisma.voiceAgent.create({
      data: {
        organizationId: org.id,
        name: 'AI Sales Agent',
        industry: 'EDUCATION',
        isActive: true,
        language: 'en-US',
        voiceId: 'alloy',
        systemPrompt: 'Help with sales',
        greeting: 'Hello!'
      }
    });
    await prisma.voiceAgent.create({
      data: {
        organizationId: org.id,
        name: 'AI Support Agent',
        industry: 'EDUCATION',
        isActive: true,
        language: 'en-US',
        voiceId: 'alloy',
        systemPrompt: 'Help with support',
        greeting: 'Hi!'
      }
    });
    agents = await prisma.voiceAgent.findMany({ where: { organizationId: org.id } });
  }
  console.log('Voice agents:', agents.length);

  // Get telecallers
  const telecallers = await prisma.user.findMany({
    where: { organizationId: org.id, isActive: true },
    take: 3
  });
  console.log('Telecallers:', telecallers.length);

  const now = new Date();
  const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'FAILED', 'NO_ANSWER'];
  const outcomes = ['INTERESTED', 'NOT_INTERESTED', 'CALLBACK_REQUESTED', null];
  let aiCreated = 0, humanCreated = 0;

  // Create AI calls for last 30 days
  console.log('Creating AI calls...');
  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);

    const callsPerDay = Math.floor(Math.random() * 8) + 5;
    for (let i = 0; i < callsPerDay; i++) {
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const hour = 9 + Math.floor(Math.random() * 9);
      const callDate = new Date(date);
      callDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const duration = status === 'COMPLETED' ? Math.floor(Math.random() * 300) + 30 : Math.floor(Math.random() * 15);

      try {
        await prisma.outboundCall.create({
          data: {
            agentId: agent.id,
            phoneNumber: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            status: status as any,
            outcome: status === 'COMPLETED' ? outcomes[Math.floor(Math.random() * outcomes.length)] as any : null,
            duration,
            startedAt: callDate,
            answeredAt: status === 'COMPLETED' ? new Date(callDate.getTime() + 5000) : null,
            endedAt: new Date(callDate.getTime() + duration * 1000),
            createdAt: callDate
          }
        });
        aiCreated++;
      } catch (e) {}
    }
  }
  console.log('Created', aiCreated, 'AI calls');

  // Create human calls
  console.log('Creating human calls...');
  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);

    for (const tc of telecallers) {
      const callsPerDay = Math.floor(Math.random() * 5) + 3;
      for (let i = 0; i < callsPerDay; i++) {
        const hour = 9 + Math.floor(Math.random() * 9);
        const callDate = new Date(date);
        callDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const duration = status === 'COMPLETED' ? Math.floor(Math.random() * 600) + 60 : Math.floor(Math.random() * 15);

        try {
          await prisma.callLog.create({
            data: {
              organizationId: org.id,
              callerId: tc.id,
              phoneNumber: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
              direction: 'OUTBOUND',
              callType: 'MANUAL',
              status: status as any,
              duration,
              startedAt: callDate,
              endedAt: new Date(callDate.getTime() + duration * 1000),
              createdAt: callDate
            }
          });
          humanCreated++;
        } catch (e) {}
      }
    }
  }
  console.log('Created', humanCreated, 'human calls');

  // Summary
  const totalAI = await prisma.outboundCall.count({ where: { agent: { organizationId: org.id } } });
  const totalHuman = await prisma.callLog.count({ where: { organizationId: org.id } });
  console.log('\n--- Summary for', org.name, '---');
  console.log('Total AI Calls:', totalAI);
  console.log('Total Human Calls:', totalHuman);

  await prisma.$disconnect();
}

seedDemo();
