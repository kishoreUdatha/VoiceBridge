const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  // Update all TRIAL organizations to ACTIVE
  const result = await prisma.organization.updateMany({
    where: {
      subscriptionStatus: 'TRIAL'
    },
    data: {
      subscriptionStatus: 'ACTIVE'
    }
  });

  console.log(`Updated ${result.count} organizations from TRIAL to ACTIVE`);

  // Verify
  const orgs = await prisma.organization.findMany({
    select: {
      name: true,
      subscriptionStatus: true,
      isActive: true,
    }
  });

  console.log('\nOrganizations now:');
  orgs.forEach(o => {
    console.log(`  ${o.name}: subscriptionStatus=${o.subscriptionStatus}, isActive=${o.isActive}`);
  });

  await prisma.$disconnect();
}

fix().catch(e => { console.error(e); process.exit(1); });
