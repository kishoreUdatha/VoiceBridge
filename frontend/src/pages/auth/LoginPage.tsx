import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../../store';
import { login, clearError } from '../../store/slices/authSlice';
import { superAdminService } from '../../services/super-admin.service';
import { authService } from '../../services/auth.service';
import { EnvelopeIcon, LockClosedIcon, ExclamationCircleIcon, ShieldCheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface LoginFormData {
  email: string;
  password: string;
}

type LoginStep = 'credentials' | 'otp';

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

  // 2FA Login State
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [credentials, setCredentials] = useState<LoginFormData | null>(null);
  const [userPhone, setUserPhone] = useState<string>('');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [channelUsed, setChannelUsed] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);

  const isLoading = authLoading || superAdminLoading || otpLoading;
  const error = loginStep === 'otp' ? otpError : (localError || authError);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Step 1: Validate credentials and send OTP
  const onCredentialsSubmit = async (data: LoginFormData) => {
    dispatch(clearError());
    setLocalError(null);
    setOtpLoading(true);

    try {
      // First validate credentials and get user phone
      const validateResult = await authService.validateCredentials(data.email, data.password);

      if (!validateResult.success) {
        setLocalError(validateResult.message || 'Invalid email or password');
        setOtpLoading(false);
        return;
      }

      // Store credentials for final login
      setCredentials(data);
      setUserPhone(validateResult.phone || '');

      // Send OTP to user's phone
      if (validateResult.phone) {
        const otpResult = await authService.sendLoginOtp(validateResult.phone, 'WHATSAPP');
        if (otpResult.success) {
          setChannelUsed(otpResult.channelUsed || 'WHATSAPP');
          setResendTimer(60);
          setLoginStep('otp');
        } else {
          setLocalError(otpResult.message || 'Failed to send OTP');
        }
      } else {
        setLocalError('No phone number associated with this account');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setLocalError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 2: Verify OTP and complete login
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }

    if (!credentials) {
      setOtpError('Session expired. Please start again.');
      setLoginStep('credentials');
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      // Verify OTP
      const verifyResult = await authService.verifyLoginOtp(userPhone, otp);
      if (!verifyResult.success) {
        setOtpError(verifyResult.message || 'Invalid OTP');
        setOtpLoading(false);
        return;
      }

      // Complete login with credentials
      const result = await dispatch(login(credentials));

      if (login.fulfilled.match(result)) {
        const tenantUrl = result.payload?.tenantUrl;
        if (tenantUrl && !window.location.hostname.includes('localhost')) {
          window.location.href = `${tenantUrl}/dashboard`;
        } else {
          navigate('/dashboard');
        }
      } else {
        setOtpError((result.payload as string) || 'Login failed');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setOtpError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || !userPhone) return;

    setOtpLoading(true);
    setOtpError(null);

    try {
      const result = await authService.resendLoginOtp(userPhone);
      if (result.success) {
        setChannelUsed(result.channelUsed || 'WHATSAPP');
        setResendTimer(60);
      } else {
        setOtpError(result.message || 'Failed to resend OTP');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setOtpError(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // Go back to credentials step
  const goBack = () => {
    setLoginStep('credentials');
    setOtp('');
    setOtpError(null);
    setCredentials(null);
  };

  // Mask phone number for display
  const maskedPhone = userPhone ? `******${userPhone.slice(-4)}` : '';

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">
          {loginStep === 'credentials' ? t('auth:login.title') : 'Verify OTP'}
        </h2>
        <p className="text-slate-500 mt-2">
          {loginStep === 'credentials'
            ? t('auth:login.subtitle')
            : 'Enter the OTP sent to your phone'
          }
        </p>
      </div>

      {/* Progress indicator for OTP step */}
      {loginStep === 'otp' && (
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white text-sm font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="w-12 h-1 bg-primary-500" />
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-medium">
              2
            </div>
          </div>
          <div className="flex justify-center gap-12 mt-2 text-xs text-slate-500">
            <span>Credentials</span>
            <span>OTP</span>
          </div>
        </div>
      )}

      {/* Back button for OTP step */}
      {loginStep === 'otp' && (
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </button>
      )}

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-danger-50 border border-danger-200 flex items-start gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      {/* Step 1: Credentials Form */}
      {loginStep === 'credentials' && (
        <form onSubmit={handleSubmit(onCredentialsSubmit)} className="space-y-5">
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
                Verifying...
              </>
            ) : (
              <>
                Continue
                <ShieldCheckIcon className="w-5 h-5 ml-2" />
              </>
            )}
          </button>

          <p className="text-xs text-center text-slate-500 mt-2">
            OTP will be sent to your registered phone number
          </p>
        </form>
      )}

      {/* Step 2: OTP Verification */}
      {loginStep === 'otp' && (
        <div className="space-y-5">
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <ShieldCheckIcon className="w-12 h-12 mx-auto text-primary-500 mb-2" />
            <p className="text-sm text-slate-600">
              OTP sent to <span className="font-semibold">{maskedPhone}</span>
            </p>
            {channelUsed && (
              <p className="text-xs text-green-600 mt-1">
                via {channelUsed === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}
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
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input text-center text-xl tracking-[0.5em] font-semibold"
              maxLength={6}
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleVerifyOtp}
            disabled={isLoading || otp.length !== 6}
            className="w-full btn btn-primary btn-lg"
          >
            {isLoading ? (
              <>
                <span className="spinner spinner-sm border-white/30 border-t-white"></span>
                Verifying...
              </>
            ) : (
              'Verify & Login'
            )}
          </button>

          {/* Resend OTP */}
          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-sm text-slate-500">
                Resend OTP in <span className="font-medium">{resendTimer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Resend OTP
              </button>
            )}
          </div>
        </div>
      )}

      {/* Divider - only show on credentials step */}
      {loginStep === 'credentials' && (
        <>
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
        </>
      )}

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
