/**
 * Comprehensive College Data for India
 * Source: AICTE, UGC, NIRF Rankings
 * This is sample data - in production, integrate with actual APIs
 */

export interface CollegeData {
  name: string;
  shortName?: string;
  collegeType: 'ENGINEERING' | 'MEDICAL' | 'ARTS' | 'COMMERCE' | 'SCIENCE' | 'POLYTECHNIC' | 'ITI' | 'OTHER';
  institutionStatus: 'UNIVERSITY' | 'AUTONOMOUS' | 'AFFILIATED' | 'DEEMED' | 'STANDALONE';
  address: string;
  city: string;
  district: string;
  state: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  establishedYear?: number;
  studentStrength?: number;
  coursesOffered?: string[];
}

export const collegesByState: Record<string, CollegeData[]> = {
  'Karnataka': [
    // Top Engineering Colleges
    { name: 'Indian Institute of Science', shortName: 'IISc', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'CV Raman Road', city: 'Bangalore', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560012', website: 'www.iisc.ac.in', establishedYear: 1909, studentStrength: 4000 },
    { name: 'National Institute of Technology Karnataka', shortName: 'NITK', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Surathkal', city: 'Mangalore', district: 'Dakshina Kannada', state: 'Karnataka', pincode: '575025', website: 'www.nitk.ac.in', establishedYear: 1960, studentStrength: 6000 },
    { name: 'RV College of Engineering', shortName: 'RVCE', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Mysore Road', city: 'Bangalore', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560059', website: 'www.rvce.edu.in', establishedYear: 1963, studentStrength: 5000 },
    { name: 'BMS College of Engineering', shortName: 'BMSCE', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Bull Temple Road', city: 'Bangalore', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560019', website: 'www.bmsce.ac.in', establishedYear: 1946, studentStrength: 4500 },
    { name: 'PES University', shortName: 'PESU', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: '100 Feet Ring Road, BSK 3rd Stage', city: 'Bangalore', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560085', website: 'www.pes.edu', establishedYear: 2013, studentStrength: 8000 },
    { name: 'MS Ramaiah Institute of Technology', shortName: 'MSRIT', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'MSR Nagar', city: 'Bangalore', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560054', website: 'www.msrit.edu', establishedYear: 1962, studentStrength: 5500 },
    { name: 'Manipal Institute of Technology', shortName: 'MIT', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'Manipal', city: 'Manipal', district: 'Udupi', state: 'Karnataka', pincode: '576104', website: 'www.manipal.edu', establishedYear: 1957, studentStrength: 7000 },
    { name: 'JSS Science and Technology University', shortName: 'JSSSTU', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'JSS Campus', city: 'Mysore', district: 'Mysuru', state: 'Karnataka', pincode: '570006', website: 'www.jssstuniv.in', establishedYear: 1963, studentStrength: 4000 },
    { name: 'Bangalore Institute of Technology', shortName: 'BIT', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'KR Road', city: 'Bangalore', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560004', website: 'www.bit-bangalore.edu.in', establishedYear: 1979, studentStrength: 3500 },
    { name: 'Sir M Visvesvaraya Institute of Technology', shortName: 'Sir MVIT', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Krishnadevaraya Nagar', city: 'Bangalore', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '562157', website: 'www.sirmvit.edu', establishedYear: 1986, studentStrength: 3000 },
    { name: 'Dayananda Sagar College of Engineering', shortName: 'DSCE', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Shavige Malleshwara Hills', city: 'Bangalore', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560078', website: 'www.dsce.edu.in', establishedYear: 1979, studentStrength: 4000 },
    { name: 'New Horizon College of Engineering', shortName: 'NHCE', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Outer Ring Road, Marathahalli', city: 'Bangalore', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560103', website: 'www.newhorizonindia.edu', establishedYear: 2001, studentStrength: 3500 },
    // Universities
    { name: 'Bangalore University', shortName: 'BU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Jnana Bharathi', city: 'Bangalore', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560056', website: 'www.bangaloreuniversity.ac.in', establishedYear: 1964, studentStrength: 50000 },
    { name: 'University of Mysore', shortName: 'UOM', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Crawford Hall', city: 'Mysore', district: 'Mysuru', state: 'Karnataka', pincode: '570005', website: 'www.uni-mysore.ac.in', establishedYear: 1916, studentStrength: 40000 },
    { name: 'Visvesvaraya Technological University', shortName: 'VTU', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Jnana Sangama', city: 'Belgaum', district: 'Belagavi', state: 'Karnataka', pincode: '590018', website: 'www.vtu.ac.in', establishedYear: 1998, studentStrength: 100000 },
    // Medical Colleges
    { name: 'Bangalore Medical College', shortName: 'BMC', collegeType: 'MEDICAL', institutionStatus: 'AUTONOMOUS', address: 'Fort', city: 'Bangalore', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560002', website: 'www.bmcri.org', establishedYear: 1955, studentStrength: 1500 },
    { name: 'Kasturba Medical College', shortName: 'KMC', collegeType: 'MEDICAL', institutionStatus: 'DEEMED', address: 'Manipal', city: 'Manipal', district: 'Udupi', state: 'Karnataka', pincode: '576104', website: 'www.manipal.edu/kmc', establishedYear: 1953, studentStrength: 2500 },
  ],

  'Tamil Nadu': [
    // IITs and NITs
    { name: 'Indian Institute of Technology Madras', shortName: 'IIT Madras', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'IIT P.O.', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pincode: '600036', website: 'www.iitm.ac.in', establishedYear: 1959, studentStrength: 10000 },
    { name: 'National Institute of Technology Tiruchirappalli', shortName: 'NIT Trichy', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Tanjore Main Road', city: 'Tiruchirappalli', district: 'Tiruchirappalli', state: 'Tamil Nadu', pincode: '620015', website: 'www.nitt.edu', establishedYear: 1964, studentStrength: 6000 },
    // Top Private Universities
    { name: 'VIT University', shortName: 'VIT', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'VIT Campus', city: 'Vellore', district: 'Vellore', state: 'Tamil Nadu', pincode: '632014', website: 'www.vit.ac.in', establishedYear: 1984, studentStrength: 25000 },
    { name: 'SRM Institute of Science and Technology', shortName: 'SRMIST', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'SRM Nagar, Kattankulathur', city: 'Chennai', district: 'Chengalpattu', state: 'Tamil Nadu', pincode: '603203', website: 'www.srmist.edu.in', establishedYear: 1985, studentStrength: 20000 },
    { name: 'Amrita Vishwa Vidyapeetham', shortName: 'Amrita', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'Ettimadai', city: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', pincode: '641112', website: 'www.amrita.edu', establishedYear: 2003, studentStrength: 15000 },
    // State Universities
    { name: 'Anna University', shortName: 'AU', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Sardar Patel Road, Guindy', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pincode: '600025', website: 'www.annauniv.edu', establishedYear: 1978, studentStrength: 80000 },
    { name: 'University of Madras', shortName: 'UNOM', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Chepauk', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pincode: '600005', website: 'www.unom.ac.in', establishedYear: 1857, studentStrength: 70000 },
    // Top Engineering Colleges
    { name: 'PSG College of Technology', shortName: 'PSG Tech', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Peelamedu', city: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', pincode: '641004', website: 'www.psgtech.edu', establishedYear: 1951, studentStrength: 6000 },
    { name: 'College of Engineering Guindy', shortName: 'CEG', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Anna University Campus', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pincode: '600025', website: 'www.annauniv.edu/ceg', establishedYear: 1794, studentStrength: 5000 },
    { name: 'Thiagarajar College of Engineering', shortName: 'TCE', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Thirupparankundram', city: 'Madurai', district: 'Madurai', state: 'Tamil Nadu', pincode: '625015', website: 'www.tce.edu', establishedYear: 1957, studentStrength: 3500 },
    { name: 'SSN College of Engineering', shortName: 'SSNCE', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Kalavakkam', city: 'Chennai', district: 'Chengalpattu', state: 'Tamil Nadu', pincode: '603110', website: 'www.ssn.edu.in', establishedYear: 1996, studentStrength: 4000 },
    { name: 'Kumaraguru College of Technology', shortName: 'KCT', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Chinnavedampatti', city: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', pincode: '641049', website: 'www.kct.ac.in', establishedYear: 1984, studentStrength: 4500 },
    // Medical Colleges
    { name: 'Madras Medical College', shortName: 'MMC', collegeType: 'MEDICAL', institutionStatus: 'AUTONOMOUS', address: 'EVR Periyar Salai', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pincode: '600003', website: 'www.mmc.tn.gov.in', establishedYear: 1835, studentStrength: 2000 },
    { name: 'Christian Medical College', shortName: 'CMC', collegeType: 'MEDICAL', institutionStatus: 'DEEMED', address: 'Ida Scudder Road', city: 'Vellore', district: 'Vellore', state: 'Tamil Nadu', pincode: '632004', website: 'www.cmch-vellore.edu', establishedYear: 1900, studentStrength: 2500 },
  ],

  'Telangana': [
    { name: 'Indian Institute of Technology Hyderabad', shortName: 'IIT Hyderabad', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Kandi', city: 'Hyderabad', district: 'Sangareddy', state: 'Telangana', pincode: '502285', website: 'www.iith.ac.in', establishedYear: 2008, studentStrength: 3500 },
    { name: 'IIIT Hyderabad', shortName: 'IIITH', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'Gachibowli', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', pincode: '500032', website: 'www.iiit.ac.in', establishedYear: 1998, studentStrength: 2500 },
    { name: 'BITS Pilani Hyderabad Campus', shortName: 'BITS Hyderabad', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'Jawahar Nagar', city: 'Hyderabad', district: 'Medchal-Malkajgiri', state: 'Telangana', pincode: '500078', website: 'www.bits-pilani.ac.in', establishedYear: 2008, studentStrength: 4000 },
    { name: 'JNTU Hyderabad', shortName: 'JNTUH', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Kukatpally', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', pincode: '500085', website: 'www.jntuh.ac.in', establishedYear: 1972, studentStrength: 100000 },
    { name: 'Osmania University', shortName: 'OU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Amberpet', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', pincode: '500007', website: 'www.osmania.ac.in', establishedYear: 1918, studentStrength: 80000 },
    { name: 'University of Hyderabad', shortName: 'UoH', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Gachibowli', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', pincode: '500046', website: 'www.uohyd.ac.in', establishedYear: 1974, studentStrength: 5000 },
    { name: 'Chaitanya Bharathi Institute of Technology', shortName: 'CBIT', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Gandipet', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', pincode: '500075', website: 'www.cbit.ac.in', establishedYear: 1979, studentStrength: 4000 },
    { name: 'Vasavi College of Engineering', shortName: 'VCE', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Ibrahimbagh', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', pincode: '500031', website: 'www.vce.ac.in', establishedYear: 1981, studentStrength: 3500 },
    { name: 'CVR College of Engineering', shortName: 'CVRCE', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Vastunagar, Mangalpalli', city: 'Hyderabad', district: 'Rangareddy', state: 'Telangana', pincode: '501510', website: 'www.cvr.ac.in', establishedYear: 2001, studentStrength: 3000 },
    { name: 'Malla Reddy College of Engineering', shortName: 'MRCE', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Maisammaguda', city: 'Hyderabad', district: 'Medchal-Malkajgiri', state: 'Telangana', pincode: '500100', website: 'www.mrce.in', establishedYear: 2004, studentStrength: 4500 },
  ],

  'Andhra Pradesh': [
    { name: 'Indian Institute of Technology Tirupati', shortName: 'IIT Tirupati', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Renigunta Road', city: 'Tirupati', district: 'Tirupati', state: 'Andhra Pradesh', pincode: '517506', website: 'www.iittp.ac.in', establishedYear: 2015, studentStrength: 1500 },
    { name: 'NIT Andhra Pradesh', shortName: 'NIT AP', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Tadepalligudem', city: 'Tadepalligudem', district: 'West Godavari', state: 'Andhra Pradesh', pincode: '534101', website: 'www.nitandhra.ac.in', establishedYear: 2015, studentStrength: 1200 },
    { name: 'IIIT Sri City', shortName: 'IIIT Sri City', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Sri City', city: 'Sri City', district: 'Chittoor', state: 'Andhra Pradesh', pincode: '517646', website: 'www.iiits.ac.in', establishedYear: 2013, studentStrength: 800 },
    { name: 'Andhra University', shortName: 'AU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Waltair', city: 'Visakhapatnam', district: 'Visakhapatnam', state: 'Andhra Pradesh', pincode: '530003', website: 'www.andhrauniversity.edu.in', establishedYear: 1926, studentStrength: 50000 },
    { name: 'Sri Venkateswara University', shortName: 'SVU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'SVU Campus', city: 'Tirupati', district: 'Tirupati', state: 'Andhra Pradesh', pincode: '517502', website: 'www.svuniversity.edu.in', establishedYear: 1954, studentStrength: 40000 },
    { name: 'JNTUK Kakinada', shortName: 'JNTUK', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Kakinada', city: 'Kakinada', district: 'Kakinada', state: 'Andhra Pradesh', pincode: '533003', website: 'www.jntuk.edu.in', establishedYear: 2008, studentStrength: 80000 },
    { name: 'JNTU Anantapur', shortName: 'JNTUA', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Anantapur', city: 'Anantapur', district: 'Anantapur', state: 'Andhra Pradesh', pincode: '515002', website: 'www.jntua.ac.in', establishedYear: 2008, studentStrength: 70000 },
    { name: 'Vignan University', shortName: 'Vignan', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'Vadlamudi', city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', pincode: '522213', website: 'www.vignan.ac.in', establishedYear: 2008, studentStrength: 8000 },
    { name: 'KL University', shortName: 'KLU', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'Green Fields', city: 'Vaddeswaram', district: 'Guntur', state: 'Andhra Pradesh', pincode: '522502', website: 'www.kluniversity.in', establishedYear: 2009, studentStrength: 15000 },
    { name: 'SRM University AP', shortName: 'SRM AP', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'Neerukonda', city: 'Mangalagiri', district: 'Guntur', state: 'Andhra Pradesh', pincode: '522240', website: 'www.srmap.edu.in', establishedYear: 2017, studentStrength: 5000 },
  ],

  'Maharashtra': [
    { name: 'Indian Institute of Technology Bombay', shortName: 'IIT Bombay', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Powai', city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra', pincode: '400076', website: 'www.iitb.ac.in', establishedYear: 1958, studentStrength: 12000 },
    { name: 'Veermata Jijabai Technological Institute', shortName: 'VJTI', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Matunga', city: 'Mumbai', district: 'Mumbai City', state: 'Maharashtra', pincode: '400019', website: 'www.vjti.ac.in', establishedYear: 1887, studentStrength: 4000 },
    { name: 'College of Engineering Pune', shortName: 'COEP', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Shivajinagar', city: 'Pune', district: 'Pune', state: 'Maharashtra', pincode: '411005', website: 'www.coep.org.in', establishedYear: 1854, studentStrength: 3500 },
    { name: 'Institute of Chemical Technology', shortName: 'ICT', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'Matunga', city: 'Mumbai', district: 'Mumbai City', state: 'Maharashtra', pincode: '400019', website: 'www.ictmumbai.edu.in', establishedYear: 1933, studentStrength: 3000 },
    { name: 'Savitribai Phule Pune University', shortName: 'SPPU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Ganeshkhind', city: 'Pune', district: 'Pune', state: 'Maharashtra', pincode: '411007', website: 'www.unipune.ac.in', establishedYear: 1949, studentStrength: 100000 },
    { name: 'University of Mumbai', shortName: 'MU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Fort', city: 'Mumbai', district: 'Mumbai City', state: 'Maharashtra', pincode: '400032', website: 'www.mu.ac.in', establishedYear: 1857, studentStrength: 150000 },
    { name: 'Symbiosis International University', shortName: 'SIU', collegeType: 'OTHER', institutionStatus: 'DEEMED', address: 'Lavale', city: 'Pune', district: 'Pune', state: 'Maharashtra', pincode: '412115', website: 'www.siu.edu.in', establishedYear: 2002, studentStrength: 20000 },
    { name: 'MIT World Peace University', shortName: 'MIT-WPU', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'Kothrud', city: 'Pune', district: 'Pune', state: 'Maharashtra', pincode: '411038', website: 'www.mitwpu.edu.in', establishedYear: 1983, studentStrength: 15000 },
    { name: 'Vishwakarma Institute of Technology', shortName: 'VIT Pune', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Bibwewadi', city: 'Pune', district: 'Pune', state: 'Maharashtra', pincode: '411037', website: 'www.vit.edu', establishedYear: 1983, studentStrength: 5000 },
    { name: 'Walchand College of Engineering', shortName: 'WCE', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Vishrambag', city: 'Sangli', district: 'Sangli', state: 'Maharashtra', pincode: '416415', website: 'www.walchand.edu', establishedYear: 1947, studentStrength: 2500 },
  ],

  'Delhi': [
    { name: 'Indian Institute of Technology Delhi', shortName: 'IIT Delhi', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Hauz Khas', city: 'New Delhi', district: 'South Delhi', state: 'Delhi', pincode: '110016', website: 'www.iitd.ac.in', establishedYear: 1961, studentStrength: 10000 },
    { name: 'Delhi Technological University', shortName: 'DTU', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Bawana Road', city: 'New Delhi', district: 'North West Delhi', state: 'Delhi', pincode: '110042', website: 'www.dtu.ac.in', establishedYear: 1941, studentStrength: 8000 },
    { name: 'Netaji Subhas University of Technology', shortName: 'NSUT', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Dwarka Sector 3', city: 'New Delhi', district: 'South West Delhi', state: 'Delhi', pincode: '110078', website: 'www.nsut.ac.in', establishedYear: 1983, studentStrength: 6000 },
    { name: 'IIIT Delhi', shortName: 'IIITD', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Okhla Phase III', city: 'New Delhi', district: 'South East Delhi', state: 'Delhi', pincode: '110020', website: 'www.iiitd.ac.in', establishedYear: 2008, studentStrength: 2500 },
    { name: 'Jamia Millia Islamia', shortName: 'JMI', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Jamia Nagar', city: 'New Delhi', district: 'South East Delhi', state: 'Delhi', pincode: '110025', website: 'www.jmi.ac.in', establishedYear: 1920, studentStrength: 25000 },
    { name: 'University of Delhi', shortName: 'DU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'North Campus', city: 'New Delhi', district: 'Central Delhi', state: 'Delhi', pincode: '110007', website: 'www.du.ac.in', establishedYear: 1922, studentStrength: 200000 },
    { name: 'Jawaharlal Nehru University', shortName: 'JNU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'New Mehrauli Road', city: 'New Delhi', district: 'South West Delhi', state: 'Delhi', pincode: '110067', website: 'www.jnu.ac.in', establishedYear: 1969, studentStrength: 8000 },
    { name: 'Ambedkar University Delhi', shortName: 'AUD', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Kashmere Gate', city: 'New Delhi', district: 'Central Delhi', state: 'Delhi', pincode: '110006', website: 'www.aud.ac.in', establishedYear: 2007, studentStrength: 3000 },
    { name: 'IGDTUW', shortName: 'IGDTUW', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Kashmere Gate', city: 'New Delhi', district: 'Central Delhi', state: 'Delhi', pincode: '110006', website: 'www.igdtuw.ac.in', establishedYear: 1998, studentStrength: 3000 },
  ],

  'Uttar Pradesh': [
    { name: 'Indian Institute of Technology Kanpur', shortName: 'IIT Kanpur', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Kalyanpur', city: 'Kanpur', district: 'Kanpur Nagar', state: 'Uttar Pradesh', pincode: '208016', website: 'www.iitk.ac.in', establishedYear: 1959, studentStrength: 8000 },
    { name: 'Indian Institute of Technology BHU', shortName: 'IIT BHU', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'BHU Campus', city: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh', pincode: '221005', website: 'www.iitbhu.ac.in', establishedYear: 1919, studentStrength: 6000 },
    { name: 'Indian Institute of Technology Roorkee', shortName: 'IIT Roorkee', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Roorkee', city: 'Roorkee', district: 'Haridwar', state: 'Uttar Pradesh', pincode: '247667', website: 'www.iitr.ac.in', establishedYear: 1847, studentStrength: 8000 },
    { name: 'IIIT Allahabad', shortName: 'IIITA', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Jhalwa', city: 'Prayagraj', district: 'Prayagraj', state: 'Uttar Pradesh', pincode: '211015', website: 'www.iiita.ac.in', establishedYear: 1999, studentStrength: 3500 },
    { name: 'Banaras Hindu University', shortName: 'BHU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Lanka', city: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh', pincode: '221005', website: 'www.bhu.ac.in', establishedYear: 1916, studentStrength: 35000 },
    { name: 'Aligarh Muslim University', shortName: 'AMU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Aligarh', city: 'Aligarh', district: 'Aligarh', state: 'Uttar Pradesh', pincode: '202002', website: 'www.amu.ac.in', establishedYear: 1875, studentStrength: 30000 },
    { name: 'University of Lucknow', shortName: 'LU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Badshah Bagh', city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', pincode: '226007', website: 'www.lkouniv.ac.in', establishedYear: 1920, studentStrength: 50000 },
    { name: 'MNNIT Allahabad', shortName: 'MNNIT', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Teliyarganj', city: 'Prayagraj', district: 'Prayagraj', state: 'Uttar Pradesh', pincode: '211004', website: 'www.mnnit.ac.in', establishedYear: 1961, studentStrength: 5000 },
    { name: 'Amity University', shortName: 'Amity', collegeType: 'OTHER', institutionStatus: 'DEEMED', address: 'Sector 125', city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', pincode: '201313', website: 'www.amity.edu', establishedYear: 2005, studentStrength: 30000 },
    { name: 'Shiv Nadar University', shortName: 'SNU', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'Greater Noida', city: 'Greater Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', pincode: '201314', website: 'www.snu.edu.in', establishedYear: 2011, studentStrength: 4000 },
  ],

  'Kerala': [
    { name: 'Indian Institute of Technology Palakkad', shortName: 'IIT Palakkad', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Ahalia Campus', city: 'Palakkad', district: 'Palakkad', state: 'Kerala', pincode: '678557', website: 'www.iitpkd.ac.in', establishedYear: 2015, studentStrength: 1000 },
    { name: 'NIT Calicut', shortName: 'NITC', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'NIT Campus P.O.', city: 'Kozhikode', district: 'Kozhikode', state: 'Kerala', pincode: '673601', website: 'www.nitc.ac.in', establishedYear: 1961, studentStrength: 5000 },
    { name: 'IIITM Kerala', shortName: 'IIITMK', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Technopark Campus', city: 'Thiruvananthapuram', district: 'Thiruvananthapuram', state: 'Kerala', pincode: '695581', website: 'www.iiitmk.ac.in', establishedYear: 2000, studentStrength: 600 },
    { name: 'Cochin University of Science and Technology', shortName: 'CUSAT', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Kalamassery', city: 'Kochi', district: 'Ernakulam', state: 'Kerala', pincode: '682022', website: 'www.cusat.ac.in', establishedYear: 1971, studentStrength: 8000 },
    { name: 'University of Kerala', shortName: 'KU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Thiruvananthapuram', city: 'Thiruvananthapuram', district: 'Thiruvananthapuram', state: 'Kerala', pincode: '695034', website: 'www.keralauniversity.ac.in', establishedYear: 1937, studentStrength: 50000 },
    { name: 'APJ Abdul Kalam Technological University', shortName: 'KTU', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'CET Campus', city: 'Thiruvananthapuram', district: 'Thiruvananthapuram', state: 'Kerala', pincode: '695016', website: 'www.ktu.edu.in', establishedYear: 2014, studentStrength: 100000 },
    { name: 'College of Engineering Trivandrum', shortName: 'CET', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Sreekaryam', city: 'Thiruvananthapuram', district: 'Thiruvananthapuram', state: 'Kerala', pincode: '695016', website: 'www.cet.ac.in', establishedYear: 1939, studentStrength: 3000 },
    { name: 'Government Engineering College Thrissur', shortName: 'GECT', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Ramavarmapuram', city: 'Thrissur', district: 'Thrissur', state: 'Kerala', pincode: '680009', website: 'www.gectcr.ac.in', establishedYear: 1957, studentStrength: 2500 },
  ],

  'Gujarat': [
    { name: 'Indian Institute of Technology Gandhinagar', shortName: 'IIT Gandhinagar', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Palaj', city: 'Gandhinagar', district: 'Gandhinagar', state: 'Gujarat', pincode: '382355', website: 'www.iitgn.ac.in', establishedYear: 2008, studentStrength: 2500 },
    { name: 'Dhirubhai Ambani IICT', shortName: 'DA-IICT', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'Near Indroda Circle', city: 'Gandhinagar', district: 'Gandhinagar', state: 'Gujarat', pincode: '382007', website: 'www.daiict.ac.in', establishedYear: 2001, studentStrength: 2000 },
    { name: 'NID Ahmedabad', shortName: 'NID', collegeType: 'ARTS', institutionStatus: 'AUTONOMOUS', address: 'Paldi', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', pincode: '380007', website: 'www.nid.edu', establishedYear: 1961, studentStrength: 1000 },
    { name: 'SVNIT Surat', shortName: 'SVNIT', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Ichchhanath', city: 'Surat', district: 'Surat', state: 'Gujarat', pincode: '395007', website: 'www.svnit.ac.in', establishedYear: 1961, studentStrength: 4000 },
    { name: 'Gujarat Technological University', shortName: 'GTU', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Chandkheda', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', pincode: '382424', website: 'www.gtu.ac.in', establishedYear: 2007, studentStrength: 500000 },
    { name: 'Gujarat University', shortName: 'GU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'Navrangpura', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', pincode: '380009', website: 'www.gujaratuniversity.ac.in', establishedYear: 1949, studentStrength: 100000 },
    { name: 'Nirma University', shortName: 'NU', collegeType: 'ENGINEERING', institutionStatus: 'DEEMED', address: 'SG Highway', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', pincode: '382481', website: 'www.nirmauni.ac.in', establishedYear: 2003, studentStrength: 8000 },
    { name: 'PDPU Gandhinagar', shortName: 'PDPU', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Raisan', city: 'Gandhinagar', district: 'Gandhinagar', state: 'Gujarat', pincode: '382426', website: 'www.pdpu.ac.in', establishedYear: 2007, studentStrength: 4000 },
  ],

  'West Bengal': [
    { name: 'Indian Institute of Technology Kharagpur', shortName: 'IIT Kharagpur', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Kharagpur', city: 'Kharagpur', district: 'Paschim Medinipur', state: 'West Bengal', pincode: '721302', website: 'www.iitkgp.ac.in', establishedYear: 1951, studentStrength: 12000 },
    { name: 'Indian Statistical Institute', shortName: 'ISI', collegeType: 'SCIENCE', institutionStatus: 'DEEMED', address: 'Baranagar', city: 'Kolkata', district: 'North 24 Parganas', state: 'West Bengal', pincode: '700108', website: 'www.isical.ac.in', establishedYear: 1931, studentStrength: 2000 },
    { name: 'IIEST Shibpur', shortName: 'IIEST', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'Botanic Garden', city: 'Howrah', district: 'Howrah', state: 'West Bengal', pincode: '711103', website: 'www.iiests.ac.in', establishedYear: 1856, studentStrength: 4000 },
    { name: 'NIT Durgapur', shortName: 'NITD', collegeType: 'ENGINEERING', institutionStatus: 'AUTONOMOUS', address: 'MG Avenue', city: 'Durgapur', district: 'Paschim Bardhaman', state: 'West Bengal', pincode: '713209', website: 'www.nitdgp.ac.in', establishedYear: 1960, studentStrength: 4500 },
    { name: 'Jadavpur University', shortName: 'JU', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Jadavpur', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', pincode: '700032', website: 'www.jaduniv.edu.in', establishedYear: 1955, studentStrength: 12000 },
    { name: 'University of Calcutta', shortName: 'CU', collegeType: 'OTHER', institutionStatus: 'UNIVERSITY', address: 'College Street', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', pincode: '700073', website: 'www.caluniv.ac.in', establishedYear: 1857, studentStrength: 50000 },
    { name: 'Presidency University', shortName: 'PU', collegeType: 'SCIENCE', institutionStatus: 'UNIVERSITY', address: 'College Street', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', pincode: '700073', website: 'www.presiuniv.ac.in', establishedYear: 1817, studentStrength: 3000 },
    { name: 'WBUT', shortName: 'MAKAUT', collegeType: 'ENGINEERING', institutionStatus: 'UNIVERSITY', address: 'Salt Lake', city: 'Kolkata', district: 'North 24 Parganas', state: 'West Bengal', pincode: '700064', website: 'www.makautwb.ac.in', establishedYear: 2000, studentStrength: 200000 },
  ],
};

// Get all colleges for a state
export function getCollegesByState(state: string): CollegeData[] {
  return collegesByState[state] || [];
}

// Get colleges by state and district
export function getCollegesByDistrict(state: string, district: string): CollegeData[] {
  const stateColleges = collegesByState[state] || [];
  return stateColleges.filter(c => c.district.toLowerCase() === district.toLowerCase());
}

// Get all available states
export function getAvailableStates(): string[] {
  return Object.keys(collegesByState);
}

// Get total college count
export function getTotalCollegeCount(): number {
  let total = 0;
  for (const state of Object.keys(collegesByState)) {
    total += collegesByState[state].length;
  }
  return total;
}
