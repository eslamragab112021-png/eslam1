import React, { useState, useEffect } from 'react';
import { BarChart3, Download, TrendingUp, Users, Clock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { attendanceService } from '../services/attendance.service';
import { payrollService } from '../services/payroll.service';
import { employeeService } from '../services/employee.service';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import toast from 'react-hot-toast';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const ReportsPage: React.FC = () => {
  const { user } = useAuthStore();
  const companyId = user?.companyId || '';

  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<Array<{ date: string; present: number; absent: number; late: number }>>([]);
  const [empStats, setEmpStats] = useState<{ byDepartment: Array<{ name: string; count: number }>; byEmploymentType: Array<{ type: string; count: number }> } | null>(null);
  const [payrollSummary, setPayrollSummary] = useState<{ currentMonthTotal: number; ytdTotal: number; avgSalary: number } | null>(null);
  const [activeReport, setActiveReport] = useState<'attendance' | 'employees' | 'payroll'>('attendance');

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    // Build last 6 months attendance data
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return {
        start: format(startOfMonth(d), 'yyyy-MM-dd'),
        end: format(endOfMonth(d), 'yyyy-MM-dd'),
        label: format(d, 'MMM'),
      };
    });

    Promise.all([
      ...months.map(m =>
        attendanceService.list(companyId, { startDate: m.start, endDate: m.end, limit: 1000 })
          .then(result => ({
            date: m.label,
            present: result.data.filter(r => ['present', 'late'].includes(r.status)).length,
            absent: result.data.filter(r => r.status === 'absent').length,
            late: result.data.filter(r => r.status === 'late').length,
          }))
      ),
      employeeService.getStats(companyId),
      payrollService.getSummary(companyId),
    ]).then(results => {
      const attResults = results.slice(0, 6) as Array<{ date: string; present: number; absent: number; late: number }>;
      setAttendanceData(attResults);
      setEmpStats(results[6] as typeof empStats);
      setPayrollSummary(results[7] as typeof payrollSummary);
    }).catch(() => {
      toast.error('Failed to load report data');
    }).finally(() => setLoading(false));
  }, [companyId]);

  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename}.csv downloaded`);
  };

  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: <Clock size={16} /> },
    { id: 'employees', label: 'Employees', icon: <Users size={16} /> },
    { id: 'payroll', label: 'Payroll', icon: <TrendingUp size={16} /> },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeReport === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download size={14} />}
          onClick={() => exportCSV(attendanceData as unknown as Record<string, unknown>[], `${activeReport}-report-${format(new Date(), 'yyyy-MM-dd')}`)}
        >
          Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Attendance Report */}
          {activeReport === 'attendance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Avg Present/Month', value: attendanceData.length > 0 ? Math.round(attendanceData.reduce((s, d) => s + d.present, 0) / attendanceData.length) : '--', icon: <Users size={18} className="text-indigo-600" /> },
                  { label: 'Avg Absent/Month', value: attendanceData.length > 0 ? Math.round(attendanceData.reduce((s, d) => s + d.absent, 0) / attendanceData.length) : '--', icon: <AlertCircle size={18} className="text-red-600" /> },
                  { label: 'Avg Late/Month', value: attendanceData.length > 0 ? Math.round(attendanceData.reduce((s, d) => s + d.late, 0) / attendanceData.length) : '--', icon: <Clock size={18} className="text-amber-600" /> },
                ].map(s => (
                  <Card key={s.label} className="flex items-center gap-4">
                    <div className="p-2.5 bg-slate-50 rounded-xl">{s.icon}</div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                      <p className="text-sm text-slate-500">{s.label}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <Card>
                <h3 className="font-semibold text-slate-800 mb-4">6-Month Attendance Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Legend />
                    <Bar dataKey="present" name="Present" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <h3 className="font-semibold text-slate-800 mb-4">Attendance Rate Trend</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={attendanceData.map(d => ({
                    ...d,
                    rate: d.present + d.absent > 0 ? Math.round((d.present / (d.present + d.absent)) * 100) : 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v}%`, 'Attendance Rate']} />
                    <Line type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={2.5} dot={{ fill: '#4f46e5', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* Employee Report */}
          {activeReport === 'employees' && empStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="font-semibold text-slate-800 mb-4">Headcount by Department</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={empStats.byDepartment} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="count" name="Employees" radius={[0, 4, 4, 0]}>
                      {empStats.byDepartment.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <h3 className="font-semibold text-slate-800 mb-4">Employment Type Breakdown</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={empStats.byEmploymentType.map(d => ({ name: d.type.replace(/_/g, ' '), value: d.count }))}
                      cx="50%" cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {empStats.byEmploymentType.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {empStats.byEmploymentType.map((d, i) => (
                    <div key={d.type} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-500 capitalize">{d.type.replace(/_/g, ' ')}</span>
                      <span className="ml-auto font-medium text-slate-800">{d.count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Payroll Report */}
          {activeReport === 'payroll' && payrollSummary && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'This Month Total', value: `$${payrollSummary.currentMonthTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={18} className="text-emerald-600" /> },
                  { label: 'YTD Total', value: `$${payrollSummary.ytdTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: <BarChart3 size={18} className="text-indigo-600" /> },
                  { label: 'Average Salary', value: `$${payrollSummary.avgSalary.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={18} className="text-violet-600" /> },
                ].map(s => (
                  <Card key={s.label} className="flex items-center gap-4">
                    <div className="p-2.5 bg-slate-50 rounded-xl">{s.icon}</div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                      <p className="text-sm text-slate-500">{s.label}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <Card>
                <h3 className="font-semibold text-slate-800 mb-2">Payroll Overview</h3>
                <p className="text-sm text-slate-400 mb-4">Process payroll for different periods to see historical data here.</p>
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-8 text-center">
                  <BarChart3 size={48} className="mx-auto text-indigo-400 mb-3" />
                  <p className="text-slate-600 font-medium">Payroll trend charts appear after processing multiple months</p>
                  <p className="text-sm text-slate-400 mt-1">Use the Payroll page to process monthly payroll</p>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
