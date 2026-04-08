/**
 * Create Lead Page
 * Form for creating a single lead with industry-specific fields
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
} from '@heroicons/react/24/outline';
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
  ],
  HEALTHCARE: [
    { key: 'condition', label: 'Medical Condition/Reason', type: 'text' },
    { key: 'preferredDoctor', label: 'Preferred Doctor', type: 'text' },
    { key: 'appointmentType', label: 'Appointment Type', type: 'select', options: ['Consultation', 'Follow-up', 'Procedure', 'Test/Diagnostic', 'Surgery'] },
    { key: 'insuranceProvider', label: 'Insurance Provider', type: 'text' },
  ],
  INSURANCE: [
    { key: 'policyType', label: 'Policy Type', type: 'select', options: ['Life', 'Health', 'Motor', 'Home', 'Travel', 'Business'] },
    { key: 'coverageAmount', label: 'Coverage Amount (₹)', type: 'number' },
    { key: 'currentInsurer', label: 'Current Insurer', type: 'text' },
    { key: 'premiumBudget', label: 'Premium Budget (₹/month)', type: 'number' },
  ],
  FINANCE: [
    { key: 'loanType', label: 'Loan Type', type: 'select', options: ['Home Loan', 'Personal Loan', 'Business Loan', 'Car Loan', 'Education Loan', 'Gold Loan'] },
    { key: 'loanAmount', label: 'Loan Amount (₹)', type: 'number' },
    { key: 'employmentType', label: 'Employment Type', type: 'select', options: ['Salaried', 'Self-employed', 'Business Owner', 'Professional'] },
    { key: 'monthlyIncome', label: 'Monthly Income (₹)', type: 'number' },
  ],
  IT_RECRUITMENT: [
    { key: 'skills', label: 'Skills', type: 'text' },
    { key: 'experienceYears', label: 'Experience (Years)', type: 'number' },
    { key: 'currentCTC', label: 'Current CTC (₹ LPA)', type: 'number' },
    { key: 'expectedCTC', label: 'Expected CTC (₹ LPA)', type: 'number' },
    { key: 'noticePeriod', label: 'Notice Period', type: 'select', options: ['Immediate', '15 days', '30 days', '60 days', '90 days'] },
  ],
  ECOMMERCE: [
    { key: 'productInterests', label: 'Product Interests', type: 'text' },
    { key: 'cartValue', label: 'Cart Value (₹)', type: 'number' },
    { key: 'preferredPaymentMethod', label: 'Preferred Payment', type: 'select', options: ['COD', 'UPI', 'Card', 'Net Banking', 'EMI'] },
  ],
  EDUCATION: [
    { key: 'courseInterest', label: 'Course Interest', type: 'text' },
    { key: 'currentQualification', label: 'Current Qualification', type: 'text' },
    { key: 'yearOfPassing', label: 'Year of Passing', type: 'number' },
    { key: 'preferredIntake', label: 'Preferred Intake', type: 'select', options: ['January', 'April', 'July', 'September'] },
  ],
  GENERAL: [],
};

export default function CreateLeadPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['leads', 'common']);
  const { user } = useSelector((state: RootState) => state.auth);

  const [isLoading, setIsLoading] = useState(false);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [industry, setIndustry] = useState<string>('GENERAL');

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    city: '',
    state: '',
    source: 'WEBSITE',
    stageId: '',
    notes: '',
    customFields: {} as Record<string, any>,
  });

  // Fetch stages and industry on mount
  useEffect(() => {
    fetchStagesAndIndustry();
  }, []);

  const fetchStagesAndIndustry = async () => {
    try {
      const [stagesRes, industryRes] = await Promise.all([
        api.get('/lead-stages'),
        api.get('/lead-stages/industry'),
      ]);

      const stagesData = stagesRes.data.data.stages || [];
      setStages(stagesData.filter((s: LeadStage) => s.order > 0)); // Exclude lost stage

      const industryData = industryRes.data.data.industry || 'GENERAL';
      setIndustry(industryData);

      // Set default stage to first stage
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customFields: { ...prev.customFields, [key]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
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
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        source: formData.source,
        stageId: formData.stageId || undefined,
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Create New Lead</h1>
              <p className="text-sm text-slate-500">Add a new lead to your pipeline</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary-600" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-1">
                    <PhoneIcon className="w-4 h-4" />
                    Phone <span className="text-red-500">*</span>
                  </span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-1">
                    <EnvelopeIcon className="w-4 h-4" />
                    Email
                  </span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="w-4 h-4" />
                    City
                  </span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Enter city"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Lead Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <TagIcon className="w-5 h-5 text-primary-600" />
              Lead Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lead Source
                </label>
                <select
                  name="source"
                  value={formData.source}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select stage</option>
                  {stages.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any notes about this lead..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Industry-Specific Fields */}
          {industryFields.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-primary-600" />
                {industry.replace('_', ' ')} Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData.customFields[field.key] || ''}
                        onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Create Lead
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
