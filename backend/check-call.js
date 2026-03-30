const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const call = await p.telecallerCall.findFirst({
    where: { id: '378d4308-a424-4a01-a2d1-c5defa9340f9' },
    select: {
      id: true,
      aiAnalyzed: true,
      transcript: true,
      sentiment: true,
      outcome: true,
      summary: true,
      qualification: true,
      duration: true,
      recordingUrl: true
    }
  });
  console.log(JSON.stringify(call, null, 2));
  await p.$disconnect();
}

main();
