import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTestLead() {
  try {
    // Find the telecaller user
    const telecaller = await prisma.user.findFirst({
      where: {
        role: {
          name: 'Telecaller'
        }
      },
      include: { organization: true }
    });

    if (!telecaller) {
      console.log('No telecaller user found');
      return;
    }

    console.log('Found telecaller:', telecaller.email, 'Org:', telecaller.organizationId);

    // Check if lead with this phone already exists
    const existingLead = await prisma.lead.findFirst({
      where: {
        phone: '8919301736',
        organizationId: telecaller.organizationId
      }
    });

    if (existingLead) {
      console.log('Lead already exists:', existingLead.id);

      // Check if already assigned
      const existingAssignment = await prisma.leadAssignment.findFirst({
        where: { leadId: existingLead.id, isActive: true }
      });

      if (existingAssignment) {
        console.log('Already assigned to:', existingAssignment.assignedToId);
      } else {
        // Assign to telecaller
        const assignment = await prisma.leadAssignment.create({
          data: {
            leadId: existingLead.id,
            assignedToId: telecaller.id,
            assignedById: telecaller.id,
            isActive: true,
          }
        });
        console.log('Assigned to telecaller:', assignment.id);
      }

      console.log('SUCCESS: Lead ready for testing!');
      return;
    }

    // Create the test lead
    const lead = await prisma.lead.create({
      data: {
        firstName: 'Test',
        lastName: 'Recording',
        phone: '8919301736',
        email: 'test.recording@example.com',
        source: 'MANUAL',
        organizationId: telecaller.organizationId,
      }
    });

    console.log('Created lead:', lead.id);

    // Assign to telecaller
    const assignment = await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToId: telecaller.id,
        assignedById: telecaller.id,
        isActive: true,
      }
    });

    console.log('Assigned to telecaller:', assignment.id);
    console.log('SUCCESS: Lead created and assigned!');

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addTestLead();
