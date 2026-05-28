import { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Users, Shield, Activity, Clock, TrendingUp,
  CheckCircle2, AlertTriangle, XCircle, ArrowUpRight,
  LogIn, Key, Monitor, ScrollText
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../lib/mockBackend';
import { RoleBadge } from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { RoleGate } from '../../components/auth/ProtectedRoute';
import type { AuditLog, User } from '../../types/auth';

export default function DashboardHome() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [usersResult, auditResult] = await Promise.all([
          authAPI.getUsers(),
          authAPI.getAuditLogs(20),
        ]);
        if (usersResult.success) setUsers(usersResult.data);
        if (auditResult.success) setAuditLogs(auditResult.data);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const activeUsers = users.filter(u => u.status === 'active').length;
  const verifiedUsers = users.filter(u => u.isEmailVerified).length;
  const successLogs = auditLogs.filter(l => l.status === 'success').length;
  const failureLogs = auditLogs.filter(l => l.status === 'failure').length;

  const roleStats = {
    super_admin: users.filter(u => u.role === 'super_admin').length,
    company_admin: users.filter(u => u.role === 'company_admin').length,
    manager: users.filter(u => u.role === 'manager').length,
    employee: users.filter(u => u.role === 'employee').length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            {user?.firstName} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · Security overview
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {user && <RoleBadge role={user.role} />}
          {user && !user.isEmailVerified && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-1">
              <AlertTriangle size={11} />
              Email unverified
            </span>
          )}
        </div>
      </div>

      {/* Security Status Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={24} className="opacity-90" />
            <div>
              <p className="font-semibold">Security Status: Protected</p>
              <p className="text-indigo-100 text-xs mt-0.5">
                JWT Auth Active · bcrypt Hashing · Rate Limiting Enabled · RBAC Enforced
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs bg-white/10 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <RoleGate roles={['super_admin', 'company_admin', 'manager']}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Users',
              value: isLoading ? '—' : users.length,
              icon: <Users size={18} className="text-indigo-600" />,
              bg: 'bg-indigo-50',
              trend: '+12%',
              sub: `${activeUsers} active`,
            },
            {
              label: 'Email Verified',
              value: isLoading ? '—' : `${verifiedUsers}/${users.length}`,
              icon: <CheckCircle2 size={18} className="text-emerald-600" />,
              bg: 'bg-emerald-50',
              trend: `${users.length > 0 ? Math.round(verifiedUsers / users.length * 100) : 0}%`,
              sub: 'Verification rate',
            },
            {
              label: 'Auth Events',
              value: isLoading ? '—' : auditLogs.length,
              icon: <Activity size={18} className="text-blue-600" />,
              bg: 'bg-blue-50',
              trend: `${successLogs} success`,
              sub: `${failureLogs} failures`,
            },
            {
              label: 'Security Score',
              value: '97',
              icon: <Shield size={18} className="text-violet-600" />,
              bg: 'bg-violet-50',
              trend: '+3 pts',
              sub: 'Above average',
            },
          ].map(stat => (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                </div>
                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  {stat.icon}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600">
                <TrendingUp size={12} />
                {stat.trend}
              </div>
            </Card>
          ))}
        </div>
      </RoleGate>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScrollText size={16} className="text-slate-400" />
                <h2 className="font-semibold text-slate-900">Recent Activity</h2>
              </div>
              <span className="text-xs text-slate-400">Last 20 events</span>
            </div>
            <div className="divide-y divide-slate-50">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No activity yet</div>
              ) : (
                auditLogs.slice(0, 8).map(log => (
                  <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      log.status === 'success' ? 'bg-emerald-50' :
                      log.status === 'failure' ? 'bg-red-50' : 'bg-amber-50'
                    }`}>
                      {log.status === 'success' ? (
                        <CheckCircle2 size={14} className="text-emerald-600" />
                      ) : log.status === 'failure' ? (
                        <XCircle size={14} className="text-red-600" />
                      ) : (
                        <AlertTriangle size={14} className="text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {log.action.replace(/_/g, ' ')}
                        </p>
                        <span className="text-xs text-slate-400 shrink-0">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{log.details}</p>
                      <p className="text-xs text-slate-400">{log.userEmail} · {log.ipAddress}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* My Account Info */}
          <Card>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Key size={15} className="text-slate-400" />
              My Account
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Role', value: user?.role ? <RoleBadge role={user.role} /> : null },
                { label: 'Email', value: user?.email, mono: true },
                { label: 'Company', value: user?.company || 'N/A' },
                { label: 'Department', value: user?.department || 'N/A' },
                {
                  label: 'Email Status',
                  value: user?.isEmailVerified ? (
                    <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} />Verified</span>
                  ) : (
                    <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle size={11} />Pending</span>
                  )
                },
                {
                  label: 'Last Login',
                  value: user?.lastLoginAt ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true }) : 'N/A',
                },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  {item.value && typeof item.value === 'string' ? (
                    <span className={`text-slate-900 font-medium text-right max-w-[140px] truncate ${item.mono ? 'font-mono text-xs' : ''}`}>
                      {item.value}
                    </span>
                  ) : (
                    <span>{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Role Distribution */}
          <RoleGate roles={['super_admin', 'company_admin']}>
            <Card>
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Users size={15} className="text-slate-400" />
                User Roles
              </h3>
              <div className="space-y-3">
                {[
                  { role: 'Super Admin', count: roleStats.super_admin, color: 'bg-red-500', total: users.length },
                  { role: 'Company Admin', count: roleStats.company_admin, color: 'bg-orange-500', total: users.length },
                  { role: 'Manager', count: roleStats.manager, color: 'bg-blue-500', total: users.length },
                  { role: 'Employee', count: roleStats.employee, color: 'bg-emerald-500', total: users.length },
                ].map(({ role, count, color, total }) => (
                  <div key={role}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{role}</span>
                      <span className="text-slate-400">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </RoleGate>

          {/* Quick Actions */}
          <Card>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ArrowUpRight size={15} className="text-slate-400" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'My Sessions', href: '/dashboard/sessions', icon: <Monitor size={14} /> },
                { label: 'Login History', href: '/dashboard/login-history', icon: <LogIn size={14} /> },
                { label: 'Security', href: '/dashboard/security', icon: <Shield size={14} /> },
                { label: 'Settings', href: '/dashboard/settings', icon: <Clock size={14} /> },
              ].map(action => (
                <a
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium transition-colors"
                >
                  {action.icon}
                  {action.label}
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
