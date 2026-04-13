import { useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../../store';
import { register as registerAction, clearError } from '../../store/slices/authSlice';
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
} from '@heroicons/react/24/outline';

interface RegisterFormData {
  organizationName: string;
  organizationSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  planId?: string;
  industry: string;
  teamSize: string;
  expectedLeadsPerMonth?: string;
  country: string;
  currency: string;
  agreeToTerms: boolean;
}

// Industry options
const industryOptions = [
  { value: 'EDUCATION', label: 'Education & Training', description: 'Schools, Colleges, Coaching Centers' },
  { value: 'REAL_ESTATE', label: 'Real Estate', description: 'Property, Builders, Brokers' },
  { value: 'HEALTHCARE', label: 'Healthcare', description: 'Hospitals, Clinics, Labs' },
  { value: 'INSURANCE', label: 'Insurance', description: 'Insurance Agents, Brokers' },
  { value: 'FINANCE', label: 'Finance & Banking', description: 'Loans, Investments, Banking' },
  { value: 'AUTOMOTIVE', label: 'Automotive', description: 'Car Dealers, Service Centers' },
  { value: 'IT_SERVICES', label: 'IT & Software', description: 'IT Services, Software Companies' },
  { value: 'RECRUITMENT', label: 'Recruitment & HR', description: 'Staffing, HR Consultants' },
  { value: 'ECOMMERCE', label: 'E-Commerce', description: 'Online Stores, D2C Brands' },
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

  const onSubmit = async (data: RegisterFormData) => {
    dispatch(clearError());
    const { confirmPassword, agreeToTerms, ...registerData } = data;
    // Include all registration data (exclude confirmPassword and agreeToTerms)
    await dispatch(registerAction({
      ...registerData,
      planId: selectedPlan,
      industry: data.industry,
      teamSize: data.teamSize,
      expectedLeadsPerMonth: data.expectedLeadsPerMonth,
      country: data.country,
      currency: data.currency,
    }));
  };

  const generateSlug = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setValue('organizationSlug', slug);
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">{t('auth:register.title')}</h2>
        <p className="text-slate-500 mt-2">{t('auth:register.subtitle')}</p>
      </div>

      {/* Selected Plan Banner */}
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

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-danger-50 border border-danger-200 flex items-start gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      {/* Form */}
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
          <p className="helper-text">yoursite.com/{watch('organizationSlug') || 'your-org'}</p>
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
              {t('auth:register.phoneLabel')} <span className="text-slate-400 font-normal">({t('common:optional')})</span>
            </label>
            <div className="relative">
              <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="phone"
                type="tel"
                placeholder={t('auth:register.phonePlaceholder')}
                {...register('phone')}
                className="input pl-11"
              />
            </div>
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
          disabled={isLoading}
          className="w-full btn btn-primary btn-lg mt-6"
        >
          {isLoading ? (
            <>
              <span className="spinner spinner-sm border-white/30 border-t-white"></span>
              {t('auth:register.creatingAccount')}
            </>
          ) : (
            t('auth:register.createAccount')
          )}
        </button>
      </form>

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
