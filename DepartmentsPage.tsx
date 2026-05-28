import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Building2 } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { departmentService, shiftService } from '../services/department.service';
import { Card, Modal, EmptyState } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { Department, Shift } from '../types';
import toast from 'react-hot-toast';

export const DepartmentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const companyId = user?.companyId || '';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'departments' | 'shifts'>('departments');

  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });
  const [shiftForm, setShiftForm] = useState({
    name: '', type: 'day', startTime: '09:00', endTime: '17:00',
    breakDuration: 60, gracePeriodMinutes: 15,
    workingDays: [1, 2, 3, 4, 5] as number[],
  });

  const fetch = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [depts, shiftList] = await Promise.all([
        departmentService.list(companyId),
        shiftService.list(companyId),
      ]);
      setDepartments(depts);
      setShifts(shiftList);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [companyId]);

  const handleSaveDept = async () => {
    if (!deptForm.name || !deptForm.code) { toast.error('Name and code are required'); return; }
    setSaving(true);
    try {
      if (editingDept) {
        await departmentService.update(companyId, editingDept.id, { name: deptForm.name, description: deptForm.description });
        toast.success('Department updated');
      } else {
        await departmentService.create(companyId, { name: deptForm.name, code: deptForm.code, description: deptForm.description });
        toast.success('Department created');
      }
      setShowDeptModal(false);
      setDeptForm({ name: '', code: '', description: '' });
      fetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveShift = async () => {
    if (!shiftForm.name) { toast.error('Shift name is required'); return; }
    setSaving(true);
    try {
      await shiftService.create(companyId, {
        name: shiftForm.name, type: shiftForm.type,
        startTime: shiftForm.startTime, endTime: shiftForm.endTime,
        breakDuration: shiftForm.breakDuration,
        workingDays: shiftForm.workingDays,
        gracePeriodMinutes: shiftForm.gracePeriodMinutes,
      });
      toast.success('Shift created');
      setShowShiftModal(false);
      setShiftForm({ name: '', type: 'day', startTime: '09:00', endTime: '17:00', breakDuration: 60, gracePeriodMinutes: 15, workingDays: [1, 2, 3, 4, 5] });
      fetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDept = async (dept: Department) => {
    if (!window.confirm(`Delete department "${dept.name}"?`)) return;
    try {
      await departmentService.delete(companyId, dept.id);
      toast.success('Department deleted');
      fetch();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {(['departments', 'shifts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">All Departments ({departments.length})</h3>
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditingDept(null); setDeptForm({ name: '', code: '', description: '' }); setShowDeptModal(true); }}>
              Add Department
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <Card>
              <EmptyState
                title="No departments yet"
                description="Create departments to organize your employees effectively."
                icon={<Building2 size={32} className="text-slate-400" />}
                action={<Button onClick={() => setShowDeptModal(true)} leftIcon={<Plus size={14} />}>Add Department</Button>}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => (
                <Card key={dept.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 bg-indigo-50 rounded-xl">
                      <Building2 size={20} className="text-indigo-600" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingDept(dept); setDeptForm({ name: dept.name, code: dept.code, description: dept.description || '' }); setShowDeptModal(true); }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteDept(dept)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-800">{dept.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{dept.code}</p>
                  {dept.description && <p className="text-sm text-slate-500 mt-2">{dept.description}</p>}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Users size={14} className="text-slate-400" />
                    <span className="text-sm text-slate-600">{dept.employeeCount || 0} employees</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">All Shifts ({shifts.length})</h3>
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowShiftModal(true)}>Add Shift</Button>
          </div>

          {shifts.length === 0 ? (
            <Card>
              <EmptyState
                title="No shifts configured"
                description="Create shifts to assign work schedules to employees."
                icon={<Users size={32} className="text-slate-400" />}
                action={<Button onClick={() => setShowShiftModal(true)} leftIcon={<Plus size={14} />}>Add Shift</Button>}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shifts.map(shift => (
                <Card key={shift.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-lg capitalize">
                      {shift.type}
                    </span>
                    <span className={`w-2 h-2 rounded-full mt-2 ${shift.isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                  </div>
                  <h3 className="font-semibold text-slate-800">{shift.name}</h3>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Hours</span>
                      <span className="font-mono text-slate-700">{shift.startTime} – {shift.endTime}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Break</span>
                      <span className="text-slate-700">{shift.breakDuration} min</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Grace</span>
                      <span className="text-slate-700">{shift.gracePeriodMinutes} min</span>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100">
                    {DAYS.map((day, idx) => (
                      <span key={day} className={`flex-1 text-center text-xs py-1 rounded ${
                        shift.workingDays?.includes(idx)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {day[0]}
                      </span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Department Modal */}
      <Modal
        isOpen={showDeptModal}
        onClose={() => setShowDeptModal(false)}
        title={editingDept ? 'Edit Department' : 'New Department'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeptModal(false)}>Cancel</Button>
            <Button onClick={handleSaveDept} loading={saving}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Department Name" value={deptForm.name} onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))} required placeholder="Engineering" />
          <Input label="Code" value={deptForm.code} onChange={e => setDeptForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} required placeholder="ENG" disabled={!!editingDept} />
          <Input label="Description" value={deptForm.description} onChange={e => setDeptForm(p => ({ ...p, description: e.target.value }))} placeholder="Department description..." />
        </div>
      </Modal>

      {/* Shift Modal */}
      <Modal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        title="New Shift"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowShiftModal(false)}>Cancel</Button>
            <Button onClick={handleSaveShift} loading={saving}>Create Shift</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Shift Name" value={shiftForm.name} onChange={e => setShiftForm(p => ({ ...p, name: e.target.value }))} required placeholder="Morning Shift" />
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Type</label>
              <select
                value={shiftForm.type}
                onChange={e => setShiftForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {['day', 'night', 'rotating', 'flexible'].map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time" value={shiftForm.startTime} onChange={e => setShiftForm(p => ({ ...p, startTime: e.target.value }))} required />
            <Input label="End Time" type="time" value={shiftForm.endTime} onChange={e => setShiftForm(p => ({ ...p, endTime: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Break Duration (min)" type="number" value={shiftForm.breakDuration} onChange={e => setShiftForm(p => ({ ...p, breakDuration: Number(e.target.value) }))} />
            <Input label="Grace Period (min)" type="number" value={shiftForm.gracePeriodMinutes} onChange={e => setShiftForm(p => ({ ...p, gracePeriodMinutes: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Working Days</label>
            <div className="flex gap-2">
              {DAYS.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setShiftForm(p => ({
                    ...p,
                    workingDays: p.workingDays.includes(idx)
                      ? p.workingDays.filter(d => d !== idx)
                      : [...p.workingDays, idx].sort(),
                  }))}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                    shiftForm.workingDays.includes(idx)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
