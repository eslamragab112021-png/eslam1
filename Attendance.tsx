import { useState, useMemo } from 'react';
import {
  Calendar, Clock, CheckCircle2, XCircle, Timer,
  MapPin, Download, ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import { format, parseISO, subDays, addDays, startOfWeek } from 'date-fns';
import { useAppStore } from '../store/appStore';
import { db } from '../data/mockDatabase';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

const STATUS_COLORS = {
  present: { bg: 'bg-emerald-100', text: 'text-emerald-700', badge: 'success' as const },
  late: { bg: 'bg-amber-100', text: 'text-amber-700', badge: 'warning' as const },
  absent: { bg: 'bg-red-100', text: 'text-red-700', badge: 'danger' as const },
  remote: { bg: 'bg-indigo-100', text: 'text-indigo-700', badge: 'info' as const },
  half_day: { bg: 'bg-purple-100', text: 'text-purple-700', badge: 'purple' as const },
  on_leave: { bg: 'bg-slate-100', text: 'text-slate-700', badge: 'default' as const },
};

export function Attendance() {
  const { currentCompany } = useAppStore();
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const employees = db.getUsers(currentCompany?.id || '').filter(u => u.role !== 'company_admin');
  const allAttendance = db.getAttendance(currentCompany?.id || '');

  const dailyRecords = useMemo(() => {
    return allAttendance.filter(a => a.date === selectedDate);
  }, [allAttendance, selectedDate]);

  const filtered = useMemo(() => {
    return dailyRecords.filter(record => {
      const user = employees.find(e => e.id === record.userId);
      const matchSearch = !search || (user && (
        user.firstName.toLowerCase().includes(search.toLowerCase()) ||
        user.lastName.toLowerCase().includes(search.toLowerCase())
      ));
      const matchStatus = filterStatus === 'all' || record.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [dailyRecords, employees, search, filterStatus]);

  const stats = useMemo(() => {
    return {
      present: dailyRecords.filter(r => r.status === 'present').length,
      late: dailyRecords.filter(r => r.status === 'late').length,
      absent: dailyRecords.filter(r => r.status === 'absent').length,
      remote: dailyRecords.filter(r => r.status === 'remote').length,
      totalHours: dailyRecords.reduce((acc, r) => acc + r.hoursWorked, 0),
      overtimeHours: dailyRecords.reduce((acc, r) => acc + r.overtimeHours, 0),
    };
  }, [dailyRecords]);

  // Calendar week view
  const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getDateAttendanceRate = (date: string) => {
    const records = allAttendance.filter(a => a.date === date);
    if (records.length === 0) return null;
    const present = records.filter(r => r.status === 'present' || r.status === 'remote').length;
    return Math.round((present / records.length) * 100);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Attendance Management</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={<Download className="h-4 w-4" />} size="sm">Export</Button>
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => setViewMode('table')} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', viewMode === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500')}>
              Table
            </button>
            <button onClick={() => setViewMode('calendar')} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', viewMode === 'calendar' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500')}>
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4">
        <button onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5 text-slate-500" />
        </button>
        <div className="flex items-center gap-3">
          {weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const rate = getDateAttendanceRate(dateStr);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  'flex flex-col items-center px-3 py-2 rounded-xl transition-all',
                  isSelected ? 'bg-indigo-600 text-white shadow-md' :
                  isToday ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                  isWeekend ? 'opacity-40 cursor-not-allowed' :
                  'hover:bg-slate-100 text-slate-700'
                )}
              >
                <span className="text-xs font-medium">{format(day, 'EEE')}</span>
                <span className="text-sm font-bold mt-0.5">{format(day, 'd')}</span>
                {rate !== null && !isWeekend && (
                  <div className={cn('mt-1 h-1 w-6 rounded-full', rate >= 85 ? 'bg-emerald-400' : rate >= 70 ? 'bg-amber-400' : 'bg-red-400', isSelected && 'bg-white/60')} />
                )}
              </button>
            );
          })}
        </div>
        <button onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight className="h-5 w-5 text-slate-500" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Present', value: stats.present, icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Late', value: stats.late, icon: <Timer className="h-4 w-4" />, color: 'text-amber-600 bg-amber-50' },
          { label: 'Absent', value: stats.absent, icon: <XCircle className="h-4 w-4" />, color: 'text-red-500 bg-red-50' },
          { label: 'Remote', value: stats.remote, icon: <MapPin className="h-4 w-4" />, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Total Hours', value: `${Math.round(stats.totalHours)}h`, icon: <Clock className="h-4 w-4" />, color: 'text-slate-600 bg-slate-100' },
          { label: 'Overtime', value: `${Math.round(stats.overtimeHours * 10) / 10}h`, icon: <Timer className="h-4 w-4" />, color: 'text-violet-600 bg-violet-50' },
        ].map(s => (
          <Card key={s.label} className="p-3">
            <div className={cn('inline-flex p-1.5 rounded-lg mb-2', s.color)}>{s.icon}</div>
            <p className="text-lg font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-48 max-w-xs">
          <Search className="h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="bg-transparent text-sm text-slate-700 outline-none w-full" />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'present', 'late', 'absent', 'remote'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                filterStatus === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Check In</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Check Out</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hours</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Overtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(record => {
                const user = employees.find(e => e.id === record.userId);
                if (!user) return null;
                const statusStyle = STATUS_COLORS[record.status] || STATUS_COLORS.present;
                return (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          {user.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-slate-400">{user.jobTitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusStyle.badge} className="capitalize">
                        {record.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-700">
                        {record.checkIn ? format(parseISO(record.checkIn), 'h:mm a') : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-700">
                        {record.checkOut ? format(parseISO(record.checkOut), 'h:mm a') : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('text-sm font-semibold', record.hoursWorked >= 8 ? 'text-emerald-600' : 'text-amber-600')}>
                        {record.hoursWorked > 0 ? `${record.hoursWorked}h` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('text-sm', record.overtimeHours > 0 ? 'text-violet-600 font-semibold' : 'text-slate-400')}>
                        {record.overtimeHours > 0 ? `+${Math.round(record.overtimeHours * 10) / 10}h` : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No attendance records for this date</p>
            <p className="text-xs mt-1">Weekend or no data available</p>
          </div>
        )}
      </Card>
    </div>
  );
}
