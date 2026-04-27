/**
 * Industry-Specific Custom Fields Configuration
 * Defines field schemas for each industry's lead custom fields
 */

import { OrganizationIndustry } from '@prisma/client';

export type FieldType = 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'boolean' | 'currency' | 'textarea';

export interface FieldOption {
  value: string;
  label: string;
}

export interface IndustryField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  min?: number;
  max?: number;
  unit?: string;
  helpText?: string;
  gridSpan?: 1 | 2; // For layout purposes
}

export interface IndustryFieldConfig {
  industry: OrganizationIndustry;
  label: string;
  icon: string;
  color: string;
  fields: IndustryField[];
}

// Real Estate Industry Fields
const REAL_ESTATE_FIELDS: IndustryField[] = [
  {
    key: 'propertyType',
    label: 'Property Type',
    type: 'select',
    required: true,
    options: [
      { value: 'apartment', label: 'Apartment' },
      { value: 'villa', label: 'Villa' },
      { value: 'plot', label: 'Plot' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'penthouse', label: 'Penthouse' },
      { value: 'farmhouse', label: 'Farmhouse' },
      { value: 'studio', label: 'Studio' },
    ],
    placeholder: 'Select property type',
  },
  {
    key: 'transactionType',
    label: 'Transaction Type',
    type: 'select',
    options: [
      { value: 'buy', label: 'Buy' },
      { value: 'rent', label: 'Rent' },
      { value: 'lease', label: 'Lease' },
    ],
  },
  {
    key: 'budget',
    label: 'Budget',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Enter budget in INR',
  },
  {
    key: 'budgetMax',
    label: 'Max Budget',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Enter max budget',
  },
  {
    key: 'preferredLocations',
    label: 'Preferred Locations',
    type: 'multiselect',
    placeholder: 'Enter preferred locations',
    helpText: 'Comma-separated locations',
  },
  {
    key: 'bhkRequirement',
    label: 'BHK Requirement',
    type: 'select',
    options: [
      { value: '1bhk', label: '1 BHK' },
      { value: '2bhk', label: '2 BHK' },
      { value: '3bhk', label: '3 BHK' },
      { value: '4bhk', label: '4 BHK' },
      { value: '5bhk+', label: '5+ BHK' },
    ],
  },
  {
    key: 'carpetArea',
    label: 'Carpet Area (sq ft)',
    type: 'number',
    min: 0,
    placeholder: 'Enter carpet area',
  },
  {
    key: 'possessionTimeline',
    label: 'Possession Timeline',
    type: 'select',
    options: [
      { value: 'ready', label: 'Ready to Move' },
      { value: '3months', label: 'Within 3 Months' },
      { value: '6months', label: 'Within 6 Months' },
      { value: '1year', label: 'Within 1 Year' },
      { value: 'under_construction', label: 'Under Construction' },
    ],
  },
  {
    key: 'furnishing',
    label: 'Furnishing',
    type: 'select',
    options: [
      { value: 'unfurnished', label: 'Unfurnished' },
      { value: 'semi_furnished', label: 'Semi-Furnished' },
      { value: 'fully_furnished', label: 'Fully Furnished' },
    ],
  },
  {
    key: 'amenitiesRequired',
    label: 'Amenities Required',
    type: 'multiselect',
    options: [
      { value: 'parking', label: 'Parking' },
      { value: 'gym', label: 'Gym' },
      { value: 'pool', label: 'Swimming Pool' },
      { value: 'security', label: '24x7 Security' },
      { value: 'clubhouse', label: 'Clubhouse' },
      { value: 'garden', label: 'Garden' },
    ],
  },
  {
    key: 'siteVisitDate',
    label: 'Preferred Site Visit Date',
    type: 'date',
  },
  {
    key: 'currentResidence',
    label: 'Current Residence Type',
    type: 'select',
    options: [
      { value: 'owned', label: 'Owned' },
      { value: 'rented', label: 'Rented' },
      { value: 'family', label: 'Living with Family' },
    ],
  },
  {
    key: 'loanRequired',
    label: 'Home Loan Required',
    type: 'boolean',
  },
  {
    key: 'remarks',
    label: 'Additional Requirements',
    type: 'textarea',
    gridSpan: 2,
    placeholder: 'Enter any additional requirements',
  },
];

// Healthcare Industry Fields
const HEALTHCARE_FIELDS: IndustryField[] = [
  {
    key: 'condition',
    label: 'Medical Condition/Concern',
    type: 'text',
    required: true,
    placeholder: 'Enter medical condition',
  },
  {
    key: 'department',
    label: 'Department',
    type: 'select',
    options: [
      { value: 'general', label: 'General Medicine' },
      { value: 'cardiology', label: 'Cardiology' },
      { value: 'orthopedics', label: 'Orthopedics' },
      { value: 'neurology', label: 'Neurology' },
      { value: 'oncology', label: 'Oncology' },
      { value: 'pediatrics', label: 'Pediatrics' },
      { value: 'gynecology', label: 'Gynecology' },
      { value: 'dermatology', label: 'Dermatology' },
      { value: 'ophthalmology', label: 'Ophthalmology' },
      { value: 'dental', label: 'Dental' },
      { value: 'ent', label: 'ENT' },
    ],
  },
  {
    key: 'preferredDoctor',
    label: 'Preferred Doctor',
    type: 'text',
    placeholder: 'Enter preferred doctor name',
  },
  {
    key: 'appointmentType',
    label: 'Appointment Type',
    type: 'select',
    options: [
      { value: 'consultation', label: 'Consultation' },
      { value: 'follow_up', label: 'Follow-up' },
      { value: 'checkup', label: 'Health Checkup' },
      { value: 'surgery', label: 'Surgery Consultation' },
      { value: 'emergency', label: 'Emergency' },
      { value: 'second_opinion', label: 'Second Opinion' },
    ],
  },
  {
    key: 'preferredDate',
    label: 'Preferred Appointment Date',
    type: 'date',
  },
  {
    key: 'preferredTime',
    label: 'Preferred Time',
    type: 'select',
    options: [
      { value: 'morning', label: 'Morning (9AM - 12PM)' },
      { value: 'afternoon', label: 'Afternoon (12PM - 4PM)' },
      { value: 'evening', label: 'Evening (4PM - 8PM)' },
    ],
  },
  {
    key: 'insuranceProvider',
    label: 'Insurance Provider',
    type: 'text',
    placeholder: 'Enter insurance provider',
  },
  {
    key: 'insurancePolicyNo',
    label: 'Insurance Policy Number',
    type: 'text',
    placeholder: 'Enter policy number',
  },
  {
    key: 'patientAge',
    label: 'Patient Age',
    type: 'number',
    min: 0,
    max: 150,
  },
  {
    key: 'patientGender',
    label: 'Patient Gender',
    type: 'select',
    options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'existingConditions',
    label: 'Existing Conditions',
    type: 'multiselect',
    options: [
      { value: 'diabetes', label: 'Diabetes' },
      { value: 'hypertension', label: 'Hypertension' },
      { value: 'heart_disease', label: 'Heart Disease' },
      { value: 'asthma', label: 'Asthma' },
      { value: 'thyroid', label: 'Thyroid' },
      { value: 'none', label: 'None' },
    ],
  },
  {
    key: 'medicalHistory',
    label: 'Brief Medical History',
    type: 'textarea',
    gridSpan: 2,
    placeholder: 'Enter relevant medical history',
  },
  {
    key: 'referralSource',
    label: 'Referral Source',
    type: 'select',
    options: [
      { value: 'doctor', label: 'Doctor Referral' },
      { value: 'hospital', label: 'Hospital Referral' },
      { value: 'self', label: 'Self' },
      { value: 'family', label: 'Family/Friends' },
      { value: 'online', label: 'Online Search' },
    ],
  },
];

// Insurance Industry Fields
const INSURANCE_FIELDS: IndustryField[] = [
  {
    key: 'policyType',
    label: 'Policy Type',
    type: 'select',
    required: true,
    options: [
      { value: 'life', label: 'Life Insurance' },
      { value: 'health', label: 'Health Insurance' },
      { value: 'motor', label: 'Motor Insurance' },
      { value: 'home', label: 'Home Insurance' },
      { value: 'travel', label: 'Travel Insurance' },
      { value: 'business', label: 'Business Insurance' },
      { value: 'term', label: 'Term Insurance' },
      { value: 'ulip', label: 'ULIP' },
    ],
  },
  {
    key: 'coverageAmount',
    label: 'Coverage Amount',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Enter desired coverage',
  },
  {
    key: 'currentInsurer',
    label: 'Current Insurer',
    type: 'text',
    placeholder: 'Enter current insurance provider',
  },
  {
    key: 'existingPolicyNo',
    label: 'Existing Policy Number',
    type: 'text',
    placeholder: 'Enter existing policy number',
  },
  {
    key: 'premiumBudget',
    label: 'Premium Budget (Monthly)',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Monthly premium budget',
  },
  {
    key: 'policyTerm',
    label: 'Policy Term (Years)',
    type: 'select',
    options: [
      { value: '5', label: '5 Years' },
      { value: '10', label: '10 Years' },
      { value: '15', label: '15 Years' },
      { value: '20', label: '20 Years' },
      { value: '25', label: '25 Years' },
      { value: '30', label: '30 Years' },
      { value: 'whole_life', label: 'Whole Life' },
    ],
  },
  {
    key: 'familyMembers',
    label: 'Family Members to Cover',
    type: 'number',
    min: 1,
    max: 10,
  },
  {
    key: 'occupation',
    label: 'Occupation',
    type: 'text',
    placeholder: 'Enter occupation',
  },
  {
    key: 'annualIncome',
    label: 'Annual Income',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Enter annual income',
  },
  {
    key: 'smoker',
    label: 'Smoker',
    type: 'boolean',
  },
  {
    key: 'preExistingConditions',
    label: 'Pre-existing Conditions',
    type: 'boolean',
  },
  {
    key: 'vehicleDetails',
    label: 'Vehicle Details (for Motor)',
    type: 'text',
    placeholder: 'Make, Model, Year',
    helpText: 'Only for motor insurance',
  },
  {
    key: 'renewalDate',
    label: 'Policy Renewal Date',
    type: 'date',
  },
  {
    key: 'additionalRiders',
    label: 'Additional Riders Required',
    type: 'multiselect',
    options: [
      { value: 'accidental_death', label: 'Accidental Death' },
      { value: 'critical_illness', label: 'Critical Illness' },
      { value: 'waiver_premium', label: 'Waiver of Premium' },
      { value: 'hospital_cash', label: 'Hospital Cash' },
    ],
  },
  {
    key: 'remarks',
    label: 'Additional Notes',
    type: 'textarea',
    gridSpan: 2,
  },
];

// Finance Industry Fields
const FINANCE_FIELDS: IndustryField[] = [
  {
    key: 'loanType',
    label: 'Loan Type',
    type: 'select',
    required: true,
    options: [
      { value: 'home', label: 'Home Loan' },
      { value: 'personal', label: 'Personal Loan' },
      { value: 'business', label: 'Business Loan' },
      { value: 'car', label: 'Car Loan' },
      { value: 'education', label: 'Education Loan' },
      { value: 'gold', label: 'Gold Loan' },
      { value: 'lap', label: 'Loan Against Property' },
      { value: 'credit_card', label: 'Credit Card' },
    ],
  },
  {
    key: 'loanAmount',
    label: 'Loan Amount Required',
    type: 'currency',
    required: true,
    unit: 'INR',
    placeholder: 'Enter required loan amount',
  },
  {
    key: 'loanTenure',
    label: 'Preferred Tenure (Months)',
    type: 'select',
    options: [
      { value: '12', label: '12 Months' },
      { value: '24', label: '24 Months' },
      { value: '36', label: '36 Months' },
      { value: '60', label: '60 Months' },
      { value: '84', label: '84 Months' },
      { value: '120', label: '120 Months' },
      { value: '180', label: '180 Months' },
      { value: '240', label: '240 Months' },
    ],
  },
  {
    key: 'employmentType',
    label: 'Employment Type',
    type: 'select',
    required: true,
    options: [
      { value: 'salaried', label: 'Salaried' },
      { value: 'self_employed', label: 'Self-Employed' },
      { value: 'business', label: 'Business Owner' },
      { value: 'professional', label: 'Professional' },
      { value: 'retired', label: 'Retired' },
    ],
  },
  {
    key: 'monthlyIncome',
    label: 'Monthly Income',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Enter monthly income',
  },
  {
    key: 'companyName',
    label: 'Company/Business Name',
    type: 'text',
    placeholder: 'Enter company name',
  },
  {
    key: 'workExperience',
    label: 'Work Experience (Years)',
    type: 'number',
    min: 0,
    max: 50,
  },
  {
    key: 'cibilScore',
    label: 'CIBIL Score',
    type: 'number',
    min: 300,
    max: 900,
    placeholder: 'Enter CIBIL score',
    helpText: 'Score between 300-900',
  },
  {
    key: 'existingEmi',
    label: 'Existing EMI (Monthly)',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Total existing EMI',
  },
  {
    key: 'propertyLocation',
    label: 'Property Location (for Home/LAP)',
    type: 'text',
    placeholder: 'Enter property location',
  },
  {
    key: 'propertyValue',
    label: 'Property Value',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Estimated property value',
  },
  {
    key: 'hasCoApplicant',
    label: 'Has Co-Applicant',
    type: 'boolean',
  },
  {
    key: 'documentsReady',
    label: 'Documents Ready',
    type: 'multiselect',
    options: [
      { value: 'id_proof', label: 'ID Proof' },
      { value: 'address_proof', label: 'Address Proof' },
      { value: 'income_proof', label: 'Income Proof' },
      { value: 'bank_statement', label: 'Bank Statement' },
      { value: 'itr', label: 'ITR' },
      { value: 'property_docs', label: 'Property Documents' },
    ],
  },
  {
    key: 'remarks',
    label: 'Additional Notes',
    type: 'textarea',
    gridSpan: 2,
  },
];

// IT Recruitment Industry Fields
const IT_RECRUITMENT_FIELDS: IndustryField[] = [
  {
    key: 'skills',
    label: 'Primary Skills',
    type: 'multiselect',
    required: true,
    options: [
      { value: 'javascript', label: 'JavaScript' },
      { value: 'typescript', label: 'TypeScript' },
      { value: 'react', label: 'React' },
      { value: 'angular', label: 'Angular' },
      { value: 'vue', label: 'Vue.js' },
      { value: 'nodejs', label: 'Node.js' },
      { value: 'python', label: 'Python' },
      { value: 'java', label: 'Java' },
      { value: 'dotnet', label: '.NET' },
      { value: 'golang', label: 'Go' },
      { value: 'rust', label: 'Rust' },
      { value: 'aws', label: 'AWS' },
      { value: 'azure', label: 'Azure' },
      { value: 'gcp', label: 'GCP' },
      { value: 'devops', label: 'DevOps' },
      { value: 'kubernetes', label: 'Kubernetes' },
      { value: 'docker', label: 'Docker' },
      { value: 'sql', label: 'SQL' },
      { value: 'mongodb', label: 'MongoDB' },
      { value: 'ml_ai', label: 'ML/AI' },
    ],
  },
  {
    key: 'experienceYears',
    label: 'Total Experience (Years)',
    type: 'number',
    required: true,
    min: 0,
    max: 40,
  },
  {
    key: 'currentRole',
    label: 'Current Role/Designation',
    type: 'text',
    placeholder: 'e.g., Senior Software Engineer',
  },
  {
    key: 'currentCompany',
    label: 'Current Company',
    type: 'text',
    placeholder: 'Enter current company',
  },
  {
    key: 'currentCTC',
    label: 'Current CTC (Annual)',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Current annual CTC',
  },
  {
    key: 'expectedCTC',
    label: 'Expected CTC (Annual)',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Expected annual CTC',
  },
  {
    key: 'noticePeriod',
    label: 'Notice Period',
    type: 'select',
    options: [
      { value: 'immediate', label: 'Immediate' },
      { value: '15days', label: '15 Days' },
      { value: '30days', label: '30 Days (1 Month)' },
      { value: '60days', label: '60 Days (2 Months)' },
      { value: '90days', label: '90 Days (3 Months)' },
      { value: 'negotiable', label: 'Negotiable' },
    ],
  },
  {
    key: 'preferredRoles',
    label: 'Preferred Roles',
    type: 'multiselect',
    options: [
      { value: 'frontend', label: 'Frontend Developer' },
      { value: 'backend', label: 'Backend Developer' },
      { value: 'fullstack', label: 'Full Stack Developer' },
      { value: 'devops', label: 'DevOps Engineer' },
      { value: 'data_engineer', label: 'Data Engineer' },
      { value: 'ml_engineer', label: 'ML Engineer' },
      { value: 'tech_lead', label: 'Tech Lead' },
      { value: 'architect', label: 'Architect' },
      { value: 'manager', label: 'Engineering Manager' },
    ],
  },
  {
    key: 'preferredLocations',
    label: 'Preferred Work Locations',
    type: 'multiselect',
    options: [
      { value: 'bangalore', label: 'Bangalore' },
      { value: 'hyderabad', label: 'Hyderabad' },
      { value: 'pune', label: 'Pune' },
      { value: 'chennai', label: 'Chennai' },
      { value: 'mumbai', label: 'Mumbai' },
      { value: 'delhi_ncr', label: 'Delhi NCR' },
      { value: 'remote', label: 'Remote' },
    ],
  },
  {
    key: 'workMode',
    label: 'Preferred Work Mode',
    type: 'select',
    options: [
      { value: 'onsite', label: 'On-site' },
      { value: 'remote', label: 'Remote' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'flexible', label: 'Flexible' },
    ],
  },
  {
    key: 'education',
    label: 'Highest Education',
    type: 'select',
    options: [
      { value: 'btech', label: 'B.Tech/B.E' },
      { value: 'mtech', label: 'M.Tech/M.E' },
      { value: 'mca', label: 'MCA' },
      { value: 'bca', label: 'BCA' },
      { value: 'bsc', label: 'B.Sc' },
      { value: 'msc', label: 'M.Sc' },
      { value: 'phd', label: 'PhD' },
      { value: 'diploma', label: 'Diploma' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'certifications',
    label: 'Certifications',
    type: 'text',
    placeholder: 'e.g., AWS Solutions Architect, K8s',
  },
  {
    key: 'linkedinProfile',
    label: 'LinkedIn Profile',
    type: 'text',
    placeholder: 'LinkedIn URL',
  },
  {
    key: 'githubProfile',
    label: 'GitHub Profile',
    type: 'text',
    placeholder: 'GitHub URL',
  },
  {
    key: 'portfolioUrl',
    label: 'Portfolio URL',
    type: 'text',
    placeholder: 'Portfolio website',
  },
  {
    key: 'visaStatus',
    label: 'Visa/Work Authorization',
    type: 'select',
    options: [
      { value: 'indian_citizen', label: 'Indian Citizen' },
      { value: 'h1b', label: 'H1B Visa' },
      { value: 'green_card', label: 'Green Card' },
      { value: 'work_permit', label: 'Work Permit' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'remarks',
    label: 'Additional Notes',
    type: 'textarea',
    gridSpan: 2,
  },
];

// Automotive Industry Fields
const AUTOMOTIVE_FIELDS: IndustryField[] = [
  {
    key: 'vehicleType',
    label: 'Vehicle Type',
    type: 'select',
    required: true,
    options: [
      { value: 'car', label: 'Car' },
      { value: 'suv', label: 'SUV' },
      { value: 'sedan', label: 'Sedan' },
      { value: 'hatchback', label: 'Hatchback' },
      { value: 'bike', label: 'Bike' },
      { value: 'scooter', label: 'Scooter' },
      { value: 'commercial', label: 'Commercial Vehicle' },
      { value: 'ev', label: 'Electric Vehicle' },
    ],
  },
  {
    key: 'purchaseType',
    label: 'Purchase Type',
    type: 'select',
    options: [
      { value: 'new', label: 'New Vehicle' },
      { value: 'used', label: 'Used/Pre-owned' },
      { value: 'exchange', label: 'Exchange' },
    ],
  },
  {
    key: 'preferredBrand',
    label: 'Preferred Brand',
    type: 'select',
    options: [
      { value: 'maruti', label: 'Maruti Suzuki' },
      { value: 'hyundai', label: 'Hyundai' },
      { value: 'tata', label: 'Tata' },
      { value: 'mahindra', label: 'Mahindra' },
      { value: 'honda', label: 'Honda' },
      { value: 'toyota', label: 'Toyota' },
      { value: 'kia', label: 'Kia' },
      { value: 'mg', label: 'MG' },
      { value: 'skoda', label: 'Skoda' },
      { value: 'volkswagen', label: 'Volkswagen' },
      { value: 'bmw', label: 'BMW' },
      { value: 'mercedes', label: 'Mercedes-Benz' },
      { value: 'audi', label: 'Audi' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'preferredModel',
    label: 'Preferred Model',
    type: 'text',
    placeholder: 'Enter preferred model',
  },
  {
    key: 'budget',
    label: 'Budget',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Enter budget',
  },
  {
    key: 'budgetMax',
    label: 'Max Budget',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Enter max budget',
  },
  {
    key: 'fuelType',
    label: 'Fuel Type',
    type: 'select',
    options: [
      { value: 'petrol', label: 'Petrol' },
      { value: 'diesel', label: 'Diesel' },
      { value: 'cng', label: 'CNG' },
      { value: 'electric', label: 'Electric' },
      { value: 'hybrid', label: 'Hybrid' },
    ],
  },
  {
    key: 'transmissionType',
    label: 'Transmission',
    type: 'select',
    options: [
      { value: 'manual', label: 'Manual' },
      { value: 'automatic', label: 'Automatic' },
      { value: 'amt', label: 'AMT' },
      { value: 'cvt', label: 'CVT' },
      { value: 'dct', label: 'DCT' },
    ],
  },
  {
    key: 'testDriveDate',
    label: 'Preferred Test Drive Date',
    type: 'date',
  },
  {
    key: 'financeRequired',
    label: 'Finance Required',
    type: 'boolean',
  },
  {
    key: 'downPayment',
    label: 'Down Payment',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Enter down payment amount',
  },
  {
    key: 'tradeInVehicle',
    label: 'Trade-in Vehicle Details',
    type: 'text',
    placeholder: 'Current vehicle make, model, year',
  },
  {
    key: 'tradeInValue',
    label: 'Expected Trade-in Value',
    type: 'currency',
    unit: 'INR',
  },
  {
    key: 'colorPreference',
    label: 'Color Preference',
    type: 'text',
    placeholder: 'Preferred color',
  },
  {
    key: 'purchaseTimeline',
    label: 'Purchase Timeline',
    type: 'select',
    options: [
      { value: 'immediate', label: 'Immediate' },
      { value: '1week', label: 'Within 1 Week' },
      { value: '1month', label: 'Within 1 Month' },
      { value: '3months', label: 'Within 3 Months' },
      { value: 'exploring', label: 'Just Exploring' },
    ],
  },
  {
    key: 'remarks',
    label: 'Additional Notes',
    type: 'textarea',
    gridSpan: 2,
  },
];

// IT Services Industry Fields
const IT_SERVICES_FIELDS: IndustryField[] = [
  {
    key: 'serviceType',
    label: 'Service Type',
    type: 'select',
    required: true,
    options: [
      { value: 'web_development', label: 'Web Development' },
      { value: 'mobile_app', label: 'Mobile App Development' },
      { value: 'cloud_services', label: 'Cloud Services' },
      { value: 'devops', label: 'DevOps & Infrastructure' },
      { value: 'data_analytics', label: 'Data Analytics' },
      { value: 'ai_ml', label: 'AI/ML Solutions' },
      { value: 'cybersecurity', label: 'Cybersecurity' },
      { value: 'erp', label: 'ERP Implementation' },
      { value: 'consulting', label: 'IT Consulting' },
      { value: 'support', label: 'IT Support & Maintenance' },
      { value: 'testing', label: 'QA & Testing' },
      { value: 'custom', label: 'Custom Software' },
    ],
  },
  {
    key: 'projectType',
    label: 'Project Type',
    type: 'select',
    options: [
      { value: 'new', label: 'New Project' },
      { value: 'enhancement', label: 'Enhancement' },
      { value: 'migration', label: 'Migration' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'poc', label: 'POC/Prototype' },
    ],
  },
  {
    key: 'companyName',
    label: 'Company Name',
    type: 'text',
    required: true,
    placeholder: 'Enter company name',
  },
  {
    key: 'companySize',
    label: 'Company Size',
    type: 'select',
    options: [
      { value: 'startup', label: 'Startup (1-10)' },
      { value: 'small', label: 'Small (11-50)' },
      { value: 'medium', label: 'Medium (51-200)' },
      { value: 'large', label: 'Large (201-1000)' },
      { value: 'enterprise', label: 'Enterprise (1000+)' },
    ],
  },
  {
    key: 'industryVertical',
    label: 'Industry Vertical',
    type: 'select',
    options: [
      { value: 'fintech', label: 'Fintech' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'retail', label: 'Retail' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'logistics', label: 'Logistics' },
      { value: 'education', label: 'Education' },
      { value: 'real_estate', label: 'Real Estate' },
      { value: 'government', label: 'Government' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'budget',
    label: 'Project Budget',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Enter project budget',
  },
  {
    key: 'budgetType',
    label: 'Budget Type',
    type: 'select',
    options: [
      { value: 'fixed', label: 'Fixed Price' },
      { value: 'time_material', label: 'Time & Material' },
      { value: 'dedicated', label: 'Dedicated Team' },
      { value: 'retainer', label: 'Monthly Retainer' },
    ],
  },
  {
    key: 'timeline',
    label: 'Expected Timeline',
    type: 'select',
    options: [
      { value: '1month', label: '< 1 Month' },
      { value: '3months', label: '1-3 Months' },
      { value: '6months', label: '3-6 Months' },
      { value: '1year', label: '6-12 Months' },
      { value: 'ongoing', label: 'Ongoing' },
    ],
  },
  {
    key: 'techStack',
    label: 'Preferred Technologies',
    type: 'multiselect',
    options: [
      { value: 'react', label: 'React' },
      { value: 'angular', label: 'Angular' },
      { value: 'nodejs', label: 'Node.js' },
      { value: 'python', label: 'Python' },
      { value: 'java', label: 'Java' },
      { value: 'dotnet', label: '.NET' },
      { value: 'aws', label: 'AWS' },
      { value: 'azure', label: 'Azure' },
      { value: 'gcp', label: 'GCP' },
      { value: 'no_preference', label: 'No Preference' },
    ],
  },
  {
    key: 'currentSystems',
    label: 'Current Systems/Tools',
    type: 'text',
    placeholder: 'Existing systems or tools in use',
  },
  {
    key: 'decisionMaker',
    label: 'Decision Maker',
    type: 'select',
    options: [
      { value: 'self', label: 'Self' },
      { value: 'team', label: 'Team Decision' },
      { value: 'management', label: 'Management' },
      { value: 'cto', label: 'CTO/IT Head' },
      { value: 'ceo', label: 'CEO/Owner' },
    ],
  },
  {
    key: 'rfpRequired',
    label: 'RFP Required',
    type: 'boolean',
  },
  {
    key: 'ndaRequired',
    label: 'NDA Required',
    type: 'boolean',
  },
  {
    key: 'projectDescription',
    label: 'Project Description',
    type: 'textarea',
    gridSpan: 2,
    placeholder: 'Brief description of the project requirements',
  },
  {
    key: 'remarks',
    label: 'Additional Notes',
    type: 'textarea',
    gridSpan: 2,
  },
];

// Call Centers Industry Fields
const CALL_CENTERS_FIELDS: IndustryField[] = [
  {
    key: 'campaignType',
    label: 'Campaign Type',
    type: 'select',
    required: true,
    options: [
      { value: 'inbound', label: 'Inbound' },
      { value: 'outbound', label: 'Outbound' },
      { value: 'blended', label: 'Blended' },
    ],
  },
  {
    key: 'serviceCategory',
    label: 'Service Category',
    type: 'select',
    options: [
      { value: 'customer_support', label: 'Customer Support' },
      { value: 'sales', label: 'Sales/Telesales' },
      { value: 'technical_support', label: 'Technical Support' },
      { value: 'collections', label: 'Collections' },
      { value: 'survey', label: 'Survey/Market Research' },
      { value: 'appointment', label: 'Appointment Setting' },
      { value: 'lead_gen', label: 'Lead Generation' },
      { value: 'verification', label: 'Verification' },
    ],
  },
  {
    key: 'callDisposition',
    label: 'Call Disposition',
    type: 'select',
    options: [
      { value: 'interested', label: 'Interested' },
      { value: 'callback', label: 'Callback Requested' },
      { value: 'not_interested', label: 'Not Interested' },
      { value: 'wrong_number', label: 'Wrong Number' },
      { value: 'dnd', label: 'DND' },
      { value: 'no_answer', label: 'No Answer' },
      { value: 'busy', label: 'Busy' },
      { value: 'voicemail', label: 'Voicemail' },
      { value: 'transferred', label: 'Transferred' },
      { value: 'resolved', label: 'Resolved' },
    ],
  },
  {
    key: 'callbackDate',
    label: 'Callback Date',
    type: 'date',
  },
  {
    key: 'callbackTime',
    label: 'Callback Time',
    type: 'select',
    options: [
      { value: 'morning', label: 'Morning (9AM - 12PM)' },
      { value: 'afternoon', label: 'Afternoon (12PM - 4PM)' },
      { value: 'evening', label: 'Evening (4PM - 8PM)' },
    ],
  },
  {
    key: 'callDuration',
    label: 'Call Duration (mins)',
    type: 'number',
    min: 0,
  },
  {
    key: 'callQuality',
    label: 'Call Quality',
    type: 'select',
    options: [
      { value: 'excellent', label: 'Excellent' },
      { value: 'good', label: 'Good' },
      { value: 'average', label: 'Average' },
      { value: 'poor', label: 'Poor' },
    ],
  },
  {
    key: 'language',
    label: 'Preferred Language',
    type: 'select',
    options: [
      { value: 'english', label: 'English' },
      { value: 'hindi', label: 'Hindi' },
      { value: 'tamil', label: 'Tamil' },
      { value: 'telugu', label: 'Telugu' },
      { value: 'kannada', label: 'Kannada' },
      { value: 'marathi', label: 'Marathi' },
      { value: 'bengali', label: 'Bengali' },
      { value: 'gujarati', label: 'Gujarati' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'issueCategory',
    label: 'Issue Category',
    type: 'select',
    options: [
      { value: 'billing', label: 'Billing' },
      { value: 'technical', label: 'Technical' },
      { value: 'product', label: 'Product' },
      { value: 'delivery', label: 'Delivery' },
      { value: 'refund', label: 'Refund/Return' },
      { value: 'complaint', label: 'Complaint' },
      { value: 'general', label: 'General Inquiry' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    options: [
      { value: 'urgent', label: 'Urgent' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ],
  },
  {
    key: 'escalated',
    label: 'Escalated',
    type: 'boolean',
  },
  {
    key: 'escalatedTo',
    label: 'Escalated To',
    type: 'text',
    placeholder: 'Escalation team/person',
  },
  {
    key: 'ticketNumber',
    label: 'Ticket/Reference Number',
    type: 'text',
    placeholder: 'Enter ticket number',
  },
  {
    key: 'callNotes',
    label: 'Call Notes',
    type: 'textarea',
    gridSpan: 2,
    placeholder: 'Summary of the call',
  },
  {
    key: 'remarks',
    label: 'Additional Notes',
    type: 'textarea',
    gridSpan: 2,
  },
];

// Travel Industry Fields
const TRAVEL_FIELDS: IndustryField[] = [
  {
    key: 'travelType',
    label: 'Travel Type',
    type: 'select',
    required: true,
    options: [
      { value: 'domestic', label: 'Domestic' },
      { value: 'international', label: 'International' },
    ],
  },
  {
    key: 'tripType',
    label: 'Trip Type',
    type: 'select',
    options: [
      { value: 'leisure', label: 'Leisure/Vacation' },
      { value: 'business', label: 'Business' },
      { value: 'honeymoon', label: 'Honeymoon' },
      { value: 'family', label: 'Family Trip' },
      { value: 'pilgrimage', label: 'Pilgrimage' },
      { value: 'adventure', label: 'Adventure' },
      { value: 'group', label: 'Group Tour' },
    ],
  },
  {
    key: 'destination',
    label: 'Destination',
    type: 'text',
    required: true,
    placeholder: 'Enter destination',
  },
  {
    key: 'departureCity',
    label: 'Departure City',
    type: 'text',
    placeholder: 'Enter departure city',
  },
  {
    key: 'travelDate',
    label: 'Travel Date',
    type: 'date',
  },
  {
    key: 'returnDate',
    label: 'Return Date',
    type: 'date',
  },
  {
    key: 'duration',
    label: 'Duration (Nights)',
    type: 'number',
    min: 1,
    max: 60,
  },
  {
    key: 'travelers',
    label: 'Number of Travelers',
    type: 'number',
    min: 1,
    max: 50,
  },
  {
    key: 'adults',
    label: 'Adults',
    type: 'number',
    min: 1,
  },
  {
    key: 'children',
    label: 'Children',
    type: 'number',
    min: 0,
  },
  {
    key: 'infants',
    label: 'Infants',
    type: 'number',
    min: 0,
  },
  {
    key: 'budget',
    label: 'Budget Per Person',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Budget per person',
  },
  {
    key: 'totalBudget',
    label: 'Total Budget',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Total trip budget',
  },
  {
    key: 'packageType',
    label: 'Package Type',
    type: 'select',
    options: [
      { value: 'full', label: 'Full Package (Flight + Hotel + Transfers)' },
      { value: 'flight_hotel', label: 'Flight + Hotel' },
      { value: 'hotel_only', label: 'Hotel Only' },
      { value: 'flight_only', label: 'Flight Only' },
      { value: 'custom', label: 'Custom Package' },
    ],
  },
  {
    key: 'hotelCategory',
    label: 'Hotel Category',
    type: 'select',
    options: [
      { value: '3star', label: '3 Star' },
      { value: '4star', label: '4 Star' },
      { value: '5star', label: '5 Star' },
      { value: 'luxury', label: 'Luxury/Premium' },
      { value: 'budget', label: 'Budget' },
      { value: 'hostel', label: 'Hostel/Backpacker' },
    ],
  },
  {
    key: 'roomType',
    label: 'Room Type',
    type: 'select',
    options: [
      { value: 'single', label: 'Single' },
      { value: 'double', label: 'Double' },
      { value: 'twin', label: 'Twin' },
      { value: 'triple', label: 'Triple' },
      { value: 'family', label: 'Family Room' },
      { value: 'suite', label: 'Suite' },
    ],
  },
  {
    key: 'mealPlan',
    label: 'Meal Plan',
    type: 'select',
    options: [
      { value: 'ep', label: 'Room Only (EP)' },
      { value: 'cp', label: 'Breakfast (CP)' },
      { value: 'map', label: 'Breakfast + Dinner (MAP)' },
      { value: 'ap', label: 'All Meals (AP)' },
      { value: 'ai', label: 'All Inclusive' },
    ],
  },
  {
    key: 'flightClass',
    label: 'Flight Class',
    type: 'select',
    options: [
      { value: 'economy', label: 'Economy' },
      { value: 'premium_economy', label: 'Premium Economy' },
      { value: 'business', label: 'Business' },
      { value: 'first', label: 'First Class' },
    ],
  },
  {
    key: 'visaRequired',
    label: 'Visa Assistance Required',
    type: 'boolean',
  },
  {
    key: 'travelInsurance',
    label: 'Travel Insurance Required',
    type: 'boolean',
  },
  {
    key: 'specialRequests',
    label: 'Special Requests',
    type: 'multiselect',
    options: [
      { value: 'wheelchair', label: 'Wheelchair Assistance' },
      { value: 'vegetarian', label: 'Vegetarian Meals' },
      { value: 'halal', label: 'Halal Meals' },
      { value: 'honeymoon', label: 'Honeymoon Setup' },
      { value: 'anniversary', label: 'Anniversary Celebration' },
      { value: 'airport_transfer', label: 'Airport Transfers' },
      { value: 'guide', label: 'Local Guide' },
    ],
  },
  {
    key: 'passportNumber',
    label: 'Passport Number',
    type: 'text',
    placeholder: 'For international travel',
  },
  {
    key: 'remarks',
    label: 'Additional Notes',
    type: 'textarea',
    gridSpan: 2,
  },
];

// Fitness Industry Fields
const FITNESS_FIELDS: IndustryField[] = [
  {
    key: 'membershipType',
    label: 'Membership Type',
    type: 'select',
    required: true,
    options: [
      { value: 'gym', label: 'Gym Only' },
      { value: 'gym_cardio', label: 'Gym + Cardio' },
      { value: 'group_classes', label: 'Group Classes' },
      { value: 'personal_training', label: 'Personal Training' },
      { value: 'swimming', label: 'Swimming' },
      { value: 'yoga', label: 'Yoga' },
      { value: 'martial_arts', label: 'Martial Arts' },
      { value: 'crossfit', label: 'CrossFit' },
      { value: 'all_access', label: 'All Access' },
    ],
  },
  {
    key: 'fitnessGoal',
    label: 'Fitness Goal',
    type: 'select',
    options: [
      { value: 'weight_loss', label: 'Weight Loss' },
      { value: 'muscle_gain', label: 'Muscle Gain' },
      { value: 'general_fitness', label: 'General Fitness' },
      { value: 'strength', label: 'Strength Training' },
      { value: 'flexibility', label: 'Flexibility' },
      { value: 'endurance', label: 'Endurance' },
      { value: 'sports', label: 'Sports Performance' },
      { value: 'rehab', label: 'Rehabilitation' },
    ],
  },
  {
    key: 'experienceLevel',
    label: 'Experience Level',
    type: 'select',
    options: [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'athlete', label: 'Athlete' },
    ],
  },
  {
    key: 'preferredTime',
    label: 'Preferred Workout Time',
    type: 'select',
    options: [
      { value: 'early_morning', label: 'Early Morning (5-7 AM)' },
      { value: 'morning', label: 'Morning (7-10 AM)' },
      { value: 'afternoon', label: 'Afternoon (12-4 PM)' },
      { value: 'evening', label: 'Evening (4-7 PM)' },
      { value: 'night', label: 'Night (7-10 PM)' },
      { value: 'flexible', label: 'Flexible' },
    ],
  },
  {
    key: 'durationPlan',
    label: 'Membership Duration',
    type: 'select',
    options: [
      { value: '1month', label: '1 Month' },
      { value: '3months', label: '3 Months' },
      { value: '6months', label: '6 Months' },
      { value: '1year', label: '1 Year' },
      { value: '2years', label: '2 Years' },
      { value: 'trial', label: 'Trial Session' },
    ],
  },
  {
    key: 'budget',
    label: 'Budget (Monthly)',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Monthly budget',
  },
  {
    key: 'trialDate',
    label: 'Preferred Trial Date',
    type: 'date',
  },
  {
    key: 'age',
    label: 'Age',
    type: 'number',
    min: 10,
    max: 100,
  },
  {
    key: 'weight',
    label: 'Current Weight (kg)',
    type: 'number',
    min: 20,
    max: 300,
  },
  {
    key: 'height',
    label: 'Height (cm)',
    type: 'number',
    min: 100,
    max: 250,
  },
  {
    key: 'healthConditions',
    label: 'Health Conditions',
    type: 'multiselect',
    options: [
      { value: 'none', label: 'None' },
      { value: 'diabetes', label: 'Diabetes' },
      { value: 'hypertension', label: 'Hypertension' },
      { value: 'heart', label: 'Heart Condition' },
      { value: 'back_pain', label: 'Back Pain' },
      { value: 'knee_injury', label: 'Knee Injury' },
      { value: 'asthma', label: 'Asthma' },
      { value: 'thyroid', label: 'Thyroid' },
      { value: 'pregnancy', label: 'Pregnancy' },
    ],
  },
  {
    key: 'previousGym',
    label: 'Previous Gym Experience',
    type: 'text',
    placeholder: 'Previous gym name',
  },
  {
    key: 'referredBy',
    label: 'Referred By',
    type: 'text',
    placeholder: 'Referral name or code',
  },
  {
    key: 'personalTrainerRequired',
    label: 'Personal Trainer Required',
    type: 'boolean',
  },
  {
    key: 'dietPlanRequired',
    label: 'Diet Plan Required',
    type: 'boolean',
  },
  {
    key: 'remarks',
    label: 'Additional Notes',
    type: 'textarea',
    gridSpan: 2,
  },
];

// B2B Sales Industry Fields
const B2B_SALES_FIELDS: IndustryField[] = [
  {
    key: 'companyName',
    label: 'Company Name',
    type: 'text',
    required: true,
    placeholder: 'Enter company name',
  },
  {
    key: 'companySize',
    label: 'Company Size',
    type: 'select',
    options: [
      { value: 'startup', label: 'Startup (1-10)' },
      { value: 'small', label: 'Small (11-50)' },
      { value: 'medium', label: 'Medium (51-200)' },
      { value: 'large', label: 'Large (201-1000)' },
      { value: 'enterprise', label: 'Enterprise (1000+)' },
    ],
  },
  {
    key: 'industry',
    label: 'Industry',
    type: 'select',
    options: [
      { value: 'technology', label: 'Technology' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'retail', label: 'Retail' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'finance', label: 'Finance' },
      { value: 'education', label: 'Education' },
      { value: 'logistics', label: 'Logistics' },
      { value: 'hospitality', label: 'Hospitality' },
      { value: 'construction', label: 'Construction' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'productInterest',
    label: 'Product/Service Interest',
    type: 'text',
    required: true,
    placeholder: 'Product or service of interest',
  },
  {
    key: 'useCase',
    label: 'Use Case',
    type: 'textarea',
    placeholder: 'Describe the use case',
  },
  {
    key: 'currentSolution',
    label: 'Current Solution',
    type: 'text',
    placeholder: 'What are they currently using?',
  },
  {
    key: 'painPoints',
    label: 'Pain Points',
    type: 'multiselect',
    options: [
      { value: 'cost', label: 'High Cost' },
      { value: 'efficiency', label: 'Low Efficiency' },
      { value: 'scalability', label: 'Scalability Issues' },
      { value: 'support', label: 'Poor Support' },
      { value: 'features', label: 'Missing Features' },
      { value: 'integration', label: 'Integration Problems' },
      { value: 'reliability', label: 'Reliability Issues' },
    ],
  },
  {
    key: 'budget',
    label: 'Budget',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Enter budget',
  },
  {
    key: 'budgetApproved',
    label: 'Budget Approved',
    type: 'boolean',
  },
  {
    key: 'decisionMaker',
    label: 'Decision Maker',
    type: 'select',
    options: [
      { value: 'self', label: 'Self' },
      { value: 'team', label: 'Team Decision' },
      { value: 'manager', label: 'Manager' },
      { value: 'director', label: 'Director/VP' },
      { value: 'cxo', label: 'C-Level' },
      { value: 'board', label: 'Board/Committee' },
    ],
  },
  {
    key: 'decisionTimeline',
    label: 'Decision Timeline',
    type: 'select',
    options: [
      { value: 'immediate', label: 'Immediate' },
      { value: '1month', label: 'Within 1 Month' },
      { value: '3months', label: 'Within 3 Months' },
      { value: '6months', label: 'Within 6 Months' },
      { value: '1year', label: 'Within 1 Year' },
      { value: 'exploring', label: 'Just Exploring' },
    ],
  },
  {
    key: 'purchaseProcess',
    label: 'Purchase Process',
    type: 'select',
    options: [
      { value: 'direct', label: 'Direct Purchase' },
      { value: 'rfp', label: 'RFP/RFQ' },
      { value: 'tender', label: 'Tender' },
      { value: 'poc', label: 'POC First' },
      { value: 'trial', label: 'Trial Period' },
    ],
  },
  {
    key: 'quantity',
    label: 'Expected Quantity/Licenses',
    type: 'number',
    min: 1,
    placeholder: 'Number of licenses/units',
  },
  {
    key: 'contractType',
    label: 'Contract Type',
    type: 'select',
    options: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'annual', label: 'Annual' },
      { value: 'multi_year', label: 'Multi-Year' },
      { value: 'one_time', label: 'One-Time Purchase' },
    ],
  },
  {
    key: 'competitors',
    label: 'Competitors Being Evaluated',
    type: 'text',
    placeholder: 'Other vendors being considered',
  },
  {
    key: 'nextSteps',
    label: 'Next Steps',
    type: 'select',
    options: [
      { value: 'demo', label: 'Schedule Demo' },
      { value: 'proposal', label: 'Send Proposal' },
      { value: 'poc', label: 'Arrange POC' },
      { value: 'meeting', label: 'Meeting with Team' },
      { value: 'follow_up', label: 'Follow Up Later' },
      { value: 'negotiation', label: 'Price Negotiation' },
    ],
  },
  {
    key: 'followUpDate',
    label: 'Follow-up Date',
    type: 'date',
  },
  {
    key: 'linkedinUrl',
    label: 'Company LinkedIn',
    type: 'text',
    placeholder: 'LinkedIn URL',
  },
  {
    key: 'websiteUrl',
    label: 'Company Website',
    type: 'text',
    placeholder: 'Website URL',
  },
  {
    key: 'remarks',
    label: 'Additional Notes',
    type: 'textarea',
    gridSpan: 2,
  },
];

// E-Commerce Industry Fields
const ECOMMERCE_FIELDS: IndustryField[] = [
  {
    key: 'productInterests',
    label: 'Product Interests',
    type: 'multiselect',
    options: [
      { value: 'electronics', label: 'Electronics' },
      { value: 'fashion', label: 'Fashion & Apparel' },
      { value: 'home_decor', label: 'Home & Decor' },
      { value: 'beauty', label: 'Beauty & Personal Care' },
      { value: 'sports', label: 'Sports & Fitness' },
      { value: 'books', label: 'Books' },
      { value: 'toys', label: 'Toys & Games' },
      { value: 'grocery', label: 'Grocery' },
      { value: 'health', label: 'Health & Wellness' },
      { value: 'automotive', label: 'Automotive' },
    ],
  },
  {
    key: 'cartValue',
    label: 'Cart Value',
    type: 'currency',
    unit: 'INR',
    placeholder: 'Current cart value',
  },
  {
    key: 'cartItems',
    label: 'Number of Items in Cart',
    type: 'number',
    min: 0,
  },
  {
    key: 'abandonedCartReason',
    label: 'Cart Abandonment Reason',
    type: 'select',
    options: [
      { value: 'high_price', label: 'High Price' },
      { value: 'shipping_cost', label: 'High Shipping Cost' },
      { value: 'payment_issue', label: 'Payment Issues' },
      { value: 'just_browsing', label: 'Just Browsing' },
      { value: 'comparison', label: 'Comparing Prices' },
      { value: 'delivery_time', label: 'Long Delivery Time' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'preferredPaymentMethod',
    label: 'Preferred Payment Method',
    type: 'select',
    options: [
      { value: 'upi', label: 'UPI' },
      { value: 'card', label: 'Credit/Debit Card' },
      { value: 'netbanking', label: 'Net Banking' },
      { value: 'wallet', label: 'Wallet' },
      { value: 'cod', label: 'Cash on Delivery' },
      { value: 'emi', label: 'EMI' },
      { value: 'bnpl', label: 'Buy Now Pay Later' },
    ],
  },
  {
    key: 'deliveryAddress',
    label: 'Delivery Address',
    type: 'textarea',
    placeholder: 'Enter delivery address',
  },
  {
    key: 'pincode',
    label: 'Delivery Pincode',
    type: 'text',
    placeholder: 'Enter pincode',
  },
  {
    key: 'preferredDeliveryTime',
    label: 'Preferred Delivery Time',
    type: 'select',
    options: [
      { value: 'morning', label: 'Morning (9AM - 12PM)' },
      { value: 'afternoon', label: 'Afternoon (12PM - 4PM)' },
      { value: 'evening', label: 'Evening (4PM - 8PM)' },
      { value: 'anytime', label: 'Anytime' },
    ],
  },
  {
    key: 'customerType',
    label: 'Customer Type',
    type: 'select',
    options: [
      { value: 'new', label: 'New Customer' },
      { value: 'returning', label: 'Returning Customer' },
      { value: 'vip', label: 'VIP Customer' },
      { value: 'wholesale', label: 'Wholesale Buyer' },
    ],
  },
  {
    key: 'membershipTier',
    label: 'Membership Tier',
    type: 'select',
    options: [
      { value: 'basic', label: 'Basic' },
      { value: 'silver', label: 'Silver' },
      { value: 'gold', label: 'Gold' },
      { value: 'platinum', label: 'Platinum' },
    ],
  },
  {
    key: 'previousOrderCount',
    label: 'Previous Orders',
    type: 'number',
    min: 0,
  },
  {
    key: 'totalSpent',
    label: 'Total Amount Spent',
    type: 'currency',
    unit: 'INR',
  },
  {
    key: 'discountCode',
    label: 'Discount Code Used',
    type: 'text',
    placeholder: 'Enter discount code',
  },
  {
    key: 'referralCode',
    label: 'Referral Code',
    type: 'text',
    placeholder: 'Enter referral code',
  },
  {
    key: 'wishlistItems',
    label: 'Wishlist Items',
    type: 'number',
    min: 0,
  },
  {
    key: 'remarks',
    label: 'Additional Notes',
    type: 'textarea',
    gridSpan: 2,
  },
];

// Industry Field Configurations Map
export const INDUSTRY_FIELD_CONFIGS: Record<OrganizationIndustry, IndustryFieldConfig> = {
  REAL_ESTATE: {
    industry: 'REAL_ESTATE',
    label: 'Real Estate',
    icon: 'BuildingOffice2Icon',
    color: '#F97316',
    fields: REAL_ESTATE_FIELDS,
  },
  HEALTHCARE: {
    industry: 'HEALTHCARE',
    label: 'Healthcare',
    icon: 'HeartIcon',
    color: '#EC4899',
    fields: HEALTHCARE_FIELDS,
  },
  INSURANCE: {
    industry: 'INSURANCE',
    label: 'Insurance',
    icon: 'ShieldCheckIcon',
    color: '#6366F1',
    fields: INSURANCE_FIELDS,
  },
  FINANCE: {
    industry: 'FINANCE',
    label: 'Finance',
    icon: 'BanknotesIcon',
    color: '#10B981',
    fields: FINANCE_FIELDS,
  },
  IT_RECRUITMENT: {
    industry: 'IT_RECRUITMENT',
    label: 'IT Recruitment',
    icon: 'ComputerDesktopIcon',
    color: '#8B5CF6',
    fields: IT_RECRUITMENT_FIELDS,
  },
  ECOMMERCE: {
    industry: 'ECOMMERCE',
    label: 'E-Commerce',
    icon: 'ShoppingCartIcon',
    color: '#F59E0B',
    fields: ECOMMERCE_FIELDS,
  },
  EDUCATION: {
    industry: 'EDUCATION',
    label: 'Education',
    icon: 'AcademicCapIcon',
    color: '#10B981',
    fields: [], // Education has dedicated models, no custom fields needed
  },
  AUTOMOTIVE: {
    industry: 'AUTOMOTIVE',
    label: 'Automotive',
    icon: 'TruckIcon',
    color: '#DC2626',
    fields: [
      { key: 'vehicleType', label: 'Vehicle Type', type: 'select', required: true, options: [
        { value: 'car', label: 'Car' }, { value: 'suv', label: 'SUV' }, { value: 'truck', label: 'Truck' },
        { value: 'motorcycle', label: 'Motorcycle' }, { value: 'commercial', label: 'Commercial Vehicle' },
      ]},
      { key: 'brand', label: 'Preferred Brand', type: 'text', placeholder: 'e.g., Toyota, Honda' },
      { key: 'budget', label: 'Budget', type: 'currency', unit: 'INR' },
      { key: 'purchaseType', label: 'Purchase Type', type: 'select', options: [
        { value: 'new', label: 'New' }, { value: 'used', label: 'Used' }, { value: 'lease', label: 'Lease' },
      ]},
      { key: 'tradeIn', label: 'Trade-In Vehicle', type: 'boolean' },
      { key: 'financingNeeded', label: 'Financing Needed', type: 'boolean' },
      { key: 'testDriveDate', label: 'Test Drive Date', type: 'date' },
      { key: 'remarks', label: 'Additional Notes', type: 'textarea', gridSpan: 2 },
    ],
  },
  IT_SERVICES: {
    industry: 'IT_SERVICES',
    label: 'IT Services',
    icon: 'ServerIcon',
    color: '#0EA5E9',
    fields: [
      { key: 'serviceType', label: 'Service Type', type: 'select', required: true, options: [
        { value: 'consulting', label: 'IT Consulting' }, { value: 'development', label: 'Software Development' },
        { value: 'support', label: 'IT Support' }, { value: 'cloud', label: 'Cloud Services' },
        { value: 'security', label: 'Cybersecurity' }, { value: 'infrastructure', label: 'Infrastructure' },
      ]},
      { key: 'companySize', label: 'Company Size', type: 'select', options: [
        { value: 'startup', label: 'Startup (1-10)' }, { value: 'small', label: 'Small (11-50)' },
        { value: 'medium', label: 'Medium (51-200)' }, { value: 'large', label: 'Large (200+)' },
      ]},
      { key: 'projectBudget', label: 'Project Budget', type: 'currency', unit: 'INR' },
      { key: 'timeline', label: 'Expected Timeline', type: 'text', placeholder: 'e.g., 3 months' },
      { key: 'currentStack', label: 'Current Tech Stack', type: 'textarea' },
      { key: 'requirements', label: 'Requirements Summary', type: 'textarea', gridSpan: 2 },
    ],
  },
  CALL_CENTERS: {
    industry: 'CALL_CENTERS',
    label: 'Call Centers',
    icon: 'PhoneIcon',
    color: '#7C3AED',
    fields: [
      { key: 'serviceType', label: 'Service Type', type: 'select', required: true, options: [
        { value: 'inbound', label: 'Inbound' }, { value: 'outbound', label: 'Outbound' },
        { value: 'blended', label: 'Blended' }, { value: 'bpo', label: 'BPO Services' },
      ]},
      { key: 'agentCount', label: 'Required Agents', type: 'number', min: 1 },
      { key: 'language', label: 'Languages Required', type: 'multiselect', options: [
        { value: 'english', label: 'English' }, { value: 'hindi', label: 'Hindi' },
        { value: 'regional', label: 'Regional Languages' },
      ]},
      { key: 'shiftType', label: 'Shift Type', type: 'select', options: [
        { value: 'day', label: 'Day Shift' }, { value: 'night', label: 'Night Shift' },
        { value: '24x7', label: '24x7' },
      ]},
      { key: 'monthlyBudget', label: 'Monthly Budget', type: 'currency', unit: 'INR' },
      { key: 'startDate', label: 'Expected Start Date', type: 'date' },
      { key: 'remarks', label: 'Additional Requirements', type: 'textarea', gridSpan: 2 },
    ],
  },
  TRAVEL: {
    industry: 'TRAVEL',
    label: 'Travel & Tourism',
    icon: 'GlobeAltIcon',
    color: '#06B6D4',
    fields: [
      { key: 'travelType', label: 'Travel Type', type: 'select', required: true, options: [
        { value: 'domestic', label: 'Domestic' }, { value: 'international', label: 'International' },
        { value: 'pilgrimage', label: 'Pilgrimage' }, { value: 'honeymoon', label: 'Honeymoon' },
        { value: 'corporate', label: 'Corporate Travel' },
      ]},
      { key: 'destination', label: 'Destination', type: 'text', required: true },
      { key: 'travelers', label: 'Number of Travelers', type: 'number', min: 1 },
      { key: 'travelDate', label: 'Travel Date', type: 'date' },
      { key: 'returnDate', label: 'Return Date', type: 'date' },
      { key: 'budget', label: 'Budget per Person', type: 'currency', unit: 'INR' },
      { key: 'accommodation', label: 'Accommodation Type', type: 'select', options: [
        { value: 'budget', label: 'Budget' }, { value: '3star', label: '3 Star' },
        { value: '4star', label: '4 Star' }, { value: '5star', label: '5 Star' },
      ]},
      { key: 'specialRequests', label: 'Special Requests', type: 'textarea', gridSpan: 2 },
    ],
  },
  FITNESS: {
    industry: 'FITNESS',
    label: 'Fitness & Wellness',
    icon: 'HeartIcon',
    color: '#F43F5E',
    fields: [
      { key: 'membershipType', label: 'Membership Interest', type: 'select', required: true, options: [
        { value: 'gym', label: 'Gym Membership' }, { value: 'yoga', label: 'Yoga Classes' },
        { value: 'personal', label: 'Personal Training' }, { value: 'group', label: 'Group Classes' },
        { value: 'spa', label: 'Spa & Wellness' },
      ]},
      { key: 'fitnessGoal', label: 'Fitness Goal', type: 'select', options: [
        { value: 'weight_loss', label: 'Weight Loss' }, { value: 'muscle_gain', label: 'Muscle Gain' },
        { value: 'flexibility', label: 'Flexibility' }, { value: 'general', label: 'General Fitness' },
      ]},
      { key: 'preferredTime', label: 'Preferred Time', type: 'select', options: [
        { value: 'morning', label: 'Morning' }, { value: 'afternoon', label: 'Afternoon' },
        { value: 'evening', label: 'Evening' },
      ]},
      { key: 'budget', label: 'Monthly Budget', type: 'currency', unit: 'INR' },
      { key: 'trialDate', label: 'Trial Session Date', type: 'date' },
      { key: 'healthConditions', label: 'Health Conditions', type: 'textarea' },
    ],
  },
  B2B_SALES: {
    industry: 'B2B_SALES',
    label: 'B2B Sales',
    icon: 'BuildingOffice2Icon',
    color: '#4F46E5',
    fields: [
      { key: 'companyName', label: 'Company Name', type: 'text', required: true },
      { key: 'industry', label: 'Client Industry', type: 'text' },
      { key: 'companySize', label: 'Company Size', type: 'select', options: [
        { value: 'startup', label: 'Startup (1-10)' }, { value: 'small', label: 'Small (11-50)' },
        { value: 'medium', label: 'Medium (51-200)' }, { value: 'enterprise', label: 'Enterprise (200+)' },
      ]},
      { key: 'dealValue', label: 'Expected Deal Value', type: 'currency', unit: 'INR' },
      { key: 'decisionMaker', label: 'Decision Maker', type: 'text' },
      { key: 'decisionTimeline', label: 'Decision Timeline', type: 'select', options: [
        { value: 'immediate', label: 'Immediate' }, { value: '1month', label: 'Within 1 Month' },
        { value: '3months', label: '1-3 Months' }, { value: '6months', label: '3-6 Months' },
      ]},
      { key: 'competitors', label: 'Competitors Considered', type: 'textarea' },
      { key: 'requirements', label: 'Requirements', type: 'textarea', gridSpan: 2 },
    ],
  },
  GENERAL: {
    industry: 'GENERAL',
    label: 'General',
    icon: 'BuildingOfficeIcon',
    color: '#6B7280',
    fields: [], // General industry - no specific fields
  },
};

/**
 * Get field configuration for a specific industry
 */
export function getIndustryFieldConfig(industry: OrganizationIndustry): IndustryFieldConfig {
  return INDUSTRY_FIELD_CONFIGS[industry] || INDUSTRY_FIELD_CONFIGS.GENERAL;
}

/**
 * Get all fields for an industry
 */
export function getIndustryFields(industry: OrganizationIndustry): IndustryField[] {
  return INDUSTRY_FIELD_CONFIGS[industry]?.fields || [];
}

/**
 * Get required fields for an industry
 */
export function getRequiredFields(industry: OrganizationIndustry): IndustryField[] {
  return getIndustryFields(industry).filter((field) => field.required);
}

/**
 * Validate custom fields against industry schema
 */
export function validateCustomFields(
  industry: OrganizationIndustry,
  customFields: Record<string, any>
): { valid: boolean; errors: string[] } {
  const fields = getIndustryFields(industry);
  const errors: string[] = [];

  // Check required fields
  for (const field of fields) {
    if (field.required && !customFields[field.key]) {
      errors.push(`${field.label} is required`);
    }
  }

  // Validate field types
  for (const [key, value] of Object.entries(customFields)) {
    const fieldDef = fields.find((f) => f.key === key);
    if (!fieldDef) continue;

    if (value !== null && value !== undefined && value !== '') {
      switch (fieldDef.type) {
        case 'number':
        case 'currency':
          if (typeof value !== 'number' && isNaN(Number(value))) {
            errors.push(`${fieldDef.label} must be a number`);
          }
          if (fieldDef.min !== undefined && Number(value) < fieldDef.min) {
            errors.push(`${fieldDef.label} must be at least ${fieldDef.min}`);
          }
          if (fieldDef.max !== undefined && Number(value) > fieldDef.max) {
            errors.push(`${fieldDef.label} must be at most ${fieldDef.max}`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${fieldDef.label} must be a boolean`);
          }
          break;
        case 'select':
          if (fieldDef.options && !fieldDef.options.some((opt) => opt.value === value)) {
            errors.push(`${fieldDef.label} has an invalid value`);
          }
          break;
        case 'multiselect':
          if (Array.isArray(value)) {
            if (fieldDef.options) {
              const validValues = fieldDef.options.map((opt) => opt.value);
              for (const v of value) {
                if (!validValues.includes(v)) {
                  errors.push(`${fieldDef.label} contains invalid value: ${v}`);
                }
              }
            }
          }
          break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get default values for industry fields
 */
export function getDefaultFieldValues(industry: OrganizationIndustry): Record<string, any> {
  const fields = getIndustryFields(industry);
  const defaults: Record<string, any> = {};

  for (const field of fields) {
    switch (field.type) {
      case 'boolean':
        defaults[field.key] = false;
        break;
      case 'multiselect':
        defaults[field.key] = [];
        break;
      default:
        defaults[field.key] = null;
    }
  }

  return defaults;
}
