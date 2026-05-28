import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Play, CheckCircle, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { payrollService } from '../services/payroll.service';
import { Card, Badge, Modal } from '../components/ui/Card';
import { Table, Pagination } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import type { PayrollRecord } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { variant: 'warning' | 'success' | 'danger' | 'info' | 'default'; label: string }> = {
  draft: { variant: 'warning', label: 'Draft' },
  processing: { variant: 'info', label: 'Processing' },
  paid: { variant: 'success', label: 'Paid' },
  failed: { variant: 'danger', label: 'Failed' },
};

export const PayrollPage: React.FC = () => {
  const { user } = useAuthStore();
  const companyId = user?.companyId || '';
  const isAdmin = ['company_admin', 'hr_manager'].includes(user?.role || '');

  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [summary, setSummary] = useState<{
    currentMonthTotal: number; previousMonthTotal: number;
    pendingPayments: number; ytdTotal: number; avgSalary: number;
  } | null>(null);

  const [processing, setProcessing] = useState(false);
  const [showProcess, setShowProcess] = useState(false);
  const [processMonth, setProcessMonth] = useState(new Date().getMonth() + 1);
  const [processYear, setProcessYear] = useState(new Date().getFullYear());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [payrollResult, summaryData] = await Promise.all([
        payrollService.list(companyId, {
          period: periodFilter || undefined,
          status: statusFilter || undefined,
          page, limit: 20,
        }),
        payrollService.getSummary(companyId),
      ]);
      setRecords(payrollResult.data);
      setTotal(payrollResult.total);
      setTotalPages(payrollResult.totalPages);
      setSummary(summaryData);
    } catch (err) {
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  }, [companyId, periodFilter, statusFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProcessPayroll = async () => {
    setProcessing(true);
    try {
      const result = await payrollService.processMonthlyPayroll(companyId, processYear, processMonth);
      toast.success(`Payroll processed: ${result.processed} employees, ${result.errors} errors`);
      setShowProcess(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payroll processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    if (selectedIds.length === 0) { toast.error('Select records to mark as paid'); return; }
    try {
      await payrollService.markAsPaid(companyId, selectedIds);
      toast.success(`${selectedIds.length} payroll records marked as paid`);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast.error('Failed to update payroll status');
    }
  };

  const pctChange = summary && summary.previousMonthTotal > 0
    ? ((summary.currentMonthTotal - summary.previousMonthTotal) / summary.previousMonthTotal * 100).toFixed(1)
    : null;

  const columns = [
    {
      key: 'select',
      header: '',
      render: (_: unknown, row: PayrollRecord) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={e => {
            e.stopPropagation();
            setSelectedIds(prev => e.target.checked ? [...prev, row.id] : prev.filter(id => id !== row.id));
          }}
          className="rounded border-slate-300 text-indigo-600"
        />
      ),
    },
    {
      key: 'employee',
      header: 'Employee',
      render: (_: unknown, row: PayrollRecord) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-emerald-700">
              {row.employee?.firstName?.[0]}{row.employee?.lastName?.[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">{row.employee?.firstName} {row.employee?.lastName}</p>
            <p className="text-xs text-slate-400">{row.employee?.department?.name || row.employee?.jobTitle}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (_: unknown, row: PayrollRecord) => (
        <span className="text-sm font-medium text-slate-700">{row.period}</span>
      ),
    },
    {
      key: 'attendance',
      header: 'Attendance',
      render: (_: unknown, row: PayrollRecord) => (
        <div className="text-sm">
          <span className="text-emerald-600 font-medium">{row.presentDays}P</span>
          <span className="text-slate-400 mx-1">/</span>
          <span className="text-red-500">{row.absentDays}A</span>
          {row.overtimeHours > 0 && (
            <span className="text-amber-500 ml-1">+{row.overtimeHours.toFixed(1)}OT</span>
          )}
        </div>
      ),
    },
    {
      key: 'baseSalary',
      header: 'Base Salary',
      render: (_: unknown, row: PayrollRecord) => (
        <span className="text-sm text-slate-600">${row.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'deductions',
      header: 'Deductions',
      render: (_: unknown, row: PayrollRecord) => (
        <span className="text-sm text-red-600">-${row.deductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'grossPay',
      header: 'Gross Pay',
      render: (_: unknown, row: PayrollRecord) => (
        <span className="text-sm font-medium text-slate-800">${row.grossPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'taxAmount',
      header: 'Tax (25%)',
      render: (_: unknown, row: PayrollRecord) => (
        <span className="text-sm text-red-500">-${row.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'netPay',
      header: 'Net Pay',
      render: (_: unknown, row: PayrollRecord) => (
        <span className="text-base font-bold text-slate-900">${row.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_: unknown, row: PayrollRecord) => {
        const cfg = statusConfig[row.status] || statusConfig.draft;
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'paidAt',
      header: 'Paid Date',
      render: (_: unknown, row: PayrollRecord) => (
        <span className="text-sm text-slate-500">
          {row.paidAt ? format(new Date(row.paidAt), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">This Month Payroll</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ${(summary?.currentMonthTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl"><DollarSign size={20} className="text-emerald-600" /></div>
          </div>
          {pctChange && (
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-50">
              {parseFloat(pctChange) >= 0
                ? <TrendingUp size={14} className="text-emerald-500" />
                : <TrendingDown size={14} className="text-red-500" />}
              <span className={`text-sm font-medium ${parseFloat(pctChange) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {pctChange}% vs last month
              </span>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Pending Payments</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ${(summary?.pendingPayments || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl"><DollarSign size={20} className="text-amber-600" /></div>
          </div>
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-50">Draft payrolls awaiting payment</p>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">YTD Total</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ${(summary?.ytdTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl"><TrendingUp size={20} className="text-indigo-600" /></div>
          </div>
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-50">Year-to-date payroll total</p>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Avg Salary</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ${(summary?.avgSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-3 bg-violet-50 rounded-xl"><DollarSign size={20} className="text-violet-600" /></div>
          </div>
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-50">Average annual salary</p>
        </Card>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 border-b border-slate-100">
          <div className="flex-1 flex items-center gap-3">
            <input
              type="month"
              value={periodFilter}
              onChange={e => { setPeriodFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-600"
            />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-600"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <Button variant="success" size="sm" onClick={handleMarkPaid} leftIcon={<CheckCircle size={14} />}>
                  Mark {selectedIds.length} as Paid
                </Button>
              )}
              <Button variant="outline" size="sm" leftIcon={<Download size={14} />}>Export</Button>
              <Button size="sm" onClick={() => setShowProcess(true)} leftIcon={<Play size={14} />}>
                Process Payroll
              </Button>
            </div>
          )}
        </div>

        <Table
          columns={isAdmin ? columns : columns.filter(c => c.key !== 'select')}
          data={records}
          keyExtractor={r => r.id}
          loading={loading}
          emptyMessage="No payroll records found. Process payroll to generate records."
        />

        {total > 20 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
        )}
      </Card>

      {/* Process Modal */}
      <Modal
        isOpen={showProcess}
        onClose={() => setShowProcess(false)}
        title="Process Monthly Payroll"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowProcess(false)}>Cancel</Button>
            <Button onClick={handleProcessPayroll} loading={processing} leftIcon={<Play size={14} />}>
              Process Now
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-slate-600 text-sm">
            This will calculate payroll for all active employees based on their attendance records,
            overtime hours, absences, and configured salary.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Year</label>
              <select
                value={processYear}
                onChange={e => setProcessYear(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {[2023, 2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Month</label>
              <select
                value={processMonth}
                onChange={e => setProcessMonth(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    {format(new Date(2024, m - 1), 'MMMM')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700">
            ⚠️ Processing will overwrite existing draft payrolls for this period.
          </div>
        </div>
      </Modal>
    </div>
  );
};
