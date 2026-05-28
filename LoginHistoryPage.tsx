import { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, Globe, Monitor, Smartphone, RefreshCw, AlertTriangle } from 'lucide-react';
import { authAPI } from '../../lib/mockBackend';
import { useAuthStore } from '../../store/authStore';
import { Badge } from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import type { LoginHistoryEntry } from '../../types/auth';

export default function LoginHistoryPage() {
  const { user } = useAuthStore();
  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    if (!user) return;
    setIsLoading(true);
    const result = await authAPI.getLoginHistory(user.id);
    if (result.success) setHistory(result.data);
    setIsLoading(false);
  };

  useEffect(() => { loadHistory(); }, [user]);

  const successCount = history.filter(h => h.status === 'success').length;
  const failureCount = history.filter(h => h.status === 'failure').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Login History</h1>
          <p className="text-slate-500 text-sm mt-1">
            Your account sign-in activity · Last 50 events
          </p>
        </div>
        <button
          onClick={loadHistory}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm text-slate-600 transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center" padding="sm">
          <p className="text-2xl font-bold text-slate-900">{history.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total Events</p>
        </Card>
        <Card className="text-center bg-emerald-50 border-emerald-100" padding="sm">
          <p className="text-2xl font-bold text-emerald-700">{successCount}</p>
          <p className="text-xs text-emerald-600 mt-1">Successful</p>
        </Card>
        <Card className="text-center bg-red-50 border-red-100" padding="sm">
          <p className="text-2xl font-bold text-red-700">{failureCount}</p>
          <p className="text-xs text-red-600 mt-1">Failed Attempts</p>
        </Card>
      </div>

      {/* Alert for failures */}
      {failureCount > 2 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-900 font-medium text-sm">Multiple Failed Login Attempts</p>
            <p className="text-amber-700 text-xs mt-0.5">
              We detected {failureCount} failed login attempts on your account. If you didn't make these, 
              consider changing your password and enabling two-factor authentication.
            </p>
          </div>
        </div>
      )}

      {/* History List */}
      <Card padding="none">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Sign-in Events</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No login history found</div>
          ) : (
            history.map(entry => (
              <div key={entry.id} className="p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  entry.status === 'success' ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  {entry.status === 'success' ? (
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  ) : (
                    <XCircle size={18} className="text-red-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={entry.status === 'success' ? 'success' : 'danger'}>
                        {entry.status === 'success' ? 'Success' : 'Failed'}
                      </Badge>
                      {entry.failureReason && (
                        <span className="text-xs text-red-500">{entry.failureReason}</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      {entry.os.includes('iOS') || entry.os.includes('Android')
                        ? <Smartphone size={11} />
                        : <Monitor size={11} />
                      }
                      {entry.browser} on {entry.os}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Globe size={11} />
                      {entry.ipAddress} · {entry.location}
                    </span>
                    <span className="col-span-2 text-slate-400">
                      {format(new Date(entry.timestamp), 'EEEE, MMMM d yyyy · h:mm:ss a')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Security Info */}
      <Card className="bg-slate-50 border-slate-100">
        <h3 className="font-semibold text-slate-900 text-sm mb-3">Security Protections Active</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
          {[
            { label: 'Account Lockout', desc: 'Locks after 5 failed attempts for 30 minutes' },
            { label: 'Rate Limiting', desc: 'Max 5 attempts per 15 minutes per IP' },
            { label: 'Timing Attack Prevention', desc: 'Constant-time email lookups' },
            { label: 'Password Hashing', desc: 'bcrypt with cost factor 12' },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-slate-200">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-800">{item.label}</p>
                <p className="text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
