import { useState, useEffect } from 'react';
import { Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../store';
import { getEmployeeAttendanceRecords } from '../../engine/attendance';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatTime, formatMinutes, formatDate } from '../../utils/format';
import { format } from 'date-fns';
import type { AttendanceRecord } from '../../db/schema';

export function AttendanceView() {
  const { employees, currentEmployee, shifts } = useStore();
  const [selectedEmpId, setSelectedEmpId] = useState(currentEmployee?.id || '');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (selectedEmpId) {
      setLoading(true);
      getEmployeeAttendanceRecords(selectedEmpId, 60)
        .then(setRecords)
        .finally(() => setLoading(false));
    }
  }, [selectedEmpId]);

  const filtered = filterStatus === 'all'
    ? records
    : records.filter((r) => r.status === filterStatus);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const emp = employees.find((e) => e.id === selectedEmpId);

  // Summary stats
  const presentCount = records.filter((r) => ['present', 'late'].includes(r.status)).length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const totalOT = records.reduce((sum, r) => sum + r.overtimeMinutes, 0);
  const avgNet = records.length > 0
    ? Math.round(records.filter(r => r.netWorkingMinutes > 0).reduce((s, r) => s + r.netWorkingMinutes, 0) / Math.max(1, records.filter(r => r.netWorkingMinutes > 0).length))
    : 0;

  const exportCSV = () => {
    const headers = ['Date', 'Status', 'Clock In', 'Clock Out', 'Net Work', 'Overtime', 'Lateness', 'Breaks', 'Geo Valid'];
    const rows = filtered.map((r) => [
      r.date,
      r.status,
      formatTime(r.clockInTime),
      formatTime(r.clockOutTime),
      formatMinutes(r.netWorkingMinutes),
      formatMinutes(r.overtimeMinutes),
      formatMinutes(r.latenessMinutes),
      r.breaks.length,
      r.clockInLocationValid ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${emp?.employeeCode}_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedEmpId}
          onChange={(e) => { setSelectedEmpId(e.target.value); setPage(0); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name} — {e.employeeCode}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
            className="text-sm bg-transparent outline-none text-gray-700"
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="half_day">Half Day</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>

        <Button variant="secondary" size="sm" onClick={exportCSV}>
          <Download size={14} />
          Export CSV
        </Button>
      </div>

      {/* Employee Header */}
      {emp && (
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              {emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{emp.name}</div>
              <div className="text-sm text-gray-500">{emp.designation} · {emp.department} · {emp.employeeCode}</div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="text-xl font-bold text-emerald-600">{presentCount}</div>
                <div className="text-xs text-gray-500">Present</div>
              </div>
              <div>
                <div className="text-xl font-bold text-red-600">{absentCount}</div>
                <div className="text-xs text-gray-500">Absent</div>
              </div>
              <div>
                <div className="text-xl font-bold text-amber-600">{lateCount}</div>
                <div className="text-xs text-gray-500">Late</div>
              </div>
              <div>
                <div className="text-xl font-bold text-indigo-600">{formatMinutes(totalOT)}</div>
                <div className="text-xs text-gray-500">Total OT</div>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-700">{formatMinutes(avgNet)}</div>
                <div className="text-xs text-gray-500">Avg/Day</div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Attendance Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Attendance Records</h3>
          <span className="text-sm text-gray-500">{filtered.length} records</span>
        </CardHeader>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading records…</div>
          ) : paged.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No records found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Date', 'Status', 'Clock In', 'Clock Out', 'Net Work', 'Overtime', 'Lateness', 'Break', 'Geo'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map((record) => {
                  const shift = shifts.find((s) => s.id === record.shiftId);
                  return (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{formatDate(record.date)}</div>
                        <div className="text-xs text-gray-400">{shift?.name}</div>
                      </td>
                      <td className="px-4 py-3"><Badge status={record.status} /></td>
                      <td className="px-4 py-3 font-mono text-gray-700">{formatTime(record.clockInTime)}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{formatTime(record.clockOutTime)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatMinutes(record.netWorkingMinutes)}</td>
                      <td className="px-4 py-3">
                        {record.overtimeMinutes > 0
                          ? <span className="text-indigo-600 font-semibold">{formatMinutes(record.overtimeMinutes)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {record.latenessMinutes > 0
                          ? <span className="text-red-500 font-semibold">{formatMinutes(record.latenessMinutes)}</span>
                          : <span className="text-emerald-500">On time</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatMinutes(record.totalBreakMinutes)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${record.clockInLocationValid ? 'text-emerald-600' : 'text-red-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${record.clockInLocationValid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {record.clockInLocationValid ? 'Valid' : 'Invalid'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                <ChevronLeft size={14} />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
