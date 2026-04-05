/**
 * Import All AICTE Excel Files
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

function mapCollegeType(type: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('engineering') || t.includes('technical') || t.includes('technology')) return 'ENGINEERING';
  if (t.includes('polytechnic')) return 'POLYTECHNIC';
  if (t.includes('pharmacy') || t.includes('medical')) return 'MEDICAL';
  if (t.includes('management') || t.includes('mba')) return 'COMMERCE';
  return 'ENGINEERING';
}

function parseExcel(filePath: string): College[] {
  const colleges: College[] = [];

  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (data.length < 2) return colleges;

    const headers = data[0] || [];

    // Find columns
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
    const typeCol = findCol(['type', 'program', 'course']);
    const addressCol = findCol(['address']);
    const pincodeCol = findCol(['pin', 'pincode']);
    const phoneCol = findCol(['phone', 'contact', 'tel']);
    const emailCol = findCol(['email', 'mail']);
    const websiteCol = findCol(['website', 'web']);

    const seenNames = new Set<string>();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const name = nameCol >= 0 ? (row[nameCol] || '').toString().trim() : '';
      const state = stateCol >= 0 ? (row[stateCol] || '').toString().trim() : '';

      if (!name || !state) continue;

      // Dedupe within file
      const key = `${name}|${state}`;
      if (seenNames.has(key)) continue;
      seenNames.add(key);

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
  } catch (e: any) {
    console.log(`  Error parsing: ${e.message}`);
  }

  return colleges;
}

async function main() {
  console.log('============================================');
  console.log('    Import All AICTE Excel Files');
  console.log('============================================\n');

  const dataDir = path.join(__dirname, '../../data');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));

  console.log(`Found ${files.length} Excel files:\n`);
  files.forEach(f => console.log(`  - ${f}`));

  // Get organization
  const org = await prisma.organization.findFirst({ where: { isActive: true } });
  if (!org) {
    console.error('No active organization!');
    process.exit(1);
  }

  const admin = await prisma.user.findFirst({
    where: { organizationId: org.id, isActive: true, role: { slug: { in: ['admin', 'owner', 'manager'] } } }
  });
  if (!admin) {
    console.error('No admin user!');
    process.exit(1);
  }

  let totalParsed = 0;
  let totalSaved = 0;
  let totalSkipped = 0;

  for (const file of files) {
    console.log(`\n--- Processing: ${file} ---`);
    const filePath = path.join(dataDir, file);
    const colleges = parseExcel(filePath);
    console.log(`  Parsed: ${colleges.length} unique colleges`);
    totalParsed += colleges.length;

    let saved = 0;
    let skipped = 0;

    for (const college of colleges) {
      try {
        const exists = await prisma.college.findFirst({
          where: { organizationId: org.id, name: college.name, state: college.state }
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
      } catch (e) {
        // Skip
      }
    }

    console.log(`  Saved: ${saved}, Skipped: ${skipped}`);
    totalSaved += saved;
    totalSkipped += skipped;
  }

  // Final count
  const total = await prisma.college.count({ where: { organizationId: org.id } });

  console.log('\n============================================');
  console.log('           FINAL SUMMARY');
  console.log('============================================');
  console.log(`Files processed: ${files.length}`);
  console.log(`Total parsed: ${totalParsed}`);
  console.log(`Total saved: ${totalSaved}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log(`\nTotal colleges in database: ${total}`);
  console.log('============================================');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
