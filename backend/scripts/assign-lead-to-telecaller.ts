import { prisma } from '../src/config/database';

async function assignLead() {
  const leadId = '6ae9076b-a684-44f6-acd5-ec0a386344b8';

  const telecaller = await prisma.user.findFirst({
    where: { email: 'telecaller2@demo.com' }
  });

  if (!telecaller) {
    console.log('Telecaller not found');
    return;
  }

  // Check if already assigned
  const existing = await prisma.leadAssignment.findFirst({
    where: { leadId, assignedToId: telecaller.id, isActive: true }
  });

  if (existing) {
    console.log('Lead already assigned to telecaller');
    return;
  }

  // Create assignment
  await prisma.leadAssignment.create({
    data: {
      leadId,
      assignedToId: telecaller.id,
      isActive: true
    }
  });

  console.log('✅ Lead "Rahul Verma" assigned to telecaller2@demo.com');
  console.log('');
  console.log('Now refresh the page - the call summary should load!');

  await prisma.$disconnect();
}

assignLead();
