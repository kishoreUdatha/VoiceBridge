const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCallRecording() {
  const callId = '35600e09-b48a-4a94-b710-6bdd16a047bc';

  try {
    // Check TelecallerCall table
    const telecallerCall = await prisma.telecallerCall.findUnique({
      where: { id: callId },
      include: {
        lead: true,
        telecaller: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    if (telecallerCall) {
      console.log('\n=== TelecallerCall Found ===');
      console.log('ID:', telecallerCall.id);
      console.log('Status:', telecallerCall.status);
      console.log('Outcome:', telecallerCall.outcome);
      console.log('Duration:', telecallerCall.duration);
      console.log('Recording URL:', telecallerCall.recordingUrl || 'NOT SET');
      console.log('Recording Path:', telecallerCall.recordingPath || 'NOT SET');
      console.log('Created At:', telecallerCall.createdAt);
      console.log('Lead:', telecallerCall.lead?.firstName, telecallerCall.lead?.lastName);
      console.log('Telecaller:', telecallerCall.telecaller?.firstName, telecallerCall.telecaller?.lastName);
      return;
    }

    // Check OutboundCall table
    const outboundCall = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: {
        lead: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    if (outboundCall) {
      console.log('\n=== OutboundCall Found ===');
      console.log('ID:', outboundCall.id);
      console.log('Status:', outboundCall.status);
      console.log('Outcome:', outboundCall.outcome);
      console.log('Duration:', outboundCall.duration);
      console.log('Recording URL:', outboundCall.recordingUrl || 'NOT SET');
      console.log('Recording Path:', outboundCall.recordingPath || 'NOT SET');
      console.log('Created At:', outboundCall.createdAt);
      console.log('Lead:', outboundCall.lead?.firstName, outboundCall.lead?.lastName);
      console.log('User:', outboundCall.user?.firstName, outboundCall.user?.lastName);
      return;
    }

    console.log('Call not found in either TelecallerCall or OutboundCall tables');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCallRecording();
