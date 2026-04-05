import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignTelecallersToTeamLead() {
  try {
    // Find team lead
    const teamLead = await prisma.user.findFirst({
      where: { email: 'teamlead@demo.com' }
    });

    if (!teamLead) {
      console.log('Team lead not found');
      return;
    }

    console.log('Team Lead:', teamLead.firstName, teamLead.lastName);
    console.log('ID:', teamLead.id);

    // Find all telecallers in same org
    const telecallers = await prisma.user.findMany({
      where: {
        organizationId: teamLead.organizationId,
        role: { slug: { in: ['telecaller', 'counselor', 'sales'] } },
        id: { not: teamLead.id }
      },
      include: { role: true }
    });

    console.log('\nTelecallers found:', telecallers.length);

    if (telecallers.length === 0) {
      console.log('No telecallers found to assign');
      return;
    }

    // Assign all telecallers to team lead
    const result = await prisma.user.updateMany({
      where: {
        id: { in: telecallers.map(t => t.id) }
      },
      data: {
        managerId: teamLead.id
      }
    });

    console.log('\n========================================');
    console.log('Assigned', result.count, 'telecallers to Team Lead');
    console.log('========================================\n');

    // Show assigned telecallers
    console.log('Telecallers now reporting to', teamLead.firstName + ':');
    telecallers.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.firstName} ${t.lastName || ''} (${t.email})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignTelecallersToTeamLead();
