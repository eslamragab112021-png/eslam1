import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { leaveService } from '../services/leave.service';
import { employeeService } from '../services/employee.service';
import { Card, Badge, Modal } from '../components/ui/Card';
import { Table, Pagination } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input, Select, TextArea } from '../components/ui/Input';
import type { LeaveRequest, Employee } from '../types';
import { format, differenceInBusinessDays } from 'date-fns';
import toast from 'react-hot-toast';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'other', label: 'Other' },
];

const statusConfig: Record<string, { variant: 'warning' | 'success' | 'danger' | 'default'; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  approved: { variant: 'success', label: 'Approved' },
  rejected: { variant: 'danger', label: 'Rejected' },
  cancelled: { variant: 'default', label: 'Cancelled' },
};

export const LeavePage: React.FC = () => {
  const { user } = useAuthStore();
  const companyId = user?.companyId || '';
  const isManager = ['company_admin', 'hr_manager', 'department_manager'].includes(user?.role || '');
  const employeeId = user?.employee?.id;

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showApprove, setShowApprove] = useState<LeaveRequest | null>(null);
  const [showReject, setShowReject] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [myEmployee, setMyEmployee] = useState<Employee | null>(null);

  const [form, setForm] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const fetchRequests = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const result = await leaveService.list(companyId, {
        employeeId: isManager ? undefined : employeeId,
        status: statusFilter || undefined,
        page, limit: 20,
      });
      setRequests(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [companyId, statusFilter, page, isManager, employeeId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!companyId || !employeeId) return;
    employeeService.getById(companyId, employeeId)
      .then(emp => setMyEmployee(emp))
      .catch(console.error);
  }, [companyId, employeeId]);

  const totalDays = form.startDate && form.endDate
    ? Math.max(0, differenceInBusinessDays(new Date(form.endDate), new Date(form.startDate)) + 1)
    : 0;

  const handleCreate = async () => {
    if (!employeeId) { toast.error('No employee profile found'); return; }
    if (!form.startDate || !form.endDate || !form.reason) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error('End date must be after start date');
      return;
    }
    setSaving(true);
    try {
      await leaveService.create(companyId, employeeId, {
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });
      toast.success('Leave request submitted successfully');
      setShowCreate(false);
      setForm({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });
      fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit leave request');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!showApprove || !employeeId) return;
    setSaving(true);
    try {
      await leaveService.approve(companyId, showApprove.id, employeeId);
      toast.success('Leave request approved');
      setShowApprove(null);
      fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!showReject || !employeeId) return;
    if (!rejectionReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    setSaving(true);
    try {
      await leaveService.reject(companyId, showReject.id, employeeId, rejectionReason);
      toast.success('Leave request rejected');
      setShowReject(null);
      setRejectionReason('');
      fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (request: LeaveRequest) => {
    if (!employeeId) return;
    try {
      await leaveService.cancel(companyId, request.id, employeeId);
      toast.success('Leave request cancelled');
      fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (_: unknown, row: LeaveRequest) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-violet-700">
              {row.employee?.firstName?.[0]}{row.employee?.lastName?.[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">{row.employee?.firstName} {row.employee?.lastName}</p>
            <p className="text-xs text-slate-400">{row.employee?.department?.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'leaveType',
      header: 'Leave Type',
      render: (_: unknown, row: LeaveRequest) => (
        <Badge variant="info">{LEAVE_TYPES.find(t => t.value === row.leaveType)?.label || row.leaveType}</Badge>
      ),
    },
    {
      key: 'dates',
      header: 'Duration',
      render: (_: unknown, row: LeaveRequest) => (
        <div>
          <p className="text-sm text-slate-700">{format(new Date(row.startDate), 'MMM d')} – {format(new Date(row.endDate), 'MMM d, yyyy')}</p>
          <p className="text-xs text-slate-400">{row.totalDays} day{row.totalDays !== 1 ? 's' : ''}</p>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (_: unknown, row: LeaveRequest) => (
        <span className="text-sm text-slate-600 line-clamp-1 max-w-xs">{row.reason}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_: unknown, row: LeaveRequest) => {
        const cfg = statusConfig[row.status] || statusConfig.pending;
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'createdAt',
      header: 'Submitted',
      render: (_: unknown, row: LeaveRequest) => (
        <span className="text-sm text-slate-500">{format(new Date(row.createdAt), 'MMM d, yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: unknown, row: LeaveRequest) => (
        <div className="flex items-center gap-1">
          {isManager && row.status === 'pending' && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setShowApprove(row); }}
                className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                title="Approve"
              >
                <CheckCircle size={15} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setShowReject(row); }}
                className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                title="Reject"
              >
                <XCircle size={15} />
              </button>
            </>
          )}
          {!isManager && row.status === 'pending' && row.employeeId === employeeId && (
            <button
              onClick={e => { e.stopPropagation(); handleCancel(row); }}
              className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Leave Balance Cards (for employees) */}
      {myEmployee && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Annual Leave', balance: myEmployee.annualLeaveBalance, color: 'indigo', icon: <Calendar size={20} className="text-indigo-600" /> },
            { label: 'Sick Leave', balance: myEmployee.sickLeaveBalance, color: 'emerald', icon: <AlertCircle size={20} className="text-emerald-600" /> },
            { label: 'Personal Leave', balance: myEmployee.personalLeaveBalance, color: 'violet', icon: <Clock size={20} className="text-violet-600" /> },
          ].map(item => (
            <Card key={item.label} className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-${item.color}-50`}>{item.icon}</div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{item.balance}</p>
                <p className="text-sm text-slate-500">{item.label} Remaining</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Requests Table */}
      <Card padding="none">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-800">Leave Requests</h3>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-600"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} leftIcon={<Plus size={14} />}>
            Request Leave
          </Button>
        </div>

        <Table
          columns={columns}
          data={requests}
          keyExtractor={r => r.id}
          loading={loading}
          emptyMessage="No leave requests found."
        />

        {total > 20 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Leave Request"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Submit Request</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Leave Type"
            value={form.leaveType}
            onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))}
            options={LEAVE_TYPES}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
              required
              min={new Date().toISOString().split('T')[0]}
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
              required
              min={form.startDate || new Date().toISOString().split('T')[0]}
            />
          </div>

          {totalDays > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-sm text-indigo-700">
              <span className="font-semibold">{totalDays} working day{totalDays !== 1 ? 's' : ''}</span> will be deducted from your {form.leaveType} leave balance.
            </div>
          )}

          <TextArea
            label="Reason"
            value={form.reason}
            onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
            required
            rows={3}
            placeholder="Please provide a reason for your leave request..."
          />
        </div>
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={!!showApprove}
        onClose={() => setShowApprove(null)}
        title="Approve Leave Request"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowApprove(null)}>Cancel</Button>
            <Button variant="success" onClick={handleApprove} loading={saving}>Approve</Button>
          </>
        }
      >
        {showApprove && (
          <div className="space-y-3">
            <p className="text-slate-600">
              Approve <strong>{showApprove.employee?.firstName} {showApprove.employee?.lastName}</strong>'s {showApprove.leaveType} leave request
              for <strong>{showApprove.totalDays} day{showApprove.totalDays !== 1 ? 's' : ''}</strong>?
            </p>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-sm text-emerald-700">
              {format(new Date(showApprove.startDate), 'MMM d')} – {format(new Date(showApprove.endDate), 'MMM d, yyyy')}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={!!showReject}
        onClose={() => setShowReject(null)}
        title="Reject Leave Request"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowReject(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} loading={saving}>Reject</Button>
          </>
        }
      >
        {showReject && (
          <div className="space-y-4">
            <p className="text-slate-600">
              Rejecting <strong>{showReject.employee?.firstName} {showReject.employee?.lastName}</strong>'s {showReject.leaveType} leave request.
            </p>
            <TextArea
              label="Rejection Reason"
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              required
              rows={3}
              placeholder="Please provide a reason for rejection..."
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
