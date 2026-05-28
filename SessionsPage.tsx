import { useEffect, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Monitor, Smartphone, Globe, Trash2, RefreshCw, Shield, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../lib/mockBackend';
import { useAuthStore } from '../../store/authStore';
import { Badge } from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import type { Session } from '../../types/auth';

export default function SessionsPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadSessions = async () => {
    if (!user) return;
    setIsLoading(true);
    const result = await authAPI.getSessions(user.id);
    if (result.success) setSessions(result.data);
    setIsLoading(false);
  };

  useEffect(() => { loadSessions(); }, [user]);

  const handleRevoke = async (session: Session) => {
    if (!user) return;
    if (session.isCurrentSession) {
      toast.error('Cannot revoke your current session. Use logout instead.');
      return;
    }
    setRevoking(session.id);
    const result = await authAPI.revokeSession(user.id, session.id);
    if (result.success) {
      toast.success('Session revoked');
      setSessions(prev => prev.filter(s => s.id !== session.id));
    }
    setRevoking(null);
  };

  const getDeviceIcon = (os: string) => {
    if (os.includes('iOS') || os.includes('Android')) return <Smartphone size={18} />;
    return <Monitor size={18} />;
  };

  const activeSessions = sessions.filter(s => s.isCurrentSession || new Date(s.expiresAt) > new Date());
  const expiredSessions = sessions.filter(s => !s.isCurrentSession && new Date(s.expiresAt) <= new Date());

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Active Sessions</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage devices and sessions with access to your account
          </p>
        </div>
        <button
          onClick={loadSessions}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm text-slate-600 transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Security Notice */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
        <Shield size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-900 font-medium text-sm">Security Tip</p>
          <p className="text-blue-700 text-xs mt-0.5">
            If you see a session you don't recognize, revoke it immediately and change your password.
            Refresh tokens are rotated on every use to prevent token theft.
          </p>
        </div>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Sessions', value: sessions.length, color: 'text-slate-900' },
          { label: 'Active', value: activeSessions.length, color: 'text-emerald-600' },
          { label: 'Expired', value: expiredSessions.length, color: 'text-slate-400' },
        ].map(stat => (
          <Card key={stat.label} className="text-center" padding="sm">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Sessions List */}
      <Card padding="none">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">All Sessions</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No sessions found</div>
          ) : (
            sessions.map(session => {
              const isExpired = !session.isCurrentSession && new Date(session.expiresAt) <= new Date();
              return (
                <div key={session.id} className={`p-5 flex items-start gap-4 ${isExpired ? 'opacity-50' : 'hover:bg-slate-50'} transition-colors`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    session.isCurrentSession ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {getDeviceIcon(session.os)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 text-sm">
                        {session.browser} on {session.os}
                      </span>
                      {session.isCurrentSession && (
                        <Badge variant="success">Current Session</Badge>
                      )}
                      {isExpired && <Badge variant="default">Expired</Badge>}
                    </div>
                    <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Globe size={11} />
                        {session.ipAddress} · {session.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        Active {formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true })}
                      </span>
                      <span>Started {format(new Date(session.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      <span>Expires {format(new Date(session.expiresAt), 'MMM d, yyyy')}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 truncate">{session.userAgent}</p>
                  </div>

                  <div className="shrink-0">
                    {!session.isCurrentSession && !isExpired && (
                      <button
                        onClick={() => handleRevoke(session)}
                        disabled={revoking === session.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        {revoking === session.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Token Info */}
      <Card className="bg-slate-50 border-slate-100">
        <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <Shield size={14} className="text-indigo-500" />
          JWT Token Security
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
          {[
            { label: 'Access Token Lifetime', value: '15 minutes' },
            { label: 'Refresh Token Lifetime', value: '7 days' },
            { label: 'Token Algorithm', value: 'RS256 (asymmetric)' },
            { label: 'Token Rotation', value: 'Enabled on every refresh' },
            { label: 'Cookie Security', value: 'HttpOnly, Secure, SameSite=Strict' },
            { label: 'Inactivity Timeout', value: '30 minutes' },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-center p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500">{item.label}</span>
              <span className="font-mono font-medium text-slate-800">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
