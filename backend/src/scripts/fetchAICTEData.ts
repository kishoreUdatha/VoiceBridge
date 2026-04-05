/**
 * AICTE Data Fetcher
 * Downloads college data from AICTE public API and saves to CSV
 *
 * Run: npx ts-node src/scripts/fetchAICTEData.ts
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// Create axios instance that ignores SSL errors (AICTE has certificate issues)
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  timeout: 120000,
});

// All Indian states
const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

// State code mapping
const STATE_CODES: Record<string, string> = {
  'Andhra Pradesh': 'AP', 'Arunachal Pradesh': 'AR', 'Assam': 'AS', 'Bihar': 'BR',
  'Chhattisgarh': 'CG', 'Goa': 'GA', 'Gujarat': 'GJ', 'Haryana': 'HR',
  'Himachal Pradesh': 'HP', 'Jharkhand': 'JH', 'Karnataka': 'KA', 'Kerala': 'KL',
  'Madhya Pradesh': 'MP', 'Maharashtra': 'MH', 'Manipur': 'MN', 'Meghalaya': 'ML',
  'Mizoram': 'MZ', 'Nagaland': 'NL', 'Odisha': 'OD', 'Punjab': 'PB',
  'Rajasthan': 'RJ', 'Sikkim': 'SK', 'Tamil Nadu': 'TN', 'Telangana': 'TS',
  'Tripura': 'TR', 'Uttar Pradesh': 'UP', 'Uttarakhand': 'UK', 'West Bengal': 'WB',
  'Andaman and Nicobar Islands': 'AN', 'Chandigarh': 'CH',
  'Dadra and Nagar Haveli and Daman and Diu': 'DN', 'Delhi': 'DL',
  'Jammu and Kashmir': 'JK', 'Ladakh': 'LA', 'Lakshadweep': 'LD', 'Puducherry': 'PY'
};

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
  established: string;
  university: string;
  status: string;
}

const allColleges: College[] = [];

// Try multiple API endpoints
async function fetchFromAICTE(stateCode: string, stateName: string): Promise<College[]> {
  const colleges: College[] = [];

  // Try different API endpoints
  const endpoints = [
    {
      url: 'https://facilities.aicte-india.org/dashboard/pages/dashboardaicte.php',
      method: 'POST',
      data: `state_name=${stateCode}&flag=0`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    },
    {
      url: `https://facilities.aicte-india.org/dashboard/pages/angabords498dfsmnbmnb.php?state=${stateCode}&Year=2024-2025`,
      method: 'GET',
      headers: {}
    }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = endpoint.method === 'POST'
        ? await axiosInstance.post(endpoint.url, endpoint.data, {
            headers: {
              ...endpoint.headers,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
          })
        : await axiosInstance.get(endpoint.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
          });

      if (response.data && Array.isArray(response.data)) {
        for (const inst of response.data) {
          colleges.push({
            name: inst.Institute_Name || inst.NAME || inst.name || '',
            state: stateName,
            district: inst.District_Name || inst.DISTRICT || inst.district || '',
            city: inst.City_Name || inst.TOWN || inst.city || '',
            type: inst.Institute_Type || inst.TYPE || inst.type || 'Engineering',
            address: inst.Address || inst.ADDRESS || '',
            pincode: inst.Pin_Code || inst.PIN || inst.pincode || '',
            phone: inst.Contact_No || inst.PHONE || inst.phone || '',
            email: inst.Email || inst.EMAIL || '',
            website: inst.Website || inst.WEBSITE || '',
            established: inst.Year_of_Estd || inst.YEAR_ESTD || '',
            university: inst.University_Name || inst.UNIVERSITY || '',
            status: inst.University_Type || inst.STATUS || ''
          });
        }
        if (colleges.length > 0) break;
      }
    } catch (error: any) {
      // Continue to next endpoint
    }
  }

  return colleges;
}

// Convert to CSV
function toCSV(colleges: College[]): string {
  const headers = ['Name', 'State', 'District', 'City', 'Type', 'Address', 'Pincode', 'Phone', 'Email', 'Website', 'Established', 'University', 'Status'];
  const rows = colleges.map(c => [
    `"${(c.name || '').replace(/"/g, '""')}"`,
    `"${(c.state || '').replace(/"/g, '""')}"`,
    `"${(c.district || '').replace(/"/g, '""')}"`,
    `"${(c.city || '').replace(/"/g, '""')}"`,
    `"${(c.type || '').replace(/"/g, '""')}"`,
    `"${(c.address || '').replace(/"/g, '""')}"`,
    `"${(c.pincode || '').replace(/"/g, '""')}"`,
    `"${(c.phone || '').replace(/"/g, '""')}"`,
    `"${(c.email || '').replace(/"/g, '""')}"`,
    `"${(c.website || '').replace(/"/g, '""')}"`,
    `"${(c.established || '').replace(/"/g, '""')}"`,
    `"${(c.university || '').replace(/"/g, '""')}"`,
    `"${(c.status || '').replace(/"/g, '""')}"`
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

async function main() {
  console.log('============================================');
  console.log('       AICTE Data Fetcher');
  console.log('============================================\n');
  console.log('Attempting to fetch college data from AICTE...\n');

  let totalFetched = 0;

  for (const stateName of STATES) {
    const stateCode = STATE_CODES[stateName];
    if (!stateCode) continue;

    process.stdout.write(`Fetching ${stateName}...`);

    try {
      const colleges = await fetchFromAICTE(stateCode, stateName);
      allColleges.push(...colleges);
      totalFetched += colleges.length;
      console.log(` ${colleges.length} colleges`);
    } catch (error: any) {
      console.log(` Failed: ${error.message}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\nTotal fetched: ${totalFetched} colleges`);

  if (allColleges.length > 0) {
    // Save to CSV
    const outputDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const csvPath = path.join(outputDir, 'aicte-colleges.csv');
    fs.writeFileSync(csvPath, toCSV(allColleges));
    console.log(`\nSaved to: ${csvPath}`);
    console.log('\nNow run:');
    console.log(`  npx ts-node src/scripts/importCollegesCSV.ts ${csvPath}`);
  } else {
    console.log('\n============================================');
    console.log('AICTE API is not accessible. Please download manually:');
    console.log('============================================\n');
    console.log('1. Go to: https://facilities.aicte-india.org/dashboard/');
    console.log('2. Click "Approved Institutes" tab');
    console.log('3. Select Academic Year: 2024-2025');
    console.log('4. Leave State as "All" or select specific states');
    console.log('5. Click "Search"');
    console.log('6. Click "Export to Excel" button');
    console.log('7. Save the file and run:');
    console.log('   npx ts-node src/scripts/importCollegesCSV.ts <path-to-csv>\n');
  }
}

main().catch(console.error);
