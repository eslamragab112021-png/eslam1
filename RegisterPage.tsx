import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building2, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../../components/auth/AuthLayout';
import PasswordStrengthMeter from '../../components/ui/PasswordStrengthMeter';
import { useAuthStore, useIsAuthenticated } from '../../store/authStore';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: string;
  acceptTerms: boolean;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const [verificationSent, setVerificationSent] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      company: '',
      acceptTerms: false,
    }
  });

  const password = watch('password');

  useEffect(() => {
    setPasswordValue(password || '');
  }, [password]);

  useEffect(() => {
    if (isAuthenticated && !verificationSent) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate, verificationSent]);

  useEffect(() => () => clearError(), [clearError]);

  const onSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }
    if (!data.acceptTerms) {
      setError('acceptTerms', { message: 'You must accept the terms and conditions' });
      return;
    }

    try {
      const result = await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        company: data.company,
      });

      const { error: authError } = useAuthStore.getState();
      if (authError) {
        setError('root', { message: authError });
      } else {
        setVerificationSent(result.verificationSent);
        toast.success('Account created! Please verify your email.');
        if (!result.verificationSent) {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError('root', { message: msg });
    }
  };

  if (verificationSent) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent a verification link">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-slate-300 text-sm">
              A verification email has been sent to your inbox. Click the link to activate your account.
            </p>
            <p className="text-slate-500 text-xs mt-2">Didn't receive it? Check your spam folder.</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-medium transition-all"
          >
            Continue to Dashboard →
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up enterprise authentication in minutes"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {(errors.root || error) && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{errors.root?.message || error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              First name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={14} className="text-slate-500" />
              </div>
              <input
                {...register('firstName', { required: 'Required', minLength: { value: 2, message: 'Too short' } })}
                type="text"
                autoComplete="given-name"
                placeholder="Alex"
                className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
            {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Last name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={14} className="text-slate-500" />
              </div>
              <input
                {...register('lastName', { required: 'Required', minLength: { value: 2, message: 'Too short' } })}
                type="text"
                autoComplete="family-name"
                placeholder="Morrison"
                className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
            {errors.lastName && <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Work email <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={16} className="text-slate-500" />
            </div>
            <input
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' }
              })}
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Company <span className="text-slate-600 text-xs">(optional)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 size={16} className="text-slate-500" />
            </div>
            <input
              {...register('company')}
              type="text"
              placeholder="Acme Corp"
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-slate-500" />
            </div>
            <input
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Minimum 8 characters' },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                  message: 'Must include uppercase, lowercase, number, and special character',
                }
              })}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>}
          {passwordValue && <PasswordStrengthMeter password={passwordValue} className="mt-2" />}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Confirm password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-slate-500" />
            </div>
            <input
              {...register('confirmPassword', { required: 'Please confirm your password' })}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword.message}</p>}
        </div>

        <div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              {...register('acceptTerms', { required: 'You must accept the terms' })}
              type="checkbox"
              className="w-4 h-4 mt-0.5 rounded border-white/20 bg-white/5 accent-indigo-500"
            />
            <span className="text-xs text-slate-400">
              I agree to the{' '}
              <button type="button" className="text-indigo-400 hover:text-indigo-300 underline">Terms of Service</button>
              {' '}and{' '}
              <button type="button" className="text-indigo-400 hover:text-indigo-300 underline">Privacy Policy</button>
            </span>
          </label>
          {errors.acceptTerms && <p className="mt-1 text-xs text-red-400">{errors.acceptTerms.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          {isLoading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <>Create account <ArrowRight size={16} /></>
          )}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
