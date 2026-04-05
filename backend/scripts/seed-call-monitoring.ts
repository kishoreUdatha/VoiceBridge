import { prisma } from '../src/config/database';

async function seedCallMonitoringData() {
  console.log('Seeding call monitoring data...\n');

  // Get all organizations
  const orgs = await prisma.organization.findMany();
  if (orgs.length === 0) {
    console.error('No organization found! Please create an organization first.');
    await prisma.$disconnect();
    return;
  }

  // Process each organization
  for (const org of orgs) {
    console.log('\n==============================');
    console.log('Seeding for organization:', org.name, '(', org.id, ')');

  // Get voice agents
  let agents = await prisma.voiceAgent.findMany({
    where: { organizationId: org.id, isActive: true },
    take: 3,
  });

  if (agents.length === 0) {
    console.log('No voice agents found. Creating test agents...');
    // Create test voice agents
    const agentData = [
      { name: 'AI Agent - Sales', description: 'Sales voice agent' },
      { name: 'AI Agent - Support', description: 'Support voice agent' },
      { name: 'AI Agent - Admissions', description: 'Admissions voice agent' },
    ];

    for (const data of agentData) {
      await prisma.voiceAgent.create({
        data: {
          organizationId: org.id,
          name: data.name,
          description: data.description,
          industry: 'EDUCATION',
          isActive: true,
          language: 'en-US',
          voiceId: 'alloy',
          systemPrompt: 'You are a helpful assistant.',
          greeting: 'Hello, how can I help you today?',
        },
      });
    }

    agents = await prisma.voiceAgent.findMany({
      where: { organizationId: org.id, isActive: true },
      take: 3,
    });
  }

  console.log('Found', agents.length, 'voice agents');

  // Get telecaller users
  let telecallers = await prisma.user.findMany({
    where: {
      organizationId: org.id,
      isActive: true,
      role: { name: { in: ['TELECALLER', 'AGENT', 'ADMIN'] } }
    },
    take: 5,
  });

  if (telecallers.length === 0) {
    // Use any active user as telecaller
    telecallers = await prisma.user.findMany({
      where: { organizationId: org.id, isActive: true },
      take: 3,
    });
  }

  console.log('Found', telecallers.length, 'telecallers/users');

  // Generate dates for the past 30 days
  const now = new Date();
  const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'FAILED', 'NO_ANSWER', 'COMPLETED'];
  const outcomes = ['INTERESTED', 'NOT_INTERESTED', 'CALLBACK_REQUESTED', 'APPOINTMENT_BOOKED', null];
  const sentiments = ['positive', 'neutral', 'negative', 'positive', 'neutral'];

  // Create AI Outbound Calls (past 30 days)
  console.log('\nCreating AI outbound calls...');
  let aiCallsCreated = 0;

  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);

    // Create 5-15 calls per day
    const callsPerDay = Math.floor(Math.random() * 10) + 5;

    for (let i = 0; i < callsPerDay; i++) {
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const hour = 9 + Math.floor(Math.random() * 9); // 9 AM to 6 PM
      const minute = Math.floor(Math.random() * 60);

      const callDate = new Date(date);
      callDate.setHours(hour, minute, 0, 0);

      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const duration = status === 'COMPLETED' ? Math.floor(Math.random() * 300) + 30 : Math.floor(Math.random() * 30);

      try {
        await prisma.outboundCall.create({
          data: {
            agentId: agent.id,
            phoneNumber: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            status: status as any,
            duration,
            outcome: status === 'COMPLETED' ? outcomes[Math.floor(Math.random() * outcomes.length)] as any : null,
            sentiment: status === 'COMPLETED' ? sentiments[Math.floor(Math.random() * sentiments.length)] : null,
            startedAt: callDate,
            answeredAt: status === 'COMPLETED' ? new Date(callDate.getTime() + 5000) : null,
            endedAt: new Date(callDate.getTime() + duration * 1000),
            createdAt: callDate,
          },
        });
        aiCallsCreated++;
      } catch (e) {
        // Skip if error
      }
    }
  }
  console.log('Created', aiCallsCreated, 'AI outbound calls');

  // Create Voice Sessions (AI inbound - past 30 days)
  console.log('\nCreating AI voice sessions...');
  let sessionsCreated = 0;

  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);

    // Create 3-8 sessions per day
    const sessionsPerDay = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < sessionsPerDay; i++) {
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const hour = 9 + Math.floor(Math.random() * 9);
      const minute = Math.floor(Math.random() * 60);

      const sessionDate = new Date(date);
      sessionDate.setHours(hour, minute, 0, 0);

      const duration = Math.floor(Math.random() * 180) + 30;
      const sessionStatus = Math.random() > 0.2 ? 'COMPLETED' : 'ABANDONED';

      try {
        await prisma.voiceSession.create({
          data: {
            agentId: agent.id,
            sessionToken: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            visitorName: `Visitor ${Math.floor(Math.random() * 1000)}`,
            visitorPhone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            status: sessionStatus as any,
            duration,
            sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
            startedAt: sessionDate,
            endedAt: new Date(sessionDate.getTime() + duration * 1000),
            createdAt: sessionDate,
          },
        });
        sessionsCreated++;
      } catch (e) {
        // Skip if error
      }
    }
  }
  console.log('Created', sessionsCreated, 'voice sessions');

  // Create Human Call Logs (past 30 days)
  if (telecallers.length > 0) {
    console.log('\nCreating human call logs...');
    let humanCallsCreated = 0;

    for (let day = 0; day < 30; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);

      // Create 3-10 calls per day per telecaller
      for (const telecaller of telecallers) {
        const callsPerDay = Math.floor(Math.random() * 7) + 3;

        for (let i = 0; i < callsPerDay; i++) {
          const hour = 9 + Math.floor(Math.random() * 9);
          const minute = Math.floor(Math.random() * 60);

          const callDate = new Date(date);
          callDate.setHours(hour, minute, 0, 0);

          const status = statuses[Math.floor(Math.random() * statuses.length)];
          const duration = status === 'COMPLETED' ? Math.floor(Math.random() * 600) + 60 : Math.floor(Math.random() * 30);

          try {
            await prisma.callLog.create({
              data: {
                organizationId: org.id,
                callerId: telecaller.id,
                phoneNumber: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
                direction: 'OUTBOUND',
                callType: 'MANUAL',
                status: status as any,
                duration,
                startedAt: callDate,
                endedAt: new Date(callDate.getTime() + duration * 1000),
                createdAt: callDate,
              },
            });
            humanCallsCreated++;
          } catch (e) {
            // Skip if error
          }
        }
      }
    }
    console.log('Created', humanCallsCreated, 'human call logs');
  }

  // Create some active/in-progress calls for live monitoring
  console.log('\nCreating active calls for live monitoring...');

  // Create 2-3 active AI calls
  for (let i = 0; i < 3; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const startTime = new Date(Date.now() - Math.floor(Math.random() * 300000)); // Started within last 5 mins

    try {
      await prisma.outboundCall.create({
        data: {
          agentId: agent.id,
          phoneNumber: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          status: 'IN_PROGRESS',
          startedAt: startTime,
          answeredAt: new Date(startTime.getTime() + 5000),
          createdAt: startTime,
        },
      });
    } catch (e) {
      // Skip
    }
  }

  // Create 2-3 active human calls
  if (telecallers.length > 0) {
    for (let i = 0; i < Math.min(3, telecallers.length); i++) {
      const telecaller = telecallers[i];
      const startTime = new Date(Date.now() - Math.floor(Math.random() * 300000));

      try {
        await prisma.callLog.create({
          data: {
            organizationId: org.id,
            callerId: telecaller.id,
            phoneNumber: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            direction: 'OUTBOUND',
            callType: 'MANUAL',
            status: 'IN_PROGRESS',
            startedAt: startTime,
            createdAt: startTime,
          },
        });
      } catch (e) {
        // Skip
      }
    }
  }

  console.log('\n--- Summary ---');
  const totalAICalls = await prisma.outboundCall.count();
  const totalSessions = await prisma.voiceSession.count();
  const totalHumanCalls = await prisma.callLog.count({ where: { callType: 'MANUAL' } });

  console.log('Total AI Outbound Calls:', totalAICalls);
  console.log('Total Voice Sessions:', totalSessions);
  console.log('Total Human Call Logs:', totalHumanCalls);

  console.log('\nCall monitoring data seeded successfully!');
  await prisma.$disconnect();
}

seedCallMonitoringData().catch(console.error);
