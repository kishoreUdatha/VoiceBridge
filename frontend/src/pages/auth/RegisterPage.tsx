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
}

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
    },
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    dispatch(clearError());
    const { confirmPassword, ...registerData } = data;
    // Include the plan from URL
    await dispatch(registerAction({ ...registerData, planId: selectedPlan }));
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

        {/* Phone */}
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
