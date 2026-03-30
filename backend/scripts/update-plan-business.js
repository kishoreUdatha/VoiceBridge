const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateToBusiness() {
  try {
    // Find user and organization
    const user = await prisma.user.findFirst({
      where: { email: 'kishore.udatha@smartgrowinfotech.com' },
      include: { organization: { include: { subscriptions: true } } }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User:', user.email);
    console.log('Org ID:', user.organizationId);
    console.log('Current subscriptions:', user.organization?.subscriptions?.length || 0);

    if (user.organizationId) {
      // Check existing subscription
      const existingSub = user.organization?.subscriptions?.[0];

      if (existingSub) {
        // Update existing subscription
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            planId: 'business',
            status: 'ACTIVE',
            activatedAt: new Date()
          }
        });
        console.log('Updated existing subscription to business plan');
      } else {
        // Create new subscription
        await prisma.subscription.create({
          data: {
            organizationId: user.organizationId,
            planId: 'business',
            billingCycle: 'annual',
            status: 'ACTIVE',
            amount: 0,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            activatedAt: new Date()
          }
        });
        console.log('Created new business subscription');
      }

      // Update organization
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          activePlanId: 'business',
          subscriptionStatus: 'ACTIVE'
        }
      });
      console.log('Updated organization activePlanId to business');

      console.log('\nSUCCESS: User now has Business plan!');
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

updateToBusiness();
