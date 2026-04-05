/**
 * College Data Import Script
 * Imports college data from the static data file into the database
 *
 * Run: npx ts-node src/scripts/importColleges.ts
 */

import { prisma } from '../config/database';
import { expandedCollegesByState, getExpandedStates, getExpandedCollegeCount, CollegeData } from '../data/collegeDataExpanded';

async function importColleges() {
  console.log('============================================');
  console.log('       College Data Import Script');
  console.log('============================================\n');

  // Get organization
  const org = await prisma.organization.findFirst({
    where: { isActive: true },
  });

  if (!org) {
    console.error('ERROR: No active organization found!');
    console.log('Please create an organization first.');
    process.exit(1);
  }

  // Get admin user to assign colleges
  const adminUser = await prisma.user.findFirst({
    where: {
      organizationId: org.id,
      isActive: true,
      role: { slug: { in: ['admin', 'owner', 'manager'] } },
    },
    include: { role: true },
  });

  if (!adminUser) {
    console.error('ERROR: No admin user found!');
    console.log('Please create an admin/owner user first.');
    process.exit(1);
  }

  console.log(`Organization: ${org.name}`);
  console.log(`Assigning to: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.role?.name})`);
  console.log(`\nTotal colleges available: ${getExpandedCollegeCount()}`);
  console.log(`States available: ${getExpandedStates().length} states\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  const states = getExpandedStates();

  for (const state of states) {
    const colleges = expandedCollegesByState[state];
    console.log(`\n--- Importing ${state} (${colleges.length} colleges) ---`);

    let stateImported = 0;
    let stateSkipped = 0;

    for (const college of colleges) {
      try {
        // Check if college already exists
        const existing = await prisma.college.findFirst({
          where: {
            organizationId: org.id,
            name: college.name,
            state: college.state,
          },
        });

        if (existing) {
          console.log(`  SKIP: ${college.name} (already exists)`);
          stateSkipped++;
          totalSkipped++;
          continue;
        }

        // Create the college
        await prisma.college.create({
          data: {
            organizationId: org.id,
            assignedToId: adminUser.id,
            name: college.name,
            shortName: college.shortName,
            collegeType: college.collegeType,
            institutionStatus: college.institutionStatus,
            category: 'WARM',
            address: college.address,
            city: college.city,
            district: college.district,
            state: college.state,
            pincode: college.pincode,
            phone: college.phone,
            email: college.email,
            website: college.website,
            establishedYear: college.establishedYear,
            studentStrength: college.studentStrength,
            coursesOffered: college.coursesOffered || [],
          },
        });

        console.log(`  ADD: ${college.name}`);
        stateImported++;
        totalImported++;
      } catch (error: any) {
        console.error(`  ERROR: ${college.name} - ${error.message}`);
        totalErrors++;
      }
    }

    console.log(`  State Summary: ${stateImported} imported, ${stateSkipped} skipped`);
  }

  console.log('\n============================================');
  console.log('           IMPORT SUMMARY');
  console.log('============================================');
  console.log(`Total Imported: ${totalImported}`);
  console.log(`Total Skipped:  ${totalSkipped}`);
  console.log(`Total Errors:   ${totalErrors}`);
  console.log('============================================\n');

  // Show final counts
  const totalColleges = await prisma.college.count({
    where: { organizationId: org.id },
  });

  const byState = await prisma.college.groupBy({
    by: ['state'],
    where: { organizationId: org.id },
    _count: { state: true },
    orderBy: { _count: { state: 'desc' } },
  });

  console.log('Colleges in Database:');
  console.log(`  Total: ${totalColleges}`);
  console.log('\n  By State:');
  for (const s of byState) {
    console.log(`    ${s.state}: ${s._count.state}`);
  }
  console.log('');
}

// Run the import
importColleges()
  .then(() => {
    console.log('Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
