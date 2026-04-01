import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMoreVisits() {
  console.log('🌱 Adding more visits for colleges...\n');

  // Get Venkat's user record
  const venkat = await prisma.user.findFirst({
    where: { email: 'fieldsales@demo.com' },
  });

  if (!venkat) {
    console.error('❌ User fieldsales@demo.com not found');
    process.exit(1);
  }

  const orgId = venkat.organizationId;

  // Get Venkat's colleges
  const colleges = await prisma.college.findMany({
    where: { assignedToId: venkat.id },
  });

  if (colleges.length === 0) {
    console.error('❌ No colleges found for Venkat');
    process.exit(1);
  }

  const cbit = colleges.find(c => c.shortName === 'CBIT');
  const vce = colleges.find(c => c.shortName === 'VCE');
  const mrec = colleges.find(c => c.shortName === 'MREC');

  const today = new Date();

  // Helper to create past dates
  const daysAgo = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return date;
  };

  const daysLater = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date;
  };

  // More visits for CBIT (multiple visits showing progression)
  if (cbit) {
    const cbitVisits = [
      {
        id: `cbit-visit-history-1`,
        visitDate: daysAgo(21),
        checkInTime: new Date(daysAgo(21).setHours(10, 0, 0)),
        checkOutTime: new Date(daysAgo(21).setHours(11, 30, 0)),
        purpose: 'FIRST_INTRODUCTION' as const,
        outcome: 'POSITIVE' as const,
        summary: 'Cold call visit. Met with receptionist who connected me with Placement Officer. He showed initial interest.',
        actionItems: 'Send company brochure by email\nCall back in 3 days to schedule meeting with Principal',
        locationVerified: true,
        distanceFromCollege: 42.5,
      },
      {
        id: `cbit-visit-history-2`,
        visitDate: daysAgo(14),
        checkInTime: new Date(daysAgo(14).setHours(14, 30, 0)),
        checkOutTime: new Date(daysAgo(14).setHours(16, 0, 0)),
        purpose: 'FIRST_INTRODUCTION' as const,
        outcome: 'POSITIVE' as const,
        summary: 'Met with Principal Dr. Narasimhulu. Explained our platform capabilities. He wants a demo for T&P cell.',
        actionItems: 'Schedule demo with T&P team\nPrepare case studies from similar colleges',
        locationVerified: true,
        distanceFromCollege: 38.2,
      },
      {
        id: `cbit-visit-history-3`,
        visitDate: daysAgo(7),
        checkInTime: new Date(daysAgo(7).setHours(11, 0, 0)),
        checkOutTime: new Date(daysAgo(7).setHours(13, 30, 0)),
        purpose: 'PRODUCT_DEMO' as const,
        outcome: 'POSITIVE' as const,
        summary: 'Product demo for 20 faculty members. Showed coding platform, assessment engine. Very positive response. HOD CSE wants to pilot.',
        actionItems: 'Send pilot proposal for 100 students\nPrepare pricing for full batch (1400 students)',
        locationVerified: true,
        distanceFromCollege: 35.8,
      },
      // Scheduled future visits
      {
        id: `cbit-visit-scheduled-1`,
        visitDate: daysLater(3),
        checkInTime: null,
        checkOutTime: null,
        purpose: 'PROPOSAL_PRESENTATION' as const,
        outcome: null,
        summary: 'Scheduled: Present final proposal to Principal and Management Committee',
      },
      {
        id: `cbit-visit-scheduled-2`,
        visitDate: daysLater(10),
        checkInTime: null,
        checkOutTime: null,
        purpose: 'NEGOTIATION' as const,
        outcome: null,
        summary: 'Scheduled: Discuss pricing and payment terms (if proposal accepted)',
      },
    ];

    for (const visit of cbitVisits) {
      await prisma.collegeVisit.upsert({
        where: { id: visit.id },
        update: {},
        create: {
          ...visit,
          collegeId: cbit.id,
          organizationId: orgId,
          userId: venkat.id,
          duration: visit.checkOutTime && visit.checkInTime
            ? Math.round((visit.checkOutTime.getTime() - visit.checkInTime.getTime()) / 60000)
            : null,
          checkInLatitude: cbit.latitude,
          checkInLongitude: cbit.longitude,
          photos: JSON.stringify([]),
          documents: JSON.stringify([]),
          contactsMet: JSON.stringify([]),
        },
      });
    }
    console.log(`✅ Added ${cbitVisits.length} visits for CBIT`);
  }

  // More visits for VCE
  if (vce) {
    const vceVisits = [
      {
        id: `vce-visit-history-1`,
        visitDate: daysAgo(18),
        checkInTime: new Date(daysAgo(18).setHours(9, 30, 0)),
        checkOutTime: new Date(daysAgo(18).setHours(10, 45, 0)),
        purpose: 'FIRST_INTRODUCTION' as const,
        outcome: 'NEUTRAL' as const,
        summary: 'First visit. Met with admin office. Principal was busy, got appointment for next week.',
        actionItems: 'Return next Tuesday at 2 PM',
        locationVerified: true,
        distanceFromCollege: 28.5,
      },
      {
        id: `vce-visit-history-2`,
        visitDate: daysAgo(11),
        checkInTime: new Date(daysAgo(11).setHours(14, 0, 0)),
        checkOutTime: new Date(daysAgo(11).setHours(15, 30, 0)),
        purpose: 'FIRST_INTRODUCTION' as const,
        outcome: 'POSITIVE' as const,
        summary: 'Met Principal and HOD CSE. They have been looking for coding assessment platform. Very interested!',
        actionItems: 'Send detailed proposal\nSchedule demo for next week',
        locationVerified: true,
        distanceFromCollege: 22.1,
      },
      {
        id: `vce-visit-history-3`,
        visitDate: daysAgo(4),
        checkInTime: new Date(daysAgo(4).setHours(10, 0, 0)),
        checkOutTime: new Date(daysAgo(4).setHours(12, 30, 0)),
        purpose: 'PRODUCT_DEMO' as const,
        outcome: 'POSITIVE' as const,
        summary: 'Full demo for CSE department. 30 faculty attended. Hands-on session with assessment module. Everyone loved the AI features.',
        actionItems: 'Start pilot with 3rd year students\nSet up faculty training session',
        locationVerified: true,
        distanceFromCollege: 25.3,
      },
      {
        id: `vce-visit-scheduled-1`,
        visitDate: daysLater(2),
        checkInTime: null,
        checkOutTime: null,
        purpose: 'NEGOTIATION' as const,
        outcome: null,
        summary: 'Scheduled: Discuss pilot results and full deployment pricing',
      },
    ];

    for (const visit of vceVisits) {
      await prisma.collegeVisit.upsert({
        where: { id: visit.id },
        update: {},
        create: {
          ...visit,
          collegeId: vce.id,
          organizationId: orgId,
          userId: venkat.id,
          duration: visit.checkOutTime && visit.checkInTime
            ? Math.round((visit.checkOutTime.getTime() - visit.checkInTime.getTime()) / 60000)
            : null,
          checkInLatitude: vce.latitude,
          checkInLongitude: vce.longitude,
          photos: JSON.stringify([]),
          documents: JSON.stringify([]),
          contactsMet: JSON.stringify([]),
        },
      });
    }
    console.log(`✅ Added ${vceVisits.length} visits for VCE`);
  }

  // More visits for MREC
  if (mrec) {
    const mrecVisits = [
      {
        id: `mrec-visit-history-1`,
        visitDate: daysAgo(25),
        checkInTime: new Date(daysAgo(25).setHours(11, 0, 0)),
        checkOutTime: new Date(daysAgo(25).setHours(12, 0, 0)),
        purpose: 'FIRST_INTRODUCTION' as const,
        outcome: 'NEUTRAL' as const,
        summary: 'First visit. Large campus with multiple buildings. Met with admin, they directed to Chairman office.',
        actionItems: 'Get appointment with Chairman through proper channel',
        locationVerified: true,
        distanceFromCollege: 55.2,
      },
      {
        id: `mrec-visit-history-2`,
        visitDate: daysAgo(17),
        checkInTime: new Date(daysAgo(17).setHours(15, 0, 0)),
        checkOutTime: new Date(daysAgo(17).setHours(16, 30, 0)),
        purpose: 'FIRST_INTRODUCTION' as const,
        outcome: 'POSITIVE' as const,
        summary: 'Met Chairman Dr. Malla Reddy. He is interested in campus-wide LMS deployment. Wants detailed proposal.',
        actionItems: 'Prepare comprehensive proposal for 6000 students\nInclude competitor comparison',
        locationVerified: true,
        distanceFromCollege: 48.7,
      },
      {
        id: `mrec-visit-history-3`,
        visitDate: daysAgo(10),
        checkInTime: new Date(daysAgo(10).setHours(10, 30, 0)),
        checkOutTime: new Date(daysAgo(10).setHours(13, 0, 0)),
        purpose: 'PROPOSAL_PRESENTATION' as const,
        outcome: 'DECISION_PENDING' as const,
        summary: 'Presented full proposal to Chairman and COO. They liked it but want to compare with 2 other vendors.',
        actionItems: 'Follow up in 1 week\nOffer early bird discount if they decide this month',
        locationVerified: true,
        distanceFromCollege: 45.8,
      },
      {
        id: `mrec-visit-scheduled-1`,
        visitDate: daysLater(5),
        checkInTime: null,
        checkOutTime: null,
        purpose: 'NEGOTIATION' as const,
        outcome: null,
        summary: 'Scheduled: Follow-up on vendor comparison. Push for decision.',
      },
    ];

    for (const visit of mrecVisits) {
      await prisma.collegeVisit.upsert({
        where: { id: visit.id },
        update: {},
        create: {
          ...visit,
          collegeId: mrec.id,
          organizationId: orgId,
          userId: venkat.id,
          duration: visit.checkOutTime && visit.checkInTime
            ? Math.round((visit.checkOutTime.getTime() - visit.checkInTime.getTime()) / 60000)
            : null,
          checkInLatitude: mrec.latitude,
          checkInLongitude: mrec.longitude,
          photos: JSON.stringify([]),
          documents: JSON.stringify([]),
          contactsMet: JSON.stringify([]),
        },
      });
    }
    console.log(`✅ Added ${mrecVisits.length} visits for MREC`);
  }

  console.log('\n🎉 Visit history added successfully!');
  console.log('\nVisit progression for each college:');
  console.log('  CBIT: 3 completed + 2 scheduled (First Introduction → Demo → Proposal)');
  console.log('  VCE: 3 completed + 1 scheduled (Introduction → Demo → Negotiation)');
  console.log('  MREC: 3 completed + 1 scheduled (Introduction → Proposal → Follow-up)');
}

seedMoreVisits()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
