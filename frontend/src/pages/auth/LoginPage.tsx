import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../../store';
import { login, clearError } from '../../store/slices/authSlice';
import { superAdminService } from '../../services/super-admin.service';
import { EnvelopeIcon, LockClosedIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isLoading: authLoading, error: authError } = useSelector((state: RootState) => state.auth);
  const [superAdminLoading, setSuperAdminLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { t } = useTranslation(['auth', 'validation']);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const isLoading = authLoading || superAdminLoading;
  const error = localError || authError;

  const onSubmit = async (data: LoginFormData) => {
    dispatch(clearError());
    setLocalError(null);

    // First try regular user login
    const result = await dispatch(login(data));

    // If regular login failed (rejected or no user), try super admin login
    const loginFailed = login.rejected.match(result) || !result.payload;

    if (loginFailed) {
      try {
        setSuperAdminLoading(true);
        console.log('[Login] Regular login failed, trying super admin login...');
        await superAdminService.login(data.email, data.password);
        console.log('[Login] Super admin login successful, redirecting...');
        // Super admin login successful, redirect to super admin dashboard
        navigate('/super-admin/dashboard');
        return; // Exit early on success
      } catch (superAdminError: unknown) {
        // Both logins failed, show the original error
        console.log('[Login] Super admin login also failed:', superAdminError);
        const err = superAdminError as { response?: { data?: { message?: string } } };
        setLocalError(err.response?.data?.message || 'Invalid email or password');
      } finally {
        setSuperAdminLoading(false);
      }
    } else {
      // Regular user login successful - redirect to tenant subdomain
      const payload = result.payload as { tenantUrl?: string; user?: { organizationSlug?: string } };
      const tenantUrl = payload?.tenantUrl;

      if (tenantUrl && !window.location.hostname.includes('localhost')) {
        console.log('[Login] Redirecting to tenant URL:', tenantUrl);
        // Redirect to tenant subdomain with dashboard
        window.location.href = `${tenantUrl}/dashboard`;
      } else {
        // Fallback to regular dashboard (localhost or no tenant URL)
        navigate('/dashboard');
      }
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">{t('auth:login.title')}</h2>
        <p className="text-slate-500 mt-2">{t('auth:login.subtitle')}</p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-danger-50 border border-danger-200 flex items-start gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="label">
            {t('auth:login.emailLabel')}
          </label>
          <div className="relative">
            <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t('auth:login.emailPlaceholder')}
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

        {/* Password */}
        <div>
          <label htmlFor="password" className="label">
            {t('auth:login.passwordLabel')}
          </label>
          <div className="relative">
            <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t('auth:login.passwordPlaceholder')}
              {...register('password', {
                required: t('validation:password.required'),
              })}
              className={`input pl-11 ${errors.password ? 'input-error' : ''}`}
            />
          </div>
          {errors.password && (
            <p className="error-text">{errors.password.message}</p>
          )}
        </div>

        {/* Remember & Forgot */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-slate-600">{t('auth:login.rememberMe')}</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            {t('auth:login.forgotPassword')}
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn btn-primary btn-lg"
        >
          {isLoading ? (
            <>
              <span className="spinner spinner-sm border-white/30 border-t-white"></span>
              {t('auth:login.signingIn')}
            </>
          ) : (
            t('auth:login.signIn')
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 text-sm text-slate-500 bg-white">{t('auth:login.orContinueWith')}</span>
        </div>
      </div>

      {/* Social login */}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn btn-secondary">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t('auth:login.google')}
        </button>
        <button className="btn btn-secondary">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          {t('auth:login.github')}
        </button>
      </div>

      {/* Register link */}
      <p className="mt-8 text-center text-sm text-slate-600">
        {t('auth:login.noAccount')}{' '}
        <Link
          to="/register"
          className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
        >
          {t('auth:login.createAccount')}
        </Link>
      </p>
    </div>
  );
}
