import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert size={40} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Access Denied</h1>
          <p className="text-slate-400 mt-2">
            You don't have permission to access this resource.
          </p>
          {user && (
            <p className="text-slate-500 text-sm mt-2">
              Your current role (<span className="text-slate-300">{user.role}</span>) 
              doesn't have the required permissions.
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            Go back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm transition-colors"
          >
            <Home size={16} />
            Dashboard
          </button>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left">
          <p className="text-slate-400 text-xs">
            <span className="text-slate-300 font-semibold">Why am I seeing this?</span><br />
            EnterpriseAuth enforces Role-Based Access Control (RBAC). Each page requires 
            specific roles or permissions. Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}
