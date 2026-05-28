// ============================================================
// ENTERPRISE AUTH — ROLE & PERMISSION DEFINITIONS
// ============================================================

import type { Role, Permission, RoleDefinition } from '../types/auth';

export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  super_admin: {
    role: 'super_admin',
    label: 'Super Admin',
    description: 'Full system access — manages all companies, users, and configurations',
    color: 'red',
    level: 4,
    permissions: [
      'users:read', 'users:write', 'users:delete',
      'roles:read', 'roles:write', 'roles:delete',
      'audit:read',
      'settings:read', 'settings:write',
      'reports:read', 'reports:write',
      'sessions:read', 'sessions:revoke',
      'company:read', 'company:write',
    ],
  },
  company_admin: {
    role: 'company_admin',
    label: 'Company Admin',
    description: 'Manages all users and settings within their company',
    color: 'orange',
    level: 3,
    permissions: [
      'users:read', 'users:write', 'users:delete',
      'roles:read', 'roles:write',
      'audit:read',
      'settings:read', 'settings:write',
      'reports:read', 'reports:write',
      'sessions:read', 'sessions:revoke',
      'company:read', 'company:write',
    ],
  },
  manager: {
    role: 'manager',
    label: 'Manager',
    description: 'Manages team members and views department reports',
    color: 'blue',
    level: 2,
    permissions: [
      'users:read', 'users:write',
      'roles:read',
      'reports:read',
      'sessions:read',
      'company:read',
    ],
  },
  employee: {
    role: 'employee',
    label: 'Employee',
    description: 'Standard access to personal profile and assigned resources',
    color: 'green',
    level: 1,
    permissions: [
      'users:read',
      'company:read',
    ],
  },
};

export const ROLE_COLORS: Record<Role, { bg: string; text: string; border: string; badge: string }> = {
  super_admin: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700 border border-red-200',
  },
  company_admin: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700 border border-orange-200',
  },
  manager: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700 border border-blue-200',
  },
  employee: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  },
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  'users:read': 'View Users',
  'users:write': 'Create & Edit Users',
  'users:delete': 'Delete Users',
  'roles:read': 'View Roles',
  'roles:write': 'Assign Roles',
  'roles:delete': 'Delete Roles',
  'audit:read': 'View Audit Logs',
  'settings:read': 'View Settings',
  'settings:write': 'Edit Settings',
  'reports:read': 'View Reports',
  'reports:write': 'Create Reports',
  'sessions:read': 'View Sessions',
  'sessions:revoke': 'Revoke Sessions',
  'company:read': 'View Company',
  'company:write': 'Edit Company',
};

export function hasPermission(userPermissions: Permission[], required: Permission): boolean {
  return userPermissions.includes(required);
}

export function hasAnyPermission(userPermissions: Permission[], required: Permission[]): boolean {
  return required.some(p => userPermissions.includes(p));
}

export function hasAllPermissions(userPermissions: Permission[], required: Permission[]): boolean {
  return required.every(p => userPermissions.includes(p));
}

export function canAccessRole(currentRole: Role, targetRole: Role): boolean {
  return ROLE_DEFINITIONS[currentRole].level > ROLE_DEFINITIONS[targetRole].level;
}
