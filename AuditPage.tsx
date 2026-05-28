import React, { useState, useEffect } from 'react';
import { Shield, Search } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { auditService } from '../services/department.service';
import { Card } from '../components/ui/Card';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface AuditEntry {
  id: string; companyId: string; userId: string;
  user?: { firstName?: string; lastName?: string; email?: string };
  action: string; resource: string; resourceId?: string;
  oldValues?: Record<string, unknown>; newValues?: Record<string, unknown>;
  ipAddress?: string; createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-blue-50 text-blue-700',
  LOGOUT: 'bg-slate-100 text-slate-600',
  CREATE: 'bg-emerald-50 text-emerald-700',
  UPDATE: 'bg-amber-50 text-amber-700',
  DELETE: 'bg-red-50 text-red-700',
  CLOCK_IN: 'bg-indigo-50 text-indigo-700',
  CLOCK_OUT: 'bg-violet-50 text-violet-700',
  APPROVE: 'bg-emerald-50 text-emerald-700',
  REJECT: 'bg-red-50 text-red-700',
};

export const AuditPage: React.FC = () => {
  const { user } = useAuthStore();
  const companyId = user?.companyId || '';

  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    auditService.list(companyId, 200)
      .then(data => setLogs(data as AuditEntry[]))
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [companyId]);

  const filtered = logs.filter(log =>
    !search || [log.action, log.resource, log.user?.email, log.user?.firstName, log.user?.lastName]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <Shield size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Audit Logs</h2>
            <p className="text-xs text-slate-400">{filtered.length} records</p>
          </div>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Timestamp', 'User', 'Action', 'Resource', 'IP Address'].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">No audit logs found</td>
                </tr>
              ) : (
                filtered.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-slate-700 font-mono text-xs">
                        {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      {log.user ? (
                        <div>
                          <p className="text-slate-700 font-medium">{log.user.firstName} {log.user.lastName}</p>
                          <p className="text-xs text-slate-400">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-mono">{log.userId?.slice(0, 8)}...</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-slate-600 capitalize">{log.resource.replace(/_/g, ' ')}</p>
                      {log.resourceId && (
                        <p className="text-xs text-slate-400 font-mono">{log.resourceId.slice(0, 12)}...</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-slate-500 font-mono text-xs">{log.ipAddress || 'N/A'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
