import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface PartnerFormData {
  companyName: string;
  companyWebsite: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  partnerType: 'RESELLER' | 'AFFILIATE' | 'WHITE_LABEL' | 'AGENCY';
  businessType: string;
  targetIndustry: string;
  expectedCustomers: number;
}

const partnerTypes = [
  {
    value: 'RESELLER',
    label: 'Reseller',
    description: 'Sell our platform to your own customers with your branding',
  },
  {
    value: 'AFFILIATE',
    label: 'Affiliate',
    description: 'Earn commissions by referring new customers to us',
  },
  {
    value: 'WHITE_LABEL',
    label: 'White Label',
    description: 'Full white-label solution with your brand and domain',
  },
  {
    value: 'AGENCY',
    label: 'Agency',
    description: 'Manage multiple client accounts under one partnership',
  },
];

const tierBenefits = [
  {
    tier: 'Bronze',
    commission: '15%',
    customers: '10',
    features: ['Basic support', 'Partner dashboard', 'Monthly payouts'],
  },
  {
    tier: 'Silver',
    commission: '20%',
    customers: '50',
    features: ['Priority support', 'Co-branded materials', 'Bi-weekly payouts'],
  },
  {
    tier: 'Gold',
    commission: '25%',
    customers: '200',
    features: ['Dedicated manager', 'Custom integrations', 'Weekly payouts'],
  },
  {
    tier: 'Platinum',
    commission: '30%',
    customers: 'Unlimited',
    features: ['White-label option', 'API access', 'Daily payouts'],
  },
];

export const PartnerApplyPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PartnerFormData>({
    companyName: '',
    companyWebsite: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    partnerType: 'RESELLER',
    businessType: '',
    targetIndustry: '',
    expectedCustomers: 10,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'expectedCustomers' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName || !formData.contactPerson || !formData.contactEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await api.post('/partner/apply', formData);
      toast.success('Partnership application submitted successfully!');
      navigate('/partner');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Become a Partner</h1>
        <p className="text-gray-600 mt-2">
          Join our partner program and start earning commissions today
        </p>
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 mb-8 text-white">
        <h2 className="text-xl font-semibold mb-4">Partner Tiers & Benefits</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {tierBenefits.map((tier) => (
            <div key={tier.tier} className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold text-lg">{tier.tier}</h3>
              <p className="text-2xl font-bold">{tier.commission}</p>
              <p className="text-sm opacity-80">commission</p>
              <p className="text-sm mt-2">Up to {tier.customers} customers</p>
              <ul className="mt-3 space-y-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-1 text-xs">
                    <CheckCircleIcon className="h-3 w-3" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Application Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit}>
          {/* Step 1: Partner Type */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Choose Your Partnership Type
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partnerTypes.map((type) => (
                  <div
                    key={type.value}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        partnerType: type.value as any,
                      }))
                    }
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.partnerType === type.value
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          formData.partnerType === type.value
                            ? 'border-primary-600 bg-primary-600'
                            : 'border-gray-300'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{type.label}</p>
                        <p className="text-sm text-gray-500">{type.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Company Information */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Your Company Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    name="companyWebsite"
                    value={formData.companyWebsite}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Type
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select business type</option>
                    <option value="SaaS">SaaS Company</option>
                    <option value="Agency">Digital Agency</option>
                    <option value="Consultancy">IT Consultancy</option>
                    <option value="System Integrator">System Integrator</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Industry
                  </label>
                  <select
                    name="targetIndustry"
                    value={formData.targetIndustry}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select target industry</option>
                    <option value="Education">Education</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Finance">Finance</option>
                    <option value="Multiple">Multiple Industries</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Monthly Customers
                  </label>
                  <input
                    type="number"
                    name="expectedCustomers"
                    value={formData.expectedCustomers}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Contact Information */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Full Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="email@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Application Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Partnership Type:</span>
                    <span className="ml-2 font-medium">{formData.partnerType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Company:</span>
                    <span className="ml-2 font-medium">{formData.companyName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Contact:</span>
                    <span className="ml-2 font-medium">{formData.contactPerson || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Expected Customers:</span>
                    <span className="ml-2 font-medium">{formData.expectedCustomers}/month</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default PartnerApplyPage;
