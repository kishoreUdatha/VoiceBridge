const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecording() {
  const callId = '0161d004-730b-4961-bacd-cab2eacb7941';

  const call = await prisma.telecallerCall.findUnique({
    where: { id: callId },
    select: {
      id: true,
      duration: true,
      recordingUrl: true,
      outcome: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true
    }
  });

  console.log('Call Record:');
  console.log(JSON.stringify(call, null, 2));

  await prisma.$disconnect();
}

checkRecording().catch(e => {
  console.error(e);
  process.exit(1);
});
