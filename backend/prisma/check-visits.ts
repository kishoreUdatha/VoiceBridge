import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVisits() {
  // Get recent visits for CVR College
  const visits = await prisma.collegeVisit.findMany({
    where: {
      college: { shortName: 'CVR' }
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      college: { select: { name: true, shortName: true } },
      user: { select: { firstName: true, lastName: true } }
    }
  });

  console.log('\n========================================');
  console.log('Recent CVR College Visits');
  console.log('========================================\n');

  if (visits.length === 0) {
    console.log('No visits found for CVR College');
  } else {
    visits.forEach((v, i) => {
      console.log(`${i + 1}. Visit on ${new Date(v.visitDate).toLocaleDateString()}`);
      console.log(`   Purpose: ${v.purpose}`);
      console.log(`   Outcome: ${v.outcome || '(not set)'}`);
      console.log(`   Check In: ${v.checkInTime ? new Date(v.checkInTime).toLocaleString() : '(not checked in)'}`);
      console.log(`   Check Out: ${v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : '(not checked out)'}`);
      console.log(`   Summary: ${v.summary ? v.summary.substring(0, 100) : '(none)'}`);
      console.log(`   By: ${v.user.firstName} ${v.user.lastName}`);
      console.log(`   Created: ${new Date(v.createdAt).toLocaleString()}`);
      console.log('');
    });
  }

  // Also check if there's a recent checkout
  const recentCheckouts = await prisma.collegeVisit.findMany({
    where: {
      checkOutTime: { not: null }
    },
    orderBy: { checkOutTime: 'desc' },
    take: 3,
    include: {
      college: { select: { name: true } },
      user: { select: { firstName: true, lastName: true } }
    }
  });

  console.log('\n========================================');
  console.log('Most Recent Check-Outs (All Colleges)');
  console.log('========================================\n');

  recentCheckouts.forEach((v, i) => {
    console.log(`${i + 1}. ${v.college.name}`);
    console.log(`   Checked Out: ${new Date(v.checkOutTime!).toLocaleString()}`);
    console.log(`   Outcome: ${v.outcome}`);
    console.log(`   Summary: ${v.summary ? v.summary.substring(0, 80) + '...' : '(none)'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkVisits().catch(console.error);
