/**
 * Create Lead Page
 * Tab-based form for creating a single lead with industry-specific fields
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  TagIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { CustomFieldsRenderer } from '../../components/CustomFieldsRenderer';
import { RootState } from '../../store';
import api from '../../services/api';

interface LeadStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface LeadSource {
  value: string;
  label: string;
}

const LEAD_SOURCES: LeadSource[] = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'ADVERTISEMENT', label: 'Advertisement' },
  { value: 'COLD_CALL', label: 'Cold Call' },
  { value: 'EMAIL_CAMPAIGN', label: 'Email Campaign' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'EVENT', label: 'Event/Exhibition' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'OTHER', label: 'Other' },
];

// Industry-specific field definitions
const INDUSTRY_FIELDS: Record<string, Array<{ key: string; label: string; type: string; options?: string[]; required?: boolean }>> = {
  REAL_ESTATE: [
    { key: 'propertyType', label: 'Property Type', type: 'select', options: ['Apartment', 'Villa', 'Plot', 'Commercial', 'Office Space', 'Warehouse'] },
    { key: 'budget', label: 'Budget (₹)', type: 'number' },
    { key: 'preferredLocations', label: 'Preferred Locations', type: 'text' },
    { key: 'bhkRequirement', label: 'BHK Requirement', type: 'select', options: ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK', 'N/A'] },
    { key: 'possessionTimeline', label: 'Possession Timeline', type: 'select', options: ['Immediate', '3 months', '6 months', '1 year', '2+ years'] },
    { key: 'propertyPurpose', label: 'Purpose', type: 'select', options: ['Self Use', 'Investment', 'Rental', 'Business'] },
  ],
  HEALTHCARE: [
    { key: 'condition', label: 'Medical Condition/Reason', type: 'text' },
    { key: 'preferredDoctor', label: 'Preferred Doctor', type: 'text' },
    { key: 'appointmentType', label: 'Appointment Type', type: 'select', options: ['Consultation', 'Follow-up', 'Procedure', 'Test/Diagnostic', 'Surgery'] },
    { key: 'insuranceProvider', label: 'Insurance Provider', type: 'text' },
    { key: 'preferredDate', label: 'Preferred Date', type: 'text' },
    { key: 'referredBy', label: 'Referred By', type: 'text' },
  ],
  INSURANCE: [
    { key: 'policyType', label: 'Policy Type', type: 'select', options: ['Life', 'Health', 'Motor', 'Home', 'Travel', 'Business'] },
    { key: 'coverageAmount', label: 'Coverage Amount (₹)', type: 'number' },
    { key: 'currentInsurer', label: 'Current Insurer', type: 'text' },
    { key: 'premiumBudget', label: 'Premium Budget (₹/month)', type: 'number' },
    { key: 'policyTerm', label: 'Policy Term (Years)', type: 'select', options: ['1 Year', '5 Years', '10 Years', '15 Years', '20 Years', '30 Years'] },
    { key: 'existingPolicies', label: 'Existing Policies', type: 'text' },
  ],
  FINANCE: [
    { key: 'loanType', label: 'Loan Type', type: 'select', options: ['Home Loan', 'Personal Loan', 'Business Loan', 'Car Loan', 'Education Loan', 'Gold Loan', 'Loan Against Property'] },
    { key: 'loanAmount', label: 'Loan Amount (₹)', type: 'number' },
    { key: 'employmentType', label: 'Employment Type', type: 'select', options: ['Salaried', 'Self-employed', 'Business Owner', 'Professional', 'Retired'] },
    { key: 'monthlyIncome', label: 'Monthly Income (₹)', type: 'number' },
    { key: 'loanTenure', label: 'Preferred Tenure', type: 'select', options: ['1 Year', '3 Years', '5 Years', '10 Years', '15 Years', '20 Years'] },
    { key: 'existingLoans', label: 'Existing Loans', type: 'text' },
  ],
  IT_RECRUITMENT: [
    { key: 'skills', label: 'Key Skills', type: 'text' },
    { key: 'experienceYears', label: 'Experience (Years)', type: 'number' },
    { key: 'currentCTC', label: 'Current CTC (₹ LPA)', type: 'number' },
    { key: 'expectedCTC', label: 'Expected CTC (₹ LPA)', type: 'number' },
    { key: 'noticePeriod', label: 'Notice Period', type: 'select', options: ['Immediate', '15 days', '30 days', '60 days', '90 days'] },
    { key: 'currentCompany', label: 'Current Company', type: 'text' },
    { key: 'preferredLocation', label: 'Preferred Location', type: 'text' },
    { key: 'jobType', label: 'Job Type', type: 'select', options: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Remote'] },
  ],
  ECOMMERCE: [
    { key: 'productInterests', label: 'Product Interests', type: 'text' },
    { key: 'cartValue', label: 'Cart Value (₹)', type: 'number' },
    { key: 'preferredPaymentMethod', label: 'Preferred Payment', type: 'select', options: ['COD', 'UPI', 'Card', 'Net Banking', 'EMI', 'Wallet'] },
    { key: 'deliveryAddress', label: 'Delivery Pincode', type: 'text' },
    { key: 'orderFrequency', label: 'Order Frequency', type: 'select', options: ['First Time', 'Occasional', 'Regular', 'Frequent'] },
  ],
  EDUCATION: [
    { key: 'courseInterest', label: 'Course Interest', type: 'text' },
    { key: 'currentQualification', label: 'Current Qualification', type: 'select', options: ['10th', '12th', 'Diploma', 'Graduate', 'Post Graduate', 'PhD', 'Other'] },
    { key: 'yearOfPassing', label: 'Year of Passing', type: 'number' },
    { key: 'preferredIntake', label: 'Preferred Intake', type: 'select', options: ['January', 'April', 'July', 'September'] },
    { key: 'studyMode', label: 'Study Mode', type: 'select', options: ['Full-time', 'Part-time', 'Distance', 'Online'] },
    { key: 'scholarshipRequired', label: 'Scholarship Required', type: 'select', options: ['Yes', 'No', 'Maybe'] },
  ],
  AUTOMOTIVE: [
    { key: 'vehicleType', label: 'Vehicle Type', type: 'select', options: ['Car', 'SUV', 'Sedan', 'Hatchback', 'Motorcycle', 'Scooter', 'Commercial Vehicle'] },
    { key: 'brand', label: 'Preferred Brand', type: 'text' },
    { key: 'model', label: 'Model Interest', type: 'text' },
    { key: 'budget', label: 'Budget (₹)', type: 'number' },
    { key: 'fuelType', label: 'Fuel Type', type: 'select', options: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'] },
    { key: 'transmission', label: 'Transmission', type: 'select', options: ['Manual', 'Automatic', 'Any'] },
    { key: 'purchaseTimeline', label: 'Purchase Timeline', type: 'select', options: ['Immediate', '1 Month', '3 Months', '6 Months', 'Just Exploring'] },
    { key: 'exchangeVehicle', label: 'Exchange Old Vehicle', type: 'select', options: ['Yes', 'No'] },
  ],
  IT_SERVICES: [
    { key: 'serviceType', label: 'Service Type', type: 'select', options: ['Web Development', 'Mobile App', 'Cloud Services', 'Data Analytics', 'AI/ML', 'DevOps', 'Cybersecurity', 'Other'] },
    { key: 'projectDescription', label: 'Project Description', type: 'text' },
    { key: 'budget', label: 'Budget (₹)', type: 'number' },
    { key: 'timeline', label: 'Timeline', type: 'select', options: ['1 Month', '3 Months', '6 Months', '1 Year', 'Ongoing'] },
    { key: 'teamSize', label: 'Team Size Required', type: 'select', options: ['1-2', '3-5', '6-10', '10+'] },
    { key: 'engagementModel', label: 'Engagement Model', type: 'select', options: ['Fixed Price', 'Time & Material', 'Dedicated Team', 'Hybrid'] },
  ],
  CALL_CENTERS: [
    { key: 'serviceType', label: 'Service Type', type: 'select', options: ['Inbound', 'Outbound', 'Both', 'Chat Support', 'Email Support', 'Technical Support'] },
    { key: 'volume', label: 'Expected Volume/Day', type: 'number' },
    { key: 'language', label: 'Language Required', type: 'select', options: ['English', 'Hindi', 'Regional', 'Multilingual'] },
    { key: 'workingHours', label: 'Working Hours', type: 'select', options: ['Day Shift', 'Night Shift', '24x7', 'Flexible'] },
    { key: 'industry', label: 'Industry', type: 'text' },
    { key: 'budget', label: 'Budget (₹/month)', type: 'number' },
  ],
  TRAVEL: [
    { key: 'travelType', label: 'Travel Type', type: 'select', options: ['Domestic', 'International', 'Pilgrimage', 'Adventure', 'Honeymoon', 'Business'] },
    { key: 'destination', label: 'Destination', type: 'text' },
    { key: 'travelDate', label: 'Travel Date', type: 'text' },
    { key: 'numberOfTravelers', label: 'Number of Travelers', type: 'number' },
    { key: 'budget', label: 'Budget (₹)', type: 'number' },
    { key: 'accommodation', label: 'Accommodation', type: 'select', options: ['3 Star', '4 Star', '5 Star', 'Resort', 'Hostel', 'Homestay'] },
    { key: 'packageType', label: 'Package Type', type: 'select', options: ['Flight + Hotel', 'Hotel Only', 'Full Package', 'Customized'] },
    { key: 'visaRequired', label: 'Visa Assistance', type: 'select', options: ['Yes', 'No', 'Already Have'] },
  ],
  FITNESS: [
    { key: 'fitnessGoal', label: 'Fitness Goal', type: 'select', options: ['Weight Loss', 'Muscle Gain', 'General Fitness', 'Sports Training', 'Rehabilitation', 'Yoga/Meditation'] },
    { key: 'currentFitnessLevel', label: 'Current Fitness Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'] },
    { key: 'preferredTime', label: 'Preferred Time', type: 'select', options: ['Morning', 'Afternoon', 'Evening', 'Flexible'] },
    { key: 'membershipType', label: 'Membership Type', type: 'select', options: ['Monthly', 'Quarterly', 'Half-Yearly', 'Annual'] },
    { key: 'personalTrainer', label: 'Personal Trainer', type: 'select', options: ['Yes', 'No', 'Maybe'] },
    { key: 'budget', label: 'Budget (₹/month)', type: 'number' },
  ],
  B2B_SALES: [
    { key: 'companyName', label: 'Company Name', type: 'text' },
    { key: 'companySize', label: 'Company Size', type: 'select', options: ['Startup', 'Small (1-50)', 'Medium (51-200)', 'Large (201-1000)', 'Enterprise (1000+)'] },
    { key: 'industry', label: 'Industry', type: 'text' },
    { key: 'productInterest', label: 'Product/Service Interest', type: 'text' },
    { key: 'budget', label: 'Budget (₹)', type: 'number' },
    { key: 'decisionMaker', label: 'Decision Maker', type: 'select', options: ['Self', 'Team', 'Management', 'Board'] },
    { key: 'timeline', label: 'Purchase Timeline', type: 'select', options: ['Immediate', '1 Month', '3 Months', '6 Months', 'Just Exploring'] },
    { key: 'currentVendor', label: 'Current Vendor', type: 'text' },
  ],
  GENERAL: [],
};

type TabType = 'basic' | 'details' | 'industry' | 'custom';

export default function CreateLeadPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['leads', 'common']);
  const { user } = useSelector((state: RootState) => state.auth);

  const [isLoading, setIsLoading] = useState(false);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [industry, setIndustry] = useState<string>('GENERAL');
  const [activeTab, setActiveTab] = useState<TabType>('basic');

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    source: 'WEBSITE',
    stageId: '',
    priority: 'MEDIUM',
    assignedToId: '',
    expectedValue: '',
    followUpDate: '',
    notes: '',
    customFields: {} as Record<string, any>,
  });
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [emailError, setEmailError] = useState('');

  // Fetch stages and industry on mount
  useEffect(() => {
    fetchStagesAndIndustry();
  }, []);

  const fetchStagesAndIndustry = async () => {
    try {
      const [stagesRes, industryRes, usersRes] = await Promise.all([
        api.get('/lead-stages'),
        api.get('/lead-stages/industry'),
        api.get('/users'),
      ]);

      const stagesData = stagesRes.data.data.stages || [];
      setStages(stagesData.filter((s: LeadStage) => s.order > 0));

      const industryData = industryRes.data.data.industry || 'GENERAL';
      setIndustry(industryData);

      const usersData = usersRes.data?.data || usersRes.data || [];
      setUsers(usersData.map((u: any) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName })));

      if (stagesData.length > 0) {
        const firstStage = stagesData.find((s: LeadStage) => s.order === 1);
        if (firstStage) {
          setFormData(prev => ({ ...prev, stageId: firstStage.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching stages:', error);
      toast.error('Failed to load lead stages');
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'email') {
      if (value.trim() && !isValidEmail(value.trim())) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError('');
      }
    }
  };

  const handleCustomFieldChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customFields: { ...prev.customFields, [key]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim()) {
      toast.error('First name is required');
      setActiveTab('basic');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      setActiveTab('basic');
      return;
    }
    if (formData.email.trim() && !isValidEmail(formData.email.trim())) {
      toast.error('Please enter a valid email address');
      setActiveTab('basic');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim() || undefined,
        address: formData.address.trim() || undefined,
        address2: formData.address2.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        pincode: formData.pincode.trim() || undefined,
        country: formData.country || undefined,
        source: formData.source,
        stageId: formData.stageId || undefined,
        priority: formData.priority || undefined,
        assignedToId: formData.assignedToId || undefined,
        expectedValue: formData.expectedValue ? Number(formData.expectedValue) : undefined,
        followUpDate: formData.followUpDate || undefined,
        notes: formData.notes.trim() || undefined,
        customFields: Object.keys(formData.customFields).length > 0 ? formData.customFields : undefined,
      };

      const response = await api.post('/leads', payload);
      const newLead = response.data.data;

      toast.success('Lead created successfully!');
      navigate(`/leads/${newLead.id}`);
    } catch (error: any) {
      console.error('Error creating lead:', error);
      toast.error(error.response?.data?.message || 'Failed to create lead');
    } finally {
      setIsLoading(false);
    }
  };

  const industryFields = INDUSTRY_FIELDS[industry] || [];

  // Format industry name properly (REAL_ESTATE -> Real Estate, EDUCATION -> Education)
  const formatIndustryName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Tab definitions
  const tabs = [
    { id: 'basic' as TabType, label: 'Basic Info', icon: UserIcon, required: true },
    { id: 'details' as TabType, label: 'Lead Details', icon: TagIcon, required: false },
    ...(industryFields.length > 0 ? [{ id: 'industry' as TabType, label: formatIndustryName(industry), icon: BuildingOfficeIcon, required: false }] : []),
    { id: 'custom' as TabType, label: 'Custom Fields', icon: DocumentTextIcon, required: false },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Create New Lead</h1>
              <p className="text-xs text-slate-500">Add a new lead to your pipeline</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  Create Lead
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab-based Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex min-h-[500px]">
          {/* Left Sidebar - Tabs */}
          <div className="w-48 border-r border-slate-200 bg-slate-50 p-3">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-primary-700 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary-600' : 'text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                  {tab.required && (
                    <span className="text-red-500 text-xs">*</span>
                  )}
                </button>
              ))}
            </nav>

            {/* Progress indicator */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">Progress</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${formData.firstName && formData.phone ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                  <span className="text-xs text-slate-600">Required fields</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${formData.email || formData.city ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                  <span className="text-xs text-slate-600">Optional info</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 p-6">
            <form onSubmit={handleSubmit}>
              {/* Basic Information Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          placeholder="Enter first name"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          placeholder="Enter last name"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          <span className="flex items-center gap-1">
                            <EnvelopeIcon className="w-3.5 h-3.5" />
                            Email
                          </span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="email@example.com"
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 ${
                            emailError
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                              : 'border-slate-200 focus:ring-primary-500 focus:border-primary-500'
                          }`}
                        />
                        {emailError && (
                          <p className="mt-1 text-xs text-red-500">{emailError}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          <span className="flex items-center gap-1">
                            <PhoneIcon className="w-3.5 h-3.5" />
                            Phone <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="+91 9876543210"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Alternate Phone
                        </label>
                        <input
                          type="tel"
                          name="alternatePhone"
                          value={formData.alternatePhone}
                          onChange={handleInputChange}
                          placeholder="+91 9876543210"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="w-3.5 h-3.5" />
                            Address Line 1
                          </span>
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="Street address, building name"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          name="address2"
                          value={formData.address2}
                          onChange={handleInputChange}
                          placeholder="Apartment, floor, etc."
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="Enter city"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          placeholder="Enter state"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Pincode
                        </label>
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleInputChange}
                          placeholder="Enter pincode"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Country
                        </label>
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="India">India</option>
                          <option value="United States">United States</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="Canada">Canada</option>
                          <option value="Australia">Australia</option>
                          <option value="Singapore">Singapore</option>
                          <option value="UAE">UAE</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lead Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Lead Classification */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Lead Classification</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Lead Source
                        </label>
                        <select
                          name="source"
                          value={formData.source}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          {LEAD_SOURCES.map(source => (
                            <option key={source.value} value={source.value}>
                              {source.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Lead Stage
                        </label>
                        <select
                          name="stageId"
                          value={formData.stageId}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Select stage</option>
                          {stages.map(stage => (
                            <option key={stage.id} value={stage.id}>
                              {stage.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Priority
                        </label>
                        <select
                          name="priority"
                          value={formData.priority}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="HIGH">Hot (High Priority)</option>
                          <option value="MEDIUM">Warm (Medium Priority)</option>
                          <option value="LOW">Cold (Low Priority)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Assignment & Value */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Assignment & Value</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Assigned To
                        </label>
                        <select
                          name="assignedToId"
                          value={formData.assignedToId}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Unassigned</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Expected Value (₹)
                        </label>
                        <input
                          type="number"
                          name="expectedValue"
                          value={formData.expectedValue}
                          onChange={handleInputChange}
                          placeholder="Enter expected value"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Follow-up Date
                        </label>
                        <input
                          type="date"
                          name="followUpDate"
                          value={formData.followUpDate}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Additional Notes</h3>
                    <div>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        placeholder="Add any notes about this lead..."
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Industry-Specific Fields Tab */}
              {activeTab === 'industry' && industryFields.length > 0 && (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    {formatIndustryName(industry)} Specific Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {industryFields.map(field => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500">*</span>}
                        </label>

                        {field.type === 'select' && field.options ? (
                          <select
                            value={formData.customFields[field.key] || ''}
                            onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="">Select {field.label}</option>
                            {field.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            value={formData.customFields[field.key] || ''}
                            onChange={(e) => handleCustomFieldChange(field.key, e.target.value ? Number(e.target.value) : '')}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={formData.customFields[field.key] || ''}
                            onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Fields Tab */}
              {activeTab === 'custom' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">Custom Contact Properties</h3>
                    <a
                      href="/settings/custom-fields"
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    >
                      <DocumentTextIcon className="w-3.5 h-3.5" />
                      Manage Fields
                    </a>
                  </div>
                  <CustomFieldsRenderer
                    values={formData.customFields}
                    onChange={handleCustomFieldChange}
                  />
                  <p className="text-xs text-slate-500 mt-4">
                    Custom fields are defined in Settings &gt; Custom Contact Property.
                    <a href="/settings/custom-fields" className="text-primary-600 hover:underline ml-1">
                      Add more fields
                    </a>
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
