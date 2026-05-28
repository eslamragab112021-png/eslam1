import { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, AlertTriangle, Search, Download, RefreshCw, Filter } from 'lucide-react';
import { authAPI } from '../../lib/mockBackend';

import Card from '../../components/ui/Card';
import type { AuditLog } from '../../types/auth';

const ACTION_COLORS: Record<string, string> = {
  USER_LOGIN: 'text-emerald-600 bg-emerald-50',
  USER_LOGOUT: 'text-slate-600 bg-slate-100',
  USER_REGISTERED: 'text-blue-600 bg-blue-50',
  LOGIN_FAILED: 'text-red-600 bg-red-50',
  PASSWORD_CHANGED: 'text-violet-600 bg-violet-50',
  PASSWORD_RESET_REQUESTED: 'text-amber-600 bg-amber-50',
  PASSWORD_RESET_COMPLETED: 'text-emerald-600 bg-emerald-50',
  EMAIL_VERIFIED: 'text-emerald-600 bg-emerald-50',
  USER_UPDATED: 'text-blue-600 bg-blue-50',
  USER_DELETED: 'text-red-600 bg-red-50',
  SESSION_REVOKED: 'text-amber-600 bg-amber-50',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failure' | 'warning'>('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    const result = await authAPI.getAuditLogs(200);
    if (result.success) setLogs(result.data);
    setIsLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const uniqueActions = ['all', ...Array.from(new Set(logs.map(l => l.action)))];

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      `${log.action} ${log.userEmail} ${log.details} ${log.ipAddress}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    return matchSearch && matchStatus && matchAction;
  });

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Action', 'User', 'Status', 'Details', 'IP Address'].join(','),
      ...filtered.map(l => [
        l.timestamp, l.action, l.userEmail, l.status, `"${l.details}"`, l.ipAddress
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const successCount = logs.filter(l => l.status === 'success').length;
  const failureCount = logs.filter(l => l.status === 'failure').length;
  const warningCount = logs.filter(l => l.status === 'warning').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500 text-sm mt-1">
            Complete security event history · {logs.length} total events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportLogs}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm text-slate-600 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={loadLogs}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center" padding="sm">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <span className="text-2xl font-bold text-slate-900">{successCount}</span>
          </div>
          <p className="text-xs text-slate-500">Successful Events</p>
        </Card>
        <Card className="text-center" padding="sm">
          <div className="flex items-center justify-center gap-2 mb-1">
            <XCircle size={18} className="text-red-500" />
            <span className="text-2xl font-bold text-slate-900">{failureCount}</span>
          </div>
          <p className="text-xs text-slate-500">Failed Events</p>
        </Card>
        <Card className="text-center" padding="sm">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle size={18} className="text-amber-500" />
            <span className="text-2xl font-bold text-slate-900">{warningCount}</span>
          </div>
          <p className="text-xs text-slate-500">Warnings</p>
        </Card>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search actions, users, IP addresses..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="warning">Warning</option>
          </select>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            {uniqueActions.map(a => (
              <option key={a} value={a}>{a === 'all' ? 'All Actions' : a.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Logs Table */}
      <Card padding="none">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-900">{filtered.length} events</span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Filter size={11} />
            {statusFilter !== 'all' || actionFilter !== 'all' || search ? 'Filtered' : 'All events'}
          </span>
        </div>
        <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading audit logs...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No logs matching your filters</div>
          ) : (
            filtered.map(log => (
              <div
                key={log.id}
                className="px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    log.status === 'success' ? 'bg-emerald-50' :
                    log.status === 'failure' ? 'bg-red-50' : 'bg-amber-50'
                  }`}>
                    {log.status === 'success' ? (
                      <CheckCircle2 size={13} className="text-emerald-600" />
                    ) : log.status === 'failure' ? (
                      <XCircle size={13} className="text-red-600" />
                    ) : (
                      <AlertTriangle size={13} className="text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${ACTION_COLORS[log.action] || 'text-slate-600 bg-slate-100'}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm text-slate-700">{log.details}</span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                      <span>{log.userEmail}</span>
                      <span>·</span>
                      <span>{log.ipAddress}</span>
                      <span>·</span>
                      <span>{log.resource}</span>
                    </div>

                    {expandedLog === log.id && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 grid grid-cols-2 gap-2">
                        <div><span className="text-slate-400">Event ID:</span> <span className="font-mono">{log.id}</span></div>
                        <div><span className="text-slate-400">Timestamp:</span> {format(new Date(log.timestamp), 'PPpp')}</div>
                        <div><span className="text-slate-400">Resource:</span> {log.resource}</div>
                        {log.resourceId && <div><span className="text-slate-400">Resource ID:</span> <span className="font-mono">{log.resourceId}</span></div>}
                        <div className="col-span-2"><span className="text-slate-400">User Agent:</span> {log.userAgent}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
