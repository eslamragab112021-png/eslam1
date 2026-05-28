import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertTriangle, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../../components/auth/AuthLayout';
import { authAPI } from '../../lib/mockBackend';

interface FormData { email: string }

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const result = await authAPI.forgotPassword(data.email);
      if (result.success) {
        setSent(true);
        if (result.data.resetToken) {
          setResetToken(result.data.resetToken);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your inbox" subtitle="Password reset link sent">
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <p className="text-slate-300 text-sm">
              If an account exists for that email, we've sent a secure reset link that expires in 1 hour.
            </p>
          </div>

          {resetToken && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-300 text-xs font-semibold mb-2 flex items-center gap-1">
                <AlertTriangle size={12} />
                Demo Mode — Reset Token (normally sent by email)
              </p>
              <div className="flex items-center gap-2 bg-black/20 rounded p-2">
                <code className="text-xs text-amber-200 flex-1 truncate">{resetToken}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`/auth/reset-password?token=${resetToken}`);
                    toast.success('Reset URL copied!');
                  }}
                  className="shrink-0 text-amber-400 hover:text-amber-300"
                >
                  <Copy size={12} />
                </button>
              </div>
              <Link
                to={`/auth/reset-password?token=${resetToken}`}
                className="mt-2 text-xs text-amber-400 hover:text-amber-300 underline block"
              >
                → Click to use reset link
              </Link>
            </div>
          )}

          <Link
            to="/auth/login"
            className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="We'll send a secure reset link to your email"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Email address <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={16} className="text-slate-500" />
            </div>
            <input
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
              })}
              type="email"
              placeholder="you@company.com"
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
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
          ) : 'Send reset link'}
        </button>

        <Link
          to="/auth/login"
          className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
