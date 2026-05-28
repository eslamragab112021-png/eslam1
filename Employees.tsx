import { useState } from 'react';
import {
  Users, Search, Download, Mail,
  Clock, CheckCircle2, Edit, UserPlus
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '../store/appStore';
import { db } from '../data/mockDatabase';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { cn } from '../utils/cn';
import type { User } from '../types';

const ROLE_LABELS: Record<string, string> = {
  company_admin: 'Admin', hr_manager: 'HR Manager', employee: 'Employee'
};

export function Employees() {
  const { currentCompany, currentPlan, setShowUpgradeModal } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [_showAddUser, setShowAddUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [importStep, setImportStep] = useState(1);

  const employees = db.getUsers(currentCompany?.id || '').filter(u => u.role !== 'superadmin');
  const departments = db.getDepartments(currentCompany?.id || '');

  const filtered = employees.filter(emp => {
    const matchSearch =
      emp.firstName.toLowerCase().includes(search.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || emp.role === filterRole;
    const matchDept = filterDept === 'all' || emp.departmentId === filterDept;
    return matchSearch && matchRole && matchDept;
  });

  const atLimit = typeof currentPlan?.limits.employees === 'number' &&
    employees.length >= currentPlan.limits.employees;

  const handleAddEmployee = () => {
    if (atLimit) { setShowUpgradeModal(true); return; }
    setShowAddUser(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Employee Directory</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {employees.length} employees
            {typeof currentPlan?.limits.employees === 'number' && ` · ${currentPlan.limits.employees - employees.length} slots remaining`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => setShowImport(true)}>Import CSV</Button>
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={handleAddEmployee}>
            Add Employee
          </Button>
        </div>
      </div>

      {/* Usage Bar */}
      {typeof currentPlan?.limits.employees === 'number' && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Employee Capacity</span>
            <span className="text-sm font-bold text-slate-900">{employees.length} / {currentPlan.limits.employees}</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                (employees.length / currentPlan.limits.employees) > 0.9 ? 'bg-red-500' :
                (employees.length / currentPlan.limits.employees) > 0.7 ? 'bg-amber-500' : 'bg-indigo-500'
              )}
              style={{ width: `${Math.min((employees.length / currentPlan.limits.employees) * 100, 100)}%` }}
            />
          </div>
          {atLimit && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-red-600 font-medium">Employee limit reached</span>
              <button onClick={() => setShowUpgradeModal(true)} className="text-xs text-indigo-600 font-medium underline">Upgrade plan →</button>
            </div>
          )}
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-48 max-w-xs">
          <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="bg-transparent text-sm text-slate-700 outline-none w-full" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none">
          <option value="all">All Roles</option>
          <option value="company_admin">Admins</option>
          <option value="hr_manager">HR Managers</option>
          <option value="employee">Employees</option>
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <span className="text-sm text-slate-400">{filtered.length} results</span>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(emp => {
          const dept = departments.find(d => d.id === emp.departmentId);
          const recentAttendance = db.getAttendance(currentCompany?.id || '', emp.id).slice(-1)[0];
          return (
            <Card key={emp.id} className="p-5 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => setSelectedUser(emp)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {emp.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-slate-500">{emp.jobTitle}</p>
                    <p className="text-xs text-slate-400 font-mono">{emp.employeeId}</p>
                  </div>
                </div>
                <Badge variant={emp.role === 'company_admin' ? 'purple' : emp.role === 'hr_manager' ? 'info' : 'default'}>
                  {ROLE_LABELS[emp.role]}
                </Badge>
              </div>

              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                {dept && (
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{dept.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Hired {format(parseISO(emp.hireDate), 'MMM yyyy')}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-2 h-2 rounded-full', emp.isActive ? 'bg-emerald-400' : 'bg-slate-300')} />
                  <span className="text-xs text-slate-500">{emp.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                {recentAttendance && (
                  <Badge
                    variant={recentAttendance.status === 'present' ? 'success' : recentAttendance.status === 'absent' ? 'danger' : 'warning'}
                  >
                    {recentAttendance.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-slate-400">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No employees found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Employee Detail Modal */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title={selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : ''} subtitle={selectedUser?.jobTitle} size="md">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-4xl">{selectedUser.avatar}</div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{selectedUser.firstName} {selectedUser.lastName}</h3>
                <p className="text-slate-500">{selectedUser.jobTitle}</p>
                <Badge variant={selectedUser.role === 'company_admin' ? 'purple' : 'default'}>{ROLE_LABELS[selectedUser.role]}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-slate-500">Employee ID</p><p className="font-mono font-semibold">{selectedUser.employeeId}</p></div>
              <div><p className="text-xs text-slate-500">Email</p><p className="font-medium">{selectedUser.email}</p></div>
              <div><p className="text-xs text-slate-500">Phone</p><p className="font-medium">{selectedUser.phone || 'N/A'}</p></div>
              <div><p className="text-xs text-slate-500">Hire Date</p><p className="font-medium">{format(parseISO(selectedUser.hireDate), 'MMM d, yyyy')}</p></div>
              <div><p className="text-xs text-slate-500">2FA Enabled</p><p className="font-medium">{selectedUser.twoFactorEnabled ? '✅ Yes' : '❌ No'}</p></div>
              <div><p className="text-xs text-slate-500">Email Notifications</p><p className="font-medium">{selectedUser.preferences.emailNotifications ? '✅ On' : '❌ Off'}</p></div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" icon={<Edit className="h-4 w-4" />}>Edit Profile</Button>
              <Button variant="ghost" icon={<Mail className="h-4 w-4" />}>Send Email</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* CSV Import Modal */}
      <Modal isOpen={showImport} onClose={() => { setShowImport(false); setImportStep(1); }} title="Import Employees" subtitle="Upload a CSV file to bulk-import employees" size="md">
        <div className="space-y-5">
          <div className="flex items-center gap-3 mb-6">
            {[1, 2, 3].map(step => (
              <div key={step} className={cn('flex items-center gap-2', step < 3 && 'flex-1')}>
                <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold', importStep >= step ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400')}>
                  {importStep > step ? <CheckCircle2 className="h-4 w-4" /> : step}
                </div>
                <span className={cn('text-xs', importStep >= step ? 'text-slate-700' : 'text-slate-400')}>
                  {step === 1 ? 'Upload' : step === 2 ? 'Map Fields' : 'Confirm'}
                </span>
                {step < 3 && <div className={cn('flex-1 h-px', importStep > step ? 'bg-indigo-300' : 'bg-slate-200')} />}
              </div>
            ))}
          </div>

          {importStep === 1 && (
            <div>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-indigo-300 transition-colors cursor-pointer">
                <Download className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="font-medium text-slate-600">Drop CSV file here or click to upload</p>
                <p className="text-xs text-slate-400 mt-1">Supports CSV, XLS, XLSX · Max 10MB</p>
              </div>
              <div className="mt-4 bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Required columns:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['first_name', 'last_name', 'email', 'department', 'job_title'].map(col => (
                    <code key={col} className="text-xs bg-white border border-slate-200 rounded px-2 py-0.5">{col}</code>
                  ))}
                </div>
              </div>
              <Button className="w-full mt-4" onClick={() => setImportStep(2)}>Upload & Continue</Button>
            </div>
          )}

          {importStep === 2 && (
            <div>
              <p className="text-sm text-slate-600 mb-4">Map your CSV columns to our fields:</p>
              <div className="space-y-3">
                {['First Name', 'Last Name', 'Email', 'Department', 'Job Title'].map(field => (
                  <div key={field} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 w-32 flex-shrink-0">{field}</span>
                    <select className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none">
                      <option>{field.toLowerCase().replace(' ', '_')}</option>
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="outline" className="flex-1" onClick={() => setImportStep(1)}>Back</Button>
                <Button className="flex-1" onClick={() => setImportStep(3)}>Preview Import</Button>
              </div>
            </div>
          )}

          {importStep === 3 && (
            <div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="font-semibold text-emerald-800">Ready to import 47 employees</p>
                </div>
                <ul className="mt-2 text-xs text-emerald-600 space-y-1 ml-7">
                  <li>✓ 45 new employees will be created</li>
                  <li>✓ 2 existing records will be updated</li>
                  <li>✓ 0 errors detected</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setImportStep(2)}>Back</Button>
                <Button variant="success" className="flex-1" onClick={() => { setShowImport(false); setImportStep(1); }}>
                  Confirm Import
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
