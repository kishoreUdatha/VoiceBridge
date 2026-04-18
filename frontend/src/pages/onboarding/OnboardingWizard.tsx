/**
 * Onboarding Wizard
 * Multi-step setup wizard for new tenant registration
 * Collects industry selection and sets up lead stages
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SparklesIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { AppDispatch, RootState } from '../../store';
import { fetchCurrentUser } from '../../store/slices/authSlice';
import { IndustrySelector, IndustryPreview } from '../../components/IndustrySelector';
import { OrganizationIndustry, getIndustryConfig } from '../leads/industry-stages.constants';
import api from '../../services/api';
import { industryTemplateService, IndustryTemplate } from '../../services/industry-template.service';

// Lead stage templates for preview (matches backend config)
const STAGE_TEMPLATES: Record<OrganizationIndustry, { stages: Array<{ name: string; color: string }>; lostStage: { name: string; color: string } }> = {
  EDUCATION: {
    stages: [
      { name: 'Inquiry', color: '#94A3B8' },
      { name: 'Interested', color: '#3B82F6' },
      { name: 'Visit Scheduled', color: '#6366F1' },
      { name: 'Visit Completed', color: '#8B5CF6' },
      { name: 'Documents Pending', color: '#F97316' },
      { name: 'Processing', color: '#EAB308' },
      { name: 'Payment Pending', color: '#F59E0B' },
      { name: 'Admitted', color: '#22C55E' },
      { name: 'Enrolled', color: '#10B981' },
    ],
    lostStage: { name: 'Dropped', color: '#EF4444' },
  },
  REAL_ESTATE: {
    stages: [
      { name: 'New Inquiry', color: '#94A3B8' },
      { name: 'Requirements', color: '#3B82F6' },
      { name: 'Site Visit Scheduled', color: '#6366F1' },
      { name: 'Site Visit Done', color: '#8B5CF6' },
      { name: 'Negotiation', color: '#EAB308' },
      { name: 'Documentation', color: '#F59E0B' },
      { name: 'Deal Closed', color: '#10B981' },
    ],
    lostStage: { name: 'Lost', color: '#EF4444' },
  },
  HEALTHCARE: {
    stages: [
      { name: 'Inquiry', color: '#94A3B8' },
      { name: 'Appointment Scheduled', color: '#3B82F6' },
      { name: 'Consultation', color: '#6366F1' },
      { name: 'Tests/Diagnostics', color: '#8B5CF6' },
      { name: 'Treatment Planned', color: '#EAB308' },
      { name: 'In Treatment', color: '#F59E0B' },
      { name: 'Completed', color: '#10B981' },
    ],
    lostStage: { name: 'Cancelled', color: '#EF4444' },
  },
  INSURANCE: {
    stages: [
      { name: 'Lead', color: '#94A3B8' },
      { name: 'Needs Analysis', color: '#3B82F6' },
      { name: 'Quote Sent', color: '#6366F1' },
      { name: 'Proposal Accepted', color: '#8B5CF6' },
      { name: 'Documents', color: '#EAB308' },
      { name: 'Underwriting', color: '#F59E0B' },
      { name: 'Payment', color: '#22C55E' },
      { name: 'Policy Issued', color: '#10B981' },
    ],
    lostStage: { name: 'Rejected', color: '#EF4444' },
  },
  FINANCE: {
    stages: [
      { name: 'Inquiry', color: '#94A3B8' },
      { name: 'KYC Pending', color: '#3B82F6' },
      { name: 'Documents Submitted', color: '#6366F1' },
      { name: 'Credit Check', color: '#8B5CF6' },
      { name: 'Approval Pending', color: '#EAB308' },
      { name: 'Approved', color: '#22C55E' },
      { name: 'Disbursed', color: '#10B981' },
    ],
    lostStage: { name: 'Rejected', color: '#EF4444' },
  },
  IT_RECRUITMENT: {
    stages: [
      { name: 'Sourced', color: '#94A3B8' },
      { name: 'Screening', color: '#3B82F6' },
      { name: 'Technical Round', color: '#6366F1' },
      { name: 'HR Round', color: '#8B5CF6' },
      { name: 'Offer Extended', color: '#EAB308' },
      { name: 'Offer Accepted', color: '#22C55E' },
      { name: 'Joined', color: '#10B981' },
    ],
    lostStage: { name: 'Rejected', color: '#EF4444' },
  },
  ECOMMERCE: {
    stages: [
      { name: 'Browsing', color: '#94A3B8' },
      { name: 'Cart Added', color: '#3B82F6' },
      { name: 'Checkout Started', color: '#6366F1' },
      { name: 'Payment Pending', color: '#EAB308' },
      { name: 'Order Placed', color: '#22C55E' },
      { name: 'Delivered', color: '#10B981' },
    ],
    lostStage: { name: 'Abandoned', color: '#EF4444' },
  },
  GENERAL: {
    stages: [
      { name: 'New', color: '#94A3B8' },
      { name: 'Contacted', color: '#3B82F6' },
      { name: 'Qualified', color: '#6366F1' },
      { name: 'Proposal', color: '#8B5CF6' },
      { name: 'Negotiation', color: '#EAB308' },
      { name: 'Won', color: '#10B981' },
    ],
    lostStage: { name: 'Lost', color: '#EF4444' },
  },
};

// Steps configuration
const steps = [
  { id: 1, name: 'Welcome', description: 'Get started' },
  { id: 2, name: 'Industry', description: 'Select your industry' },
  { id: 3, name: 'Preview', description: 'Review your setup' },
  { id: 4, name: 'Complete', description: 'Start using CRM' },
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedIndustry, setSelectedIndustry] = useState<OrganizationIndustry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleNext = () => {
    if (currentStep === 2 && !selectedIndustry) {
      toast.error('Please select an industry to continue');
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCompleteSetup = async () => {
    if (!selectedIndustry) {
      toast.error('Please select an industry');
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      // Set industry and create lead stages
      await api.put('/lead-stages/industry', {
        industry: selectedIndustry,
        resetStages: true,
      });

      // Try to apply matching industry template for labels, custom fields, etc.
      try {
        const templates = await industryTemplateService.getAllTemplates();
        const matchingTemplate = templates.find(
          (t) => t.industry === selectedIndustry || t.slug === selectedIndustry.toLowerCase().replace('_', '-')
        );
        if (matchingTemplate) {
          await industryTemplateService.applyTemplate(matchingTemplate.id);
        }
      } catch (templateError) {
        // Template application is optional, don't fail onboarding
        console.log('Industry template not applied:', templateError);
      }

      // Mark onboarding as complete with industry
      await api.post('/organization/complete-onboarding', {
        industry: selectedIndustry,
      });

      // Refresh user data
      await dispatch(fetchCurrentUser());

      setIsComplete(true);
      setCurrentStep(4);
      toast.success('Setup completed successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const industryConfig = selectedIndustry ? getIndustryConfig(selectedIndustry) : null;
  const stageTemplate = selectedIndustry ? STAGE_TEMPLATES[selectedIndustry] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Welcome to MyLeadX CRM</h1>
                <p className="text-sm text-slate-500">Let's set up your account</p>
              </div>
            </div>
            <div className="text-sm text-slate-500">
              {user?.organizationName}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => (
              <li key={step.id} className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      step.id < currentStep
                        ? 'bg-primary-600 text-white'
                        : step.id === currentStep
                        ? 'bg-primary-100 text-primary-700 ring-4 ring-primary-200'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <CheckCircleSolidIcon className="w-6 h-6" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${step.id <= currentStep ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step.name}
                    </p>
                    <p className="text-xs text-slate-500 hidden sm:block">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded ${
                      step.id < currentStep ? 'bg-primary-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mx-auto mb-6">
                <RocketLaunchIcon className="w-10 h-10 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Welcome, {user?.firstName}!
              </h2>
              <p className="text-slate-600 max-w-lg mx-auto mb-8">
                You're just a few steps away from setting up your CRM. We'll customize
                your experience based on your industry to give you the best tools for
                managing your leads and customers.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">Select Industry</h3>
                  <p className="text-sm text-slate-500">Choose your business type</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                    <span className="text-purple-600 font-bold">2</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">Auto-Setup</h3>
                  <p className="text-sm text-slate-500">Pre-configured lead stages</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                    <span className="text-green-600 font-bold">3</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">Start Working</h3>
                  <p className="text-sm text-slate-500">Import leads & go live</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Industry Selection */}
          {currentStep === 2 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  What industry is your business in?
                </h2>
                <p className="text-slate-600">
                  We'll customize your CRM with industry-specific lead stages, fields, and workflows.
                </p>
              </div>
              <IndustrySelector
                value={selectedIndustry}
                onChange={setSelectedIndustry}
              />
              {selectedIndustry && (
                <div className="mt-6 p-4 bg-primary-50 rounded-xl border border-primary-200">
                  <div className="flex items-center gap-2 text-primary-700">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span className="font-medium">
                      Great choice! Click "Next" to see your customized lead stages.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {currentStep === 3 && selectedIndustry && industryConfig && stageTemplate && (
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Your {industryConfig.label} CRM Setup
                </h2>
                <p className="text-slate-600">
                  Here's how your lead journey will look. You can customize this later.
                </p>
              </div>

              {/* Industry Badge */}
              <div className="flex justify-center mb-6">
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                  style={{ backgroundColor: `${industryConfig.color}20`, color: industryConfig.color }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: industryConfig.color }}></span>
                  {industryConfig.journeyTitle}
                </span>
              </div>

              {/* Stage Preview */}
              <IndustryPreview
                industry={selectedIndustry}
                stages={stageTemplate.stages}
                lostStage={stageTemplate.lostStage}
              />

              {/* What's Included */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <h3 className="font-semibold text-slate-900 mb-3">What's Included:</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircleSolidIcon className="w-4 h-4 text-green-500" />
                      {stageTemplate.stages.length} pre-configured lead stages
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleSolidIcon className="w-4 h-4 text-green-500" />
                      Industry-specific custom fields
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleSolidIcon className="w-4 h-4 text-green-500" />
                      Automatic won/lost tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleSolidIcon className="w-4 h-4 text-green-500" />
                      Customizable at any time
                    </li>
                  </ul>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <h3 className="font-semibold text-slate-900 mb-3">Next Steps:</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                      Complete this setup
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
                      Import or add your first leads
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">3</span>
                      Invite your team members
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">4</span>
                      Set up integrations
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && isComplete && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mx-auto mb-6">
                <CheckCircleSolidIcon className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                You're All Set!
              </h2>
              <p className="text-slate-600 max-w-lg mx-auto mb-8">
                Your CRM has been configured for the {industryConfig?.label} industry.
                You can now start adding leads and managing your sales pipeline.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleGoToDashboard}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-colors"
                >
                  Go to Dashboard
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/leads/new')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                >
                  Add Your First Lead
                </button>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep < 4 && (
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>

              {currentStep < 3 ? (
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors"
                >
                  Next
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCompleteSetup}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Setting Up...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircleIcon className="w-5 h-5" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
