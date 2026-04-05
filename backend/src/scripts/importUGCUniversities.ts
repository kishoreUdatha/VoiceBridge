/**
 * Import UGC Universities from parsed PDF text
 */
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../config/database';

interface University {
  name: string;
  state: string;
  district: string;
  city: string;
  type: string;
  year: string;
}

// State name mapping for extraction
const stateNames = [
  'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH',
  'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL PRADESH', 'JHARKHAND', 'KARNATAKA',
  'KERALA', 'MADHYA PRADESH', 'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA', 'MIZORAM',
  'NAGALAND', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL NADU',
  'TELANGANA', 'TRIPURA', 'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL',
  'DELHI', 'JAMMU AND KASHMIR', 'LADAKH', 'PUDUCHERRY', 'CHANDIGARH',
  'ANDAMAN AND NICOBAR', 'DADRA AND NAGAR HAVELI', 'LAKSHADWEEP',
  'JAMMU & KASHMIR'
];

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function extractDistrict(text: string): string {
  // Common patterns for district extraction
  const districtPatterns = [
    /District[:\s-]*([A-Za-z\s]+?)(?:,|\.|$)/i,
    /Dt\.?\s*([A-Za-z\s]+?)(?:,|\.|$)/i,
    /,\s*([A-Za-z\s]+?)\s*District/i,
  ];

  for (const pattern of districtPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

function extractCity(text: string): string {
  // Try to extract city from address
  const cityPatterns = [
    /,\s*([A-Za-z\s]+?)\s*[-–]\s*\d{6}/,
    /([A-Za-z]+)\s*[-–]\s*\d{6}/,
  ];

  for (const pattern of cityPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

function extractType(text: string): string {
  if (text.includes('Central University')) return 'Central';
  if (text.includes('State University')) return 'State';
  if (text.includes('Private University')) return 'Private';
  if (text.includes('Deemed')) return 'Deemed';
  return 'Other';
}

async function main() {
  console.log('============================================');
  console.log('  Import UGC Universities');
  console.log('============================================\n');

  const textPath = path.join(__dirname, '../../data/ugc_universities.txt');

  if (!fs.existsSync(textPath)) {
    console.log('Text file not found. Run parseUGCPdf2.js first.');
    return;
  }

  const text = fs.readFileSync(textPath, 'utf-8');
  console.log('Text length:', text.length);

  // Get organization and admin
  const org = await prisma.organization.findFirst({ where: { isActive: true } });
  if (!org) {
    console.error('No organization found!');
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { email: 'admin@demo.com' }
  });

  if (!admin) {
    console.error('No admin user found!');
    return;
  }

  const universities: University[] = [];
  let currentState = '';

  // Split by lines and process
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if this line is a state header
    for (const state of stateNames) {
      if (line.toUpperCase().includes(state) && !line.includes('University') && line.length < 50) {
        currentState = toTitleCase(state);
        break;
      }
    }

    // Check if this line contains a university entry (starts with number followed by period)
    const match = line.match(/^\d+\.\s+(.+)/);
    if (match && currentState) {
      const fullEntry = match[1];

      // Get university name (before the comma or address)
      let name = fullEntry.split(',')[0].trim();

      // Clean up name
      name = name.replace(/\s+/g, ' ').trim();

      if (name.length > 10 && name.toLowerCase().includes('university') ||
          name.toLowerCase().includes('institute') ||
          name.toLowerCase().includes('college')) {

        const district = extractDistrict(fullEntry) || currentState;
        const city = extractCity(fullEntry) || district;
        const type = extractType(fullEntry);
        const yearMatch = fullEntry.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : '';

        universities.push({
          name: name.substring(0, 200),
          state: currentState,
          district,
          city,
          type,
          year
        });
      }
    }
  }

  console.log(`Parsed ${universities.length} universities`);

  // Show sample
  console.log('\nSample universities:');
  universities.slice(0, 10).forEach(u => {
    console.log(`  - ${u.name.substring(0, 50)}... | ${u.district} | ${u.state}`);
  });

  // Import to database
  console.log('\nImporting to database...');

  let saved = 0;
  let skipped = 0;

  for (const uni of universities) {
    try {
      // Check if already exists
      const exists = await prisma.college.findFirst({
        where: {
          organizationId: org.id,
          name: { contains: uni.name.substring(0, 50), mode: 'insensitive' }
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
          name: uni.name,
          collegeType: 'OTHER',
          institutionStatus: uni.type === 'Central' ? 'UNIVERSITY' :
                            uni.type === 'Deemed' ? 'DEEMED' :
                            uni.type === 'Private' ? 'STANDALONE' : 'AFFILIATED',
          category: 'WARM',
          address: `${uni.city}, ${uni.district}, ${uni.state}`,
          city: uni.city || uni.district,
          district: uni.district,
          state: uni.state,
        }
      });
      saved++;

      if (saved % 100 === 0) {
        console.log(`  Saved: ${saved}...`);
      }
    } catch (e: any) {
      // Skip duplicates
    }
  }

  // Final stats
  const total = await prisma.college.count({ where: { organizationId: org.id } });
  const byState = await prisma.college.groupBy({
    by: ['state'],
    where: { organizationId: org.id },
    _count: true,
    orderBy: { _count: { state: 'desc' } },
    take: 15
  });

  console.log('\n============================================');
  console.log('           IMPORT COMPLETE');
  console.log('============================================');
  console.log(`Parsed: ${universities.length}`);
  console.log(`Saved: ${saved}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total in DB: ${total}`);
  console.log('\nTop States:');
  byState.forEach(s => console.log(`  ${s.state}: ${s._count}`));
  console.log('============================================');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
