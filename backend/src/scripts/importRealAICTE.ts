/**
 * Import REAL AICTE College Data
 * Properly parses all AICTE Excel files
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
  address: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
}

function cleanString(val: any): string {
  if (!val) return '';
  return String(val).trim();
}

function extractState(address: string): string {
  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
    'Andaman and Nicobar', 'Dadra and Nagar Haveli', 'Lakshadweep'
  ];

  const addr = address.toLowerCase();
  for (const state of states) {
    if (addr.includes(state.toLowerCase())) {
      return state;
    }
  }
  return '';
}

function parseMainFile(filePath: string): College[] {
  const colleges: College[] = [];
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet) as any[];

  for (const row of data) {
    const name = cleanString(row['Institute Name'] || row['Inst Name'] || row['INSTITUTE NAME']);
    const address = cleanString(row['Inst Address'] || row['Address'] || row['INST ADDRESS'] || '');
    const state = cleanString(row['State'] || row['STATE']) || extractState(address);
    const district = cleanString(row['District'] || row['DISTRICT'] || '');
    const city = cleanString(row['City'] || row['Town'] || row['CITY'] || district);

    if (!name || name.length < 3) continue;

    colleges.push({
      name,
      state: state || 'Unknown',
      district,
      city: city || district || 'Unknown',
      address,
      pincode: cleanString(row['Pincode'] || row['PIN'] || row['Pin Code'] || ''),
      phone: cleanString(row['Phone'] || row['Contact'] || row['PHONE'] || ''),
      email: cleanString(row['Email'] || row['EMAIL'] || ''),
      website: cleanString(row['Website'] || row['WEBSITE'] || '')
    });
  }

  return colleges;
}

function parseRegionalFile(filePath: string): College[] {
  const colleges: College[] = [];
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet) as any[];

  for (const row of data) {
    // Try multiple column name variations
    const name = cleanString(
      row['Institute Name'] || row['Inst Name'] || row['INSTITUTE NAME'] ||
      row['Institute'] || row['Name'] || row['College Name'] || ''
    );

    if (!name || name.length < 5) continue;

    const state = cleanString(row['State'] || row['STATE'] || row['state'] || '');
    const district = cleanString(row['District'] || row['DISTRICT'] || row['district'] || '');
    const city = cleanString(row['City'] || row['Town'] || row['CITY'] || row['Place'] || '');
    const address = cleanString(row['Address'] || row['Inst Address'] || row['INST ADDRESS'] || '');

    colleges.push({
      name,
      state: state || extractState(address) || 'Unknown',
      district,
      city: city || district || 'Unknown',
      address,
      pincode: cleanString(row['Pincode'] || row['PIN'] || row['Pin'] || ''),
      phone: cleanString(row['Phone'] || row['Contact'] || row['Mobile'] || ''),
      email: cleanString(row['Email'] || row['E-mail'] || ''),
      website: cleanString(row['Website'] || row['Web'] || '')
    });
  }

  return colleges;
}

async function main() {
  console.log('============================================');
  console.log('    Import REAL AICTE College Data');
  console.log('============================================\n');

  const dataDir = path.join(__dirname, '../../data');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));

  console.log(`Found ${files.length} Excel files\n`);

  // Get organization and admin
  const org = await prisma.organization.findFirst({ where: { isActive: true } });
  if (!org) {
    console.error('No active organization!');
    process.exit(1);
  }

  const admin = await prisma.user.findFirst({
    where: { organizationId: org.id, isActive: true }
  });
  if (!admin) {
    console.error('No admin user!');
    process.exit(1);
  }

  const allColleges: College[] = [];
  const seenNames = new Set<string>();

  for (const file of files) {
    console.log(`Processing: ${file}`);
    const filePath = path.join(dataDir, file);

    let colleges: College[] = [];
    if (file === 'aicte_colleges.xls') {
      colleges = parseMainFile(filePath);
    } else {
      colleges = parseRegionalFile(filePath);
    }

    // Deduplicate
    let added = 0;
    for (const c of colleges) {
      const key = c.name.toLowerCase().substring(0, 50);
      if (!seenNames.has(key)) {
        seenNames.add(key);
        allColleges.push(c);
        added++;
      }
    }
    console.log(`  Parsed: ${colleges.length}, New: ${added}`);
  }

  console.log(`\nTotal unique colleges: ${allColleges.length}`);
  console.log('Importing to database...\n');

  let saved = 0;
  let errors = 0;

  for (const college of allColleges) {
    try {
      await prisma.college.create({
        data: {
          organizationId: org.id,
          assignedToId: admin.id,
          name: college.name,
          collegeType: 'ENGINEERING',
          institutionStatus: 'AFFILIATED',
          category: 'WARM',
          address: college.address || college.city,
          city: college.city,
          district: college.district,
          state: college.state,
          pincode: college.pincode,
          phone: college.phone,
          email: college.email,
          website: college.website
        }
      });
      saved++;
      if (saved % 500 === 0) {
        console.log(`  Saved: ${saved}...`);
      }
    } catch (e) {
      errors++;
    }
  }

  const total = await prisma.college.count({ where: { organizationId: org.id } });

  console.log('\n============================================');
  console.log('           IMPORT COMPLETE');
  console.log('============================================');
  console.log(`Parsed: ${allColleges.length}`);
  console.log(`Saved: ${saved}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total in DB: ${total}`);
  console.log('============================================');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
