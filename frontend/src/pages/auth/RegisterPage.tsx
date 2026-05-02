import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../../store';
import { register as registerAction, clearError } from '../../store/slices/authSlice';
import { authService } from '../../services/auth.service';
import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  LockClosedIcon,
  PhoneIcon,
  ExclamationCircleIcon,
  LinkIcon,
  CheckCircleIcon,
  BriefcaseIcon,
  UsersIcon,
  ChartBarIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  DevicePhoneMobileIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

type RegistrationStep = 'form' | 'verify_phone' | 'verify_email' | 'complete';

interface RegisterFormData {
  organizationName: string;
  organizationSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string; // Required for OTP verification
  planId?: string;
  industry: string;
  teamSize: string;
  expectedLeadsPerMonth?: string;
  country: string;
  currency: string;
  agreeToTerms: boolean;
}

// Industry options - matches backend OrganizationIndustry enum
const industryOptions = [
  { value: 'EDUCATION', label: 'Education & Training', description: 'Schools, Colleges, Coaching Centers' },
  { value: 'REAL_ESTATE', label: 'Real Estate', description: 'Property, Builders, Brokers' },
  { value: 'HEALTHCARE', label: 'Healthcare', description: 'Hospitals, Clinics, Labs' },
  { value: 'INSURANCE', label: 'Insurance', description: 'Insurance Agents, Brokers' },
  { value: 'FINANCE', label: 'Finance & Banking', description: 'Loans, Investments, Banking' },
  { value: 'AUTOMOTIVE', label: 'Automotive', description: 'Car Dealers, Service Centers' },
  { value: 'IT_SERVICES', label: 'IT & Software', description: 'IT Services, Software Companies' },
  { value: 'IT_RECRUITMENT', label: 'IT Recruitment', description: 'Tech Staffing, IT HR' },
  { value: 'ECOMMERCE', label: 'E-Commerce', description: 'Online Stores, D2C Brands' },
  { value: 'CALL_CENTERS', label: 'Call Centers', description: 'BPO, Contact Centers' },
  { value: 'TRAVEL', label: 'Travel & Hospitality', description: 'Travel Agents, Hotels' },
  { value: 'FITNESS', label: 'Fitness & Wellness', description: 'Gyms, Studios, Wellness' },
  { value: 'B2B_SALES', label: 'B2B Sales', description: 'Enterprise, Business Sales' },
  { value: 'GENERAL', label: 'Other / General', description: 'Other Business Types' },
];

// Team size options
const teamSizeOptions = [
  { value: '1', label: 'Just me' },
  { value: '2-5', label: '2-5 users' },
  { value: '6-10', label: '6-10 users' },
  { value: '11-25', label: '11-25 users' },
  { value: '26-50', label: '26-50 users' },
  { value: '51-100', label: '51-100 users' },
  { value: '100+', label: '100+ users' },
];

// Expected leads per month
const leadsPerMonthOptions = [
  { value: '0-100', label: 'Less than 100' },
  { value: '100-500', label: '100-500' },
  { value: '500-1000', label: '500-1,000' },
  { value: '1000-5000', label: '1,000-5,000' },
  { value: '5000-10000', label: '5,000-10,000' },
  { value: '10000+', label: '10,000+' },
];

// Country options (common countries first, then alphabetical)
const countryOptions = [
  { value: 'India', label: 'India' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'UAE', label: 'United Arab Emirates' },
  { value: 'Germany', label: 'Germany' },
  { value: 'France', label: 'France' },
  { value: 'Netherlands', label: 'Netherlands' },
  { value: 'Japan', label: 'Japan' },
  { value: 'South Korea', label: 'South Korea' },
  { value: 'Brazil', label: 'Brazil' },
  { value: 'Mexico', label: 'Mexico' },
  { value: 'South Africa', label: 'South Africa' },
  { value: 'Other', label: 'Other' },
];

// Currency options
const currencyOptions = [
  { value: 'INR', label: 'INR (₹) - Indian Rupee' },
  { value: 'USD', label: 'USD ($) - US Dollar' },
  { value: 'EUR', label: 'EUR (€) - Euro' },
  { value: 'GBP', label: 'GBP (£) - British Pound' },
  { value: 'AUD', label: 'AUD ($) - Australian Dollar' },
  { value: 'CAD', label: 'CAD ($) - Canadian Dollar' },
  { value: 'SGD', label: 'SGD ($) - Singapore Dollar' },
  { value: 'AED', label: 'AED (د.إ) - UAE Dirham' },
  { value: 'JPY', label: 'JPY (¥) - Japanese Yen' },
  { value: 'CNY', label: 'CNY (¥) - Chinese Yuan' },
];

const planDetails: Record<string, { name: string; features: string[] }> = {
  free: {
    name: 'Free',
    features: ['100 leads', '1 user', '1 form', '100 emails/month'],
  },
  starter: {
    name: 'Starter',
    features: ['2,000 leads', '3 users', '50 AI calls/month', '500 WhatsApp/month'],
  },
  growth: {
    name: 'Growth',
    features: ['10,000 leads', '10 users', '200 AI calls/month', 'Telecaller Queue'],
  },
  business: {
    name: 'Business',
    features: ['50,000 leads', '25 users', '1,000 AI calls/month', 'API Access'],
  },
  enterprise: {
    name: 'Enterprise',
    features: ['Unlimited leads', 'Unlimited users', 'Unlimited AI calls', 'Dedicated support'],
  },
};

export default function RegisterPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { t } = useTranslation(['auth', 'validation']);
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get('plan') || 'free';
  const billingCycle = searchParams.get('billing') || 'monthly';
  const planInfo = planDetails[selectedPlan] || planDetails.free;

  // Registration step state
  const [step, setStep] = useState<RegistrationStep>('form');
  const [formData, setFormData] = useState<RegisterFormData | null>(null);

  // Phone verification state
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneOtpError, setPhoneOtpError] = useState<string | null>(null);
  const [phoneChannelUsed, setPhoneChannelUsed] = useState<string | null>(null);
  const [phoneResendTimer, setPhoneResendTimer] = useState(0);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Email verification state
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const [emailResendTimer, setEmailResendTimer] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);

  // Resend timers countdown
  useEffect(() => {
    if (phoneResendTimer > 0) {
      const timer = setTimeout(() => setPhoneResendTimer(phoneResendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phoneResendTimer]);

  useEffect(() => {
    if (emailResendTimer > 0) {
      const timer = setTimeout(() => setEmailResendTimer(emailResendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailResendTimer]);

  // Redirect to onboarding after successful registration
  useEffect(() => {
    if (isAuthenticated && user) {
      // New users go to onboarding, existing users go to dashboard
      if (!user.onboardingCompleted) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: {
      planId: selectedPlan,
      industry: 'GENERAL',
      teamSize: '2-5',
      expectedLeadsPerMonth: '100-500',
      country: 'India',
      currency: 'INR',
      agreeToTerms: false,
    },
  });

  const password = watch('password');

  // Step 1: Form submission - proceed to phone verification
  const onFormSubmit = async (data: RegisterFormData) => {
    dispatch(clearError());
    setFormData(data);

    // If phone is provided, verify it first
    if (data.phone && data.phone.length >= 10) {
      await sendPhoneOtp(data.phone);
      setStep('verify_phone');
    } else {
      // No phone provided, skip to email verification
      await sendEmailOtp(data.email);
      setStep('verify_email');
    }
  };

  // Send phone OTP
  const sendPhoneOtp = async (phone: string) => {
    setPhoneOtpLoading(true);
    setPhoneOtpError(null);

    try {
      const result = await authService.sendPhoneVerificationOtp(phone, 'WHATSAPP');
      if (result.success) {
        setPhoneChannelUsed(result.channelUsed || 'WHATSAPP');
        setPhoneResendTimer(60);
      } else {
        setPhoneOtpError(result.message || 'Failed to send OTP');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setPhoneOtpError(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  // Verify phone OTP
  const verifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.length !== 6 || !formData?.phone) return;

    setPhoneOtpLoading(true);
    setPhoneOtpError(null);

    try {
      const result = await authService.verifyPhoneOtp(formData.phone, phoneOtp);
      if (result.success) {
        setPhoneVerified(true);
        // Proceed to email verification
        await sendEmailOtp(formData.email);
        setStep('verify_email');
      } else {
        setPhoneOtpError(result.message || 'Invalid OTP');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setPhoneOtpError(error.response?.data?.message || 'Verification failed');
    } finally {
      setPhoneOtpLoading(false);
    }
  };

  // Resend phone OTP
  const resendPhoneOtp = async () => {
    if (phoneResendTimer > 0 || !formData?.phone) return;
    await sendPhoneOtp(formData.phone);
  };

  // Send email OTP
  const sendEmailOtp = async (email: string) => {
    setEmailOtpLoading(true);
    setEmailOtpError(null);

    try {
      const result = await authService.sendEmailVerificationOtp(email);
      if (result.success) {
        setEmailResendTimer(60);
      } else {
        setEmailOtpError(result.message || 'Failed to send OTP');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setEmailOtpError(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  // Verify email OTP and complete registration
  const verifyEmailOtpAndRegister = async () => {
    if (!emailOtp || emailOtp.length !== 6 || !formData) return;

    setEmailOtpLoading(true);
    setEmailOtpError(null);

    try {
      const result = await authService.verifyEmailOtp(formData.email, emailOtp);
      if (result.success) {
        setEmailVerified(true);
        // Proceed with registration
        const { confirmPassword, agreeToTerms, ...registerData } = formData;
        await dispatch(registerAction({
          ...registerData,
          planId: selectedPlan,
          industry: formData.industry,
          teamSize: formData.teamSize,
          expectedLeadsPerMonth: formData.expectedLeadsPerMonth,
          country: formData.country,
          currency: formData.currency,
        }));
      } else {
        setEmailOtpError(result.message || 'Invalid OTP');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setEmailOtpError(error.response?.data?.message || 'Verification failed');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  // Resend email OTP
  const resendEmailOtp = async () => {
    if (emailResendTimer > 0 || !formData?.email) return;
    await sendEmailOtp(formData.email);
  };

  // Go back to previous step
  const goBack = () => {
    if (step === 'verify_phone') {
      setStep('form');
      setPhoneOtp('');
      setPhoneOtpError(null);
    } else if (step === 'verify_email') {
      if (formData?.phone && formData.phone.length >= 10 && !phoneVerified) {
        setStep('verify_phone');
      } else {
        setStep('form');
      }
      setEmailOtp('');
      setEmailOtpError(null);
    }
  };

  // Legacy submit handler for backward compatibility
  const onSubmit = onFormSubmit;

  const generateSlug = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setValue('organizationSlug', slug);
  };

  // Get current step error
  const currentError = step === 'form' ? error : step === 'verify_phone' ? phoneOtpError : emailOtpError;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          {step === 'form' && t('auth:register.title')}
          {step === 'verify_phone' && 'Verify Phone Number'}
          {step === 'verify_email' && 'Verify Email Address'}
        </h2>
        <p className="text-slate-500 mt-2">
          {step === 'form' && t('auth:register.subtitle')}
          {step === 'verify_phone' && 'Enter the OTP sent to your phone'}
          {step === 'verify_email' && 'Enter the OTP sent to your email'}
        </p>
      </div>

      {/* Progress Steps */}
      {step !== 'form' && (
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === 'form' ? 'bg-primary-600 text-white' : 'bg-green-500 text-white'
            }`}>
              {step === 'form' ? '1' : <CheckCircleIcon className="w-5 h-5" />}
            </div>
            <div className={`w-12 h-1 ${phoneVerified || step === 'verify_email' ? 'bg-green-500' : 'bg-slate-200'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === 'verify_phone' ? 'bg-primary-600 text-white' :
              phoneVerified ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {phoneVerified ? <CheckCircleIcon className="w-5 h-5" /> : '2'}
            </div>
            <div className={`w-12 h-1 ${emailVerified ? 'bg-green-500' : 'bg-slate-200'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === 'verify_email' ? 'bg-primary-600 text-white' :
              emailVerified ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {emailVerified ? <CheckCircleIcon className="w-5 h-5" /> : '3'}
            </div>
          </div>
          <div className="flex justify-center gap-8 mt-2 text-xs text-slate-500">
            <span>Details</span>
            <span>Phone</span>
            <span>Email</span>
          </div>
        </div>
      )}

      {/* Back Button */}
      {step !== 'form' && (
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </button>
      )}

      {/* Selected Plan Banner - only show on form step */}
      {step === 'form' && (
        <div className="mb-6 p-4 rounded-xl bg-primary-50 border border-primary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600 font-medium">Selected Plan</p>
              <p className="text-lg font-bold text-primary-900">{planInfo.name} Plan</p>
            </div>
            <Link
              to="/pricing"
              className="text-sm text-primary-600 hover:text-primary-700 underline"
            >
              Change plan
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {planInfo.features.map((feature, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full text-primary-700">
                <CheckCircleIcon className="w-3 h-3" />
                {feature}
              </span>
            ))}
          </div>
          {selectedPlan !== 'free' && (
            <p className="mt-2 text-xs text-primary-600">
              14-day free trial included. {billingCycle === 'annual' ? 'Billed annually (save 20%)' : 'Billed monthly'}
            </p>
          )}
        </div>
      )}

      {/* Error alert */}
      {currentError && (
        <div className="mb-6 p-4 rounded-xl bg-danger-50 border border-danger-200 flex items-start gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{currentError}</p>
        </div>
      )}

      {/* Phone Verification Step */}
      {step === 'verify_phone' && formData && (
        <div className="space-y-5">
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <DevicePhoneMobileIcon className="w-12 h-12 mx-auto text-primary-500 mb-2" />
            <p className="text-sm text-slate-600">
              OTP sent to <span className="font-semibold">+91 {formData.phone}</span>
            </p>
            {phoneChannelUsed && (
              <p className="text-xs text-green-600 mt-1">
                via {phoneChannelUsed === 'WHATSAPP' ? 'WhatsApp' : phoneChannelUsed === 'SMS' ? 'SMS' : phoneChannelUsed}
              </p>
            )}
          </div>

          <div>
            <label className="label">Enter 6-digit OTP</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter OTP"
              value={phoneOtp}
              onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input text-center text-xl tracking-[0.5em] font-semibold"
              maxLength={6}
            />
          </div>

          <button
            type="button"
            onClick={verifyPhoneOtp}
            disabled={phoneOtpLoading || phoneOtp.length !== 6}
            className="w-full btn btn-primary btn-lg"
          >
            {phoneOtpLoading ? (
              <>
                <span className="spinner spinner-sm border-white/30 border-t-white"></span>
                Verifying...
              </>
            ) : (
              'Verify & Continue'
            )}
          </button>

          <div className="text-center">
            {phoneResendTimer > 0 ? (
              <p className="text-sm text-slate-500">
                Resend OTP in <span className="font-medium">{phoneResendTimer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={resendPhoneOtp}
                disabled={phoneOtpLoading}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Resend OTP
              </button>
            )}
          </div>

          {/* Skip phone verification */}
          <button
            type="button"
            onClick={async () => {
              await sendEmailOtp(formData.email);
              setStep('verify_email');
            }}
            className="w-full text-sm text-slate-500 hover:text-slate-700"
          >
            Skip phone verification
          </button>
        </div>
      )}

      {/* Email Verification Step */}
      {step === 'verify_email' && formData && (
        <div className="space-y-5">
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <EnvelopeIcon className="w-12 h-12 mx-auto text-primary-500 mb-2" />
            <p className="text-sm text-slate-600">
              OTP sent to <span className="font-semibold">{formData.email}</span>
            </p>
          </div>

          <div>
            <label className="label">Enter 6-digit OTP</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter OTP"
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input text-center text-xl tracking-[0.5em] font-semibold"
              maxLength={6}
            />
          </div>

          <button
            type="button"
            onClick={verifyEmailOtpAndRegister}
            disabled={emailOtpLoading || isLoading || emailOtp.length !== 6}
            className="w-full btn btn-primary btn-lg"
          >
            {emailOtpLoading || isLoading ? (
              <>
                <span className="spinner spinner-sm border-white/30 border-t-white"></span>
                {isLoading ? 'Creating Account...' : 'Verifying...'}
              </>
            ) : (
              'Verify & Create Account'
            )}
          </button>

          <div className="text-center">
            {emailResendTimer > 0 ? (
              <p className="text-sm text-slate-500">
                Resend OTP in <span className="font-medium">{emailResendTimer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={resendEmailOtp}
                disabled={emailOtpLoading}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Resend OTP
              </button>
            )}
          </div>
        </div>
      )}

      {/* Registration Form - only show on form step */}
      {step === 'form' && (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="label">
              {t('auth:register.firstNameLabel')}
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="firstName"
                type="text"
                placeholder={t('auth:register.firstNamePlaceholder')}
                {...register('firstName', {
                  required: t('validation:firstName.required'),
                  minLength: { value: 2, message: t('validation:firstName.minLength') },
                })}
                className={`input pl-11 ${errors.firstName ? 'input-error' : ''}`}
              />
            </div>
            {errors.firstName && (
              <p className="error-text">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="label">
              {t('auth:register.lastNameLabel')}
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="lastName"
                type="text"
                placeholder={t('auth:register.lastNamePlaceholder')}
                {...register('lastName', {
                  required: t('validation:lastName.required'),
                  minLength: { value: 2, message: t('validation:lastName.minLength') },
                })}
                className={`input pl-11 ${errors.lastName ? 'input-error' : ''}`}
              />
            </div>
            {errors.lastName && (
              <p className="error-text">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Organization Name */}
        <div>
          <label htmlFor="organizationName" className="label">
            {t('auth:register.organizationNameLabel')}
          </label>
          <div className="relative">
            <BuildingOfficeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="organizationName"
              type="text"
              placeholder={t('auth:register.organizationNamePlaceholder')}
              {...register('organizationName', {
                required: t('validation:organizationName.required'),
                minLength: { value: 2, message: t('validation:organizationName.minLength') },
                onChange: (e) => generateSlug(e.target.value),
              })}
              className={`input pl-11 ${errors.organizationName ? 'input-error' : ''}`}
            />
          </div>
          {errors.organizationName && (
            <p className="error-text">{errors.organizationName.message}</p>
          )}
        </div>

        {/* Organization Slug */}
        <div>
          <label htmlFor="organizationSlug" className="label">
            {t('auth:register.organizationUrlLabel')}
          </label>
          <div className="relative">
            <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="organizationSlug"
              type="text"
              placeholder={t('auth:register.organizationUrlPlaceholder')}
              {...register('organizationSlug', {
                required: t('validation:organizationSlug.required'),
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message: t('validation:organizationSlug.pattern'),
                },
              })}
              className={`input pl-11 ${errors.organizationSlug ? 'input-error' : ''}`}
            />
          </div>
          <p className="helper-text">Your workspace will be accessible at: <strong>app.myleadx.ai/{watch('organizationSlug') || 'my-company'}</strong></p>
          {errors.organizationSlug && (
            <p className="error-text">{errors.organizationSlug.message}</p>
          )}
        </div>

        {/* Industry Selection */}
        <div>
          <label htmlFor="industry" className="label">
            Industry Type
          </label>
          <div className="relative">
            <BriefcaseIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
            <select
              id="industry"
              {...register('industry', {
                required: 'Please select your industry',
              })}
              className={`input pl-11 appearance-none ${errors.industry ? 'input-error' : ''}`}
            >
              {industryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
          </div>
          {errors.industry && (
            <p className="error-text">{errors.industry.message}</p>
          )}
        </div>

        {/* Team Size & Expected Leads */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="teamSize" className="label">
              Team Size
            </label>
            <div className="relative">
              <UsersIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <select
                id="teamSize"
                {...register('teamSize', {
                  required: 'Please select team size',
                })}
                className={`input pl-11 appearance-none ${errors.teamSize ? 'input-error' : ''}`}
              >
                {teamSizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.teamSize && (
              <p className="error-text">{errors.teamSize.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="expectedLeadsPerMonth" className="label">
              Expected Leads/Month
            </label>
            <div className="relative">
              <ChartBarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <select
                id="expectedLeadsPerMonth"
                {...register('expectedLeadsPerMonth')}
                className="input pl-11 appearance-none"
              >
                {leadsPerMonthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="label">
            {t('auth:register.emailLabel')}
          </label>
          <div className="relative">
            <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t('auth:register.emailPlaceholder')}
              {...register('email', {
                required: t('validation:email.required'),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t('validation:email.invalid'),
                },
              })}
              className={`input pl-11 ${errors.email ? 'input-error' : ''}`}
            />
          </div>
          {errors.email && (
            <p className="error-text">{errors.email.message}</p>
          )}
        </div>

        {/* Phone & Country */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="label">
              {t('auth:register.phoneLabel')} <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                +91
              </span>
              <input
                id="phone"
                type="tel"
                placeholder="Enter 10-digit number"
                {...register('phone', {
                  required: 'Phone number is required for verification',
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: 'Please enter a valid 10-digit Indian mobile number',
                  },
                })}
                className={`input pl-14 ${errors.phone ? 'input-error' : ''}`}
                maxLength={10}
              />
            </div>
            {errors.phone && (
              <p className="error-text">{errors.phone.message}</p>
            )}
            <p className="helper-text">OTP will be sent via WhatsApp</p>
          </div>

          <div>
            <label htmlFor="country" className="label">
              Country
            </label>
            <div className="relative">
              <GlobeAltIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <select
                id="country"
                {...register('country', {
                  required: 'Please select your country',
                })}
                className={`input pl-11 appearance-none ${errors.country ? 'input-error' : ''}`}
              >
                {countryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.country && (
              <p className="error-text">{errors.country.message}</p>
            )}
          </div>
        </div>

        {/* Currency */}
        <div>
          <label htmlFor="currency" className="label">
            Currency
          </label>
          <div className="relative">
            <CurrencyDollarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
            <select
              id="currency"
              {...register('currency', {
                required: 'Please select your currency',
              })}
              className={`input pl-11 appearance-none ${errors.currency ? 'input-error' : ''}`}
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <p className="helper-text">This will be used for pricing and invoices</p>
          {errors.currency && (
            <p className="error-text">{errors.currency.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="label">
            {t('auth:register.passwordLabel')}
          </label>
          <div className="relative">
            <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder={t('auth:register.passwordPlaceholder')}
              {...register('password', {
                required: t('validation:password.required'),
                minLength: { value: 8, message: t('validation:password.minLength') },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: t('validation:password.pattern'),
                },
              })}
              className={`input pl-11 ${errors.password ? 'input-error' : ''}`}
            />
          </div>
          {errors.password && (
            <p className="error-text">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="label">
            {t('auth:register.confirmPasswordLabel')}
          </label>
          <div className="relative">
            <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder={t('auth:register.confirmPasswordPlaceholder')}
              {...register('confirmPassword', {
                required: t('validation:confirmPassword.required'),
                validate: (value) => value === password || t('validation:confirmPassword.mismatch'),
              })}
              className={`input pl-11 ${errors.confirmPassword ? 'input-error' : ''}`}
            />
          </div>
          {errors.confirmPassword && (
            <p className="error-text">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Terms & Conditions */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="agreeToTerms"
            {...register('agreeToTerms', {
              required: 'You must agree to the Terms of Service and Privacy Policy',
            })}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="agreeToTerms" className="text-sm text-slate-600">
            I agree to the{' '}
            <Link to="/terms" className="text-primary-600 hover:text-primary-700 underline" target="_blank">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-primary-600 hover:text-primary-700 underline" target="_blank">
              Privacy Policy
            </Link>
          </label>
        </div>
        {errors.agreeToTerms && (
          <p className="error-text -mt-2">{errors.agreeToTerms.message}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || phoneOtpLoading || emailOtpLoading}
          className="w-full btn btn-primary btn-lg mt-6"
        >
          {isLoading ? (
            <>
              <span className="spinner spinner-sm border-white/30 border-t-white"></span>
              {t('auth:register.creatingAccount')}
            </>
          ) : (
            'Continue to Verification'
          )}
        </button>
      </form>
      )}

      {/* Login link */}
      <p className="mt-6 text-center text-sm text-slate-600">
        {t('auth:register.haveAccount')}{' '}
        <Link
          to="/login"
          className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
        >
          {t('auth:register.signIn')}
        </Link>
      </p>
    </div>
  );
}
