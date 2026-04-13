const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateUsageTracking() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  console.log(`Updating usage tracking for ${currentMonth}/${currentYear}`);
  console.log(`Date range: ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`);

  // Get all organizations
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true }
  });

  for (const org of orgs) {
    console.log(`\nProcessing organization: ${org.name} (${org.id})`);

    // Count leads created this month
    const leadsCount = await prisma.lead.count({
      where: {
        organizationId: org.id,
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    // Count telecaller calls this month
    const callsCount = await prisma.telecallerCall.count({
      where: {
        organizationId: org.id,
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    // Count SMS this month (via user's organization)
    let smsCount = 0;
    try {
      smsCount = await prisma.smsLog.count({
        where: {
          user: { organizationId: org.id },
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        }
      });
    } catch (e) { /* ignore */ }

    // Count emails this month
    let emailsCount = 0;
    try {
      emailsCount = await prisma.emailLog.count({
        where: {
          user: { organizationId: org.id },
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        }
      });
    } catch (e) { /* ignore */ }

    // Count WhatsApp messages this month
    let whatsappCount = 0;
    try {
      whatsappCount = await prisma.whatsappLog.count({
        where: {
          user: { organizationId: org.id },
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        }
      });
    } catch (e) { /* ignore */ }

    // Count call logs (voice minutes)
    const callLogs = await prisma.callLog.aggregate({
      where: {
        organizationId: org.id,
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      },
      _sum: { duration: true },
      _count: true,
    });

    const voiceMinutesUsed = Math.round((callLogs._sum.duration || 0) / 60);
    const aiCallsCount = callLogs._count || 0;

    console.log(`  Leads: ${leadsCount}, Calls: ${aiCallsCount}, Voice Minutes: ${voiceMinutesUsed}`);
    console.log(`  SMS: ${smsCount}, Emails: ${emailsCount}, WhatsApp: ${whatsappCount}`);

    // Upsert usage tracking record
    await prisma.usageTracking.upsert({
      where: {
        organizationId_month_year: {
          organizationId: org.id,
          month: currentMonth,
          year: currentYear,
        }
      },
      update: {
        leadsCount,
        aiCallsCount,
        voiceMinutesUsed,
        smsCount,
        emailsCount,
        whatsappCount,
      },
      create: {
        organizationId: org.id,
        month: currentMonth,
        year: currentYear,
        leadsCount,
        aiCallsCount,
        voiceMinutesUsed,
        smsCount,
        emailsCount,
        whatsappCount,
        storageUsedMb: 0,
        apiCallsCount: 0,
      }
    });

    console.log(`  Updated usage tracking record`);
  }

  console.log('\n✅ Usage tracking updated successfully!');

  // Verify totals
  const totals = await prisma.usageTracking.aggregate({
    where: {
      month: currentMonth,
      year: currentYear,
    },
    _sum: {
      leadsCount: true,
      aiCallsCount: true,
      voiceMinutesUsed: true,
      smsCount: true,
      emailsCount: true,
      whatsappCount: true,
    }
  });

  console.log('\nTotal usage this month:');
  console.log(`  Leads: ${totals._sum.leadsCount || 0}`);
  console.log(`  AI Calls: ${totals._sum.aiCallsCount || 0}`);
  console.log(`  Voice Minutes: ${totals._sum.voiceMinutesUsed || 0}`);
  console.log(`  SMS: ${totals._sum.smsCount || 0}`);
  console.log(`  Emails: ${totals._sum.emailsCount || 0}`);
  console.log(`  WhatsApp: ${totals._sum.whatsappCount || 0}`);

  await prisma.$disconnect();
}

updateUsageTracking().catch(e => { console.error(e); process.exit(1); });
