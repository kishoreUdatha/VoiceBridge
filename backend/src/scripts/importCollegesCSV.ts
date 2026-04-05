/**
 * College CSV Import Script
 * Imports college data from CSV files (AICTE, UGC, NIRF formats)
 *
 * Usage:
 *   npx ts-node src/scripts/importCollegesCSV.ts <csv-file-path>
 *
 * Example:
 *   npx ts-node src/scripts/importCollegesCSV.ts ./data/aicte-colleges.csv
 *
 * Supported CSV formats:
 *   1. AICTE format: Institute Name, State, District, City, Type, etc.
 *   2. Generic format: name, state, district, city, type, address, pincode, phone, email, website
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { prisma } from '../config/database';

interface CSVCollege {
  [key: string]: string;
}

// Column name mappings for different CSV formats
const COLUMN_MAPPINGS: Record<string, string[]> = {
  name: ['Institute Name', 'Name', 'INSTITUTE_NAME', 'College Name', 'name', 'COLLEGE_NAME', 'Institution Name', 'INSTITUTION_NAME'],
  state: ['State', 'STATE', 'State Name', 'STATE_NAME', 'state'],
  district: ['District', 'DISTRICT', 'District Name', 'DISTRICT_NAME', 'district'],
  city: ['City', 'CITY', 'Town', 'TOWN', 'City Name', 'city', 'Place'],
  address: ['Address', 'ADDRESS', 'Full Address', 'address'],
  pincode: ['Pincode', 'PINCODE', 'Pin Code', 'PIN_CODE', 'Pin', 'pincode', 'ZIP'],
  phone: ['Phone', 'PHONE', 'Contact', 'CONTACT', 'Phone No', 'phone', 'Mobile', 'STD_CODE'],
  email: ['Email', 'EMAIL', 'Email ID', 'email', 'E-mail'],
  website: ['Website', 'WEBSITE', 'Web', 'URL', 'website'],
  type: ['Type', 'TYPE', 'Institute Type', 'INSTITUTE_TYPE', 'College Type', 'type', 'Category'],
  established: ['Established', 'ESTABLISHED', 'Year of Establishment', 'YEAR_ESTD', 'Year', 'established'],
  university: ['University', 'UNIVERSITY', 'Affiliated To', 'University Name', 'UNIVERSITY_NAME'],
  status: ['Status', 'STATUS', 'Institution Status', 'Autonomy Status'],
};

// Map college type from CSV to our enum
function mapCollegeType(type: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('engineering') || t.includes('technical') || t.includes('technology')) return 'ENGINEERING';
  if (t.includes('polytechnic')) return 'POLYTECHNIC';
  if (t.includes('pharmacy') || t.includes('medical') || t.includes('dental') || t.includes('nursing')) return 'MEDICAL';
  if (t.includes('management') || t.includes('mba') || t.includes('commerce') || t.includes('business')) return 'COMMERCE';
  if (t.includes('architecture')) return 'ENGINEERING';
  if (t.includes('arts') || t.includes('humanities')) return 'ARTS';
  if (t.includes('science')) return 'SCIENCE';
  if (t.includes('iti') || t.includes('industrial training')) return 'ITI';
  if (t.includes('hotel') || t.includes('hmct') || t.includes('catering')) return 'OTHER';
  return 'ENGINEERING';
}

// Map institution status
function mapInstitutionStatus(status: string, university: string): string {
  const s = (status || '').toLowerCase();
  const u = (university || '').toLowerCase();

  if (s.includes('autonomous') || u.includes('autonomous')) return 'AUTONOMOUS';
  if (s.includes('deemed') || u.includes('deemed')) return 'DEEMED';
  if (s.includes('university') || u.includes('university')) return 'UNIVERSITY';
  if (s.includes('standalone')) return 'STANDALONE';
  return 'AFFILIATED';
}

// Get value from CSV row using column mappings
function getValue(row: CSVCollege, field: string): string {
  const possibleColumns = COLUMN_MAPPINGS[field] || [field];
  for (const col of possibleColumns) {
    if (row[col] !== undefined && row[col] !== null && row[col].toString().trim() !== '') {
      return row[col].toString().trim();
    }
  }
  return '';
}

// Clean and validate data
function cleanData(value: string): string {
  if (!value) return '';
  return value.replace(/[\r\n\t]+/g, ' ').trim();
}

async function importCSV(filePath: string) {
  console.log('============================================');
  console.log('       College CSV Import Script');
  console.log('============================================\n');

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: File not found: ${filePath}`);
    process.exit(1);
  }

  // Get organization
  const org = await prisma.organization.findFirst({
    where: { isActive: true },
  });

  if (!org) {
    console.error('ERROR: No active organization found!');
    process.exit(1);
  }

  // Get admin user
  const adminUser = await prisma.user.findFirst({
    where: {
      organizationId: org.id,
      isActive: true,
      role: { slug: { in: ['admin', 'owner', 'manager'] } },
    },
  });

  if (!adminUser) {
    console.error('ERROR: No admin user found!');
    process.exit(1);
  }

  console.log(`Organization: ${org.name}`);
  console.log(`Assigning to: ${adminUser.firstName} ${adminUser.lastName}`);
  console.log(`\nReading CSV: ${filePath}\n`);

  // Read and parse CSV
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  let records: CSVCollege[];
  try {
    records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (error: any) {
    console.error(`ERROR parsing CSV: ${error.message}`);
    process.exit(1);
  }

  console.log(`Total records in CSV: ${records.length}\n`);

  // Show detected columns
  if (records.length > 0) {
    console.log('Detected columns:', Object.keys(records[0]).join(', '));
    console.log('');
  }

  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalInvalid = 0;

  const batchSize = 100;
  const stateStats: Record<string, number> = {};

  for (let i = 0; i < records.length; i++) {
    const row = records[i];

    // Extract data using mappings
    const name = cleanData(getValue(row, 'name'));
    const state = cleanData(getValue(row, 'state'));
    const district = cleanData(getValue(row, 'district'));
    const city = cleanData(getValue(row, 'city')) || district;
    const address = cleanData(getValue(row, 'address'));
    const pincode = cleanData(getValue(row, 'pincode'));
    const phone = cleanData(getValue(row, 'phone'));
    const email = cleanData(getValue(row, 'email'));
    const website = cleanData(getValue(row, 'website'));
    const type = cleanData(getValue(row, 'type'));
    const established = cleanData(getValue(row, 'established'));
    const university = cleanData(getValue(row, 'university'));
    const status = cleanData(getValue(row, 'status'));

    // Validate required fields
    if (!name || !state) {
      totalInvalid++;
      continue;
    }

    try {
      // Check if exists
      const existing = await prisma.college.findFirst({
        where: {
          organizationId: org.id,
          name: name,
          state: state,
        },
      });

      if (existing) {
        totalSkipped++;
        continue;
      }

      // Create college
      await prisma.college.create({
        data: {
          organizationId: org.id,
          assignedToId: adminUser.id,
          name: name,
          collegeType: mapCollegeType(type) as any,
          institutionStatus: mapInstitutionStatus(status, university) as any,
          category: 'WARM',
          address: address || `${city}, ${district}`,
          city: city || district || 'Unknown',
          district: district || '',
          state: state,
          pincode: pincode || '',
          phone: phone || '',
          email: email || '',
          website: website || '',
          establishedYear: established ? parseInt(established) : undefined,
        },
      });

      totalImported++;
      stateStats[state] = (stateStats[state] || 0) + 1;

      // Progress indicator
      if (totalImported % batchSize === 0) {
        console.log(`  Imported: ${totalImported} colleges...`);
      }
    } catch (error: any) {
      totalErrors++;
      if (totalErrors <= 10) {
        console.error(`  Error importing "${name}": ${error.message}`);
      }
    }
  }

  console.log('\n============================================');
  console.log('           IMPORT SUMMARY');
  console.log('============================================');
  console.log(`Total Records:  ${records.length}`);
  console.log(`Total Imported: ${totalImported}`);
  console.log(`Total Skipped:  ${totalSkipped} (already exist)`);
  console.log(`Total Invalid:  ${totalInvalid} (missing name/state)`);
  console.log(`Total Errors:   ${totalErrors}`);
  console.log('============================================\n');

  // Show state breakdown
  const sortedStates = Object.entries(stateStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  console.log('Top 20 States by Imported Colleges:');
  for (const [state, count] of sortedStates) {
    console.log(`  ${state}: ${count}`);
  }

  // Final database count
  const totalColleges = await prisma.college.count({
    where: { organizationId: org.id },
  });
  console.log(`\nTotal colleges in database: ${totalColleges}`);
}

// Main
const csvPath = process.argv[2];

if (!csvPath) {
  console.log('============================================');
  console.log('       College CSV Import Script');
  console.log('============================================\n');
  console.log('Usage: npx ts-node src/scripts/importCollegesCSV.ts <csv-file-path>\n');
  console.log('Download AICTE approved institutions list from:');
  console.log('  https://facilities.aicte-india.org/dashboard/\n');
  console.log('Expected CSV columns (any of these):');
  console.log('  - Institute Name / Name / College Name');
  console.log('  - State / State Name');
  console.log('  - District / District Name');
  console.log('  - City / Town');
  console.log('  - Type / Institute Type');
  console.log('  - Address / Full Address');
  console.log('  - Pincode / Pin Code');
  console.log('  - Phone / Contact');
  console.log('  - Email / Email ID');
  console.log('  - Website / URL');
  console.log('  - Established / Year of Establishment');
  console.log('');
  process.exit(0);
}

importCSV(csvPath)
  .then(() => {
    console.log('\nImport completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
