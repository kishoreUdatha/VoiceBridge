const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      trialEndsAt: true,
      activePlanId: true,
    }
  });

  console.log('Organizations subscription status:');
  orgs.forEach(o => {
    console.log(`\n  ${o.name}:`);
    console.log(`    isActive: ${o.isActive}`);
    console.log(`    subscriptionStatus: ${o.subscriptionStatus}`);
    console.log(`    subscriptionExpiresAt: ${o.subscriptionExpiresAt}`);
    console.log(`    trialEndsAt: ${o.trialEndsAt}`);
    console.log(`    activePlanId: ${o.activePlanId}`);
  });

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
