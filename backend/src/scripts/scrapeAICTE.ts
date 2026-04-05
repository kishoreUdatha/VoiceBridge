/**
 * AICTE College Scraper
 * Scrapes all technical colleges from AICTE's public dashboard
 *
 * Run: npx ts-node src/scripts/scrapeAICTE.ts
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../config/database';

// AICTE State Codes
const AICTE_STATES = [
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CG', name: 'Chhattisgarh' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OD', name: 'Odisha' },
  { code: 'PB', name: 'Punjab' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TS', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UK', name: 'Uttarakhand' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'AN', name: 'Andaman and Nicobar Islands' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'DN', name: 'Dadra and Nagar Haveli' },
  { code: 'DD', name: 'Daman and Diu' },
  { code: 'DL', name: 'Delhi' },
  { code: 'LD', name: 'Lakshadweep' },
  { code: 'PY', name: 'Puducherry' },
];

interface AICTEInstitute {
  AICTE_ID: string;
  Institute_Name: string;
  Institute_Type: string;
  Address: string;
  City_Name: string;
  District_Name: string;
  State_Name: string;
  Pin_Code: string;
  Contact_No: string;
  Email: string;
  Website: string;
  Year_of_Estd: string;
  University_Name: string;
  University_Type: string;
}

// Map college type
function mapCollegeType(type: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('engineering') || t.includes('technical')) return 'ENGINEERING';
  if (t.includes('polytechnic')) return 'POLYTECHNIC';
  if (t.includes('pharmacy')) return 'MEDICAL';
  if (t.includes('management') || t.includes('mba')) return 'COMMERCE';
  if (t.includes('architecture')) return 'ENGINEERING';
  if (t.includes('hotel') || t.includes('hmct')) return 'OTHER';
  return 'ENGINEERING';
}

// Map institution status
function mapInstitutionStatus(univType: string): string {
  const t = (univType || '').toLowerCase();
  if (t.includes('deemed')) return 'DEEMED';
  if (t.includes('central') || t.includes('state')) return 'UNIVERSITY';
  if (t.includes('autonomous')) return 'AUTONOMOUS';
  if (t.includes('private')) return 'AFFILIATED';
  return 'AFFILIATED';
}

// Scrape institutes from AICTE
async function scrapeAICTEState(stateCode: string, stateName: string): Promise<AICTEInstitute[]> {
  const institutes: AICTEInstitute[] = [];

  try {
    // AICTE Public API endpoint
    const response = await axios.post(
      'https://www.facilities.aicte-india.org/dashboard/pages/dashboardaicte.php',
      `state_name=${stateCode}&flag=0`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Origin': 'https://www.facilities.aicte-india.org',
          'Referer': 'https://www.facilities.aicte-india.org/dashboard/',
        },
        timeout: 60000,
      }
    );

    if (response.data && Array.isArray(response.data)) {
      for (const inst of response.data) {
        institutes.push({
          AICTE_ID: inst.Permanent_Id || inst.AICTE_ID || '',
          Institute_Name: inst.Institute_Name || inst.Name || '',
          Institute_Type: inst.Institute_Type || inst.Type || '',
          Address: inst.Address || '',
          City_Name: inst.City_Name || inst.Town || inst.City || '',
          District_Name: inst.District_Name || inst.District || '',
          State_Name: stateName,
          Pin_Code: inst.Pin_Code || inst.Pincode || '',
          Contact_No: inst.Contact_No || inst.Phone || '',
          Email: inst.Email || '',
          Website: inst.Website || '',
          Year_of_Estd: inst.Year_of_Estd || inst.Established || '',
          University_Name: inst.University_Name || '',
          University_Type: inst.University_Type || '',
        });
      }
    }
  } catch (error: any) {
    console.log(`  Failed to fetch from AICTE API: ${error.message}`);
  }

  return institutes;
}

// Alternative: Scrape from AICTE approved list page
async function scrapeAICTEApprovedList(stateCode: string, stateName: string): Promise<AICTEInstitute[]> {
  const institutes: AICTEInstitute[] = [];

  try {
    // Try the facilities dashboard API
    const response = await axios.get(
      `https://facilities.aicte-india.org/dashboard/pages/angabords498dfsmnbmnb.php`,
      {
        params: {
          state: stateCode,
          dist: '',
          insttype: '',
          Year: '2024-2025',
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 60000,
      }
    );

    if (response.data && typeof response.data === 'object') {
      const data = response.data.data || response.data;
      if (Array.isArray(data)) {
        for (const inst of data) {
          institutes.push({
            AICTE_ID: inst.PERMANENT_ID || inst.aicte_id || '',
            Institute_Name: inst.NAME || inst.institute_name || '',
            Institute_Type: inst.TYPE || inst.type || 'Engineering',
            Address: inst.ADDRESS || inst.address || '',
            City_Name: inst.TOWN || inst.city || '',
            District_Name: inst.DISTRICT || inst.district || '',
            State_Name: stateName,
            Pin_Code: inst.PIN || inst.pincode || '',
            Contact_No: inst.STD_CODE ? `${inst.STD_CODE}-${inst.PHONE}` : inst.phone || '',
            Email: inst.EMAIL || inst.email || '',
            Website: inst.WEBSITE || inst.website || '',
            Year_of_Estd: inst.YEAR_ESTD || '',
            University_Name: inst.UNIVERSITY || '',
            University_Type: inst.UNIV_TYPE || '',
          });
        }
      }
    }
  } catch (error: any) {
    console.log(`  Alternative API also failed: ${error.message}`);
  }

  return institutes;
}

// Save to database
async function saveToDatabase(institutes: AICTEInstitute[], organizationId: string, assignedToId: string): Promise<number> {
  let saved = 0;

  for (const inst of institutes) {
    if (!inst.Institute_Name || inst.Institute_Name.trim() === '') continue;

    try {
      // Check if exists
      const existing = await prisma.college.findFirst({
        where: {
          organizationId,
          name: inst.Institute_Name,
          state: inst.State_Name,
        },
      });

      if (existing) continue;

      await prisma.college.create({
        data: {
          organizationId,
          assignedToId,
          name: inst.Institute_Name,
          collegeType: mapCollegeType(inst.Institute_Type) as any,
          institutionStatus: mapInstitutionStatus(inst.University_Type) as any,
          category: 'WARM',
          address: inst.Address || `${inst.City_Name}, ${inst.District_Name}`,
          city: inst.City_Name || inst.District_Name || 'Unknown',
          district: inst.District_Name || '',
          state: inst.State_Name,
          pincode: inst.Pin_Code || '',
          phone: inst.Contact_No || '',
          email: inst.Email || '',
          website: inst.Website || '',
          establishedYear: inst.Year_of_Estd ? parseInt(inst.Year_of_Estd) : undefined,
        },
      });

      saved++;
    } catch (error: any) {
      // Skip errors silently
    }
  }

  return saved;
}

// Save to JSON file for backup
function saveToJSON(institutes: AICTEInstitute[], stateName: string) {
  const dir = path.join(__dirname, '../../data/scraped');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = path.join(dir, `${stateName.replace(/\s+/g, '_')}.json`);
  fs.writeFileSync(filename, JSON.stringify(institutes, null, 2));
  console.log(`  Saved to ${filename}`);
}

// Main function
async function main() {
  console.log('============================================');
  console.log('       AICTE College Scraper');
  console.log('============================================\n');

  // Get organization
  const org = await prisma.organization.findFirst({ where: { isActive: true } });
  if (!org) {
    console.error('No active organization found!');
    process.exit(1);
  }

  // Get admin user
  const admin = await prisma.user.findFirst({
    where: {
      organizationId: org.id,
      isActive: true,
      role: { slug: { in: ['admin', 'owner', 'manager'] } },
    },
  });

  if (!admin) {
    console.error('No admin user found!');
    process.exit(1);
  }

  console.log(`Organization: ${org.name}`);
  console.log(`Assigning to: ${admin.firstName} ${admin.lastName}\n`);

  let totalScraped = 0;
  let totalSaved = 0;

  // Scrape each state
  for (const state of AICTE_STATES) {
    console.log(`\n--- ${state.name} (${state.code}) ---`);

    // Try primary API
    let institutes = await scrapeAICTEState(state.code, state.name);

    // If failed, try alternative
    if (institutes.length === 0) {
      institutes = await scrapeAICTEApprovedList(state.code, state.name);
    }

    console.log(`  Found: ${institutes.length} institutes`);
    totalScraped += institutes.length;

    if (institutes.length > 0) {
      // Save to JSON backup
      saveToJSON(institutes, state.name);

      // Save to database
      const saved = await saveToDatabase(institutes, org.id, admin.id);
      totalSaved += saved;
      console.log(`  Saved to DB: ${saved} new colleges`);
    }

    // Rate limiting - wait 2 seconds between states
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n============================================');
  console.log('           SCRAPING SUMMARY');
  console.log('============================================');
  console.log(`Total Scraped: ${totalScraped}`);
  console.log(`Total Saved:   ${totalSaved}`);
  console.log('============================================\n');

  // Show final counts
  const byState = await prisma.college.groupBy({
    by: ['state'],
    where: { organizationId: org.id },
    _count: { state: true },
    orderBy: { _count: { state: 'desc' } },
  });

  console.log('Colleges by State:');
  for (const s of byState) {
    console.log(`  ${s.state}: ${s._count.state}`);
  }
}

main()
  .then(() => {
    console.log('\nScraping completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Scraping failed:', error);
    process.exit(1);
  });
