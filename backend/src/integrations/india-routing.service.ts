import { prisma } from '../config/database';


// India Regional Configuration
export interface IndiaRegion {
  code: string;
  name: string;
  states: string[];
  languages: string[];
  timezone: string;
  businessHours: { start: number; end: number };
  holidays: string[]; // ISO date strings
}

// Regional holiday lists (2024-2026)
const NORTH_INDIA_HOLIDAYS = [
  // 2024
  '2024-01-14', // Makar Sankranti / Lohri
  '2024-03-25', // Holi
  '2024-04-14', // Baisakhi
  '2024-08-26', // Janmashtami
  '2024-10-12', // Dussehra
  '2024-10-20', // Karwa Chauth
  '2024-10-31', // Diwali
  '2024-11-01', // Govardhan Puja
  '2024-11-02', // Bhai Dooj
  // 2025
  '2025-01-14', // Makar Sankranti / Lohri
  '2025-03-14', // Holi
  '2025-04-14', // Baisakhi
  '2025-08-16', // Janmashtami
  '2025-10-02', // Dussehra
  '2025-10-20', // Diwali
  // 2026
  '2026-01-14', // Makar Sankranti
  '2026-03-04', // Holi
  '2026-04-14', // Baisakhi
  '2026-11-08', // Diwali
];

const SOUTH_INDIA_HOLIDAYS = [
  // 2024
  '2024-01-15', // Pongal
  '2024-01-16', // Thiruvalluvar Day
  '2024-04-14', // Tamil New Year / Vishu
  '2024-08-15', // Onam (approx)
  '2024-09-07', // Onam
  '2024-10-12', // Dussehra / Ayudha Puja
  '2024-10-31', // Diwali / Naraka Chaturdashi
  '2024-11-01', // Kannada Rajyotsava
  // 2025
  '2025-01-14', // Pongal
  '2025-01-15', // Pongal Day 2
  '2025-04-14', // Tamil New Year / Vishu
  '2025-08-27', // Onam
  '2025-10-02', // Dussehra
  '2025-10-20', // Diwali
  '2025-11-01', // Kannada Rajyotsava
  // 2026
  '2026-01-14', // Pongal
  '2026-04-14', // Tamil New Year
  '2026-09-16', // Onam
  '2026-11-08', // Diwali
];

const WEST_INDIA_HOLIDAYS = [
  // 2024
  '2024-01-14', // Makar Sankranti
  '2024-03-25', // Holi
  '2024-04-10', // Gudi Padwa
  '2024-05-01', // Maharashtra Day / Gujarat Day
  '2024-08-19', // Raksha Bandhan
  '2024-08-26', // Janmashtami (Gokulashtami)
  '2024-09-07', // Ganesh Chaturthi
  '2024-09-17', // Ganesh Visarjan
  '2024-10-03', // Navratri starts
  '2024-10-12', // Dussehra
  '2024-10-31', // Diwali
  '2024-11-03', // Diwali Padwa
  // 2025
  '2025-01-14', // Makar Sankranti
  '2025-03-14', // Holi
  '2025-03-30', // Gudi Padwa
  '2025-05-01', // Maharashtra Day
  '2025-08-09', // Raksha Bandhan
  '2025-08-27', // Ganesh Chaturthi
  '2025-10-02', // Dussehra
  '2025-10-20', // Diwali
  // 2026
  '2026-01-14', // Makar Sankranti
  '2026-03-04', // Holi
  '2026-04-18', // Gudi Padwa
  '2026-05-01', // Maharashtra Day
  '2026-11-08', // Diwali
];

const EAST_INDIA_HOLIDAYS = [
  // 2024
  '2024-01-14', // Makar Sankranti
  '2024-01-23', // Netaji Jayanti
  '2024-04-14', // Poila Boishakh (Bengali New Year)
  '2024-04-15', // Maha Bishuba Sankranti (Odia New Year)
  '2024-06-01', // Raja Parba (Odisha)
  '2024-10-09', // Maha Saptami
  '2024-10-10', // Maha Ashtami
  '2024-10-11', // Maha Navami
  '2024-10-12', // Dussehra / Vijaya Dashami
  '2024-10-31', // Diwali / Kali Puja
  '2024-11-15', // Chhath Puja
  // 2025
  '2025-01-14', // Makar Sankranti
  '2025-01-23', // Netaji Jayanti
  '2025-04-14', // Poila Boishakh
  '2025-04-15', // Maha Bishuba Sankranti
  '2025-10-01', // Durga Puja starts
  '2025-10-02', // Dussehra
  '2025-10-20', // Diwali / Kali Puja
  '2025-11-05', // Chhath Puja
  // 2026
  '2026-01-14', // Makar Sankranti
  '2026-04-14', // Poila Boishakh
  '2026-11-08', // Diwali
];

const NORTHEAST_INDIA_HOLIDAYS = [
  // 2024
  '2024-01-14', // Magh Bihu / Makar Sankranti
  '2024-02-20', // Statehood Day (Arunachal Pradesh, Mizoram)
  '2024-04-14', // Bohag Bihu / Rongali Bihu
  '2024-04-15', // Bohag Bihu
  '2024-04-16', // Bohag Bihu
  '2024-11-01', // Kut Festival (Manipur)
  '2024-12-01', // Hornbill Festival starts (Nagaland)
  // 2025
  '2025-01-14', // Magh Bihu
  '2025-02-20', // Statehood Day
  '2025-04-14', // Bohag Bihu
  '2025-04-15', // Bohag Bihu
  '2025-04-16', // Bohag Bihu
  '2025-10-20', // Diwali
  '2025-12-01', // Hornbill Festival
  // 2026
  '2026-01-14', // Magh Bihu
  '2026-04-14', // Bohag Bihu
  '2026-11-08', // Diwali
];

const CENTRAL_INDIA_HOLIDAYS = [
  // 2024
  '2024-01-14', // Makar Sankranti
  '2024-03-25', // Holi
  '2024-07-07', // Hareli (Chhattisgarh)
  '2024-10-12', // Dussehra
  '2024-10-31', // Diwali
  '2024-11-01', // Madhya Pradesh Foundation Day
  // 2025
  '2025-01-14', // Makar Sankranti
  '2025-03-14', // Holi
  '2025-10-02', // Dussehra
  '2025-10-20', // Diwali
  '2025-11-01', // MP Foundation Day
  // 2026
  '2026-01-14', // Makar Sankranti
  '2026-03-04', // Holi
  '2026-11-01', // MP Foundation Day
  '2026-11-08', // Diwali
];

export const INDIA_REGIONS: Record<string, IndiaRegion> = {
  NORTH: {
    code: 'NORTH',
    name: 'North India',
    states: [
      'Delhi', 'Uttar Pradesh', 'Haryana', 'Punjab', 'Rajasthan',
      'Himachal Pradesh', 'Uttarakhand', 'Jammu and Kashmir', 'Ladakh',
      'Chandigarh',
    ],
    languages: ['hi-IN', 'pa-IN', 'en-IN'],
    timezone: 'Asia/Kolkata',
    businessHours: { start: 9, end: 18 },
    holidays: NORTH_INDIA_HOLIDAYS,
  },
  SOUTH: {
    code: 'SOUTH',
    name: 'South India',
    states: [
      'Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana',
      'Puducherry', 'Lakshadweep',
    ],
    languages: ['ta-IN', 'kn-IN', 'te-IN', 'ml-IN', 'en-IN'],
    timezone: 'Asia/Kolkata',
    businessHours: { start: 9, end: 18 },
    holidays: SOUTH_INDIA_HOLIDAYS,
  },
  WEST: {
    code: 'WEST',
    name: 'West India',
    states: [
      'Maharashtra', 'Gujarat', 'Goa', 'Dadra and Nagar Haveli',
      'Daman and Diu',
    ],
    languages: ['mr-IN', 'gu-IN', 'en-IN', 'hi-IN'],
    timezone: 'Asia/Kolkata',
    businessHours: { start: 9, end: 18 },
    holidays: WEST_INDIA_HOLIDAYS,
  },
  EAST: {
    code: 'EAST',
    name: 'East India',
    states: [
      'West Bengal', 'Bihar', 'Jharkhand', 'Odisha', 'Sikkim',
      'Andaman and Nicobar Islands',
    ],
    languages: ['bn-IN', 'hi-IN', 'en-IN'],
    timezone: 'Asia/Kolkata',
    businessHours: { start: 9, end: 18 },
    holidays: EAST_INDIA_HOLIDAYS,
  },
  NORTHEAST: {
    code: 'NORTHEAST',
    name: 'North East India',
    states: [
      'Assam', 'Meghalaya', 'Tripura', 'Manipur', 'Mizoram',
      'Nagaland', 'Arunachal Pradesh',
    ],
    languages: ['en-IN', 'hi-IN'],
    timezone: 'Asia/Kolkata',
    businessHours: { start: 9, end: 17 }, // Slightly earlier
    holidays: NORTHEAST_INDIA_HOLIDAYS,
  },
  CENTRAL: {
    code: 'CENTRAL',
    name: 'Central India',
    states: ['Madhya Pradesh', 'Chhattisgarh'],
    languages: ['hi-IN', 'en-IN'],
    timezone: 'Asia/Kolkata',
    businessHours: { start: 9, end: 18 },
    holidays: CENTRAL_INDIA_HOLIDAYS,
  },
};

// State to Region mapping
export const STATE_TO_REGION: Record<string, string> = {};
Object.entries(INDIA_REGIONS).forEach(([regionCode, region]) => {
  region.states.forEach(state => {
    STATE_TO_REGION[state.toLowerCase()] = regionCode;
  });
});

// Phone prefix to state mapping (more comprehensive)
export const PHONE_PREFIX_TO_STATE: Record<string, string> = {
  // Landline STD codes
  '011': 'Delhi',
  '022': 'Maharashtra', // Mumbai
  '033': 'West Bengal', // Kolkata
  '040': 'Telangana', // Hyderabad
  '044': 'Tamil Nadu', // Chennai
  '080': 'Karnataka', // Bangalore
  '079': 'Gujarat', // Ahmedabad
  '0120': 'Uttar Pradesh', // Noida
  '0124': 'Haryana', // Gurgaon
  '020': 'Maharashtra', // Pune
  '0172': 'Punjab', // Chandigarh
  '0141': 'Rajasthan', // Jaipur
  '0755': 'Madhya Pradesh', // Bhopal
  '0471': 'Kerala', // Thiruvananthapuram
  '0484': 'Kerala', // Kochi
  '0891': 'Andhra Pradesh', // Visakhapatnam
  '0866': 'Andhra Pradesh', // Vijayawada
  '0821': 'Karnataka', // Mysore
  '0422': 'Tamil Nadu', // Coimbatore
  '0452': 'Tamil Nadu', // Madurai
  '0657': 'Jharkhand', // Jamshedpur
  '0612': 'Bihar', // Patna
  '0674': 'Odisha', // Bhubaneswar
  '0361': 'Assam', // Guwahati
};

// India public holidays 2024-2025
export const INDIA_NATIONAL_HOLIDAYS = [
  '2024-01-26', // Republic Day
  '2024-03-25', // Holi
  '2024-04-11', // Eid ul-Fitr
  '2024-04-17', // Ram Navami
  '2024-05-23', // Buddha Purnima
  '2024-06-17', // Eid ul-Adha
  '2024-07-17', // Muharram
  '2024-08-15', // Independence Day
  '2024-08-26', // Janmashtami
  '2024-10-02', // Gandhi Jayanti
  '2024-10-12', // Dussehra
  '2024-10-31', // Diwali
  '2024-11-01', // Diwali Holiday
  '2024-11-15', // Guru Nanak Jayanti
  '2024-12-25', // Christmas
  '2025-01-26', // Republic Day
  '2025-03-14', // Holi
  '2025-08-15', // Independence Day
  '2025-10-02', // Gandhi Jayanti
];

class IndiaRoutingService {
  // Get region from state name
  getRegionFromState(state: string): IndiaRegion | null {
    const normalizedState = state.toLowerCase().trim();
    const regionCode = STATE_TO_REGION[normalizedState];
    return regionCode ? INDIA_REGIONS[regionCode] : null;
  }

  // Get region from phone number
  getRegionFromPhone(phone: string): { region: IndiaRegion | null; state: string | null } {
    const digits = phone.replace(/\D/g, '');

    // Remove country code
    let normalized = digits;
    if (digits.startsWith('91')) {
      normalized = digits.substring(2);
    } else if (digits.startsWith('0')) {
      normalized = digits.substring(1);
    }

    // Check STD codes for landlines
    for (const [prefix, state] of Object.entries(PHONE_PREFIX_TO_STATE)) {
      const checkPrefix = prefix.startsWith('0') ? prefix.substring(1) : prefix;
      if (normalized.startsWith(checkPrefix)) {
        const region = this.getRegionFromState(state);
        return { region, state };
      }
    }

    // Mobile number analysis (approximate based on operator distribution)
    if (normalized.length === 10) {
      const mobilePrefix = normalized.substring(0, 2);
      const mobileState = this.getStateFromMobilePrefix(mobilePrefix);
      if (mobileState) {
        const region = this.getRegionFromState(mobileState);
        return { region, state: mobileState };
      }
    }

    return { region: null, state: null };
  }

  // Get state from mobile prefix (approximate)
  private getStateFromMobilePrefix(prefix: string): string | null {
    const prefixMap: Record<string, string> = {
      '70': 'Multiple',
      '72': 'Gujarat',
      '73': 'Maharashtra',
      '74': 'Karnataka',
      '75': 'Andhra Pradesh',
      '76': 'Kerala',
      '77': 'Tamil Nadu',
      '78': 'Delhi',
      '79': 'Maharashtra',
      '80': 'Karnataka',
      '81': 'Delhi',
      '82': 'Maharashtra',
      '83': 'West Bengal',
      '84': 'Uttar Pradesh',
      '85': 'Uttar Pradesh',
      '86': 'Telangana',
      '87': 'Rajasthan',
      '88': 'Punjab',
      '89': 'Bihar',
      '94': 'Tamil Nadu',
      '95': 'Kerala',
      '97': 'Karnataka',
      '98': 'Delhi',
      '99': 'Delhi',
    };
    return prefixMap[prefix] || null;
  }

  // Get recommended language for a phone number
  getRecommendedLanguage(phone: string, preferredLanguage?: string): string {
    // If user has preferred language, use it
    if (preferredLanguage) {
      return preferredLanguage;
    }

    // Try to detect from phone number
    const { region } = this.getRegionFromPhone(phone);
    if (region && region.languages.length > 0) {
      return region.languages[0];
    }

    // Default to English (India)
    return 'en-IN';
  }

  // Check if current time is within business hours for a region
  isWithinBusinessHours(regionCode: string = 'NORTH'): boolean {
    const region = INDIA_REGIONS[regionCode] || INDIA_REGIONS.NORTH;
    const now = new Date();

    // Convert to IST
    const istOffset = 5.5 * 60; // IST is UTC+5:30
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcTime + (istOffset * 60000));

    const currentHour = istTime.getHours();
    const currentDay = istTime.getDay();

    // Check if weekend (Sunday = 0, Saturday = 6)
    if (currentDay === 0) return false; // Sunday closed
    // Saturday might be half day
    if (currentDay === 6 && currentHour >= 14) return false;

    // Check business hours
    return currentHour >= region.businessHours.start && currentHour < region.businessHours.end;
  }

  // Check if today is a holiday (national or regional)
  isHoliday(date: Date = new Date(), regionCode?: string): boolean {
    const dateStr = date.toISOString().split('T')[0];

    // Check national holidays first
    if (INDIA_NATIONAL_HOLIDAYS.includes(dateStr)) {
      return true;
    }

    // Check regional holidays if region is specified
    if (regionCode && INDIA_REGIONS[regionCode]) {
      return INDIA_REGIONS[regionCode].holidays.includes(dateStr);
    }

    // Check all regional holidays if no specific region
    for (const region of Object.values(INDIA_REGIONS)) {
      if (region.holidays.includes(dateStr)) {
        return true;
      }
    }

    return false;
  }

  // Get upcoming holidays for a region
  getUpcomingHolidays(regionCode: string = 'NORTH', limit: number = 5): Array<{ date: string; isNational: boolean }> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const region = INDIA_REGIONS[regionCode] || INDIA_REGIONS.NORTH;
    const allHolidays: Array<{ date: string; isNational: boolean }> = [];

    // Add national holidays
    for (const date of INDIA_NATIONAL_HOLIDAYS) {
      if (date >= todayStr) {
        allHolidays.push({ date, isNational: true });
      }
    }

    // Add regional holidays
    for (const date of region.holidays) {
      if (date >= todayStr && !allHolidays.find(h => h.date === date)) {
        allHolidays.push({ date, isNational: false });
      }
    }

    // Sort by date and return limited results
    return allHolidays
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, limit);
  }

  // Get best time to call based on region
  getBestCallTime(regionCode: string = 'NORTH'): { start: string; end: string; timezone: string } {
    const region = INDIA_REGIONS[regionCode] || INDIA_REGIONS.NORTH;
    return {
      start: `${region.businessHours.start}:00`,
      end: `${region.businessHours.end}:00`,
      timezone: region.timezone,
    };
  }

  // Get all supported languages
  getAllLanguages(): Array<{ code: string; name: string; region: string }> {
    return [
      { code: 'en-IN', name: 'English (India)', region: 'ALL' },
      { code: 'hi-IN', name: 'Hindi', region: 'NORTH, CENTRAL' },
      { code: 'ta-IN', name: 'Tamil', region: 'SOUTH' },
      { code: 'te-IN', name: 'Telugu', region: 'SOUTH' },
      { code: 'kn-IN', name: 'Kannada', region: 'SOUTH' },
      { code: 'ml-IN', name: 'Malayalam', region: 'SOUTH' },
      { code: 'mr-IN', name: 'Marathi', region: 'WEST' },
      { code: 'gu-IN', name: 'Gujarati', region: 'WEST' },
      { code: 'bn-IN', name: 'Bengali', region: 'EAST' },
      { code: 'pa-IN', name: 'Punjabi', region: 'NORTH' },
    ];
  }

  // Get all regions
  getAllRegions(): IndiaRegion[] {
    return Object.values(INDIA_REGIONS);
  }

  // Route call to appropriate regional number/agent
  async getRegionalRoutingInfo(phone: string): Promise<{
    region: string;
    state: string | null;
    language: string;
    withinBusinessHours: boolean;
    isHoliday: boolean;
    upcomingHolidays: Array<{ date: string; isNational: boolean }>;
    recommendedAgent?: string;
  }> {
    const { region, state } = this.getRegionFromPhone(phone);
    const regionCode = region?.code || 'NORTH';
    const language = this.getRecommendedLanguage(phone);

    return {
      region: regionCode,
      state,
      language,
      withinBusinessHours: this.isWithinBusinessHours(regionCode),
      isHoliday: this.isHoliday(new Date(), regionCode),
      upcomingHolidays: this.getUpcomingHolidays(regionCode, 3),
    };
  }

  // Format phone number for India
  formatIndianNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');

    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (digits.startsWith('0') && digits.length === 11) {
      return `+91${digits.substring(1)}`;
    }
    if (digits.startsWith('91') && digits.length === 12) {
      return `+${digits}`;
    }
    if (digits.startsWith('+91')) {
      return digits;
    }

    return phone;
  }

  // Validate Indian phone number
  isValidIndianNumber(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');

    // Mobile: 10 digits starting with 6-9
    if (digits.length === 10 && /^[6-9]/.test(digits)) {
      return true;
    }

    // With country code
    if (digits.startsWith('91') && digits.length === 12 && /^91[6-9]/.test(digits)) {
      return true;
    }

    // Landline with STD
    if (digits.startsWith('0') && digits.length >= 10 && digits.length <= 11) {
      return true;
    }

    return false;
  }
}

export const indiaRoutingService = new IndiaRoutingService();
export default indiaRoutingService;
