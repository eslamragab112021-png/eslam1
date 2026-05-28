import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Filter, Download, Edit2, Trash2, Eye,
  UserCheck, Users, Building2, Briefcase
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { employeeService, type CreateEmployeePayload } from '../services/employee.service';
import { departmentService, shiftService } from '../services/department.service';
import { Card, Badge, EmptyState, Modal, LoadingSpinner } from '../components/ui/Card';
import { Table, Pagination } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input, Select, TextArea } from '../components/ui/Input';
import type { Employee, Department, Shift } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const statusBadge = (isActive: boolean) => (
  <Badge variant={isActive ? 'success' : 'danger'}>
    {isActive ? 'Active' : 'Inactive'}
  </Badge>
);

const employmentBadge = (type: string) => {
  const variants: Record<string, 'info' | 'purple' | 'warning' | 'default'> = {
    full_time: 'info', part_time: 'purple', contract: 'warning', intern: 'default',
  };
  return <Badge variant={variants[type] || 'default'}>{type.replace(/_/g, ' ')}</Badge>;
};

const defaultForm: CreateEmployeePayload = {
  firstName: '', lastName: '', email: '', phone: '', gender: 'prefer_not_to_say',
  jobTitle: '', employmentType: 'full_time', salary: 0, currency: 'USD',
  hireDate: new Date().toISOString().split('T')[0],
  departmentId: '', shiftId: '', annualLeaveBalance: 21, sickLeaveBalance: 10,
  emergencyContactName: '', emergencyContactPhone: '', address: '', city: '', country: '',
};

export const EmployeesPage: React.FC = () => {
  const { user } = useAuthStore();
  const companyId = user?.companyId || '';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<CreateEmployeePayload>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);

  const [stats, setStats] = useState<{ total: number; active: number; inactive: number; newThisMonth: number } | null>(null);

  const fetchEmployees = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const result = await employeeService.list(companyId, {
        search: search || undefined,
        departmentId: deptFilter || undefined,
        status: (statusFilter as 'active' | 'inactive') || undefined,
        page,
        limit: 15,
      });
      setEmployees(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [companyId, search, deptFilter, statusFilter, page]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      departmentService.list(companyId),
      shiftService.list(companyId),
      employeeService.getStats(companyId),
    ]).then(([depts, shiftList, empStats]) => {
      setDepartments(depts);
      setShifts(shiftList);
      setStats(empStats);
    }).catch(console.error);
  }, [companyId]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({
      firstName: emp.firstName, lastName: emp.lastName, email: emp.email,
      phone: emp.phone || '', gender: emp.gender, jobTitle: emp.jobTitle,
      employmentType: emp.employmentType, salary: emp.salary, currency: emp.currency,
      hireDate: emp.hireDate, departmentId: emp.departmentId || '',
      shiftId: emp.shiftId || '', annualLeaveBalance: emp.annualLeaveBalance,
      sickLeaveBalance: emp.sickLeaveBalance, address: emp.address || '',
      city: emp.city || '', country: emp.country || '',
      emergencyContactName: emp.emergencyContactName || '',
      emergencyContactPhone: emp.emergencyContactPhone || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.jobTitle) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      if (editingEmployee) {
        await employeeService.update(companyId, editingEmployee.id, form);
        toast.success('Employee updated successfully');
      } else {
        await employeeService.create(companyId, form);
        toast.success('Employee created successfully');
      }
      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await employeeService.deactivate(companyId, confirmDelete.id);
      toast.success('Employee deactivated');
      setConfirmDelete(null);
      fetchEmployees();
    } catch (err) {
      toast.error('Deactivation failed');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Employee',
      render: (_: unknown, row: Employee) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-indigo-700">
              {row.firstName[0]}{row.lastName[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-slate-800">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-slate-400">{row.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'jobTitle',
      header: 'Job Title',
      render: (_: unknown, row: Employee) => (
        <div>
          <p className="text-sm text-slate-700">{row.jobTitle}</p>
          <p className="text-xs text-slate-400">{row.department?.name || 'Unassigned'}</p>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (_: unknown, row: Employee) => <span className="text-sm text-slate-600">{row.email}</span> },
    {
      key: 'employmentType',
      header: 'Type',
      render: (_: unknown, row: Employee) => employmentBadge(row.employmentType),
    },
    {
      key: 'hireDate',
      header: 'Hire Date',
      render: (_: unknown, row: Employee) => (
        <span className="text-sm text-slate-600">{format(new Date(row.hireDate), 'MMM d, yyyy')}</span>
      ),
    },
    {
      key: 'salary',
      header: 'Salary',
      render: (_: unknown, row: Employee) => (
        <span className="text-sm font-medium text-slate-700">
          ${row.salary.toLocaleString()}/yr
        </span>
      ),
    },
    { key: 'isActive', header: 'Status', render: (_: unknown, row: Employee) => statusBadge(row.isActive) },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: unknown, row: Employee) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setViewEmployee(row); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
            <Eye size={15} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openEditModal(row); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
            <Edit2 size={15} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(row); }} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats?.total ?? '--', icon: <Users size={18} className="text-indigo-600" />, bg: 'bg-indigo-50' },
          { label: 'Active', value: stats?.active ?? '--', icon: <UserCheck size={18} className="text-emerald-600" />, bg: 'bg-emerald-50' },
          { label: 'Inactive', value: stats?.inactive ?? '--', icon: <Trash2 size={18} className="text-red-600" />, bg: 'bg-red-50' },
          { label: 'New This Month', value: stats?.newThisMonth ?? '--', icon: <Plus size={18} className="text-violet-600" />, bg: 'bg-violet-50' },
        ].map(s => (
          <Card key={s.label} padding="sm" className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${s.bg}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Table Card */}
      <Card padding="none">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 border-b border-slate-100">
          <div className="flex-1 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search employees..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
              />
            </div>
            <select
              value={deptFilter}
              onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-600"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as '' | 'active' | 'inactive'); setPage(1); }}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-600"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Download size={14} />}>Export</Button>
            <Button size="sm" onClick={openCreateModal} leftIcon={<Plus size={14} />}>Add Employee</Button>
          </div>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={employees}
          keyExtractor={e => e.id}
          loading={loading}
          emptyMessage="No employees found. Add your first employee to get started."
        />

        {/* Pagination */}
        {total > 15 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={15} onPageChange={setPage} />
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editingEmployee ? 'Save Changes' : 'Create Employee'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="First Name" value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required placeholder="John" />
          <Input label="Last Name" value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} required placeholder="Doe" />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required placeholder="john@company.com" />
          <Input label="Phone" type="tel" value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
          <Input label="Job Title" value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))} required placeholder="Software Engineer" />
          <Select label="Gender" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} options={GENDER_OPTIONS} />
          <Select label="Department" value={form.departmentId || ''} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}
            options={departments.map(d => ({ value: d.id, label: d.name }))} placeholder="Select department" />
          <Select label="Shift" value={form.shiftId || ''} onChange={e => setForm(p => ({ ...p, shiftId: e.target.value }))}
            options={shifts.map(s => ({ value: s.id, label: `${s.name} (${s.startTime}-${s.endTime})` }))} placeholder="Select shift" />
          <Select label="Employment Type" value={form.employmentType} onChange={e => setForm(p => ({ ...p, employmentType: e.target.value }))} options={EMPLOYMENT_TYPES} />
          <Input label="Annual Salary (USD)" type="number" value={form.salary} onChange={e => setForm(p => ({ ...p, salary: Number(e.target.value) }))} required />
          <Input label="Hire Date" type="date" value={form.hireDate} onChange={e => setForm(p => ({ ...p, hireDate: e.target.value }))} required />
          <Input label="Annual Leave Balance (days)" type="number" value={form.annualLeaveBalance || 21} onChange={e => setForm(p => ({ ...p, annualLeaveBalance: Number(e.target.value) }))} />
          <Input label="Sick Leave Balance (days)" type="number" value={form.sickLeaveBalance || 10} onChange={e => setForm(p => ({ ...p, sickLeaveBalance: Number(e.target.value) }))} />
          <div className="sm:col-span-2">
            <Input label="Address" value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St" />
          </div>
          <Input label="City" value={form.city || ''} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="New York" />
          <Input label="Country" value={form.country || ''} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} placeholder="US" />
          <Input label="Emergency Contact Name" value={form.emergencyContactName || ''} onChange={e => setForm(p => ({ ...p, emergencyContactName: e.target.value }))} />
          <Input label="Emergency Contact Phone" value={form.emergencyContactPhone || ''} onChange={e => setForm(p => ({ ...p, emergencyContactPhone: e.target.value }))} />
        </div>
      </Modal>

      {/* View Employee Modal */}
      <Modal isOpen={!!viewEmployee} onClose={() => setViewEmployee(null)} title="Employee Details" size="lg">
        {viewEmployee && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                <span className="text-xl font-bold text-indigo-700">
                  {viewEmployee.firstName[0]}{viewEmployee.lastName[0]}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{viewEmployee.firstName} {viewEmployee.lastName}</h3>
                <p className="text-slate-500">{viewEmployee.jobTitle}</p>
                <div className="flex items-center gap-2 mt-1">
                  {statusBadge(viewEmployee.isActive)}
                  {employmentBadge(viewEmployee.employmentType)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Employee Code', value: viewEmployee.employeeCode },
                { label: 'Email', value: viewEmployee.email },
                { label: 'Phone', value: viewEmployee.phone || 'N/A' },
                { label: 'Department', value: viewEmployee.department?.name || 'Unassigned' },
                { label: 'Shift', value: viewEmployee.shift?.name || 'Unassigned' },
                { label: 'Salary', value: `$${viewEmployee.salary.toLocaleString()}/yr` },
                { label: 'Hire Date', value: format(new Date(viewEmployee.hireDate), 'MMMM d, yyyy') },
                { label: 'Annual Leave', value: `${viewEmployee.annualLeaveBalance} days remaining` },
                { label: 'Sick Leave', value: `${viewEmployee.sickLeaveBalance} days remaining` },
                { label: 'Emergency Contact', value: viewEmployee.emergencyContactName || 'N/A' },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{item.label}</p>
                  <p className="text-slate-800 mt-0.5 font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Deactivate Employee" size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Deactivate</Button>
          </>
        }
      >
        <p className="text-slate-600">
          Are you sure you want to deactivate <strong>{confirmDelete?.firstName} {confirmDelete?.lastName}</strong>?
          They will no longer be able to access the system.
        </p>
      </Modal>
    </div>
  );
};
