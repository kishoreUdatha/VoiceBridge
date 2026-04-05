/**
 * Import UGC Universities from parsed PDF text - Version 2
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
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function extractStateFromText(text: string): string {
  const statePatterns = [
    /Andhra Pradesh/i, /Arunachal Pradesh/i, /Assam/i, /Bihar/i, /Chhattisgarh/i,
    /Goa/i, /Gujarat/i, /Haryana/i, /Himachal Pradesh/i, /Jharkhand/i, /Karnataka/i,
    /Kerala/i, /Madhya Pradesh/i, /Maharashtra/i, /Manipur/i, /Meghalaya/i, /Mizoram/i,
    /Nagaland/i, /Odisha/i, /Orissa/i, /Punjab/i, /Rajasthan/i, /Sikkim/i, /Tamil Nadu/i,
    /Telangana/i, /Tripura/i, /Uttar Pradesh/i, /Uttarakhand/i, /West Bengal/i,
    /Delhi/i, /New Delhi/i, /Jammu and Kashmir/i, /Jammu & Kashmir/i, /Ladakh/i,
    /Puducherry/i, /Pondicherry/i, /Chandigarh/i, /Andaman/i, /Dadra/i, /Lakshadweep/i
  ];

  for (const pattern of statePatterns) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        let state = match[0];
        if (state.toLowerCase() === 'orissa') state = 'Odisha';
        if (state.toLowerCase() === 'new delhi') state = 'Delhi';
        if (state.toLowerCase() === 'pondicherry') state = 'Puducherry';
        return toTitleCase(state);
      }
    }
  }
  return '';
}

function extractType(text: string): string {
  if (/\(Central University\)/i.test(text)) return 'UNIVERSITY';
  if (/\(State University\)/i.test(text)) return 'UNIVERSITY';
  if (/\(Private University\)/i.test(text)) return 'STANDALONE';
  if (/\(Deemed/i.test(text)) return 'DEEMED';
  return 'AFFILIATED';
}

function extractDistrict(text: string, state: string): string {
  // Try to find district patterns
  const patterns = [
    /(?:Dt\.|District|Dist)[:\s-]*([A-Za-z\s]+?)(?:,|\.|[-–]|\(|$)/i,
    /,\s*([A-Za-z\s]+?)\s*District/i,
    /,\s*([A-Za-z\s]+?)\s*[-–]\s*\d{6}/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].length > 2 && match[1].length < 30) {
      return match[1].trim();
    }
  }

  // Try to extract city before pincode
  const cityMatch = text.match(/([A-Za-z]+)\s*[-–]\s*\d{6}/);
  if (cityMatch) {
    return cityMatch[1].trim();
  }

  return state;
}

async function main() {
  console.log('============================================');
  console.log('  Import UGC Universities - v2');
  console.log('============================================\n');

  const textPath = path.join(__dirname, '../../data/ugc_universities.txt');
  const text = fs.readFileSync(textPath, 'utf-8');

  // Get organization and admin
  const org = await prisma.organization.findFirst({ where: { isActive: true } });
  const admin = await prisma.user.findFirst({ where: { email: 'admin@demo.com' } });

  if (!org || !admin) {
    console.error('No org or admin found!');
    return;
  }

  // Clear existing data
  console.log('Clearing existing colleges...');
  await prisma.college.deleteMany({ where: { organizationId: org.id } });

  const universities: University[] = [];

  // Split by numbered entries (1. , 2. , etc.)
  const entries = text.split(/(?=\d+\.\s+)/);

  for (const entry of entries) {
    // Skip short entries or page headers
    if (entry.length < 50) continue;
    if (entry.includes('Page')) continue;
    if (entry.includes('UNIVERSITY GRANTS COMMISSION')) continue;
    if (entry.includes('Total No.')) continue;

    // Check if this looks like a university entry
    const numMatch = entry.match(/^(\d+)\.\s+/);
    if (!numMatch) continue;

    // Extract university name (up to first comma or parenthesis with address)
    let name = entry.substring(numMatch[0].length);

    // Clean up whitespace
    name = name.replace(/\s+/g, ' ').trim();

    // Get state from the entry
    const state = extractStateFromText(entry);
    if (!state) continue;

    // Extract name (usually before first address indicator)
    const nameEndPatterns = [
      /,\s*[A-Za-z\s]+[-–]\s*\d{6}/, // city-pincode
      /,\s*\d{6}/, // just pincode
      /,\s*[A-Z][a-z]+\s+[A-Z][a-z]+/, // address start
    ];

    let cleanName = name;
    for (const pattern of nameEndPatterns) {
      const match = name.match(pattern);
      if (match && match.index && match.index > 20) {
        cleanName = name.substring(0, match.index);
        break;
      }
    }

    // Further clean the name
    cleanName = cleanName.split(',')[0].trim();
    if (cleanName.length < 10) continue;

    // Extract district
    const district = extractDistrict(entry, state);

    // Extract type
    const type = extractType(entry);

    universities.push({
      name: cleanName.substring(0, 200),
      state,
      district,
      city: district,
      type
    });
  }

  console.log(`Parsed ${universities.length} universities\n`);

  // Show sample by state
  const byState = new Map<string, number>();
  universities.forEach(u => {
    byState.set(u.state, (byState.get(u.state) || 0) + 1);
  });

  console.log('By State:');
  [...byState.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([state, count]) => console.log(`  ${state}: ${count}`));

  // Import to database
  console.log('\nImporting to database...');

  let saved = 0;
  for (const uni of universities) {
    try {
      await prisma.college.create({
        data: {
          organizationId: org.id,
          assignedToId: admin.id,
          name: uni.name,
          collegeType: 'OTHER',
          institutionStatus: uni.type as any,
          category: 'WARM',
          address: `${uni.city}, ${uni.state}`,
          city: uni.city,
          district: uni.district,
          state: uni.state,
        }
      });
      saved++;
    } catch (e) {
      // Skip
    }
  }

  // Final stats
  const total = await prisma.college.count({ where: { organizationId: org.id } });

  console.log('\n============================================');
  console.log('           IMPORT COMPLETE');
  console.log('============================================');
  console.log(`Parsed: ${universities.length}`);
  console.log(`Saved: ${saved}`);
  console.log(`Total in DB: ${total}`);
  console.log('============================================');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
