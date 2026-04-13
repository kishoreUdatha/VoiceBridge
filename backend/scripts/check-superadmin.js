const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: 'superadmin@voicebridge.ai' },
    include: { role: true, organization: true }
  });

  if (user) {
    console.log('User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.firstName, user.lastName);
    console.log('  Role:', user.role?.name || user.role?.slug || 'No role');
    console.log('  Organization:', user.organization?.name || 'No org');
    console.log('  Is Active:', user.isActive);
  } else {
    console.log('User NOT found with email: superadmin@voicebridge.ai');
  }

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
