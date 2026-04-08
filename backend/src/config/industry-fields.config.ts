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
