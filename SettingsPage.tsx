import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Building2, Bell, Globe, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../lib/mockBackend';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/ui/Card';
import { RoleBadge } from '../../components/ui/Badge';

interface ProfileForm {
  firstName: string;
  lastName: string;
  company: string;
  department: string;
}

export default function SettingsPage() {
  const { user, updateUserLocal } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'api'>('profile');

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileForm>({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      company: user?.company || '',
      department: user?.department || '',
    }
  });

  const onSave = async (data: ProfileForm) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const result = await authAPI.updateUser(user.id, data);
      if (result.success) {
        updateUserLocal(data);
        toast.success('Profile updated successfully');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={15} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={15} /> },
    { id: 'api', label: 'API Keys', icon: <Globe size={15} /> },
  ] as const;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto">
                {user ? `${user.firstName[0]}${user.lastName[0]}` : '??'}
              </div>
              <h3 className="mt-4 font-bold text-slate-900">{user?.firstName} {user?.lastName}</h3>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <div className="mt-2 flex justify-center">
                {user && <RoleBadge role={user.role} />}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 space-y-1">
                <p>Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}</p>
                <p>{user?.company && `${user.company}`}</p>
              </div>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <User size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Personal Information</h2>
                  <p className="text-xs text-slate-500">Update your profile details</p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSave)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                        <User size={14} className="text-slate-400" />
                      </div>
                      <input
                        {...register('firstName', { required: 'Required' })}
                        type="text"
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                      />
                    </div>
                    {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                        <User size={14} className="text-slate-400" />
                      </div>
                      <input
                        {...register('lastName', { required: 'Required' })}
                        type="text"
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                      />
                    </div>
                    {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <input
                    value={user?.email || ''}
                    disabled
                    type="email"
                    className="w-full px-4 py-2.5 border border-slate-100 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-slate-400">Email cannot be changed from settings. Contact support.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Company</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Building2 size={14} className="text-slate-400" />
                    </div>
                    <input
                      {...register('company')}
                      type="text"
                      placeholder="Acme Corp"
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
                  <input
                    {...register('department')}
                    type="text"
                    placeholder="Engineering, Product, Marketing..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-400">Role: <span className="font-medium">{user?.role}</span> (managed by admin)</p>
                  <button
                    type="submit"
                    disabled={isSaving || !isDirty}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {isSaving ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : <Save size={14} />}
                    {isSaving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <Card>
          <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Bell size={16} className="text-slate-400" />
            Notification Preferences
          </h2>
          <div className="space-y-4">
            {[
              { label: 'Security Alerts', desc: 'Get notified of suspicious login attempts', enabled: true },
              { label: 'New Device Login', desc: 'Alert when your account is accessed from a new device', enabled: true },
              { label: 'Password Changes', desc: 'Notification when your password is changed', enabled: true },
              { label: 'Session Expiry', desc: 'Remind me before session expires', enabled: false },
              { label: 'Weekly Security Report', desc: 'Weekly summary of your account activity', enabled: false },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={item.enabled} className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-200 peer-checked:bg-indigo-600 rounded-full peer transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                </label>
              </div>
            ))}
          </div>
          <button
            onClick={() => toast.success('Notification preferences saved')}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save size={14} />
            Save preferences
          </button>
        </Card>
      )}

      {activeTab === 'api' && (
        <Card>
          <h2 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Globe size={16} className="text-slate-400" />
            API Keys
          </h2>
          <p className="text-slate-500 text-sm mb-5">
            Programmatic access to the EnterpriseAuth API for integrations
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center">
            <Globe size={32} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">API Access</p>
            <p className="text-xs text-slate-400 mt-1">
              Available on Enterprise plan. Contact your administrator to generate API keys.
            </p>
          </div>
          <div className="mt-5 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
            <h3 className="text-sm font-semibold text-indigo-900 mb-2">Backend Integration</h3>
            <p className="text-xs text-indigo-700 mb-3">
              This demo connects to a simulated backend. In production, replace <code className="font-mono bg-indigo-100 px-1 rounded">src/lib/mockBackend.ts</code> with real API calls to your NestJS backend:
            </p>
            <div className="bg-indigo-900 rounded-lg p-3 font-mono text-xs text-indigo-100 overflow-x-auto">
              <p className="text-indigo-400"># .env</p>
              <p>VITE_API_URL=https://api.yourcompany.com</p>
              <p>VITE_API_VERSION=v1</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
