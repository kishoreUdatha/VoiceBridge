/**
 * Real College Data Fetcher
 * Tries multiple sources to get actual college data
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { prisma } from '../config/database';

// Axios with SSL disabled and longer timeout
const ax = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 120000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  }
});

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

const allColleges: College[] = [];

// State codes for AICTE
const STATES: Record<string, string> = {
  'ANDHRA PRADESH': 'AP', 'ARUNACHAL PRADESH': 'AR', 'ASSAM': 'AS', 'BIHAR': 'BR',
  'CHHATTISGARH': 'CG', 'GOA': 'GA', 'GUJARAT': 'GJ', 'HARYANA': 'HR',
  'HIMACHAL PRADESH': 'HP', 'JHARKHAND': 'JH', 'KARNATAKA': 'KA', 'KERALA': 'KL',
  'MADHYA PRADESH': 'MP', 'MAHARASHTRA': 'MH', 'MANIPUR': 'MN', 'MEGHALAYA': 'ML',
  'MIZORAM': 'MZ', 'NAGALAND': 'NL', 'ODISHA': 'OD', 'PUNJAB': 'PB',
  'RAJASTHAN': 'RJ', 'SIKKIM': 'SK', 'TAMIL NADU': 'TN', 'TELANGANA': 'TS',
  'TRIPURA': 'TR', 'UTTAR PRADESH': 'UP', 'UTTARAKHAND': 'UK', 'WEST BENGAL': 'WB',
  'DELHI': 'DL', 'JAMMU AND KASHMIR': 'JK', 'LADAKH': 'LA', 'PUDUCHERRY': 'PY',
  'CHANDIGARH': 'CH', 'ANDAMAN AND NICOBAR': 'AN', 'DADRA AND NAGAR HAVELI': 'DN',
  'LAKSHADWEEP': 'LD'
};

// Try AICTE facilities dashboard
async function tryAICTEFacilities(): Promise<number> {
  console.log('\n=== Trying AICTE Facilities Dashboard ===');
  let total = 0;

  for (const [stateName, stateCode] of Object.entries(STATES)) {
    try {
      // Try POST request
      const response = await ax.post(
        'https://facilities.aicte-india.org/dashboard/pages/dashboardaicte.php',
        new URLSearchParams({ state_name: stateCode, flag: '0' }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://facilities.aicte-india.org',
            'Referer': 'https://facilities.aicte-india.org/dashboard/'
          }
        }
      );

      if (response.data && Array.isArray(response.data)) {
        for (const inst of response.data) {
          allColleges.push({
            name: inst.Institute_Name || inst.NAME || '',
            state: stateName,
            district: inst.District_Name || inst.DISTRICT || '',
            city: inst.City_Name || inst.TOWN || '',
            type: inst.Institute_Type || 'Engineering',
            address: inst.Address || '',
            pincode: inst.Pin_Code || '',
            phone: inst.Contact_No || '',
            email: inst.Email || '',
            website: inst.Website || ''
          });
        }
        total += response.data.length;
        console.log(`  ${stateName}: ${response.data.length} colleges`);
      }
    } catch (e: any) {
      console.log(`  ${stateName}: Failed - ${e.message?.substring(0, 50)}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  return total;
}

// Try AICTE public API v2
async function tryAICTEAPIv2(): Promise<number> {
  console.log('\n=== Trying AICTE API v2 ===');
  let total = 0;

  const endpoints = [
    'https://www.aicte-india.org/api/institutes',
    'https://www.aicte-india.org/api/v1/institutes',
    'https://facilities.aicte-india.org/api/institutes',
    'https://facilities.aicte-india.org/dashboard/api/institutes'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`  Trying: ${endpoint}`);
      const response = await ax.get(endpoint, { params: { limit: 50000 } });
      if (response.data) {
        console.log(`  Response type: ${typeof response.data}`);
        if (Array.isArray(response.data)) {
          total = response.data.length;
          console.log(`  Found ${total} records`);
        } else if (response.data.data && Array.isArray(response.data.data)) {
          total = response.data.data.length;
          console.log(`  Found ${total} records in data field`);
        }
      }
    } catch (e: any) {
      console.log(`  Failed: ${e.message?.substring(0, 60)}`);
    }
  }
  return total;
}

// Try NIRF data
async function tryNIRF(): Promise<number> {
  console.log('\n=== Trying NIRF Rankings Data ===');
  let total = 0;

  try {
    const response = await ax.get('https://www.nirfindia.org/nirfpdfcdn/2023/pdf/Engineering.pdf', {
      responseType: 'arraybuffer'
    });
    console.log(`  NIRF PDF size: ${response.data.length} bytes`);
  } catch (e: any) {
    console.log(`  NIRF failed: ${e.message?.substring(0, 50)}`);
  }
  return total;
}

// Try scraping HTML page
async function tryHTMLScrape(): Promise<number> {
  console.log('\n=== Trying HTML Scrape ===');
  let total = 0;

  try {
    const response = await ax.get('https://facilities.aicte-india.org/dashboard/');
    if (response.data) {
      console.log(`  Got HTML page: ${response.data.length} bytes`);
      // Check if there's embedded JSON data
      const jsonMatch = response.data.match(/var\s+institutes\s*=\s*(\[[\s\S]*?\]);/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        console.log(`  Found embedded data: ${data.length} records`);
        total = data.length;
      }
    }
  } catch (e: any) {
    console.log(`  HTML scrape failed: ${e.message?.substring(0, 50)}`);
  }
  return total;
}

// Try Government Open Data
async function tryGovOpenData(): Promise<number> {
  console.log('\n=== Trying data.gov.in ===');
  let total = 0;

  const datasets = [
    'https://data.gov.in/resource/list-aicte-approved-institutions',
    'https://data.gov.in/catalog/aicte-approved-institutes',
    'https://api.data.gov.in/resource/aicte-institutions'
  ];

  for (const url of datasets) {
    try {
      console.log(`  Trying: ${url}`);
      const response = await ax.get(url);
      console.log(`  Status: ${response.status}`);
    } catch (e: any) {
      console.log(`  Failed: ${e.message?.substring(0, 50)}`);
    }
  }
  return total;
}

// Save colleges to database
async function saveToDatabase(): Promise<number> {
  if (allColleges.length === 0) {
    console.log('\nNo colleges to save');
    return 0;
  }

  console.log(`\n=== Saving ${allColleges.length} colleges to database ===`);

  const org = await prisma.organization.findFirst({ where: { isActive: true } });
  if (!org) return 0;

  const admin = await prisma.user.findFirst({
    where: { organizationId: org.id, isActive: true, role: { slug: { in: ['admin', 'owner'] } } }
  });
  if (!admin) return 0;

  let saved = 0;
  for (const college of allColleges) {
    if (!college.name || !college.state) continue;

    try {
      const exists = await prisma.college.findFirst({
        where: { organizationId: org.id, name: college.name, state: college.state }
      });
      if (exists) continue;

      await prisma.college.create({
        data: {
          organizationId: org.id,
          assignedToId: admin.id,
          name: college.name,
          collegeType: 'ENGINEERING',
          institutionStatus: 'AFFILIATED',
          category: 'WARM',
          address: college.address || college.city,
          city: college.city || college.district,
          district: college.district,
          state: college.state,
          pincode: college.pincode,
          phone: college.phone,
          email: college.email,
          website: college.website
        }
      });
      saved++;
      if (saved % 500 === 0) console.log(`  Saved ${saved}...`);
    } catch (e) {
      // Skip
    }
  }
  return saved;
}

async function main() {
  console.log('============================================');
  console.log('    Real College Data Fetcher');
  console.log('============================================');

  // Try all sources
  let total = 0;

  total += await tryAICTEFacilities();
  if (total === 0) total += await tryAICTEAPIv2();
  if (total === 0) total += await tryHTMLScrape();
  if (total === 0) total += await tryGovOpenData();
  if (total === 0) total += await tryNIRF();

  console.log(`\n============================================`);
  console.log(`Total colleges fetched: ${allColleges.length}`);
  console.log(`============================================`);

  if (allColleges.length > 0) {
    const saved = await saveToDatabase();
    console.log(`Saved to database: ${saved}`);
  } else {
    console.log('\n❌ Could not fetch real data from any source.');
    console.log('\n✅ MANUAL DOWNLOAD REQUIRED:');
    console.log('   1. Open: https://facilities.aicte-india.org/dashboard/');
    console.log('   2. Click "Approved Institutes" tab');
    console.log('   3. Click "Search" then "Export to Excel"');
    console.log('   4. Run: npx ts-node src/scripts/importCollegesCSV.ts <file.csv>');
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
