const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
  const call = await prisma.telecallerCall.findFirst({
    where: { id: { startsWith: '62ddecde' } },
    select: { id: true, recordingUrl: true, transcript: true }
  });
  console.log('Full ID:', call?.id);
  console.log('Recording:', call?.recordingUrl);
  console.log('Transcript preview:', call?.transcript?.substring(0, 300));
  await prisma.$disconnect();
}
main();
