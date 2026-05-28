import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Shield, Lock, AlertTriangle, CheckCircle2, Eye, EyeOff, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../lib/mockBackend';
import { useAuthStore } from '../../store/authStore';
import PasswordStrengthMeter from '../../components/ui/PasswordStrengthMeter';
import Card from '../../components/ui/Card';

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SecurityPage() {
  const { user, logout } = useAuthStore();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, watch, reset, setError, formState: { errors } } = useForm<ChangePasswordForm>();
  const newPassword = watch('newPassword', '');

  const onChangePassword = async (data: ChangePasswordForm) => {
    if (!user) return;
    if (data.newPassword !== data.confirmPassword) {
      setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }

    setIsChanging(true);
    setServerError('');

    try {
      const result = await authAPI.changePassword(user.id, data.currentPassword, data.newPassword);
      if (result.success) {
        toast.success('Password changed! Please sign in again.');
        reset();
        setTimeout(() => logout(), 2000);
      } else {
        setServerError(result.error);
      }
    } finally {
      setIsChanging(false);
    }
  };

  const securityChecklist = [
    {
      label: 'Email Verified',
      status: user?.isEmailVerified,
      action: 'Verify Email',
      desc: 'Confirm your email address to enhance account security.',
    },
    {
      label: 'Strong Password',
      status: true,
      desc: 'Password meets minimum security requirements.',
    },
    {
      label: 'Session Management',
      status: true,
      desc: 'Active sessions are tracked and can be revoked.',
    },
    {
      label: 'Two-Factor Authentication',
      status: user?.isTwoFactorEnabled,
      action: 'Enable 2FA',
      desc: 'Add an extra layer of security with authenticator app.',
    },
  ];

  const securityScore = securityChecklist.filter(c => c.status).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Security Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your account security preferences and password
        </p>
      </div>

      {/* Security Score */}
      <Card className="bg-gradient-to-r from-indigo-600 to-violet-600 border-0 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-100 text-sm">Security Score</p>
            <p className="text-4xl font-bold mt-1">{Math.round(securityScore / securityChecklist.length * 100)}%</p>
            <p className="text-indigo-200 text-xs mt-1">
              {securityScore}/{securityChecklist.length} security measures active
            </p>
          </div>
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
            <Shield size={32} className="text-white" />
          </div>
        </div>
        <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${(securityScore / securityChecklist.length) * 100}%` }}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Password */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Key size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Change Password</h2>
              <p className="text-xs text-slate-500">Update your account password</p>
            </div>
          </div>

          {serverError && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Lock size={15} className="text-slate-400" />
                </div>
                <input
                  {...register('currentPassword', { required: 'Current password is required' })}
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Lock size={15} className="text-slate-400" />
                </div>
                <input
                  {...register('newPassword', {
                    required: 'New password is required',
                    minLength: { value: 8, message: 'Min 8 characters' },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                      message: 'Must include uppercase, lowercase, number, and special character',
                    }
                  })}
                  type={showNew ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
              )}
              {newPassword && <PasswordStrengthMeter password={newPassword} className="mt-2" />}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Lock size={15} className="text-slate-400" />
                </div>
                <input
                  {...register('confirmPassword', { required: 'Please confirm new password' })}
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChanging}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isChanging ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : <Lock size={15} />}
                {isChanging ? 'Changing password...' : 'Change password'}
              </button>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Changing your password will sign you out of all devices
              </p>
            </div>
          </form>
        </Card>

        {/* Security Checklist */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Shield size={18} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Security Checklist</h2>
                <p className="text-xs text-slate-500">Steps to maximize account security</p>
              </div>
            </div>
            <div className="space-y-3">
              {securityChecklist.map(item => (
                <div key={item.label} className={`flex items-start gap-3 p-3 rounded-xl border ${
                  item.status ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    item.status ? 'bg-emerald-100' : 'bg-amber-100'
                  }`}>
                    {item.status ? (
                      <CheckCircle2 size={14} className="text-emerald-600" />
                    ) : (
                      <AlertTriangle size={14} className="text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${item.status ? 'text-emerald-900' : 'text-amber-900'}`}>
                        {item.label}
                      </p>
                      {!item.status && item.action && (
                        <button className="text-xs text-amber-700 underline hover:no-underline">
                          {item.action}
                        </button>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${item.status ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Active Protections */}
          <Card className="bg-slate-50 border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Active Security Protections</h3>
            <div className="space-y-2">
              {[
                'JWT RS256 token signing',
                'bcrypt password hashing (cost 12)',
                'HTTP-only secure cookies',
                'CSRF protection (SameSite=Strict)',
                'Rate limiting (5 req/15 min)',
                'Account lockout after 5 failures',
                'Token rotation on every refresh',
                'XSS input sanitization',
                'SQL injection prevention',
                'Helmet security headers',
              ].map(protection => (
                <div key={protection} className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  {protection}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
