/**
 * College Data Scraper
 * Scrapes college information from AICTE, UGC and other sources
 * Run: npx ts-node src/scripts/scrapeColleges.ts
 */

import axios from 'axios';
import { prisma } from '../config/database';
import { CollegeType, InstitutionStatus } from '@prisma/client';

interface ScrapedCollege {
  name: string;
  shortName?: string;
  collegeType: CollegeType;
  institutionStatus: InstitutionStatus;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  establishedYear?: number;
  coursesOffered?: string[];
}

// AICTE API endpoints (publicly available data)
const AICTE_API = 'https://facilities.aicte-india.org/dashboard/pages/angabords498dfsmnbmnb.php';

// State codes mapping for AICTE
const stateCodesAICTE: Record<string, string> = {
  'Andhra Pradesh': 'AP',
  'Arunachal Pradesh': 'AR',
  'Assam': 'AS',
  'Bihar': 'BR',
  'Chhattisgarh': 'CG',
  'Goa': 'GA',
  'Gujarat': 'GJ',
  'Haryana': 'HR',
  'Himachal Pradesh': 'HP',
  'Jharkhand': 'JH',
  'Karnataka': 'KA',
  'Kerala': 'KL',
  'Madhya Pradesh': 'MP',
  'Maharashtra': 'MH',
  'Manipur': 'MN',
  'Meghalaya': 'ML',
  'Mizoram': 'MZ',
  'Nagaland': 'NL',
  'Odisha': 'OD',
  'Punjab': 'PB',
  'Rajasthan': 'RJ',
  'Sikkim': 'SK',
  'Tamil Nadu': 'TN',
  'Telangana': 'TS',
  'Tripura': 'TR',
  'Uttar Pradesh': 'UP',
  'Uttarakhand': 'UK',
  'West Bengal': 'WB',
  'Andaman and Nicobar Islands': 'AN',
  'Chandigarh': 'CH',
  'Dadra and Nagar Haveli and Daman and Diu': 'DD',
  'Delhi': 'DL',
  'Jammu and Kashmir': 'JK',
  'Ladakh': 'LA',
  'Lakshadweep': 'LD',
  'Puducherry': 'PY',
};

// College type mapping
function mapCollegeType(type: string): CollegeType {
  const typeMap: Record<string, CollegeType> = {
    'engineering': 'ENGINEERING',
    'technical': 'ENGINEERING',
    'polytechnic': 'POLYTECHNIC',
    'pharmacy': 'MEDICAL',
    'medical': 'MEDICAL',
    'management': 'COMMERCE',
    'mba': 'COMMERCE',
    'arts': 'ARTS',
    'science': 'SCIENCE',
    'iti': 'ITI',
  };

  const lowerType = type.toLowerCase();
  for (const [key, value] of Object.entries(typeMap)) {
    if (lowerType.includes(key)) return value;
  }
  return 'OTHER';
}

// Institution status mapping
function mapInstitutionStatus(status: string): InstitutionStatus {
  const statusMap: Record<string, InstitutionStatus> = {
    'university': 'UNIVERSITY',
    'autonomous': 'AUTONOMOUS',
    'deemed': 'DEEMED',
    'affiliated': 'AFFILIATED',
    'standalone': 'STANDALONE',
  };

  const lowerStatus = status.toLowerCase();
  for (const [key, value] of Object.entries(statusMap)) {
    if (lowerStatus.includes(key)) return value;
  }
  return 'AFFILIATED';
}

// Scrape colleges from AICTE
async function scrapeAICTEColleges(state: string): Promise<ScrapedCollege[]> {
  const colleges: ScrapedCollege[] = [];
  const stateCode = stateCodesAICTE[state];

  if (!stateCode) {
    console.log(`No AICTE code found for state: ${state}`);
    return colleges;
  }

  try {
    // AICTE provides public institute data
    const response = await axios.get(
      `https://facilities.aicte-india.org/dashboard/pages/dashboardaicte498dfs.php`,
      {
        params: { state: stateCode },
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    // Parse the response if it's valid JSON
    if (response.data && Array.isArray(response.data)) {
      for (const inst of response.data) {
        colleges.push({
          name: inst.name || inst.institute_name || '',
          collegeType: mapCollegeType(inst.type || inst.institute_type || ''),
          institutionStatus: mapInstitutionStatus(inst.status || ''),
          address: inst.address || '',
          city: inst.city || inst.town || '',
          district: inst.district || '',
          state: state,
          pincode: inst.pincode || inst.pin || '',
          phone: inst.phone || inst.contact || '',
          email: inst.email || '',
          website: inst.website || inst.url || '',
        });
      }
    }
  } catch (error: any) {
    console.log(`AICTE scraping for ${state} failed: ${error.message}`);
  }

  return colleges;
}

// Alternative: Use static college data from public sources
// This is sample data - in production you would scrape from actual sources
function getStaticCollegeData(state: string, district: string): ScrapedCollege[] {
  // Sample colleges for demonstration - replace with actual scraped data
  const sampleColleges: Record<string, ScrapedCollege[]> = {
    'Karnataka': [
      {
        name: 'Indian Institute of Science',
        shortName: 'IISc',
        collegeType: 'ENGINEERING',
        institutionStatus: 'DEEMED',
        address: 'CV Raman Road, Bangalore',
        city: 'Bangalore',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        pincode: '560012',
        establishedYear: 1909,
        coursesOffered: ['B.Tech', 'M.Tech', 'PhD'],
      },
      {
        name: 'RV College of Engineering',
        shortName: 'RVCE',
        collegeType: 'ENGINEERING',
        institutionStatus: 'AUTONOMOUS',
        address: 'Mysore Road, Bangalore',
        city: 'Bangalore',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        pincode: '560059',
        establishedYear: 1963,
        coursesOffered: ['B.E', 'M.Tech', 'MBA'],
      },
      {
        name: 'BMS College of Engineering',
        shortName: 'BMSCE',
        collegeType: 'ENGINEERING',
        institutionStatus: 'AUTONOMOUS',
        address: 'Bull Temple Road, Bangalore',
        city: 'Bangalore',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        pincode: '560019',
        establishedYear: 1946,
        coursesOffered: ['B.E', 'M.Tech'],
      },
      {
        name: 'PES University',
        shortName: 'PESU',
        collegeType: 'ENGINEERING',
        institutionStatus: 'UNIVERSITY',
        address: '100 Feet Ring Road, BSK 3rd Stage',
        city: 'Bangalore',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        pincode: '560085',
        establishedYear: 2013,
        coursesOffered: ['B.Tech', 'M.Tech', 'MBA', 'MCA'],
      },
      {
        name: 'National Institute of Technology Karnataka',
        shortName: 'NITK',
        collegeType: 'ENGINEERING',
        institutionStatus: 'AUTONOMOUS',
        address: 'Surathkal, Mangalore',
        city: 'Mangalore',
        district: 'Dakshina Kannada',
        state: 'Karnataka',
        pincode: '575025',
        establishedYear: 1960,
        coursesOffered: ['B.Tech', 'M.Tech', 'PhD'],
      },
      {
        name: 'Manipal Institute of Technology',
        shortName: 'MIT Manipal',
        collegeType: 'ENGINEERING',
        institutionStatus: 'DEEMED',
        address: 'Manipal',
        city: 'Manipal',
        district: 'Udupi',
        state: 'Karnataka',
        pincode: '576104',
        establishedYear: 1957,
        coursesOffered: ['B.Tech', 'M.Tech'],
      },
    ],
    'Tamil Nadu': [
      {
        name: 'Indian Institute of Technology Madras',
        shortName: 'IIT Madras',
        collegeType: 'ENGINEERING',
        institutionStatus: 'AUTONOMOUS',
        address: 'IIT P.O., Chennai',
        city: 'Chennai',
        district: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600036',
        establishedYear: 1959,
        coursesOffered: ['B.Tech', 'M.Tech', 'PhD', 'MBA'],
      },
      {
        name: 'Anna University',
        shortName: 'AU',
        collegeType: 'ENGINEERING',
        institutionStatus: 'UNIVERSITY',
        address: 'Sardar Patel Road, Guindy',
        city: 'Chennai',
        district: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600025',
        establishedYear: 1978,
        coursesOffered: ['B.E', 'M.E', 'PhD'],
      },
      {
        name: 'VIT University',
        shortName: 'VIT',
        collegeType: 'ENGINEERING',
        institutionStatus: 'DEEMED',
        address: 'Vellore',
        city: 'Vellore',
        district: 'Vellore',
        state: 'Tamil Nadu',
        pincode: '632014',
        establishedYear: 1984,
        coursesOffered: ['B.Tech', 'M.Tech', 'MBA', 'MCA'],
      },
      {
        name: 'SRM Institute of Science and Technology',
        shortName: 'SRMIST',
        collegeType: 'ENGINEERING',
        institutionStatus: 'DEEMED',
        address: 'SRM Nagar, Kattankulathur',
        city: 'Chennai',
        district: 'Chengalpattu',
        state: 'Tamil Nadu',
        pincode: '603203',
        establishedYear: 1985,
        coursesOffered: ['B.Tech', 'M.Tech', 'MBA'],
      },
      {
        name: 'PSG College of Technology',
        shortName: 'PSG Tech',
        collegeType: 'ENGINEERING',
        institutionStatus: 'AUTONOMOUS',
        address: 'Peelamedu, Coimbatore',
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641004',
        establishedYear: 1951,
        coursesOffered: ['B.E', 'M.E', 'MCA', 'MBA'],
      },
    ],
    'Telangana': [
      {
        name: 'Indian Institute of Technology Hyderabad',
        shortName: 'IIT Hyderabad',
        collegeType: 'ENGINEERING',
        institutionStatus: 'AUTONOMOUS',
        address: 'Kandi, Sangareddy',
        city: 'Hyderabad',
        district: 'Sangareddy',
        state: 'Telangana',
        pincode: '502285',
        establishedYear: 2008,
        coursesOffered: ['B.Tech', 'M.Tech', 'PhD'],
      },
      {
        name: 'BITS Pilani Hyderabad Campus',
        shortName: 'BITS Hyderabad',
        collegeType: 'ENGINEERING',
        institutionStatus: 'DEEMED',
        address: 'Jawahar Nagar, Hyderabad',
        city: 'Hyderabad',
        district: 'Medchal-Malkajgiri',
        state: 'Telangana',
        pincode: '500078',
        establishedYear: 2008,
        coursesOffered: ['B.Tech', 'M.Tech', 'PhD'],
      },
      {
        name: 'JNTU Hyderabad',
        shortName: 'JNTUH',
        collegeType: 'ENGINEERING',
        institutionStatus: 'UNIVERSITY',
        address: 'Kukatpally, Hyderabad',
        city: 'Hyderabad',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500085',
        establishedYear: 1972,
        coursesOffered: ['B.Tech', 'M.Tech', 'MBA', 'MCA', 'PhD'],
      },
      {
        name: 'Osmania University',
        shortName: 'OU',
        collegeType: 'OTHER',
        institutionStatus: 'UNIVERSITY',
        address: 'Amberpet, Hyderabad',
        city: 'Hyderabad',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500007',
        establishedYear: 1918,
        coursesOffered: ['BA', 'B.Sc', 'B.Com', 'MA', 'M.Sc'],
      },
      {
        name: 'IIIT Hyderabad',
        shortName: 'IIITH',
        collegeType: 'ENGINEERING',
        institutionStatus: 'DEEMED',
        address: 'Gachibowli, Hyderabad',
        city: 'Hyderabad',
        district: 'Hyderabad',
        state: 'Telangana',
        pincode: '500032',
        establishedYear: 1998,
        coursesOffered: ['B.Tech', 'M.Tech', 'PhD'],
      },
    ],
    'Andhra Pradesh': [
      {
        name: 'Indian Institute of Technology Tirupati',
        shortName: 'IIT Tirupati',
        collegeType: 'ENGINEERING',
        institutionStatus: 'AUTONOMOUS',
        address: 'Renigunta Road, Tirupati',
        city: 'Tirupati',
        district: 'Tirupati',
        state: 'Andhra Pradesh',
        pincode: '517506',
        establishedYear: 2015,
        coursesOffered: ['B.Tech', 'M.Tech', 'PhD'],
      },
      {
        name: 'Andhra University',
        shortName: 'AU',
        collegeType: 'OTHER',
        institutionStatus: 'UNIVERSITY',
        address: 'Waltair, Visakhapatnam',
        city: 'Visakhapatnam',
        district: 'Visakhapatnam',
        state: 'Andhra Pradesh',
        pincode: '530003',
        establishedYear: 1926,
        coursesOffered: ['B.Tech', 'BA', 'B.Sc', 'B.Com', 'MBA'],
      },
      {
        name: 'NIT Andhra Pradesh',
        shortName: 'NIT AP',
        collegeType: 'ENGINEERING',
        institutionStatus: 'AUTONOMOUS',
        address: 'Tadepalligudem',
        city: 'Tadepalligudem',
        district: 'West Godavari',
        state: 'Andhra Pradesh',
        pincode: '534101',
        establishedYear: 2015,
        coursesOffered: ['B.Tech', 'M.Tech', 'PhD'],
      },
      {
        name: 'Sri Venkateswara University',
        shortName: 'SVU',
        collegeType: 'OTHER',
        institutionStatus: 'UNIVERSITY',
        address: 'Tirupati',
        city: 'Tirupati',
        district: 'Tirupati',
        state: 'Andhra Pradesh',
        pincode: '517502',
        establishedYear: 1954,
        coursesOffered: ['BA', 'B.Sc', 'B.Com', 'MA', 'M.Sc'],
      },
    ],
    'Maharashtra': [
      {
        name: 'Indian Institute of Technology Bombay',
        shortName: 'IIT Bombay',
        collegeType: 'ENGINEERING',
        institutionStatus: 'AUTONOMOUS',
        address: 'Powai, Mumbai',
        city: 'Mumbai',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        pincode: '400076',
        establishedYear: 1958,
        coursesOffered: ['B.Tech', 'M.Tech', 'PhD', 'MBA'],
      },
      {
        name: 'College of Engineering Pune',
        shortName: 'COEP',
        collegeType: 'ENGINEERING',
        institutionStatus: 'AUTONOMOUS',
        address: 'Shivajinagar, Pune',
        city: 'Pune',
        district: 'Pune',
        state: 'Maharashtra',
        pincode: '411005',
        establishedYear: 1854,
        coursesOffered: ['B.Tech', 'M.Tech'],
      },
      {
        name: 'VJTI Mumbai',
        shortName: 'VJTI',
        collegeType: 'ENGINEERING',
        institutionStatus: 'AUTONOMOUS',
        address: 'Matunga, Mumbai',
        city: 'Mumbai',
        district: 'Mumbai City',
        state: 'Maharashtra',
        pincode: '400019',
        establishedYear: 1887,
        coursesOffered: ['B.Tech', 'M.Tech'],
      },
      {
        name: 'Savitribai Phule Pune University',
        shortName: 'SPPU',
        collegeType: 'OTHER',
        institutionStatus: 'UNIVERSITY',
        address: 'Ganeshkhind, Pune',
        city: 'Pune',
        district: 'Pune',
        state: 'Maharashtra',
        pincode: '411007',
        establishedYear: 1949,
        coursesOffered: ['BA', 'B.Sc', 'B.Com', 'B.E', 'MBA'],
      },
      {
        name: 'MIT World Peace University',
        shortName: 'MIT-WPU',
        collegeType: 'ENGINEERING',
        institutionStatus: 'DEEMED',
        address: 'Kothrud, Pune',
        city: 'Pune',
        district: 'Pune',
        state: 'Maharashtra',
        pincode: '411038',
        establishedYear: 1983,
        coursesOffered: ['B.Tech', 'MBA', 'MCA'],
      },
    ],
    'Delhi': [
      {
        name: 'Indian Institute of Technology Delhi',
        shortName: 'IIT Delhi',
        collegeType: 'ENGINEERING',
        institutionStatus: 'AUTONOMOUS',
        address: 'Hauz Khas, New Delhi',
        city: 'New Delhi',
        district: 'South Delhi',
        state: 'Delhi',
        pincode: '110016',
        establishedYear: 1961,
        coursesOffered: ['B.Tech', 'M.Tech', 'PhD', 'MBA'],
      },
      {
        name: 'Delhi Technological University',
        shortName: 'DTU',
        collegeType: 'ENGINEERING',
        institutionStatus: 'UNIVERSITY',
        address: 'Bawana Road, Delhi',
        city: 'New Delhi',
        district: 'North West Delhi',
        state: 'Delhi',
        pincode: '110042',
        establishedYear: 1941,
        coursesOffered: ['B.Tech', 'M.Tech', 'MBA', 'PhD'],
      },
      {
        name: 'Netaji Subhas University of Technology',
        shortName: 'NSUT',
        collegeType: 'ENGINEERING',
        institutionStatus: 'UNIVERSITY',
        address: 'Dwarka Sector 3, New Delhi',
        city: 'New Delhi',
        district: 'South West Delhi',
        state: 'Delhi',
        pincode: '110078',
        establishedYear: 1983,
        coursesOffered: ['B.Tech', 'M.Tech', 'MBA'],
      },
      {
        name: 'Indraprastha Institute of Information Technology',
        shortName: 'IIIT Delhi',
        collegeType: 'ENGINEERING',
        institutionStatus: 'UNIVERSITY',
        address: 'Okhla Industrial Estate, Phase III',
        city: 'New Delhi',
        district: 'South East Delhi',
        state: 'Delhi',
        pincode: '110020',
        establishedYear: 2008,
        coursesOffered: ['B.Tech', 'M.Tech', 'PhD'],
      },
      {
        name: 'Delhi University',
        shortName: 'DU',
        collegeType: 'OTHER',
        institutionStatus: 'UNIVERSITY',
        address: 'University Road, Delhi',
        city: 'New Delhi',
        district: 'Central Delhi',
        state: 'Delhi',
        pincode: '110007',
        establishedYear: 1922,
        coursesOffered: ['BA', 'B.Sc', 'B.Com', 'MA', 'M.Sc', 'PhD'],
      },
    ],
  };

  return sampleColleges[state] || [];
}

// Save colleges to database
async function saveCollegesToDB(
  colleges: ScrapedCollege[],
  organizationId: string,
  assignedToId: string
): Promise<number> {
  let savedCount = 0;

  for (const college of colleges) {
    try {
      // Check if college already exists
      const existing = await prisma.college.findFirst({
        where: {
          organizationId,
          name: college.name,
          state: college.state,
        },
      });

      if (existing) {
        console.log(`Skipping existing: ${college.name}`);
        continue;
      }

      await prisma.college.create({
        data: {
          organizationId,
          assignedToId,
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
          coursesOffered: college.coursesOffered || [],
        },
      });

      savedCount++;
      console.log(`Saved: ${college.name}`);
    } catch (error: any) {
      console.error(`Failed to save ${college.name}: ${error.message}`);
    }
  }

  return savedCount;
}

// Main scraping function
async function scrapeAllColleges() {
  console.log('Starting college data scraper...\n');

  // Get organization and admin user
  const org = await prisma.organization.findFirst({
    where: { isActive: true },
  });

  if (!org) {
    console.error('No active organization found');
    process.exit(1);
  }

  const adminUser = await prisma.user.findFirst({
    where: {
      organizationId: org.id,
      isActive: true,
      role: { slug: { in: ['admin', 'owner', 'manager'] } },
    },
  });

  if (!adminUser) {
    console.error('No admin user found');
    process.exit(1);
  }

  console.log(`Organization: ${org.name}`);
  console.log(`Assigning colleges to: ${adminUser.firstName} ${adminUser.lastName}\n`);

  // List of states to scrape
  const statesToScrape = [
    'Karnataka',
    'Tamil Nadu',
    'Telangana',
    'Andhra Pradesh',
    'Maharashtra',
    'Delhi',
    'Uttar Pradesh',
    'Gujarat',
    'Rajasthan',
    'Kerala',
    'West Bengal',
    'Punjab',
    'Haryana',
    'Madhya Pradesh',
    'Bihar',
    'Odisha',
  ];

  let totalSaved = 0;

  for (const state of statesToScrape) {
    console.log(`\n--- Scraping ${state} ---`);

    // Try AICTE scraping first
    let colleges = await scrapeAICTEColleges(state);

    // If AICTE fails, use static data
    if (colleges.length === 0) {
      console.log(`Using static data for ${state}`);
      colleges = getStaticCollegeData(state, '');
    }

    console.log(`Found ${colleges.length} colleges in ${state}`);

    if (colleges.length > 0) {
      const saved = await saveCollegesToDB(colleges, org.id, adminUser.id);
      totalSaved += saved;
      console.log(`Saved ${saved} new colleges from ${state}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Total colleges saved: ${totalSaved}`);
  console.log(`========================================\n`);
}

// Run the scraper
scrapeAllColleges()
  .then(() => {
    console.log('Scraping completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Scraping failed:', error);
    process.exit(1);
  });
