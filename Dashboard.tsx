import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';
import { useStore } from '../../store';
import { getAttendanceAnalytics, type AttendanceAnalytics } from '../../engine/attendance';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatMinutes, formatTime } from '../../utils/format';
import { format, subDays } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

export function Dashboard() {
  const { employees, todayRecords, shifts } = useStore();
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const start = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const end = format(new Date(), 'yyyy-MM-dd');
    getAttendanceAnalytics(undefined, start, end).then(setAnalytics);
  }, [todayRecords]);

  const presentToday = todayRecords.filter((r) => r.clockInTime && !r.clockOutTime).length;
  const clockedOut = todayRecords.filter((r) => r.clockOutTime).length;
  const absentToday = employees.length - todayRecords.length;
  const lateToday = todayRecords.filter((r) => r.latenessMinutes > 0).length;

  const pieData = analytics
    ? [
        { name: 'Present', value: analytics.totalPresent, color: '#10b981' },
        { name: 'Absent', value: analytics.totalAbsent, color: '#ef4444' },
        { name: 'Late', value: analytics.totalLate, color: '#f59e0b' },
        { name: 'Half Day', value: analytics.totalHalfDay, color: '#f97316' },
        { name: 'On Leave', value: analytics.totalOnLeave, color: '#6366f1' },
      ].filter((d) => d.value > 0)
    : [];

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayRecords = todayRecords.filter((r) => r.date === dateStr);
    return {
      day: format(d, 'EEE'),
      present: dayRecords.filter((r) => r.status === 'present' || r.status === 'late').length,
      absent: dayRecords.filter((r) => r.status === 'absent').length,
      late: dayRecords.filter((r) => r.status === 'late').length,
    };
  });

  const recentActivity = todayRecords
    .filter((r) => r.clockInTime)
    .sort((a, b) => (b.clockInTime || '').localeCompare(a.clockInTime || ''))
    .slice(0, 8);

  return (
    <div className="p-6 space-y-6">
      {/* Live Clock */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-medium">Live Time</p>
            <div className="text-5xl font-mono font-bold tracking-tight mt-1">
              {format(liveTime, 'HH:mm:ss')}
            </div>
            <p className="text-indigo-300 text-sm mt-1">{format(liveTime, 'EEEE, dd MMMM yyyy')}</p>
          </div>
          <div className="text-right">
            <div className="text-indigo-200 text-xs font-medium mb-1">Currently Online</div>
            <div className="text-4xl font-bold">{presentToday}</div>
            <div className="text-indigo-300 text-sm">of {employees.length} employees</div>
          </div>
        </div>

        {/* Live indicators */}
        <div className="flex items-center gap-2 mt-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-indigo-200">Live</span>
          </div>
          <span className="text-indigo-400 text-xs">•</span>
          <span className="text-xs text-indigo-200">Real-time attendance tracking active</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Clocked In', value: presentToday, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Clocked Out', value: clockedOut, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Absent Today', value: absentToday, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Late Today', value: lateToday, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardBody className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
                <kpi.icon className={kpi.color} size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                <div className="text-xs text-gray-500 font-medium">{kpi.label}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold text-gray-900">30-Day Attendance Overview</h3>
          </CardHeader>
          <CardBody>
            {analytics && (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={last7Days}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="present" stroke="#6366f1" fill="url(#presentGrad)" strokeWidth={2} name="Present" />
                  <Area type="monotone" dataKey="late" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Late" />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {analytics && (
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{analytics.attendanceRate}%</div>
                  <div className="text-xs text-gray-500">Attendance Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{analytics.latenessRate}%</div>
                  <div className="text-xs text-gray-500">Lateness Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{formatMinutes(analytics.avgWorkingMinutes)}</div>
                  <div className="text-xs text-gray-500">Avg Work Hours</div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Status Breakdown</h3>
          </CardHeader>
          <CardBody>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-600">{d.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data yet</div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Live Activity */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Live Activity Feed</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">Real-time</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {recentActivity.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No activity today yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentActivity.map((record) => {
                const emp = employees.find((e) => e.id === record.employeeId);
                const shift = shifts.find((s) => s.id === record.shiftId);
                return (
                  <div key={record.id} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                      {emp?.name.split(' ').map((n) => n[0]).join('').slice(0, 2) || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{emp?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{emp?.department} · {shift?.name}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-gray-500">
                        {record.clockOutTime ? '🟡 Clocked Out' : '🟢 Clocked In'}
                      </div>
                      <div className="text-xs font-mono text-gray-700">
                        {formatTime(record.clockInTime)}
                        {record.clockOutTime && ` – ${formatTime(record.clockOutTime)}`}
                      </div>
                    </div>
                    <Badge status={record.status} />
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${record.clockInLocationValid ? 'bg-emerald-400' : 'bg-red-400'}`} title={record.clockInLocationValid ? 'Location Valid' : 'Outside Geofence'} />
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Dept Summary */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">Department Attendance Today</h3>
        </CardHeader>
        <CardBody>
          {(() => {
            const depts = [...new Set(employees.map((e) => e.department))].sort();
            return (
              <div className="space-y-3">
                {depts.map((dept) => {
                  const deptEmps = employees.filter((e) => e.department === dept);
                  const deptPresent = deptEmps.filter((e) =>
                    todayRecords.some((r) => r.employeeId === e.id && r.clockInTime)
                  ).length;
                  const pct = deptEmps.length > 0 ? Math.round((deptPresent / deptEmps.length) * 100) : 0;
                  return (
                    <div key={dept} className="flex items-center gap-4">
                      <div className="w-28 text-sm text-gray-600 font-medium truncate">{dept}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-sm font-semibold text-gray-900 w-16 text-right">
                        {deptPresent}/{deptEmps.length}
                      </div>
                      <div className="text-xs text-gray-500 w-10 text-right">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardBody>
      </Card>
    </div>
  );
}
