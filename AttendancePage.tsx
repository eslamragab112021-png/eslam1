import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, Calendar, Download, Search, CheckCircle, XCircle,
  AlertCircle, Minus, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { attendanceService } from '../services/attendance.service';
import { employeeService } from '../services/employee.service';
import { departmentService } from '../services/department.service';
import { Card, Badge, Modal } from '../components/ui/Card';
import { Table, Pagination } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import type { AttendanceRecord, Employee, Department } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { label: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'default'; icon: React.ReactNode }> = {
  present: { label: 'Present', variant: 'success', icon: <CheckCircle size={12} /> },
  absent: { label: 'Absent', variant: 'danger', icon: <XCircle size={12} /> },
  late: { label: 'Late', variant: 'warning', icon: <AlertCircle size={12} /> },
  half_day: { label: 'Half Day', variant: 'info', icon: <Minus size={12} /> },
  on_leave: { label: 'On Leave', variant: 'purple' as 'default', icon: <Calendar size={12} /> },
  holiday: { label: 'Holiday', variant: 'info', icon: <Calendar size={12} /> },
  weekend: { label: 'Weekend', variant: 'default', icon: <Minus size={12} /> },
};

export const AttendancePage: React.FC = () => {
  const { user } = useAuthStore();
  const companyId = user?.companyId || '';

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [empFilter, setEmpFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [viewRecord, setViewRecord] = useState<AttendanceRecord | null>(null);

  const [summary, setSummary] = useState({
    total: 0, present: 0, absent: 0, late: 0, onLeave: 0, totalHours: 0, overtimeHours: 0,
  });

  const fetchRecords = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const result = await attendanceService.list(companyId, {
        startDate, endDate,
        employeeId: empFilter || undefined,
        status: statusFilter || undefined,
        departmentId: deptFilter || undefined,
        page, limit: 20,
      });
      setRecords(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);

      // Calculate summary
      const s = result.data.reduce((acc, r) => {
        acc.total++;
        if (r.status === 'present') acc.present++;
        else if (r.status === 'absent') acc.absent++;
        else if (r.status === 'late') { acc.present++; acc.late++; }
        else if (r.status === 'on_leave') acc.onLeave++;
        acc.totalHours += r.totalHours || 0;
        acc.overtimeHours += r.overtimeHours || 0;
        return acc;
      }, { total: 0, present: 0, absent: 0, late: 0, onLeave: 0, totalHours: 0, overtimeHours: 0 });
      setSummary(s);
    } catch (err) {
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [companyId, startDate, endDate, empFilter, statusFilter, deptFilter, page]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      employeeService.list(companyId, { limit: 200 }),
      departmentService.list(companyId),
    ]).then(([emps, depts]) => {
      setEmployees(emps.data);
      setDepartments(depts);
    }).catch(console.error);
  }, [companyId]);

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (_: unknown, row: AttendanceRecord) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-indigo-700">
              {row.employee?.firstName?.[0]}{row.employee?.lastName?.[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">{row.employee?.firstName} {row.employee?.lastName}</p>
            <p className="text-xs text-slate-400">{row.employee?.department?.name || row.employee?.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (_: unknown, row: AttendanceRecord) => (
        <div>
          <p className="text-sm font-medium text-slate-700">{format(new Date(row.date), 'MMM d, yyyy')}</p>
          <p className="text-xs text-slate-400">{format(new Date(row.date), 'EEEE')}</p>
        </div>
      ),
    },
    {
      key: 'clockIn',
      header: 'Clock In',
      render: (_: unknown, row: AttendanceRecord) => (
        <span className="text-sm text-slate-700 font-mono">
          {row.clockIn ? format(new Date(row.clockIn), 'HH:mm') : '--:--'}
        </span>
      ),
    },
    {
      key: 'clockOut',
      header: 'Clock Out',
      render: (_: unknown, row: AttendanceRecord) => (
        <span className="text-sm text-slate-700 font-mono">
          {row.clockOut ? format(new Date(row.clockOut), 'HH:mm') : '--:--'}
        </span>
      ),
    },
    {
      key: 'totalHours',
      header: 'Hours',
      render: (_: unknown, row: AttendanceRecord) => (
        <div>
          <span className="text-sm font-medium text-slate-700">{row.totalHours ? `${row.totalHours.toFixed(1)}h` : '--'}</span>
          {row.overtimeHours > 0 && (
            <span className="ml-1 text-xs text-amber-600 font-medium">+{row.overtimeHours.toFixed(1)}OT</span>
          )}
        </div>
      ),
    },
    {
      key: 'lateMinutes',
      header: 'Late',
      render: (_: unknown, row: AttendanceRecord) => (
        <span className={`text-sm ${row.lateMinutes > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
          {row.lateMinutes > 0 ? `${row.lateMinutes}m` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_: unknown, row: AttendanceRecord) => {
        const config = statusConfig[row.status] || statusConfig.absent;
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${
            config.variant === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
            config.variant === 'danger' ? 'bg-red-50 text-red-700 border-red-100' :
            config.variant === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-100' :
            config.variant === 'info' ? 'bg-blue-50 text-blue-700 border-blue-100' :
            'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {config.icon}
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'geofence',
      header: 'Location',
      render: (_: unknown, row: AttendanceRecord) => (
        row.isWithinGeofence !== null && row.isWithinGeofence !== undefined ? (
          <Badge variant={row.isWithinGeofence ? 'success' : 'warning'}>
            {row.isWithinGeofence ? '✓ In Zone' : '⚠ Outside'}
          </Badge>
        ) : <span className="text-slate-300 text-xs">N/A</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Records', value: total, color: 'text-slate-800' },
          { label: 'Present', value: summary.present, color: 'text-emerald-600' },
          { label: 'Absent', value: summary.absent, color: 'text-red-600' },
          { label: 'Late', value: summary.late, color: 'text-amber-600' },
          { label: 'On Leave', value: summary.onLeave, color: 'text-violet-600' },
          { label: 'Total Hours', value: `${summary.totalHours.toFixed(0)}h`, color: 'text-indigo-600' },
          { label: 'Overtime', value: `${summary.overtimeHours.toFixed(0)}h`, color: 'text-orange-600' },
        ].map(s => (
          <Card key={s.label} padding="sm" className="text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Main Table */}
      <Card padding="none">
        {/* Filters */}
        <div className="flex flex-col gap-3 p-5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setPage(1); }}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setPage(1); }}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Employee Filter */}
            <select
              value={empFilter}
              onChange={e => { setEmpFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-600"
            >
              <option value="">All Employees</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>

            {/* Department */}
            <select
              value={deptFilter}
              onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-600"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-600"
            >
              <option value="">All Statuses</option>
              {Object.entries(statusConfig).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>

            <Button variant="outline" size="sm" leftIcon={<Download size={14} />}>Export CSV</Button>
          </div>
        </div>

        <Table
          columns={columns}
          data={records}
          keyExtractor={r => r.id}
          loading={loading}
          onRowClick={r => setViewRecord(r)}
          emptyMessage="No attendance records found for the selected filters."
        />

        {total > 20 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
        )}
      </Card>

      {/* View Record Modal */}
      <Modal isOpen={!!viewRecord} onClose={() => setViewRecord(null)} title="Attendance Record Details" size="md">
        {viewRecord && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <span className="font-bold text-indigo-700">
                  {viewRecord.employee?.firstName?.[0]}{viewRecord.employee?.lastName?.[0]}
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">{viewRecord.employee?.firstName} {viewRecord.employee?.lastName}</h4>
                <p className="text-sm text-slate-500">{format(new Date(viewRecord.date), 'EEEE, MMMM d, yyyy')}</p>
              </div>
              <div className="ml-auto">
                {(() => {
                  const config = statusConfig[viewRecord.status] || statusConfig.absent;
                  return <Badge variant={config.variant === 'success' ? 'success' : config.variant === 'danger' ? 'danger' : config.variant === 'warning' ? 'warning' : config.variant === 'info' ? 'info' : 'default'}>
                    {config.label}
                  </Badge>;
                })()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Clock In</p>
                <p className="text-2xl font-bold text-slate-800 font-mono mt-1">
                  {viewRecord.clockIn ? format(new Date(viewRecord.clockIn), 'HH:mm') : '--:--'}
                </p>
                {viewRecord.clockInAddress && <p className="text-xs text-slate-400 mt-1">{viewRecord.clockInAddress}</p>}
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Clock Out</p>
                <p className="text-2xl font-bold text-slate-800 font-mono mt-1">
                  {viewRecord.clockOut ? format(new Date(viewRecord.clockOut), 'HH:mm') : '--:--'}
                </p>
                {viewRecord.clockOutAddress && <p className="text-xs text-slate-400 mt-1">{viewRecord.clockOutAddress}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Hours', value: `${viewRecord.totalHours?.toFixed(2) || '0'}h` },
                { label: 'Regular Hours', value: `${viewRecord.regularHours?.toFixed(2) || '0'}h` },
                { label: 'Overtime', value: `${viewRecord.overtimeHours?.toFixed(2) || '0'}h` },
                { label: 'Late (min)', value: viewRecord.lateMinutes || 0 },
                { label: 'Break (min)', value: viewRecord.breakMinutes || 0 },
                { label: 'Location', value: viewRecord.isWithinGeofence ? 'In Zone ✓' : viewRecord.isWithinGeofence === false ? 'Outside ⚠' : 'N/A' },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="font-semibold text-slate-800 mt-1">{item.value}</p>
                </div>
              ))}
            </div>

            {viewRecord.notes && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{viewRecord.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
