import { useState } from 'react';
import { Search, Plus, Users } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../store';
import { dbPut } from '../../db/database';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';
import type { Employee } from '../../db/schema';

const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Operations', 'Sales', 'Marketing'];

export function EmployeesView() {
  const { employees, shifts, locations, loadEmployees } = useStore();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>({
    name: '', email: '', employeeCode: '', department: 'Engineering',
    designation: '', phone: '', status: 'active', shiftId: '', workLocationId: '',
    annualLeaveBalance: 14, sickLeaveBalance: 14, emergencyLeaveBalance: 3,
    joinDate: new Date().toISOString().split('T')[0],
  });

  const openCreate = () => {
    setEditEmp(null);
    setForm({
      name: '', email: '', employeeCode: `EMP${String(employees.length + 1).padStart(4, '0')}`,
      department: 'Engineering', designation: '', phone: '', status: 'active',
      shiftId: shifts[0]?.id || '', workLocationId: locations[0]?.id || '',
      annualLeaveBalance: 14, sickLeaveBalance: 14, emergencyLeaveBalance: 3,
      joinDate: new Date().toISOString().split('T')[0],
    });
    setShowForm(true);
  };

  const openEdit = (emp: Employee) => {
    setEditEmp(emp);
    setForm({ ...emp });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.employeeCode) {
      toast.error('Name, email and employee code are required');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const emp: Employee = {
        id: editEmp?.id || uuidv4(),
        employeeCode: form.employeeCode!,
        name: form.name!,
        email: form.email!,
        department: form.department || 'Engineering',
        designation: form.designation || '',
        phone: form.phone || '',
        status: form.status || 'active',
        shiftId: form.shiftId,
        workLocationId: form.workLocationId,
        joinDate: form.joinDate || now.split('T')[0],
        annualLeaveBalance: form.annualLeaveBalance || 14,
        sickLeaveBalance: form.sickLeaveBalance || 14,
        emergencyLeaveBalance: form.emergencyLeaveBalance || 3,
        createdAt: editEmp?.createdAt || now,
        updatedAt: now,
      };
      await dbPut('employees', emp);
      await loadEmployees();
      setShowForm(false);
      toast.success(editEmp ? 'Employee updated' : 'Employee added');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = employees.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || e.department === filterDept;
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const depts = [...new Set(employees.map((e) => e.department))].sort();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Employee Management</h2>
          <p className="text-sm text-gray-500">{employees.length} employees total</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Add Employee
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-0">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees…"
            className="text-sm bg-transparent outline-none text-gray-700 w-full"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Depts</option>
          {depts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_leave">On Leave</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: employees.length, color: 'text-gray-900' },
          { label: 'Active', value: employees.filter(e => e.status === 'active').length, color: 'text-emerald-600' },
          { label: 'On Leave', value: employees.filter(e => e.status === 'on_leave').length, color: 'text-blue-600' },
          { label: 'Departments', value: depts.length, color: 'text-indigo-600' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardBody className="text-center py-4">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((emp) => {
          const shift = shifts.find((s) => s.id === emp.shiftId);
          const location = locations.find((l) => l.id === emp.workLocationId);
          return (
            <Card key={emp.id} onClick={() => openEdit(emp)}>
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 truncate">{emp.name}</h3>
                      <Badge status={emp.status} />
                    </div>
                    <div className="text-xs text-gray-500 truncate">{emp.designation}</div>
                    <div className="text-xs text-indigo-600 font-mono">{emp.employeeCode}</div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Department</span>
                    <span className="font-medium text-gray-700">{emp.department}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Shift</span>
                    <span className="font-medium text-gray-700">{shift?.name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Location</span>
                    <span className="font-medium text-gray-700 truncate max-w-24">{location?.name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Joined</span>
                    <span className="font-medium text-gray-700">{formatDate(emp.joinDate)}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs">
                  <span className="text-gray-500">Annual: <span className="font-bold text-blue-600">{emp.annualLeaveBalance}d</span></span>
                  <span className="text-gray-500">Sick: <span className="font-bold text-amber-600">{emp.sickLeaveBalance}d</span></span>
                  <span className="text-gray-500">Emergency: <span className="font-bold text-red-600">{emp.emergencyLeaveBalance}d</span></span>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <div>No employees found</div>
        </div>
      )}

      {/* Employee Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editEmp ? 'Edit Employee' : 'Add Employee'} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee Code *</label>
              <input value={form.employeeCode || ''} onChange={(e) => setForm((f) => ({ ...f, employeeCode: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email || ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone || ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <input value={form.designation || ''} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
              <select value={form.shiftId || ''} onChange={(e) => setForm((f) => ({ ...f, shiftId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">No shift</option>
                {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Location</label>
              <select value={form.workLocationId || ''} onChange={(e) => setForm((f) => ({ ...f, workLocationId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">No location</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Employee['status'] }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
              <input type="date" value={form.joinDate || ''} onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Annual Leave</label>
              <input type="number" value={form.annualLeaveBalance || 0} onChange={(e) => setForm((f) => ({ ...f, annualLeaveBalance: +e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sick Leave</label>
              <input type="number" value={form.sickLeaveBalance || 0} onChange={(e) => setForm((f) => ({ ...f, sickLeaveBalance: +e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency</label>
              <input type="number" value={form.emergencyLeaveBalance || 0} onChange={(e) => setForm((f) => ({ ...f, emergencyLeaveBalance: +e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editEmp ? 'Update' : 'Add'} Employee</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
