import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    const telecaller = await prisma.user.findFirst({
      where: { email: 'telecaller@demo.com' },
      select: { id: true }
    });

    if (!telecaller) {
      console.log('Telecaller not found');
      return;
    }

    const stages = await prisma.leadStage.findMany({
      select: { id: true, name: true },
      take: 10
    });
    console.log('Stages:', stages.map((s: { name: string }) => s.name));

    const leads = await prisma.lead.findMany({
      where: {
        customFields: { path: ['qualifiedBy'], equals: telecaller.id }
      },
      select: { id: true, firstName: true, lastName: true }
    });

    console.log('Qualified leads:', leads.length);

    const targetStages = ['Contacted', 'Qualified', 'Negotiation', 'Won'];

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const stageName = targetStages[i % targetStages.length];
      const stage = stages.find((s: { id: string; name: string }) => s.name.toLowerCase() === stageName.toLowerCase());

      if (stage) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { stageId: stage.id }
        });
        console.log('Updated', lead.firstName, 'to', stageName);
      }
    }

    console.log('Done!');
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
