/**
 * Import AICTE Excel Data
 * Parses downloaded AICTE Excel file and imports to database
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../config/database';

interface College {
  name: string;
  state: string;
  district: string;
  city: string;
  type: string;
  address: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
}

// Map college type
function mapCollegeType(type: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('engineering') || t.includes('technical') || t.includes('technology')) return 'ENGINEERING';
  if (t.includes('polytechnic')) return 'POLYTECHNIC';
  if (t.includes('pharmacy') || t.includes('medical')) return 'MEDICAL';
  if (t.includes('management') || t.includes('mba')) return 'COMMERCE';
  if (t.includes('architecture')) return 'ENGINEERING';
  return 'ENGINEERING';
}

async function main() {
  console.log('============================================');
  console.log('    AICTE Excel Import');
  console.log('============================================\n');

  const filePath = path.join(__dirname, '../../data/aicte_colleges.xls');

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(filePath);

  console.log('Sheets found:', workbook.SheetNames);

  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  console.log(`Total rows: ${data.length}`);

  if (data.length > 0) {
    console.log('\nFirst row (headers):');
    console.log(data[0]);

    if (data.length > 1) {
      console.log('\nSecond row (sample data):');
      console.log(data[1]);
    }
  }

  // Parse the data
  const colleges: College[] = [];
  const headers = data[0] || [];

  // Find column indices
  const findCol = (keywords: string[]): number => {
    for (let i = 0; i < headers.length; i++) {
      const h = (headers[i] || '').toString().toLowerCase();
      for (const kw of keywords) {
        if (h.includes(kw.toLowerCase())) return i;
      }
    }
    return -1;
  };

  const nameCol = findCol(['name', 'institute', 'college', 'institution']);
  const stateCol = findCol(['state']);
  const districtCol = findCol(['district']);
  const cityCol = findCol(['city', 'town', 'place']);
  const typeCol = findCol(['type', 'category']);
  const addressCol = findCol(['address']);
  const pincodeCol = findCol(['pin', 'pincode', 'zip']);
  const phoneCol = findCol(['phone', 'contact', 'mobile', 'tel']);
  const emailCol = findCol(['email', 'mail']);
  const websiteCol = findCol(['website', 'web', 'url']);

  console.log('\nColumn mapping:');
  console.log(`  Name: ${nameCol >= 0 ? headers[nameCol] : 'NOT FOUND'}`);
  console.log(`  State: ${stateCol >= 0 ? headers[stateCol] : 'NOT FOUND'}`);
  console.log(`  District: ${districtCol >= 0 ? headers[districtCol] : 'NOT FOUND'}`);
  console.log(`  City: ${cityCol >= 0 ? headers[cityCol] : 'NOT FOUND'}`);
  console.log(`  Type: ${typeCol >= 0 ? headers[typeCol] : 'NOT FOUND'}`);

  // Parse rows
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const name = nameCol >= 0 ? (row[nameCol] || '').toString().trim() : '';
    const state = stateCol >= 0 ? (row[stateCol] || '').toString().trim() : '';

    if (!name || !state) continue;

    colleges.push({
      name,
      state,
      district: districtCol >= 0 ? (row[districtCol] || '').toString().trim() : '',
      city: cityCol >= 0 ? (row[cityCol] || '').toString().trim() : '',
      type: typeCol >= 0 ? (row[typeCol] || '').toString().trim() : 'Engineering',
      address: addressCol >= 0 ? (row[addressCol] || '').toString().trim() : '',
      pincode: pincodeCol >= 0 ? (row[pincodeCol] || '').toString().trim() : '',
      phone: phoneCol >= 0 ? (row[phoneCol] || '').toString().trim() : '',
      email: emailCol >= 0 ? (row[emailCol] || '').toString().trim() : '',
      website: websiteCol >= 0 ? (row[websiteCol] || '').toString().trim() : ''
    });
  }

  console.log(`\nParsed ${colleges.length} colleges from Excel`);

  if (colleges.length === 0) {
    console.log('No valid colleges found in Excel file.');
    process.exit(0);
  }

  // Show sample
  console.log('\nSample colleges:');
  for (const c of colleges.slice(0, 5)) {
    console.log(`  - ${c.name} (${c.state})`);
  }

  // Get organization
  const org = await prisma.organization.findFirst({ where: { isActive: true } });
  if (!org) {
    console.error('No active organization found!');
    process.exit(1);
  }

  const admin = await prisma.user.findFirst({
    where: {
      organizationId: org.id,
      isActive: true,
      role: { slug: { in: ['admin', 'owner', 'manager'] } }
    }
  });

  if (!admin) {
    console.error('No admin user found!');
    process.exit(1);
  }

  console.log(`\nImporting to organization: ${org.name}`);

  let saved = 0;
  let skipped = 0;

  for (const college of colleges) {
    try {
      const exists = await prisma.college.findFirst({
        where: {
          organizationId: org.id,
          name: college.name,
          state: college.state
        }
      });

      if (exists) {
        skipped++;
        continue;
      }

      await prisma.college.create({
        data: {
          organizationId: org.id,
          assignedToId: admin.id,
          name: college.name,
          collegeType: mapCollegeType(college.type) as any,
          institutionStatus: 'AFFILIATED',
          category: 'WARM',
          address: college.address || college.city || college.district,
          city: college.city || college.district || 'Unknown',
          district: college.district || '',
          state: college.state,
          pincode: college.pincode || '',
          phone: college.phone || '',
          email: college.email || '',
          website: college.website || ''
        }
      });

      saved++;
      if (saved % 100 === 0) {
        console.log(`  Saved: ${saved} colleges...`);
      }
    } catch (e: any) {
      // Skip errors
    }
  }

  console.log('\n============================================');
  console.log('           IMPORT SUMMARY');
  console.log('============================================');
  console.log(`Total in Excel: ${colleges.length}`);
  console.log(`Saved: ${saved}`);
  console.log(`Skipped: ${skipped} (already exist)`);

  // Final count
  const total = await prisma.college.count({ where: { organizationId: org.id } });
  console.log(`\nTotal colleges in database: ${total}`);
  console.log('============================================');
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
