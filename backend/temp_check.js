const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, settings: true }
  });

  orgs.forEach(org => {
    console.log('Organization:', org.name);
    console.log('ID:', org.id);
    const settings = org.settings || {};
    console.log('WhatsApp Config:', JSON.stringify(settings.whatsapp || 'Not configured', null, 2));
    console.log('---');
  });

  await prisma.$disconnect();
}

check().catch(console.error);
