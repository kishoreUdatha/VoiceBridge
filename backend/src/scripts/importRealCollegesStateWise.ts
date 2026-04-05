/**
 * Import Real Colleges - State-wise with District Data
 * Uses curated list of actual Indian engineering colleges
 */

import { prisma } from '../config/database';

interface College {
  name: string;
  district: string;
  city: string;
  state: string;
  type?: string;
  pincode?: string;
}

// Real colleges data - curated from AICTE and public sources
const realColleges: Record<string, College[]> = {
  'Andhra Pradesh': [
    // Chittoor District
    { name: 'VEMU Institute of Technology', district: 'Chittoor', city: 'P. Kothakota', state: 'Andhra Pradesh', pincode: '517112' },
    { name: 'Sri Venkateswara College of Engineering', district: 'Chittoor', city: 'Tirupati', state: 'Andhra Pradesh' },
    { name: 'Sri Vidyanikethan Engineering College', district: 'Chittoor', city: 'Tirupati', state: 'Andhra Pradesh' },
    { name: 'Sree Vidyanikethan Engineering College', district: 'Chittoor', city: 'A.Rangampet', state: 'Andhra Pradesh' },
    { name: 'Annamacharya Institute of Technology and Sciences', district: 'Chittoor', city: 'Rajampet', state: 'Andhra Pradesh' },
    { name: 'G. Pullaiah College of Engineering and Technology', district: 'Chittoor', city: 'Kurnool', state: 'Andhra Pradesh' },
    // Guntur District
    { name: 'RVR & JC College of Engineering', district: 'Guntur', city: 'Guntur', state: 'Andhra Pradesh' },
    { name: 'Vignan\'s Foundation for Science Technology and Research', district: 'Guntur', city: 'Vadlamudi', state: 'Andhra Pradesh' },
    { name: 'KL University', district: 'Guntur', city: 'Vaddeswaram', state: 'Andhra Pradesh' },
    { name: 'Bapatla Engineering College', district: 'Guntur', city: 'Bapatla', state: 'Andhra Pradesh' },
    { name: 'Lakireddy Bali Reddy College of Engineering', district: 'Guntur', city: 'Mylavaram', state: 'Andhra Pradesh' },
    // Visakhapatnam District
    { name: 'Andhra University College of Engineering', district: 'Visakhapatnam', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { name: 'GITAM University', district: 'Visakhapatnam', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { name: 'Gayatri Vidya Parishad College of Engineering', district: 'Visakhapatnam', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { name: 'Raghu Engineering College', district: 'Visakhapatnam', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { name: 'Sanketika Vidya Parishad Engineering College', district: 'Visakhapatnam', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
    // Krishna District
    { name: 'Velagapudi Ramakrishna Siddhartha Engineering College', district: 'Krishna', city: 'Vijayawada', state: 'Andhra Pradesh' },
    { name: 'PVP Siddhartha Institute of Technology', district: 'Krishna', city: 'Vijayawada', state: 'Andhra Pradesh' },
    { name: 'Gudlavalleru Engineering College', district: 'Krishna', city: 'Gudlavalleru', state: 'Andhra Pradesh' },
    { name: 'Sir C R Reddy College of Engineering', district: 'Krishna', city: 'Eluru', state: 'Andhra Pradesh' },
    // East Godavari
    { name: 'Jawaharlal Nehru Technological University Kakinada', district: 'East Godavari', city: 'Kakinada', state: 'Andhra Pradesh' },
    { name: 'Aditya Engineering College', district: 'East Godavari', city: 'Surampalem', state: 'Andhra Pradesh' },
    { name: 'Pragati Engineering College', district: 'East Godavari', city: 'Surampalem', state: 'Andhra Pradesh' },
    // West Godavari
    { name: 'DNR College of Engineering and Technology', district: 'West Godavari', city: 'Bhimavaram', state: 'Andhra Pradesh' },
    { name: 'Sri Vasavi Engineering College', district: 'West Godavari', city: 'Tadepalligudem', state: 'Andhra Pradesh' },
    // Prakasam
    { name: 'Narasaraopeta Engineering College', district: 'Prakasam', city: 'Narasaraopet', state: 'Andhra Pradesh' },
    { name: 'QIS College of Engineering and Technology', district: 'Prakasam', city: 'Ongole', state: 'Andhra Pradesh' },
    // Nellore
    { name: 'Audisankara College of Engineering and Technology', district: 'Nellore', city: 'Nellore', state: 'Andhra Pradesh' },
    { name: 'Narayana Engineering College', district: 'Nellore', city: 'Nellore', state: 'Andhra Pradesh' },
    // Kadapa
    { name: 'JNTUA College of Engineering', district: 'Kadapa', city: 'Pulivendula', state: 'Andhra Pradesh' },
    { name: 'Rajiv Gandhi Memorial College of Engineering and Technology', district: 'Kadapa', city: 'Nandyal', state: 'Andhra Pradesh' },
    // Kurnool
    { name: 'JNTUA College of Engineering', district: 'Kurnool', city: 'Anantapur', state: 'Andhra Pradesh' },
    { name: 'G Pulla Reddy Engineering College', district: 'Kurnool', city: 'Kurnool', state: 'Andhra Pradesh' },
    // Anantapur
    { name: 'Jawaharlal Nehru Technological University Anantapur', district: 'Anantapur', city: 'Anantapur', state: 'Andhra Pradesh' },
    { name: 'Sri Krishnadevaraya University College of Engineering', district: 'Anantapur', city: 'Anantapur', state: 'Andhra Pradesh' },
    { name: 'Santhiram Engineering College', district: 'Anantapur', city: 'Nandyal', state: 'Andhra Pradesh' },
    // Srikakulam
    { name: 'Rajiv Gandhi University of Knowledge Technologies', district: 'Srikakulam', city: 'Srikakulam', state: 'Andhra Pradesh' },
    { name: 'Aditya Institute of Technology and Management', district: 'Srikakulam', city: 'Tekkali', state: 'Andhra Pradesh' },
  ],

  'Telangana': [
    // Hyderabad
    { name: 'Osmania University College of Engineering', district: 'Hyderabad', city: 'Hyderabad', state: 'Telangana' },
    { name: 'JNTU Hyderabad', district: 'Hyderabad', city: 'Hyderabad', state: 'Telangana' },
    { name: 'Chaitanya Bharathi Institute of Technology', district: 'Hyderabad', city: 'Hyderabad', state: 'Telangana' },
    { name: 'Vasavi College of Engineering', district: 'Hyderabad', city: 'Hyderabad', state: 'Telangana' },
    { name: 'CVR College of Engineering', district: 'Hyderabad', city: 'Ibrahimpatnam', state: 'Telangana' },
    { name: 'Gokaraju Rangaraju Institute of Engineering and Technology', district: 'Hyderabad', city: 'Hyderabad', state: 'Telangana' },
    { name: 'VNR Vignana Jyothi Institute of Engineering and Technology', district: 'Hyderabad', city: 'Hyderabad', state: 'Telangana' },
    { name: 'Muffakham Jah College of Engineering and Technology', district: 'Hyderabad', city: 'Hyderabad', state: 'Telangana' },
    { name: 'Matrusri Engineering College', district: 'Hyderabad', city: 'Hyderabad', state: 'Telangana' },
    { name: 'Methodist College of Engineering and Technology', district: 'Hyderabad', city: 'Hyderabad', state: 'Telangana' },
    // Rangareddy
    { name: 'BITS Pilani Hyderabad Campus', district: 'Rangareddy', city: 'Hyderabad', state: 'Telangana' },
    { name: 'IIIT Hyderabad', district: 'Rangareddy', city: 'Hyderabad', state: 'Telangana' },
    { name: 'ISB Hyderabad', district: 'Rangareddy', city: 'Hyderabad', state: 'Telangana' },
    { name: 'Mahindra University', district: 'Rangareddy', city: 'Hyderabad', state: 'Telangana' },
    { name: 'Anurag University', district: 'Rangareddy', city: 'Hyderabad', state: 'Telangana' },
    { name: 'MLR Institute of Technology', district: 'Rangareddy', city: 'Hyderabad', state: 'Telangana' },
    // Warangal
    { name: 'NIT Warangal', district: 'Warangal', city: 'Warangal', state: 'Telangana' },
    { name: 'Kakatiya Institute of Technology and Science', district: 'Warangal', city: 'Warangal', state: 'Telangana' },
    { name: 'SR Engineering College', district: 'Warangal', city: 'Warangal', state: 'Telangana' },
    { name: 'Vaagdevi College of Engineering', district: 'Warangal', city: 'Warangal', state: 'Telangana' },
    // Karimnagar
    { name: 'Sree Chaitanya College of Engineering', district: 'Karimnagar', city: 'Karimnagar', state: 'Telangana' },
    { name: 'Vaageswari College of Engineering', district: 'Karimnagar', city: 'Karimnagar', state: 'Telangana' },
    // Nizamabad
    { name: 'Keshav Memorial Institute of Technology', district: 'Nizamabad', city: 'Nizamabad', state: 'Telangana' },
    // Khammam
    { name: 'Vignan Institute of Technology and Science', district: 'Khammam', city: 'Khammam', state: 'Telangana' },
    // Medak
    { name: 'Guru Nanak Institutions Technical Campus', district: 'Medak', city: 'Ibrahimpatnam', state: 'Telangana' },
    { name: 'CMR College of Engineering and Technology', district: 'Medak', city: 'Kandlakoya', state: 'Telangana' },
  ],

  'Tamil Nadu': [
    // Chennai
    { name: 'IIT Madras', district: 'Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    { name: 'Anna University', district: 'Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    { name: 'College of Engineering Guindy', district: 'Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    { name: 'Madras Institute of Technology', district: 'Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    { name: 'SRM Institute of Science and Technology', district: 'Chennai', city: 'Kattankulathur', state: 'Tamil Nadu' },
    { name: 'Sathyabama Institute of Science and Technology', district: 'Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    { name: 'VIT Chennai', district: 'Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    { name: 'Sri Sivasubramaniya Nadar College of Engineering', district: 'Chennai', city: 'Kalavakkam', state: 'Tamil Nadu' },
    { name: 'Rajalakshmi Engineering College', district: 'Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    { name: 'Panimalar Engineering College', district: 'Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    { name: 'Saveetha Engineering College', district: 'Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    { name: 'St. Joseph\'s College of Engineering', district: 'Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    { name: 'Easwari Engineering College', district: 'Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    { name: 'Vel Tech Rangarajan Dr. Sagunthala R&D Institute of Science and Technology', district: 'Chennai', city: 'Chennai', state: 'Tamil Nadu' },
    // Vellore
    { name: 'VIT Vellore', district: 'Vellore', city: 'Vellore', state: 'Tamil Nadu' },
    { name: 'Vellore Institute of Technology', district: 'Vellore', city: 'Vellore', state: 'Tamil Nadu' },
    // Coimbatore
    { name: 'PSG College of Technology', district: 'Coimbatore', city: 'Coimbatore', state: 'Tamil Nadu' },
    { name: 'Coimbatore Institute of Technology', district: 'Coimbatore', city: 'Coimbatore', state: 'Tamil Nadu' },
    { name: 'Amrita Vishwa Vidyapeetham', district: 'Coimbatore', city: 'Coimbatore', state: 'Tamil Nadu' },
    { name: 'Kumaraguru College of Technology', district: 'Coimbatore', city: 'Coimbatore', state: 'Tamil Nadu' },
    { name: 'Sri Krishna College of Engineering and Technology', district: 'Coimbatore', city: 'Coimbatore', state: 'Tamil Nadu' },
    { name: 'Bannari Amman Institute of Technology', district: 'Coimbatore', city: 'Sathyamangalam', state: 'Tamil Nadu' },
    { name: 'Karpagam College of Engineering', district: 'Coimbatore', city: 'Coimbatore', state: 'Tamil Nadu' },
    { name: 'Sri Ramakrishna Engineering College', district: 'Coimbatore', city: 'Coimbatore', state: 'Tamil Nadu' },
    // Madurai
    { name: 'Thiagarajar College of Engineering', district: 'Madurai', city: 'Madurai', state: 'Tamil Nadu' },
    { name: 'Mepco Schlenk Engineering College', district: 'Madurai', city: 'Sivakasi', state: 'Tamil Nadu' },
    { name: 'Velammal College of Engineering and Technology', district: 'Madurai', city: 'Madurai', state: 'Tamil Nadu' },
    // Tiruchirappalli
    { name: 'NIT Tiruchirappalli', district: 'Tiruchirappalli', city: 'Tiruchirappalli', state: 'Tamil Nadu' },
    { name: 'Saranathan College of Engineering', district: 'Tiruchirappalli', city: 'Tiruchirappalli', state: 'Tamil Nadu' },
    { name: 'K. Ramakrishnan College of Engineering', district: 'Tiruchirappalli', city: 'Tiruchirappalli', state: 'Tamil Nadu' },
    // Salem
    { name: 'Sona College of Technology', district: 'Salem', city: 'Salem', state: 'Tamil Nadu' },
    { name: 'Paavai Engineering College', district: 'Salem', city: 'Namakkal', state: 'Tamil Nadu' },
    // Thanjavur
    { name: 'SASTRA University', district: 'Thanjavur', city: 'Thanjavur', state: 'Tamil Nadu' },
    { name: 'Periyar Maniammai Institute of Science and Technology', district: 'Thanjavur', city: 'Thanjavur', state: 'Tamil Nadu' },
    // Tirunelveli
    { name: 'Mepco Schlenk Engineering College', district: 'Tirunelveli', city: 'Sivakasi', state: 'Tamil Nadu' },
    // Kanyakumari
    { name: 'Noorul Islam Centre for Higher Education', district: 'Kanyakumari', city: 'Kumaracoil', state: 'Tamil Nadu' },
  ],

  'Karnataka': [
    // Bengaluru
    { name: 'Indian Institute of Science', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'RV College of Engineering', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'BMS College of Engineering', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'PES University', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'MS Ramaiah Institute of Technology', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'Nitte Meenakshi Institute of Technology', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'Sir M Visvesvaraya Institute of Technology', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'Dayananda Sagar College of Engineering', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'New Horizon College of Engineering', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'CMR Institute of Technology', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'REVA University', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'JSS Academy of Technical Education', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'BNM Institute of Technology', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    { name: 'Bangalore Institute of Technology', district: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    // Mysuru
    { name: 'NIE Mysore', district: 'Mysuru', city: 'Mysuru', state: 'Karnataka' },
    { name: 'Sri Jayachamarajendra College of Engineering', district: 'Mysuru', city: 'Mysuru', state: 'Karnataka' },
    { name: 'Vidyavardhaka College of Engineering', district: 'Mysuru', city: 'Mysuru', state: 'Karnataka' },
    // Mangalore
    { name: 'NIT Karnataka Surathkal', district: 'Dakshina Kannada', city: 'Surathkal', state: 'Karnataka' },
    { name: 'Manipal Institute of Technology', district: 'Udupi', city: 'Manipal', state: 'Karnataka' },
    { name: 'St. Joseph Engineering College', district: 'Dakshina Kannada', city: 'Mangalore', state: 'Karnataka' },
    { name: 'Sahyadri College of Engineering and Management', district: 'Dakshina Kannada', city: 'Mangalore', state: 'Karnataka' },
    // Dharwad
    { name: 'BVB College of Engineering and Technology', district: 'Dharwad', city: 'Hubli', state: 'Karnataka' },
    { name: 'SDM College of Engineering and Technology', district: 'Dharwad', city: 'Dharwad', state: 'Karnataka' },
    // Belgaum
    { name: 'KLE Technological University', district: 'Belgaum', city: 'Hubli', state: 'Karnataka' },
    { name: 'Jain College of Engineering', district: 'Belgaum', city: 'Belgaum', state: 'Karnataka' },
    // Gulbarga
    { name: 'PDA College of Engineering', district: 'Kalaburagi', city: 'Kalaburagi', state: 'Karnataka' },
    // Shimoga
    { name: 'JNN College of Engineering', district: 'Shimoga', city: 'Shimoga', state: 'Karnataka' },
  ],

  'Kerala': [
    // Thiruvananthapuram
    { name: 'College of Engineering Trivandrum', district: 'Thiruvananthapuram', city: 'Thiruvananthapuram', state: 'Kerala' },
    { name: 'Indian Institute of Space Science and Technology', district: 'Thiruvananthapuram', city: 'Thiruvananthapuram', state: 'Kerala' },
    { name: 'Mar Baselios College of Engineering and Technology', district: 'Thiruvananthapuram', city: 'Thiruvananthapuram', state: 'Kerala' },
    // Ernakulam
    { name: 'Cochin University of Science and Technology', district: 'Ernakulam', city: 'Kochi', state: 'Kerala' },
    { name: 'Rajagiri School of Engineering and Technology', district: 'Ernakulam', city: 'Kochi', state: 'Kerala' },
    { name: 'Adi Shankara Institute of Engineering and Technology', district: 'Ernakulam', city: 'Kalady', state: 'Kerala' },
    // Thrissur
    { name: 'Government Engineering College Thrissur', district: 'Thrissur', city: 'Thrissur', state: 'Kerala' },
    { name: 'Vidya Academy of Science and Technology', district: 'Thrissur', city: 'Thrissur', state: 'Kerala' },
    // Kozhikode
    { name: 'NIT Calicut', district: 'Kozhikode', city: 'Kozhikode', state: 'Kerala' },
    { name: 'Government Engineering College Kozhikode', district: 'Kozhikode', city: 'Kozhikode', state: 'Kerala' },
    // Palakkad
    { name: 'IIT Palakkad', district: 'Palakkad', city: 'Palakkad', state: 'Kerala' },
    { name: 'NSS College of Engineering', district: 'Palakkad', city: 'Palakkad', state: 'Kerala' },
    // Kottayam
    { name: 'College of Engineering Kidangoor', district: 'Kottayam', city: 'Kottayam', state: 'Kerala' },
    { name: 'Amal Jyothi College of Engineering', district: 'Kottayam', city: 'Kottayam', state: 'Kerala' },
    // Kannur
    { name: 'Government Engineering College Kannur', district: 'Kannur', city: 'Kannur', state: 'Kerala' },
    // Kollam
    { name: 'TKM College of Engineering', district: 'Kollam', city: 'Kollam', state: 'Kerala' },
  ],

  'Maharashtra': [
    // Mumbai
    { name: 'IIT Bombay', district: 'Mumbai', city: 'Mumbai', state: 'Maharashtra' },
    { name: 'VJTI Mumbai', district: 'Mumbai', city: 'Mumbai', state: 'Maharashtra' },
    { name: 'DJ Sanghvi College of Engineering', district: 'Mumbai', city: 'Mumbai', state: 'Maharashtra' },
    { name: 'Thadomal Shahani Engineering College', district: 'Mumbai', city: 'Mumbai', state: 'Maharashtra' },
    { name: 'Sardar Patel Institute of Technology', district: 'Mumbai', city: 'Mumbai', state: 'Maharashtra' },
    { name: 'KJ Somaiya College of Engineering', district: 'Mumbai', city: 'Mumbai', state: 'Maharashtra' },
    { name: 'Fr. Conceicao Rodrigues College of Engineering', district: 'Mumbai', city: 'Mumbai', state: 'Maharashtra' },
    // Pune
    { name: 'College of Engineering Pune', district: 'Pune', city: 'Pune', state: 'Maharashtra' },
    { name: 'Vishwakarma Institute of Technology', district: 'Pune', city: 'Pune', state: 'Maharashtra' },
    { name: 'MIT Pune', district: 'Pune', city: 'Pune', state: 'Maharashtra' },
    { name: 'Symbiosis Institute of Technology', district: 'Pune', city: 'Pune', state: 'Maharashtra' },
    { name: 'PICT Pune', district: 'Pune', city: 'Pune', state: 'Maharashtra' },
    { name: 'Sinhgad College of Engineering', district: 'Pune', city: 'Pune', state: 'Maharashtra' },
    { name: 'Cummins College of Engineering for Women', district: 'Pune', city: 'Pune', state: 'Maharashtra' },
    { name: 'Army Institute of Technology', district: 'Pune', city: 'Pune', state: 'Maharashtra' },
    // Nagpur
    { name: 'VNIT Nagpur', district: 'Nagpur', city: 'Nagpur', state: 'Maharashtra' },
    { name: 'Shri Ramdeobaba College of Engineering', district: 'Nagpur', city: 'Nagpur', state: 'Maharashtra' },
    { name: 'G H Raisoni College of Engineering', district: 'Nagpur', city: 'Nagpur', state: 'Maharashtra' },
    // Nashik
    { name: 'K K Wagh Institute of Engineering', district: 'Nashik', city: 'Nashik', state: 'Maharashtra' },
    { name: 'Sandip Institute of Technology', district: 'Nashik', city: 'Nashik', state: 'Maharashtra' },
    // Aurangabad
    { name: 'Government College of Engineering Aurangabad', district: 'Aurangabad', city: 'Aurangabad', state: 'Maharashtra' },
    // Kolhapur
    { name: 'KIT College of Engineering', district: 'Kolhapur', city: 'Kolhapur', state: 'Maharashtra' },
    { name: 'Rajarambapu Institute of Technology', district: 'Kolhapur', city: 'Sangli', state: 'Maharashtra' },
  ],

  'Gujarat': [
    // Ahmedabad
    { name: 'IIT Gandhinagar', district: 'Gandhinagar', city: 'Gandhinagar', state: 'Gujarat' },
    { name: 'DAIICT', district: 'Gandhinagar', city: 'Gandhinagar', state: 'Gujarat' },
    { name: 'LD College of Engineering', district: 'Ahmedabad', city: 'Ahmedabad', state: 'Gujarat' },
    { name: 'Nirma University', district: 'Ahmedabad', city: 'Ahmedabad', state: 'Gujarat' },
    { name: 'CEPT University', district: 'Ahmedabad', city: 'Ahmedabad', state: 'Gujarat' },
    { name: 'Gujarat Technological University', district: 'Ahmedabad', city: 'Ahmedabad', state: 'Gujarat' },
    // Surat
    { name: 'SVNIT Surat', district: 'Surat', city: 'Surat', state: 'Gujarat' },
    { name: 'SCET Surat', district: 'Surat', city: 'Surat', state: 'Gujarat' },
    // Vadodara
    { name: 'MS University Vadodara', district: 'Vadodara', city: 'Vadodara', state: 'Gujarat' },
    { name: 'Parul University', district: 'Vadodara', city: 'Vadodara', state: 'Gujarat' },
    // Rajkot
    { name: 'Marwadi University', district: 'Rajkot', city: 'Rajkot', state: 'Gujarat' },
    { name: 'Darshan Institute of Engineering', district: 'Rajkot', city: 'Rajkot', state: 'Gujarat' },
  ],

  'Rajasthan': [
    // Jaipur
    { name: 'MNIT Jaipur', district: 'Jaipur', city: 'Jaipur', state: 'Rajasthan' },
    { name: 'JECRC University', district: 'Jaipur', city: 'Jaipur', state: 'Rajasthan' },
    { name: 'Manipal University Jaipur', district: 'Jaipur', city: 'Jaipur', state: 'Rajasthan' },
    { name: 'Poornima University', district: 'Jaipur', city: 'Jaipur', state: 'Rajasthan' },
    { name: 'Arya College of Engineering', district: 'Jaipur', city: 'Jaipur', state: 'Rajasthan' },
    // Jodhpur
    { name: 'IIT Jodhpur', district: 'Jodhpur', city: 'Jodhpur', state: 'Rajasthan' },
    { name: 'MBM University', district: 'Jodhpur', city: 'Jodhpur', state: 'Rajasthan' },
    // Pilani
    { name: 'BITS Pilani', district: 'Jhunjhunu', city: 'Pilani', state: 'Rajasthan' },
    // Kota
    { name: 'RTU Kota', district: 'Kota', city: 'Kota', state: 'Rajasthan' },
    // Udaipur
    { name: 'CTAE Udaipur', district: 'Udaipur', city: 'Udaipur', state: 'Rajasthan' },
  ],

  'Uttar Pradesh': [
    // Lucknow
    { name: 'IIT Kanpur', district: 'Kanpur', city: 'Kanpur', state: 'Uttar Pradesh' },
    { name: 'HBTU Kanpur', district: 'Kanpur', city: 'Kanpur', state: 'Uttar Pradesh' },
    // Noida
    { name: 'Amity University', district: 'Gautam Buddha Nagar', city: 'Noida', state: 'Uttar Pradesh' },
    { name: 'Jaypee Institute of Information Technology', district: 'Gautam Buddha Nagar', city: 'Noida', state: 'Uttar Pradesh' },
    { name: 'Shiv Nadar University', district: 'Gautam Buddha Nagar', city: 'Greater Noida', state: 'Uttar Pradesh' },
    { name: 'Bennett University', district: 'Gautam Buddha Nagar', city: 'Greater Noida', state: 'Uttar Pradesh' },
    { name: 'Galgotias University', district: 'Gautam Buddha Nagar', city: 'Greater Noida', state: 'Uttar Pradesh' },
    // Varanasi
    { name: 'IIT BHU', district: 'Varanasi', city: 'Varanasi', state: 'Uttar Pradesh' },
    // Allahabad
    { name: 'MNNIT Allahabad', district: 'Prayagraj', city: 'Allahabad', state: 'Uttar Pradesh' },
    // Aligarh
    { name: 'Aligarh Muslim University', district: 'Aligarh', city: 'Aligarh', state: 'Uttar Pradesh' },
    // Ghaziabad
    { name: 'ABES Engineering College', district: 'Ghaziabad', city: 'Ghaziabad', state: 'Uttar Pradesh' },
    { name: 'KIET Group of Institutions', district: 'Ghaziabad', city: 'Ghaziabad', state: 'Uttar Pradesh' },
    // Agra
    { name: 'GLA University', district: 'Mathura', city: 'Mathura', state: 'Uttar Pradesh' },
  ],

  'West Bengal': [
    // Kolkata
    { name: 'IIT Kharagpur', district: 'West Midnapore', city: 'Kharagpur', state: 'West Bengal' },
    { name: 'Jadavpur University', district: 'Kolkata', city: 'Kolkata', state: 'West Bengal' },
    { name: 'IIEST Shibpur', district: 'Howrah', city: 'Howrah', state: 'West Bengal' },
    { name: 'NIT Durgapur', district: 'Paschim Bardhaman', city: 'Durgapur', state: 'West Bengal' },
    { name: 'Heritage Institute of Technology', district: 'Kolkata', city: 'Kolkata', state: 'West Bengal' },
    { name: 'Institute of Engineering and Management', district: 'Kolkata', city: 'Kolkata', state: 'West Bengal' },
    { name: 'Techno India University', district: 'Kolkata', city: 'Kolkata', state: 'West Bengal' },
    // Durgapur
    { name: 'Dr B C Roy Engineering College', district: 'Paschim Bardhaman', city: 'Durgapur', state: 'West Bengal' },
  ],

  'Delhi': [
    { name: 'IIT Delhi', district: 'South Delhi', city: 'New Delhi', state: 'Delhi' },
    { name: 'DTU Delhi', district: 'North West Delhi', city: 'New Delhi', state: 'Delhi' },
    { name: 'NSIT Delhi', district: 'South West Delhi', city: 'New Delhi', state: 'Delhi' },
    { name: 'IIIT Delhi', district: 'South Delhi', city: 'New Delhi', state: 'Delhi' },
    { name: 'Jamia Millia Islamia', district: 'South Delhi', city: 'New Delhi', state: 'Delhi' },
    { name: 'IGDTUW', district: 'Central Delhi', city: 'New Delhi', state: 'Delhi' },
    { name: 'Bharati Vidyapeeth College of Engineering', district: 'South Delhi', city: 'New Delhi', state: 'Delhi' },
    { name: 'Amity School of Engineering', district: 'South Delhi', city: 'New Delhi', state: 'Delhi' },
    { name: 'MSIT Delhi', district: 'West Delhi', city: 'New Delhi', state: 'Delhi' },
  ],

  'Madhya Pradesh': [
    // Bhopal
    { name: 'MANIT Bhopal', district: 'Bhopal', city: 'Bhopal', state: 'Madhya Pradesh' },
    { name: 'RGPV Bhopal', district: 'Bhopal', city: 'Bhopal', state: 'Madhya Pradesh' },
    { name: 'Lakshmi Narain College of Technology', district: 'Bhopal', city: 'Bhopal', state: 'Madhya Pradesh' },
    { name: 'Sagar Institute of Research and Technology', district: 'Bhopal', city: 'Bhopal', state: 'Madhya Pradesh' },
    // Indore
    { name: 'IIT Indore', district: 'Indore', city: 'Indore', state: 'Madhya Pradesh' },
    { name: 'IIM Indore', district: 'Indore', city: 'Indore', state: 'Madhya Pradesh' },
    { name: 'DAVV Indore', district: 'Indore', city: 'Indore', state: 'Madhya Pradesh' },
    { name: 'Medicaps University', district: 'Indore', city: 'Indore', state: 'Madhya Pradesh' },
    { name: 'Acropolis Institute of Technology', district: 'Indore', city: 'Indore', state: 'Madhya Pradesh' },
    // Gwalior
    { name: 'IIITM Gwalior', district: 'Gwalior', city: 'Gwalior', state: 'Madhya Pradesh' },
    { name: 'ITM University Gwalior', district: 'Gwalior', city: 'Gwalior', state: 'Madhya Pradesh' },
    // Jabalpur
    { name: 'JNEC Jabalpur', district: 'Jabalpur', city: 'Jabalpur', state: 'Madhya Pradesh' },
  ],

  'Bihar': [
    // Patna
    { name: 'IIT Patna', district: 'Patna', city: 'Patna', state: 'Bihar' },
    { name: 'NIT Patna', district: 'Patna', city: 'Patna', state: 'Bihar' },
    { name: 'Birla Institute of Technology Patna', district: 'Patna', city: 'Patna', state: 'Bihar' },
    { name: 'Chanakya National Law University', district: 'Patna', city: 'Patna', state: 'Bihar' },
    // Muzaffarpur
    { name: 'Muzaffarpur Institute of Technology', district: 'Muzaffarpur', city: 'Muzaffarpur', state: 'Bihar' },
    // Bhagalpur
    { name: 'Bhagalpur College of Engineering', district: 'Bhagalpur', city: 'Bhagalpur', state: 'Bihar' },
  ],

  'Odisha': [
    // Bhubaneswar
    { name: 'IIT Bhubaneswar', district: 'Khurda', city: 'Bhubaneswar', state: 'Odisha' },
    { name: 'NIT Rourkela', district: 'Sundargarh', city: 'Rourkela', state: 'Odisha' },
    { name: 'KIIT University', district: 'Khurda', city: 'Bhubaneswar', state: 'Odisha' },
    { name: 'Silicon Institute of Technology', district: 'Khurda', city: 'Bhubaneswar', state: 'Odisha' },
    { name: 'College of Engineering and Technology Bhubaneswar', district: 'Khurda', city: 'Bhubaneswar', state: 'Odisha' },
    { name: 'ITER SOA University', district: 'Khurda', city: 'Bhubaneswar', state: 'Odisha' },
    // Cuttack
    { name: 'Ravenshaw University', district: 'Cuttack', city: 'Cuttack', state: 'Odisha' },
  ],

  'Punjab': [
    // Chandigarh
    { name: 'PEC Chandigarh', district: 'Chandigarh', city: 'Chandigarh', state: 'Punjab' },
    { name: 'Punjab University', district: 'Chandigarh', city: 'Chandigarh', state: 'Punjab' },
    // Jalandhar
    { name: 'NIT Jalandhar', district: 'Jalandhar', city: 'Jalandhar', state: 'Punjab' },
    { name: 'Lovely Professional University', district: 'Jalandhar', city: 'Phagwara', state: 'Punjab' },
    // Patiala
    { name: 'Thapar Institute of Engineering and Technology', district: 'Patiala', city: 'Patiala', state: 'Punjab' },
    // Ludhiana
    { name: 'Punjab Agricultural University', district: 'Ludhiana', city: 'Ludhiana', state: 'Punjab' },
    { name: 'Guru Nanak Dev Engineering College', district: 'Ludhiana', city: 'Ludhiana', state: 'Punjab' },
    // Amritsar
    { name: 'Guru Nanak Dev University', district: 'Amritsar', city: 'Amritsar', state: 'Punjab' },
  ],

  'Haryana': [
    // Gurgaon
    { name: 'Ashoka University', district: 'Sonipat', city: 'Sonipat', state: 'Haryana' },
    { name: 'OP Jindal Global University', district: 'Sonipat', city: 'Sonipat', state: 'Haryana' },
    // Faridabad
    { name: 'YMCA University of Science and Technology', district: 'Faridabad', city: 'Faridabad', state: 'Haryana' },
    { name: 'Manav Rachna University', district: 'Faridabad', city: 'Faridabad', state: 'Haryana' },
    // Kurukshetra
    { name: 'NIT Kurukshetra', district: 'Kurukshetra', city: 'Kurukshetra', state: 'Haryana' },
    { name: 'Kurukshetra University', district: 'Kurukshetra', city: 'Kurukshetra', state: 'Haryana' },
    // Rohtak
    { name: 'MDU Rohtak', district: 'Rohtak', city: 'Rohtak', state: 'Haryana' },
    { name: 'DCRUST Murthal', district: 'Sonipat', city: 'Murthal', state: 'Haryana' },
    // Hisar
    { name: 'Guru Jambheshwar University', district: 'Hisar', city: 'Hisar', state: 'Haryana' },
  ],

  'Jharkhand': [
    // Ranchi
    { name: 'IIT ISM Dhanbad', district: 'Dhanbad', city: 'Dhanbad', state: 'Jharkhand' },
    { name: 'BIT Mesra', district: 'Ranchi', city: 'Ranchi', state: 'Jharkhand' },
    { name: 'NIT Jamshedpur', district: 'East Singhbhum', city: 'Jamshedpur', state: 'Jharkhand' },
    { name: 'XISS Ranchi', district: 'Ranchi', city: 'Ranchi', state: 'Jharkhand' },
    { name: 'Central University of Jharkhand', district: 'Ranchi', city: 'Ranchi', state: 'Jharkhand' },
  ],

  'Chhattisgarh': [
    // Raipur
    { name: 'NIT Raipur', district: 'Raipur', city: 'Raipur', state: 'Chhattisgarh' },
    { name: 'IIT Bhilai', district: 'Durg', city: 'Bhilai', state: 'Chhattisgarh' },
    { name: 'GEC Raipur', district: 'Raipur', city: 'Raipur', state: 'Chhattisgarh' },
    { name: 'Rungta College of Engineering and Technology', district: 'Raipur', city: 'Bhilai', state: 'Chhattisgarh' },
    // Bilaspur
    { name: 'Guru Ghasidas University', district: 'Bilaspur', city: 'Bilaspur', state: 'Chhattisgarh' },
  ],

  'Assam': [
    // Guwahati
    { name: 'IIT Guwahati', district: 'Kamrup', city: 'Guwahati', state: 'Assam' },
    { name: 'NIT Silchar', district: 'Cachar', city: 'Silchar', state: 'Assam' },
    { name: 'Assam Engineering College', district: 'Kamrup', city: 'Guwahati', state: 'Assam' },
    { name: 'Tezpur University', district: 'Sonitpur', city: 'Tezpur', state: 'Assam' },
    { name: 'Cotton University', district: 'Kamrup', city: 'Guwahati', state: 'Assam' },
  ],

  'Uttarakhand': [
    // Dehradun
    { name: 'IIT Roorkee', district: 'Haridwar', city: 'Roorkee', state: 'Uttarakhand' },
    { name: 'UPES Dehradun', district: 'Dehradun', city: 'Dehradun', state: 'Uttarakhand' },
    { name: 'Graphic Era University', district: 'Dehradun', city: 'Dehradun', state: 'Uttarakhand' },
    { name: 'DIT University', district: 'Dehradun', city: 'Dehradun', state: 'Uttarakhand' },
    { name: 'GEU Dehradun', district: 'Dehradun', city: 'Dehradun', state: 'Uttarakhand' },
  ],
};

async function main() {
  console.log('============================================');
  console.log('  Import Real Colleges - State & District wise');
  console.log('============================================\n');

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
    console.error('No admin user found!');
    process.exit(1);
  }

  // Delete existing colleges
  console.log('Clearing existing data...');
  await prisma.college.deleteMany({ where: { organizationId: org.id } });

  let total = 0;
  let saved = 0;

  for (const [state, colleges] of Object.entries(realColleges)) {
    console.log(`\n${state}: ${colleges.length} colleges`);
    total += colleges.length;

    for (const college of colleges) {
      try {
        await prisma.college.create({
          data: {
            organizationId: org.id,
            assignedToId: admin.id,
            name: college.name,
            collegeType: 'ENGINEERING',
            institutionStatus: 'AFFILIATED',
            category: 'WARM',
            address: `${college.city}, ${college.district}, ${college.state}`,
            city: college.city,
            district: college.district,
            state: college.state,
            pincode: college.pincode || '',
          }
        });
        saved++;
      } catch (e) {
        console.log(`  Error: ${college.name}`);
      }
    }
  }

  // Final stats
  const byState = await prisma.college.groupBy({
    by: ['state'],
    _count: true,
    orderBy: { _count: { state: 'desc' } }
  });

  console.log('\n============================================');
  console.log('           IMPORT COMPLETE');
  console.log('============================================');
  console.log(`Total colleges: ${saved}`);
  console.log('\nBy State:');
  byState.forEach(s => console.log(`  ${s.state}: ${s._count}`));
  console.log('============================================');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
