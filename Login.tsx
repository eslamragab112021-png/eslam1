import { useState } from 'react';
import { Clock, Eye, EyeOff, ShieldCheck, Zap, Users, BarChart3, ArrowRight, Check } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

const DEMO_ACCOUNTS = [
  { email: 'admin@attendiq.com', label: 'Super Admin', icon: '👑', desc: 'Platform-wide access', color: 'from-amber-500 to-orange-500' },
  { email: 'sarah@acme.com', label: 'Company Admin', icon: '👩‍💼', desc: 'Acme Corp — Enterprise', color: 'from-indigo-500 to-violet-600' },
  { email: 'david@techcorp.io', label: 'Ops Manager', icon: '👨‍💼', desc: 'TechCorp — Pro Plan', color: 'from-sky-500 to-blue-600' },
  { email: 'mike@acme.com', label: 'Employee', icon: '👨‍💻', desc: 'Acme Corp — Engineer', color: 'from-emerald-500 to-teal-600' },
];

const FEATURES = [
  { icon: <ShieldCheck className="h-5 w-5" />, title: 'Multi-tenant Security', desc: 'Complete data isolation per company' },
  { icon: <Zap className="h-5 w-5" />, title: 'Real-time Tracking', desc: 'Live attendance monitoring & alerts' },
  { icon: <Users className="h-5 w-5" />, title: 'Team Management', desc: 'Full HR & department controls' },
  { icon: <BarChart3 className="h-5 w-5" />, title: 'Advanced Analytics', desc: 'Revenue & usage dashboards' },
];

export function Login() {
  const [email, setEmail] = useState('sarah@acme.com');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAppStore(s => s.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const success = login(email, password);
    if (!success) setError('Invalid credentials. Try one of the demo accounts below.');
    setLoading(false);
  };

  const quickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    login(demoEmail, 'demo1234');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-xl tracking-tight">AttendIQ</span>
              <span className="ml-2 text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">SaaS</span>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              The complete SaaS platform for<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">workforce attendance</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Multi-tenant architecture, real Stripe billing, enterprise features, and powerful analytics — all in one platform.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-indigo-400 mb-2">{f.icon}</div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p className="text-slate-400 text-xs mt-1">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8">
            {[
              { value: '10K+', label: 'Companies' },
              { value: '$2.4M', label: 'ARR' },
              { value: '99.9%', label: 'Uptime' },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-slate-500 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">AttendIQ</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-slate-500 mt-1">Use a demo account below or enter credentials</p>
          </div>

          {/* Quick Demo Login */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Demo Login</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => quickLogin(acc.email)}
                  disabled={loading}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group',
                    email === acc.email && 'border-indigo-300 bg-indigo-50'
                  )}
                >
                  <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${acc.color} flex items-center justify-center text-sm flex-shrink-0`}>
                    {acc.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{acc.label}</p>
                    <p className="text-xs text-slate-400 truncate">{acc.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">or sign in manually</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all pr-12"
                  placeholder="Enter any password for demo"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              iconRight={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              Sign In
            </Button>
          </form>

          {/* Demo notice */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Demo Mode Active</p>
                <p className="text-xs text-amber-600 mt-0.5">All data is simulated. Stripe integration uses test mode. No real charges will be made.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
