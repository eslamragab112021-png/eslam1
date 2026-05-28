import { Shield, Lock, Check, Users, ChevronRight } from 'lucide-react';
import { ROLE_DEFINITIONS, PERMISSION_LABELS, ROLE_COLORS } from '../../config/roles';
import { RoleBadge } from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import type { Role, Permission } from '../../types/auth';

const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: 'User Management',
    permissions: ['users:read', 'users:write', 'users:delete'],
  },
  {
    label: 'Role Management',
    permissions: ['roles:read', 'roles:write', 'roles:delete'],
  },
  {
    label: 'Audit & Compliance',
    permissions: ['audit:read'],
  },
  {
    label: 'Settings',
    permissions: ['settings:read', 'settings:write'],
  },
  {
    label: 'Reports',
    permissions: ['reports:read', 'reports:write'],
  },
  {
    label: 'Sessions',
    permissions: ['sessions:read', 'sessions:revoke'],
  },
  {
    label: 'Company',
    permissions: ['company:read', 'company:write'],
  },
];

const ROLES: Role[] = ['super_admin', 'company_admin', 'manager', 'employee'];

export default function RolesPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Roles & Permissions</h1>
        <p className="text-slate-500 text-sm mt-1">
          Role-based access control matrix — view permissions assigned to each role
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ROLES.map(role => {
          const def = ROLE_DEFINITIONS[role];
          const colors = ROLE_COLORS[role];
          return (
            <Card key={role} className={`border-2 ${colors.border} hover:shadow-md transition-shadow`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center`}>
                  <Shield size={18} className={colors.text} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{def.label}</h3>
                  <span className="text-xs text-slate-500">Level {def.level}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">{def.description}</p>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  {def.permissions.length} permissions
                </p>
                <div className="flex flex-wrap gap-1">
                  {def.permissions.slice(0, 6).map(p => (
                    <span key={p} className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                      {p}
                    </span>
                  ))}
                  {def.permissions.length > 6 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      +{def.permissions.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Permissions Matrix */}
      <Card padding="none">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-slate-400" />
            <h2 className="font-bold text-slate-900">Permissions Matrix</h2>
          </div>
          <p className="text-slate-500 text-xs mt-1">Complete access control breakdown by role</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 w-64">Permission</th>
                {ROLES.map(role => (
                  <th key={role} className="px-4 py-3 text-center">
                    <RoleBadge role={role} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map(group => (
                <>
                  <tr key={`group-${group.label}`} className="bg-slate-50/50">
                    <td colSpan={5} className="px-5 py-2">
                      <div className="flex items-center gap-2">
                        <Users size={13} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                          {group.label}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {group.permissions.map(permission => (
                    <tr key={permission} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <ChevronRight size={12} className="text-slate-300" />
                          <span className="text-sm text-slate-700">{PERMISSION_LABELS[permission]}</span>
                          <span className="text-xs text-slate-400 font-mono hidden lg:inline">({permission})</span>
                        </div>
                      </td>
                      {ROLES.map(role => {
                        const hasIt = ROLE_DEFINITIONS[role].permissions.includes(permission);
                        return (
                          <td key={role} className="px-4 py-3 text-center">
                            {hasIt ? (
                              <div className="flex items-center justify-center">
                                <div className="w-6 h-6 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center">
                                  <Check size={12} className="text-emerald-600" />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* RBAC Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: 'Principle of Least Privilege',
            desc: 'Each role is granted only the minimum permissions necessary to perform their job functions.',
            icon: '🔒',
          },
          {
            title: 'Role Hierarchy',
            desc: 'Higher-level roles can only manage users with lower privilege levels, preventing privilege escalation.',
            icon: '🏗️',
          },
          {
            title: 'Permission Inheritance',
            desc: 'All permissions are explicitly defined — no implicit inheritance to prevent accidental access grants.',
            icon: '📋',
          },
        ].map(item => (
          <Card key={item.title} className="bg-slate-50 border-slate-100">
            <div className="text-2xl mb-3">{item.icon}</div>
            <h3 className="font-semibold text-slate-900 text-sm mb-1">{item.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
