import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Search, MoreVertical, UserCheck, UserX,
  Trash2, Edit3, RefreshCw, CheckCircle2, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../lib/mockBackend';
import { useAuthStore } from '../../store/authStore';
import { RoleBadge, Badge } from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { ROLE_DEFINITIONS } from '../../config/roles';
import type { User, Role } from '../../types/auth';

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    const result = await authAPI.getUsers();
    if (result.success) setUsers(result.data);
    setIsLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      `${u.firstName} ${u.lastName} ${u.email} ${u.company || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const canManageUser = (target: User) => {
    if (!currentUser) return false;
    if (currentUser.id === target.id) return false; // Can't edit self
    const myLevel = ROLE_DEFINITIONS[currentUser.role].level;
    const targetLevel = ROLE_DEFINITIONS[target.role].level;
    return myLevel > targetLevel;
  };

  const handleSuspend = async (target: User) => {
    const newStatus = target.status === 'active' ? 'suspended' : 'active';
    const result = await authAPI.updateUser(target.id, { status: newStatus });
    if (result.success) {
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'}`);
      setUsers(prev => prev.map(u => u.id === target.id ? { ...u, status: newStatus } : u));
    }
    setActiveMenu(null);
  };

  const handleRoleChange = async (target: User, newRole: Role) => {
    const result = await authAPI.updateUser(target.id, { role: newRole });
    if (result.success) {
      toast.success('Role updated successfully');
      setUsers(prev => prev.map(u => u.id === target.id ? result.data : u));
    }
    setEditingUser(null);
  };

  const handleDelete = async (target: User) => {
    if (!currentUser) return;
    if (!confirm(`Are you sure you want to delete ${target.firstName} ${target.lastName}? This cannot be undone.`)) return;
    const result = await authAPI.deleteUser(target.id, currentUser.id);
    if (result.success) {
      toast.success('User deleted');
      setUsers(prev => prev.filter(u => u.id !== target.id));
    }
    setActiveMenu(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            {users.length} users · {users.filter(u => u.status === 'active').length} active
          </p>
        </div>
        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or company..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as Role | 'all')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="company_admin">Company Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </Card>

      {/* User Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Company</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Last Login</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-sm">Loading users...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-sm">No users found</td></tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900">
                              {u.firstName} {u.lastName}
                              {u.id === currentUser?.id && <span className="ml-1 text-xs text-indigo-500">(you)</span>}
                            </p>
                            {u.isEmailVerified ? (
                              <CheckCircle2 size={12} className="text-emerald-500" />
                            ) : (
                              <AlertTriangle size={12} className="text-amber-500" />
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <Badge variant={u.status === 'active' ? 'success' : 'danger'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 hidden xl:table-cell">
                      <span className="text-sm text-slate-600">{u.company || '—'}</span>
                    </td>
                    <td className="px-5 py-4 hidden xl:table-cell">
                      <span className="text-xs text-slate-400">
                        {u.lastLoginAt
                          ? formatDistanceToNow(new Date(u.lastLoginAt), { addSuffix: true })
                          : 'Never'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {canManageUser(u) && (
                          <>
                            <button
                              onClick={() => setEditingUser(u)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                              title="Edit role"
                            >
                              <Edit3 size={14} />
                            </button>
                            <div className="relative">
                              <button
                                onClick={() => setActiveMenu(activeMenu === u.id ? null : u.id)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                              >
                                <MoreVertical size={14} />
                              </button>
                              {activeMenu === u.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                                    <button
                                      onClick={() => handleSuspend(u)}
                                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                      {u.status === 'active' ? (
                                        <><UserX size={14} className="text-amber-500" />Suspend</>
                                      ) : (
                                        <><UserCheck size={14} className="text-emerald-500" />Activate</>
                                      )}
                                    </button>
                                    {currentUser?.role === 'super_admin' && (
                                      <button
                                        onClick={() => handleDelete(u)}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                      >
                                        <Trash2 size={14} />
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Change Role</h3>
            <p className="text-slate-500 text-sm mb-5">
              Update role for {editingUser.firstName} {editingUser.lastName}
            </p>
            <div className="space-y-2">
              {(Object.keys(ROLE_DEFINITIONS) as Role[]).map(role => {
                const myLevel = currentUser ? ROLE_DEFINITIONS[currentUser.role].level : 0;
                const roleLevel = ROLE_DEFINITIONS[role].level;
                const canAssign = myLevel > roleLevel;
                return (
                  <button
                    key={role}
                    disabled={!canAssign}
                    onClick={() => handleRoleChange(editingUser, role)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      editingUser.role === role
                        ? 'border-indigo-300 bg-indigo-50'
                        : canAssign
                        ? 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                        : 'border-slate-100 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{ROLE_DEFINITIONS[role].label}</p>
                        <p className="text-xs text-slate-500">{ROLE_DEFINITIONS[role].description}</p>
                      </div>
                      {editingUser.role === role && (
                        <CheckCircle2 size={16} className="text-indigo-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setEditingUser(null)}
              className="mt-4 w-full py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
