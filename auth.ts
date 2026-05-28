// ============================================================
// ENTERPRISE AUTH — TYPE DEFINITIONS
// ============================================================

export type Role = 'super_admin' | 'company_admin' | 'manager' | 'employee';

export type Permission =
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'roles:read'
  | 'roles:write'
  | 'roles:delete'
  | 'audit:read'
  | 'settings:read'
  | 'settings:write'
  | 'reports:read'
  | 'reports:write'
  | 'sessions:read'
  | 'sessions:revoke'
  | 'company:read'
  | 'company:write';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  permissions: Permission[];
  avatar?: string;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  company?: string;
  department?: string;
  lastLoginAt?: string;
  createdAt: string;
  status: 'active' | 'suspended' | 'pending';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  company?: string;
  role?: Role;
  acceptTerms: boolean;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface Session {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  browser: string;
  os: string;
  location: string;
  isCurrentSession: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  timestamp: string;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  browser: string;
  os: string;
  location: string;
  status: 'success' | 'failure';
  failureReason?: string;
  timestamp: string;
}

export interface RoleDefinition {
  role: Role;
  label: string;
  description: string;
  permissions: Permission[];
  color: string;
  level: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}
