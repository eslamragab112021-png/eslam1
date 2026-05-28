import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Clock, UserCheck, UserX, TrendingUp, AlertCircle,
  Calendar, Activity, MapPin, RefreshCw, Zap
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useAuthStore } from '../store/auth.store';
import { attendanceService } from '../services/attendance.service';
import { StatsCard, Card, Badge, LoadingSpinner } from '../components/ui/Card';
import type { DashboardStats, AttendanceRecord } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface ClockWidgetProps {
  companyId: string;
  employeeId?: string;
}

const ClockWidget: React.FC<ClockWidgetProps> = ({ companyId, employeeId }) => {
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!employeeId) { setFetching(false); return; }
    attendanceService.getTodayRecord(companyId, employeeId)
      .then(r => { setRecord(r); setFetching(false); })
      .catch(() => setFetching(false));
  }, [companyId, employeeId]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const handleClock = async (type: 'clock_in' | 'clock_out') => {
    if (!employeeId) { toast.error('No employee profile linked to your account'); return; }
    setLoading(true);
    try {
      const updated = await attendanceService.clockEvent(companyId, employeeId, {
        type,
        latitude: location?.lat,
        longitude: location?.lng,
        address: location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : undefined,
      });
      setRecord(updated);
      toast.success(type === 'clock_in' ? '✅ Clocked in successfully!' : '👋 Clocked out successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Clock event failed');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="animate-pulse h-32 bg-slate-100 rounded-2xl" />;

  const isClockedIn = !!record?.clockIn && !record?.clockOut;
  const isClockedOut = !!record?.clockOut;

  return (
    <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-0">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-indigo-200 text-sm font-medium">Today's Status</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={`h-2.5 w-2.5 rounded-full ${isClockedIn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-lg font-bold">
              {isClockedOut ? 'Completed' : isClockedIn ? 'Working' : 'Not Started'}
            </span>
          </div>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <Clock size={24} />
        </div>
      </div>

      {record && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-indigo-200 text-xs">Clock In</p>
            <p className="text-white font-semibold text-sm mt-0.5">
              {record.clockIn ? format(new Date(record.clockIn), 'HH:mm') : '--:--'}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-indigo-200 text-xs">Hours</p>
            <p className="text-white font-semibold text-sm mt-0.5">
              {record.totalHours ? `${record.totalHours.toFixed(1)}h` : '--'}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <p className="text-indigo-200 text-xs">Clock Out</p>
            <p className="text-white font-semibold text-sm mt-0.5">
              {record.clockOut ? format(new Date(record.clockOut), 'HH:mm') : '--:--'}
            </p>
          </div>
        </div>
      )}

      {location && (
        <div className="flex items-center gap-1.5 text-indigo-200 text-xs mb-4">
          <MapPin size={12} />
          <span>GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
        </div>
      )}

      <div className="flex gap-2">
        {!isClockedIn && !isClockedOut && (
          <button
            onClick={() => handleClock('clock_in')}
            disabled={loading}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl py-3 text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
            Clock In
          </button>
        )}
        {isClockedIn && (
          <button
            onClick={() => handleClock('clock_out')}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-xl py-3 text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Clock size={16} />}
            Clock Out
          </button>
        )}
        {isClockedOut && (
          <div className="flex-1 bg-white/10 rounded-xl py-3 text-center text-sm font-medium">
            ✅ Day Complete — {record?.totalHours?.toFixed(1)}h worked
          </div>
        )}
      </div>
    </Card>
  );
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const companyId = user?.companyId || '';
  const employeeId = user?.employee?.id;

  const fetchStats = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await attendanceService.getDashboardStats(companyId);
      setStats(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard stats error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchStats]);

  const statusCards = [
    {
      title: 'Total Employees',
      value: stats?.totalEmployees ?? '--',
      icon: <Users size={20} className="text-indigo-600" />,
      iconBg: 'bg-indigo-50',
      change: stats ? `+${stats.newHiresThisMonth} this month` : undefined,
      changeType: 'positive' as const,
    },
    {
      title: 'Present Today',
      value: stats?.presentToday ?? '--',
      icon: <UserCheck size={20} className="text-emerald-600" />,
      iconBg: 'bg-emerald-50',
      change: stats ? `${stats.attendanceRate}% attendance rate` : undefined,
      changeType: stats && stats.attendanceRate >= 80 ? 'positive' as const : 'negative' as const,
    },
    {
      title: 'Absent Today',
      value: stats?.absentToday ?? '--',
      icon: <UserX size={20} className="text-red-600" />,
      iconBg: 'bg-red-50',
      change: stats?.lateToday !== undefined ? `${stats.lateToday} late arrivals` : undefined,
      changeType: 'negative' as const,
    },
    {
      title: 'On Leave',
      value: stats?.onLeaveToday ?? '--',
      icon: <Calendar size={20} className="text-amber-600" />,
      iconBg: 'bg-amber-50',
      change: stats?.pendingLeaveRequests !== undefined ? `${stats.pendingLeaveRequests} pending requests` : undefined,
      changeType: 'neutral' as const,
    },
    {
      title: 'Overtime This Month',
      value: stats ? `${stats.overtimeHoursThisMonth.toFixed(0)}h` : '--',
      icon: <TrendingUp size={20} className="text-violet-600" />,
      iconBg: 'bg-violet-50',
      change: 'Total overtime hours',
      changeType: 'neutral' as const,
    },
    {
      title: 'Pending Leave Requests',
      value: stats?.pendingLeaveRequests ?? '--',
      icon: <AlertCircle size={20} className="text-orange-600" />,
      iconBg: 'bg-orange-50',
      change: 'Requires approval',
      changeType: stats && stats.pendingLeaveRequests > 0 ? 'negative' as const : 'positive' as const,
    },
  ];

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-slate-500 mt-4">Loading live data from PostgreSQL...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.firstName} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · Last updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-600 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Clock Widget for Employees */}
      {(user?.role === 'employee' || user?.role === 'department_manager') && (
        <ClockWidget companyId={companyId} employeeId={employeeId} />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {statusCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <StatsCard
              title={card.title}
              value={card.value}
              icon={card.icon}
              iconBg={card.iconBg}
              change={card.change}
              changeType={card.changeType}
            />
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Trend */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-800">Weekly Attendance Trend</h3>
              <p className="text-sm text-slate-400 mt-0.5">Last 7 days performance</p>
            </div>
            <Badge variant="info">Live Data</Badge>
          </div>
          {stats?.weeklyTrend && stats.weeklyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.weeklyTrend}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={v => format(new Date(v), 'EEE')} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend formatter={(v) => v === 'present' ? 'Present' : v === 'absent' ? 'Absent' : 'Late'} />
                <Area type="monotone" dataKey="present" stroke="#4f46e5" strokeWidth={2} fill="url(#presentGrad)" />
                <Area type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} fill="url(#absentGrad)" />
                <Area type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} fill="none" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No attendance data yet</div>
          )}
        </Card>

        {/* Today's Breakdown Pie */}
        <Card>
          <h3 className="font-semibold text-slate-800 mb-1">Today's Breakdown</h3>
          <p className="text-sm text-slate-400 mb-4">{format(new Date(), 'MMM d, yyyy')}</p>
          {stats && (stats.presentToday + stats.absentToday + stats.onLeaveToday) > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Present', value: stats.presentToday },
                      { name: 'Absent', value: stats.absentToday },
                      { name: 'On Leave', value: stats.onLeaveToday },
                      { name: 'Late', value: stats.lateToday },
                    ].filter(d => d.value > 0)}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    dataKey="value"
                  >
                    {[
                      { name: 'Present', value: stats.presentToday },
                      { name: 'Absent', value: stats.absentToday },
                      { name: 'On Leave', value: stats.onLeaveToday },
                      { name: 'Late', value: stats.lateToday },
                    ].filter(d => d.value > 0).map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {[
                  { label: 'Present', value: stats.presentToday, color: 'bg-indigo-600' },
                  { label: 'Absent', value: stats.absentToday, color: 'bg-emerald-500' },
                  { label: 'On Leave', value: stats.onLeaveToday, color: 'bg-amber-500' },
                  { label: 'Late', value: stats.lateToday, color: 'bg-red-500' },
                ].filter(i => i.value > 0).map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-slate-600">{item.label}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data for today</div>
          )}
        </Card>
      </div>

      {/* Department Breakdown */}
      {stats?.departmentBreakdown && stats.departmentBreakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-slate-800 mb-1">Department Attendance</h3>
            <p className="text-sm text-slate-400 mb-4">Today by department</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.departmentBreakdown} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="department" width={80} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="present" name="Present" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Recent Activity */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Live Activity Feed</h3>
              <Activity size={16} className="text-emerald-500" />
            </div>
            <div className="space-y-3">
              {stats.recentActivity.length > 0 ? stats.recentActivity.slice(0, 6).map((activity, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-indigo-700">
                      {activity.employeeName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{activity.employeeName}</p>
                    <p className="text-xs text-slate-400">{activity.action}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                  </span>
                </div>
              )) : (
                <p className="text-slate-400 text-sm text-center py-8">No recent activity</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
