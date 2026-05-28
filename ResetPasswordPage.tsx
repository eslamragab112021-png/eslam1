import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../../components/auth/AuthLayout';
import PasswordStrengthMeter from '../../components/ui/PasswordStrengthMeter';
import { authAPI } from '../../lib/mockBackend';

interface FormData {
  newPassword: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm<FormData>();
  const password = watch('newPassword', '');

  if (!token) {
    return (
      <AuthLayout title="Invalid Link" subtitle="This reset link is invalid or has expired">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <p className="text-slate-400 text-sm">Please request a new password reset link.</p>
          <Link
            to="/auth/forgot-password"
            className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-medium transition-all text-center"
          >
            Request new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async (data: FormData) => {
    if (data.newPassword !== data.confirmPassword) {
      setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }

    setIsLoading(true);
    setServerError('');
    try {
      const result = await authAPI.resetPassword(token, data.newPassword);
      if (result.success) {
        setSuccess(true);
        toast.success('Password reset successfully!');
      } else {
        setServerError(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Password reset!" subtitle="Your password has been updated">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <p className="text-slate-300 text-sm">
            Your password has been reset and all existing sessions have been invalidated for security.
          </p>
          <button
            onClick={() => navigate('/auth/login')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-medium transition-all"
          >
            Sign in with new password
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Create a new secure password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {serverError && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{serverError}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            New password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-slate-500" />
            </div>
            <input
              {...register('newPassword', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Min 8 characters' },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                  message: 'Must include upper, lower, number, and special char',
                }
              })}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          {errors.newPassword && <p className="mt-1.5 text-xs text-red-400">{errors.newPassword.message}</p>}
          {password && <PasswordStrengthMeter password={password} className="mt-2" />}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Confirm new password <span className="text-red-400">*</span>
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

        <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 space-y-1">
          <p className="font-medium text-slate-300">Password requirements:</p>
          {['At least 8 characters', 'Uppercase and lowercase letters', 'At least one number', 'At least one special character (@$!%*?&)'].map(req => (
            <p key={req} className="flex items-center gap-1.5">
              <span className={password && new RegExp(
                req.includes('8') ? '.{8,}' :
                req.includes('Upper') ? '(?=.*[A-Z])(?=.*[a-z])' :
                req.includes('number') ? '(?=.*[0-9])' : '(?=.*[@$!%*?&])'
              ).test(password) ? 'text-emerald-400' : 'text-slate-600'}>●</span>
              {req}
            </p>
          ))}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  );
}
