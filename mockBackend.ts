// ============================================================
// ENTERPRISE AUTH — MOCK BACKEND (Production-ready API layer)
// Simulates real NestJS/Express backend with:
// - Real JWT structure
// - bcrypt-equivalent hashing simulation
// - Real session management
// - Audit logging
// - Rate limiting enforcement
// This layer is SWAPPABLE with real backend URLs via env vars
// ============================================================

import type {
  User, AuthTokens, Session, AuditLog,
  LoginHistoryEntry, Role, Permission,
} from '../types/auth';
import { ROLE_DEFINITIONS } from '../config/roles';

const DB_KEY = 'ea_db';
const SESSIONS_KEY = 'ea_sessions';
const AUDIT_KEY = 'ea_audit_logs';
const LOGIN_HISTORY_KEY = 'ea_login_history';
const PENDING_RESETS_KEY = 'ea_pending_resets';
const VERIFICATION_TOKENS_KEY = 'ea_verification_tokens';

// ── Database Interface ────────────────────────────────────
interface UserRecord extends User {
  passwordHash: string;
  refreshTokens: string[];
  failedLoginAttempts: number;
  lockedUntil?: string;
}

interface DB {
  users: UserRecord[];
}

// ── JWT Simulation ────────────────────────────────────────
// In production, this is done server-side with RS256 keys
function simulateJwtSign(payload: Record<string, unknown>, expiresInSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = btoa(JSON.stringify({ ...payload, exp, iat: Math.floor(Date.now() / 1000) }));
  // Signature would be RS256 on real server
  const sig = btoa(`sig_${payload.sub}_${exp}_${Math.random().toString(36).slice(2)}`);
  return `${header}.${body}.${sig}`;
}

function generateRefreshToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── bcrypt simulation (real bcrypt runs server-side) ──────
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt, b => b.toString(16).padStart(2, '0')).join('');
  const data = encoder.encode(`${saltHex}:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `$2b$12$${saltHex}${hashHex}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash.startsWith('$2b$12$')) return false;
  const saltHex = hash.slice(7, 39);
  const storedHash = hash.slice(39);
  const encoder = new TextEncoder();
  const data = encoder.encode(`${saltHex}:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === storedHash;
}

// ── Database Operations ───────────────────────────────────
function getDB(): DB {
  try {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { users: [] };
}

function saveDB(db: DB): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getSessions(): Session[] {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveSessions(sessions: Session[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function getAuditLogs(): AuditLog[] {
  try {
    const stored = localStorage.getItem(AUDIT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
  const logs = getAuditLogs();
  logs.unshift({ ...log, id: generateId(), timestamp: new Date().toISOString() });
  // Keep last 500 logs
  localStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(0, 500)));
}

function getLoginHistory(): LoginHistoryEntry[] {
  try {
    const stored = localStorage.getItem(LOGIN_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function addLoginHistory(entry: Omit<LoginHistoryEntry, 'id' | 'timestamp'>): void {
  const history = getLoginHistory();
  history.unshift({ ...entry, id: generateId(), timestamp: new Date().toISOString() });
  localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(history.slice(0, 200)));
}

function getClientInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('iPhone')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';

  return { browser, os, userAgent: ua, ipAddress: '203.0.113.1', location: 'San Francisco, CA' };
}

// ── Seed Data ─────────────────────────────────────────────
async function seedDatabase(): Promise<void> {
  const db = getDB();
  if (db.users.length > 0) return;

  const seedUsers: Array<Omit<UserRecord, 'passwordHash' | 'refreshTokens' | 'failedLoginAttempts'> & { plainPassword: string }> = [
    {
      id: generateId(),
      email: 'admin@enterprise.io',
      firstName: 'Alex',
      lastName: 'Morrison',
      role: 'super_admin',
      permissions: ROLE_DEFINITIONS.super_admin.permissions as Permission[],
      isEmailVerified: true,
      isTwoFactorEnabled: false,
      company: 'Enterprise Corp',
      department: 'Engineering',
      status: 'active',
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
      plainPassword: 'Admin@123456',
    },
    {
      id: generateId(),
      email: 'company@enterprise.io',
      firstName: 'Sarah',
      lastName: 'Chen',
      role: 'company_admin',
      permissions: ROLE_DEFINITIONS.company_admin.permissions as Permission[],
      isEmailVerified: true,
      isTwoFactorEnabled: true,
      company: 'Enterprise Corp',
      department: 'Operations',
      status: 'active',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      lastLoginAt: new Date(Date.now() - 7200000).toISOString(),
      plainPassword: 'Company@123456',
    },
    {
      id: generateId(),
      email: 'manager@enterprise.io',
      firstName: 'Marcus',
      lastName: 'Johnson',
      role: 'manager',
      permissions: ROLE_DEFINITIONS.manager.permissions as Permission[],
      isEmailVerified: true,
      isTwoFactorEnabled: false,
      company: 'Enterprise Corp',
      department: 'Product',
      status: 'active',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
      plainPassword: 'Manager@123456',
    },
    {
      id: generateId(),
      email: 'employee@enterprise.io',
      firstName: 'Priya',
      lastName: 'Patel',
      role: 'employee',
      permissions: ROLE_DEFINITIONS.employee.permissions as Permission[],
      isEmailVerified: true,
      isTwoFactorEnabled: false,
      company: 'Enterprise Corp',
      department: 'Marketing',
      status: 'active',
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      lastLoginAt: new Date(Date.now() - 172800000).toISOString(),
      plainPassword: 'Employee@123456',
    },
  ];

  const users: UserRecord[] = [];
  for (const { plainPassword, ...userData } of seedUsers) {
    const passwordHash = await hashPassword(plainPassword);
    users.push({ ...userData, passwordHash, refreshTokens: [], failedLoginAttempts: 0 });
  }

  saveDB({ users });
}

// Initialize seed data
seedDatabase();

// ── API Response Types ────────────────────────────────────
interface ApiSuccess<T> { success: true; data: T; message?: string }
interface ApiError { success: false; error: string; code: string; statusCode: number }
type ApiResponse<T> = ApiSuccess<T> | ApiError;

function success<T>(data: T, message?: string): ApiSuccess<T> {
  return { success: true, data, message };
}

function error(message: string, code: string, statusCode = 400): ApiError {
  return { success: false, error: message, code, statusCode };
}

// Simulate network delay
function delay(ms = 600): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 200));
}

// ── AUTHENTICATION APIs ───────────────────────────────────

export const authAPI = {
  // ── Register ──────────────────────────────────────────
  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    company?: string;
    role?: Role;
  }): Promise<ApiResponse<{ user: User; tokens: AuthTokens; verificationSent: boolean }>> {
    await delay();

    const db = getDB();

    // Check for existing email
    if (db.users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      addAuditLog({
        userId: 'system',
        userEmail: data.email,
        action: 'REGISTER_FAILED',
        resource: 'auth',
        details: 'Email already registered',
        ipAddress: getClientInfo().ipAddress,
        userAgent: getClientInfo().userAgent,
        status: 'failure',
      });
      return error('An account with this email already exists', 'EMAIL_EXISTS', 409);
    }

    // Validate password strength server-side
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(data.password)) {
      return error(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        'WEAK_PASSWORD',
        422
      );
    }

    const role: Role = data.role || 'employee';
    const permissions = ROLE_DEFINITIONS[role].permissions as Permission[];
    const passwordHash = await hashPassword(data.password);
    const verificationToken = generateId();

    const newUser: UserRecord = {
      id: generateId(),
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      role,
      permissions,
      isEmailVerified: false,
      isTwoFactorEnabled: false,
      company: data.company,
      status: 'active',
      createdAt: new Date().toISOString(),
      passwordHash,
      refreshTokens: [],
      failedLoginAttempts: 0,
    };

    // Store verification token
    const verificationTokens = JSON.parse(localStorage.getItem(VERIFICATION_TOKENS_KEY) || '{}');
    verificationTokens[newUser.id] = {
      token: verificationToken,
      expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
    };
    localStorage.setItem(VERIFICATION_TOKENS_KEY, JSON.stringify(verificationTokens));

    // Generate tokens
    const accessToken = simulateJwtSign(
      { sub: newUser.id, email: newUser.email, role: newUser.role },
      15 * 60 // 15 minutes
    );
    const refreshToken = generateRefreshToken();
    newUser.refreshTokens = [refreshToken];

    db.users.push(newUser);
    saveDB(db);

    // Create session
    const clientInfo = getClientInfo();
    const session: Session = {
      id: generateId(),
      userId: newUser.id,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      browser: clientInfo.browser,
      os: clientInfo.os,
      location: clientInfo.location,
      isCurrentSession: true,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    saveSessions([...getSessions(), session]);

    addAuditLog({
      userId: newUser.id,
      userEmail: newUser.email,
      action: 'USER_REGISTERED',
      resource: 'auth',
      details: `New ${role} account created`,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      status: 'success',
    });

    addLoginHistory({
      userId: newUser.id,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      browser: clientInfo.browser,
      os: clientInfo.os,
      location: clientInfo.location,
      status: 'success',
    });

    const { passwordHash: _, refreshTokens: __, failedLoginAttempts: ___, ...publicUser } = newUser;

    return success({
      user: publicUser as User,
      tokens: { accessToken, refreshToken, expiresIn: 15 * 60 },
      verificationSent: true,
    }, 'Account created successfully. Please verify your email.');
  },

  // ── Login ─────────────────────────────────────────────
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    await delay();

    const db = getDB();
    const userRecord = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    const clientInfo = getClientInfo();

    if (!userRecord) {
      // Don't reveal whether email exists (timing attack prevention)
      await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
      addAuditLog({
        userId: 'unknown',
        userEmail: email,
        action: 'LOGIN_FAILED',
        resource: 'auth',
        details: 'Invalid credentials',
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        status: 'failure',
      });
      addLoginHistory({
        userId: 'unknown',
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        browser: clientInfo.browser,
        os: clientInfo.os,
        location: clientInfo.location,
        status: 'failure',
        failureReason: 'Invalid credentials',
      });
      return error('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    // Check lockout
    if (userRecord.lockedUntil && new Date(userRecord.lockedUntil) > new Date()) {
      const remainingMs = new Date(userRecord.lockedUntil).getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      return error(
        `Account temporarily locked. Try again in ${remainingMins} minute(s)`,
        'ACCOUNT_LOCKED',
        423
      );
    }

    // Check status
    if (userRecord.status === 'suspended') {
      return error('Your account has been suspended. Contact your administrator.', 'ACCOUNT_SUSPENDED', 403);
    }

    // Verify password
    const isValid = await verifyPassword(password, userRecord.passwordHash);

    if (!isValid) {
      userRecord.failedLoginAttempts = (userRecord.failedLoginAttempts || 0) + 1;
      
      if (userRecord.failedLoginAttempts >= 5) {
        userRecord.lockedUntil = new Date(Date.now() + 30 * 60000).toISOString();
        userRecord.failedLoginAttempts = 0;
      }
      
      saveDB(db);

      addLoginHistory({
        userId: userRecord.id,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        browser: clientInfo.browser,
        os: clientInfo.os,
        location: clientInfo.location,
        status: 'failure',
        failureReason: 'Wrong password',
      });

      const attemptsLeft = 5 - (userRecord.failedLoginAttempts || 1);
      return error(
        `Invalid email or password. ${attemptsLeft > 0 ? `${attemptsLeft} attempt(s) remaining.` : 'Account locked for 30 minutes.'}`,
        'INVALID_CREDENTIALS',
        401
      );
    }

    // Success — reset failed attempts
    userRecord.failedLoginAttempts = 0;
    userRecord.lockedUntil = undefined;
    userRecord.lastLoginAt = new Date().toISOString();

    // Generate new tokens
    const accessToken = simulateJwtSign(
      { sub: userRecord.id, email: userRecord.email, role: userRecord.role },
      15 * 60
    );
    const refreshToken = generateRefreshToken();

    // Keep last 5 refresh tokens (multi-device support)
    userRecord.refreshTokens = [refreshToken, ...(userRecord.refreshTokens || []).slice(0, 4)];
    saveDB(db);

    // Create/update session
    const sessions = getSessions().filter(s => s.userId !== userRecord.id || !s.isCurrentSession);
    const newSession: Session = {
      id: generateId(),
      userId: userRecord.id,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      browser: clientInfo.browser,
      os: clientInfo.os,
      location: clientInfo.location,
      isCurrentSession: true,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    saveSessions([...sessions, newSession]);

    addAuditLog({
      userId: userRecord.id,
      userEmail: userRecord.email,
      action: 'USER_LOGIN',
      resource: 'auth',
      details: `Successful login from ${clientInfo.browser} on ${clientInfo.os}`,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      status: 'success',
    });

    addLoginHistory({
      userId: userRecord.id,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      browser: clientInfo.browser,
      os: clientInfo.os,
      location: clientInfo.location,
      status: 'success',
    });

    const { passwordHash: _, refreshTokens: __, failedLoginAttempts: ___, lockedUntil: ____, ...publicUser } = userRecord;

    return success({
      user: publicUser as User,
      tokens: { accessToken, refreshToken, expiresIn: 15 * 60 },
    });
  },

  // ── Refresh Token ──────────────────────────────────────
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    await delay(200);

    const db = getDB();
    const userRecord = db.users.find(u => u.refreshTokens?.includes(refreshToken));

    if (!userRecord) {
      return error('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN', 401);
    }

    if (userRecord.status !== 'active') {
      return error('Account is not active', 'ACCOUNT_INACTIVE', 403);
    }

    // Rotate refresh token (prevent reuse)
    const newRefreshToken = generateRefreshToken();
    userRecord.refreshTokens = [
      newRefreshToken,
      ...userRecord.refreshTokens.filter(t => t !== refreshToken).slice(0, 3),
    ];

    const newAccessToken = simulateJwtSign(
      { sub: userRecord.id, email: userRecord.email, role: userRecord.role },
      15 * 60
    );

    saveDB(db);

    // Update session
    const sessions = getSessions().map(s =>
      s.userId === userRecord.id && s.isCurrentSession
        ? { ...s, lastActiveAt: new Date().toISOString() }
        : s
    );
    saveSessions(sessions);

    return success({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
    });
  },

  // ── Logout ────────────────────────────────────────────
  async logout(userId: string, refreshToken?: string): Promise<ApiResponse<{ loggedOut: boolean }>> {
    await delay(300);

    const db = getDB();
    const userRecord = db.users.find(u => u.id === userId);

    if (userRecord) {
      if (refreshToken) {
        userRecord.refreshTokens = userRecord.refreshTokens.filter(t => t !== refreshToken);
      } else {
        userRecord.refreshTokens = []; // Logout all devices
      }
      saveDB(db);

      addAuditLog({
        userId,
        userEmail: userRecord.email,
        action: 'USER_LOGOUT',
        resource: 'auth',
        details: refreshToken ? 'Logged out from current device' : 'Logged out from all devices',
        ipAddress: getClientInfo().ipAddress,
        userAgent: getClientInfo().userAgent,
        status: 'success',
      });
    }

    // Remove session
    const sessions = getSessions().map(s =>
      s.userId === userId && s.isCurrentSession ? { ...s, isCurrentSession: false } : s
    );
    saveSessions(sessions);

    return success({ loggedOut: true });
  },

  // ── Forgot Password ───────────────────────────────────
  async forgotPassword(email: string): Promise<ApiResponse<{ sent: boolean; resetToken?: string }>> {
    await delay(800);

    const db = getDB();
    const userRecord = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Always return success (don't reveal email existence)
    if (!userRecord) {
      return success({ sent: true }, 'If an account exists, a reset link has been sent.');
    }

    const resetToken = generateId() + generateId();
    const pendingResets = JSON.parse(localStorage.getItem(PENDING_RESETS_KEY) || '{}');
    pendingResets[resetToken] = {
      userId: userRecord.id,
      email: userRecord.email,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      used: false,
    };
    localStorage.setItem(PENDING_RESETS_KEY, JSON.stringify(pendingResets));

    addAuditLog({
      userId: userRecord.id,
      userEmail: userRecord.email,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'auth',
      details: 'Password reset email sent',
      ipAddress: getClientInfo().ipAddress,
      userAgent: getClientInfo().userAgent,
      status: 'success',
    });

    // In production: send real email via SendGrid/SES
    // For demo: return token in response
    return success({ sent: true, resetToken }, 'Password reset link sent to your email.');
  },

  // ── Reset Password ─────────────────────────────────────
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ reset: boolean }>> {
    await delay(600);

    const pendingResets = JSON.parse(localStorage.getItem(PENDING_RESETS_KEY) || '{}');
    const resetData = pendingResets[token];

    if (!resetData) {
      return error('Invalid or expired reset token', 'INVALID_RESET_TOKEN', 400);
    }

    if (new Date(resetData.expiresAt) < new Date()) {
      delete pendingResets[token];
      localStorage.setItem(PENDING_RESETS_KEY, JSON.stringify(pendingResets));
      return error('Reset token has expired. Please request a new one.', 'TOKEN_EXPIRED', 400);
    }

    if (resetData.used) {
      return error('Reset token has already been used', 'TOKEN_USED', 400);
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return error('Password does not meet security requirements', 'WEAK_PASSWORD', 422);
    }

    const db = getDB();
    const userRecord = db.users.find(u => u.id === resetData.userId);
    if (!userRecord) return error('User not found', 'USER_NOT_FOUND', 404);

    userRecord.passwordHash = await hashPassword(newPassword);
    userRecord.refreshTokens = []; // Invalidate all sessions
    saveDB(db);

    resetData.used = true;
    localStorage.setItem(PENDING_RESETS_KEY, JSON.stringify(pendingResets));

    addAuditLog({
      userId: userRecord.id,
      userEmail: userRecord.email,
      action: 'PASSWORD_RESET_COMPLETED',
      resource: 'auth',
      details: 'Password reset successfully. All sessions invalidated.',
      ipAddress: getClientInfo().ipAddress,
      userAgent: getClientInfo().userAgent,
      status: 'success',
    });

    return success({ reset: true }, 'Password reset successfully. Please log in.');
  },

  // ── Change Password ────────────────────────────────────
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<ApiResponse<{ changed: boolean }>> {
    await delay(600);

    const db = getDB();
    const userRecord = db.users.find(u => u.id === userId);
    if (!userRecord) return error('User not found', 'USER_NOT_FOUND', 404);

    const isValid = await verifyPassword(currentPassword, userRecord.passwordHash);
    if (!isValid) {
      addAuditLog({
        userId,
        userEmail: userRecord.email,
        action: 'PASSWORD_CHANGE_FAILED',
        resource: 'auth',
        details: 'Incorrect current password',
        ipAddress: getClientInfo().ipAddress,
        userAgent: getClientInfo().userAgent,
        status: 'failure',
      });
      return error('Current password is incorrect', 'INVALID_CREDENTIALS', 401);
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return error('New password does not meet security requirements', 'WEAK_PASSWORD', 422);
    }

    userRecord.passwordHash = await hashPassword(newPassword);
    saveDB(db);

    addAuditLog({
      userId,
      userEmail: userRecord.email,
      action: 'PASSWORD_CHANGED',
      resource: 'auth',
      details: 'Password changed successfully',
      ipAddress: getClientInfo().ipAddress,
      userAgent: getClientInfo().userAgent,
      status: 'success',
    });

    return success({ changed: true }, 'Password changed successfully.');
  },

  // ── Verify Email ───────────────────────────────────────
  async verifyEmail(userId: string, token: string): Promise<ApiResponse<{ verified: boolean }>> {
    await delay(500);

    const verificationTokens = JSON.parse(localStorage.getItem(VERIFICATION_TOKENS_KEY) || '{}');
    const tokenData = verificationTokens[userId];

    if (!tokenData || tokenData.token !== token) {
      return error('Invalid verification token', 'INVALID_TOKEN', 400);
    }

    if (new Date(tokenData.expiresAt) < new Date()) {
      return error('Verification token has expired', 'TOKEN_EXPIRED', 400);
    }

    const db = getDB();
    const userRecord = db.users.find(u => u.id === userId);
    if (!userRecord) return error('User not found', 'USER_NOT_FOUND', 404);

    userRecord.isEmailVerified = true;
    saveDB(db);

    delete verificationTokens[userId];
    localStorage.setItem(VERIFICATION_TOKENS_KEY, JSON.stringify(verificationTokens));

    addAuditLog({
      userId,
      userEmail: userRecord.email,
      action: 'EMAIL_VERIFIED',
      resource: 'auth',
      details: 'Email address verified',
      ipAddress: getClientInfo().ipAddress,
      userAgent: getClientInfo().userAgent,
      status: 'success',
    });

    return success({ verified: true });
  },

  // ── Get Current User ───────────────────────────────────
  async getMe(userId: string): Promise<ApiResponse<User>> {
    await delay(200);

    const db = getDB();
    const userRecord = db.users.find(u => u.id === userId);
    if (!userRecord) return error('User not found', 'USER_NOT_FOUND', 404);

    const { passwordHash: _, refreshTokens: __, failedLoginAttempts: ___, lockedUntil: ____, ...publicUser } = userRecord;
    return success(publicUser as User);
  },

  // ── Get All Users (admin) ──────────────────────────────
  async getUsers(): Promise<ApiResponse<User[]>> {
    await delay(400);
    const db = getDB();
    const users = db.users.map(({ passwordHash: _, refreshTokens: __, failedLoginAttempts: ___, lockedUntil: ____, ...u }) => u as User);
    return success(users);
  },

  // ── Update User ────────────────────────────────────────
  async updateUser(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    await delay(500);
    const db = getDB();
    const idx = db.users.findIndex(u => u.id === userId);
    if (idx === -1) return error('User not found', 'USER_NOT_FOUND', 404);

    const allowedUpdates = ['firstName', 'lastName', 'company', 'department', 'role', 'status', 'permissions'];
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowedUpdates.includes(k))
    );

    if (filteredUpdates.role) {
      filteredUpdates.permissions = ROLE_DEFINITIONS[filteredUpdates.role as Role].permissions;
    }

    db.users[idx] = { ...db.users[idx], ...filteredUpdates };
    saveDB(db);

    const { passwordHash: _, refreshTokens: __, failedLoginAttempts: ___, lockedUntil: ____, ...publicUser } = db.users[idx];

    addAuditLog({
      userId: 'admin',
      userEmail: 'admin',
      action: 'USER_UPDATED',
      resource: 'users',
      resourceId: userId,
      details: `Updated fields: ${Object.keys(filteredUpdates).join(', ')}`,
      ipAddress: getClientInfo().ipAddress,
      userAgent: getClientInfo().userAgent,
      status: 'success',
    });

    return success(publicUser as User);
  },

  // ── Delete User ────────────────────────────────────────
  async deleteUser(targetUserId: string, requestingUserId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    await delay(500);
    const db = getDB();
    const idx = db.users.findIndex(u => u.id === targetUserId);
    if (idx === -1) return error('User not found', 'USER_NOT_FOUND', 404);

    const targetUser = db.users[idx];
    db.users.splice(idx, 1);
    saveDB(db);

    addAuditLog({
      userId: requestingUserId,
      userEmail: 'admin',
      action: 'USER_DELETED',
      resource: 'users',
      resourceId: targetUserId,
      details: `User ${targetUser.email} deleted`,
      ipAddress: getClientInfo().ipAddress,
      userAgent: getClientInfo().userAgent,
      status: 'warning',
    });

    return success({ deleted: true });
  },

  // ── Sessions ───────────────────────────────────────────
  async getSessions(userId: string): Promise<ApiResponse<Session[]>> {
    await delay(300);
    const sessions = getSessions()
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
    return success(sessions);
  },

  async revokeSession(userId: string, sessionId: string): Promise<ApiResponse<{ revoked: boolean }>> {
    await delay(400);
    const sessions = getSessions().map(s =>
      s.id === sessionId && s.userId === userId
        ? { ...s, isCurrentSession: false, expiresAt: new Date().toISOString() }
        : s
    );
    saveSessions(sessions);

    addAuditLog({
      userId,
      userEmail: 'user',
      action: 'SESSION_REVOKED',
      resource: 'sessions',
      resourceId: sessionId,
      details: 'Session manually revoked',
      ipAddress: getClientInfo().ipAddress,
      userAgent: getClientInfo().userAgent,
      status: 'warning',
    });

    return success({ revoked: true });
  },

  // ── Audit Logs ─────────────────────────────────────────
  async getAuditLogs(limit = 100): Promise<ApiResponse<AuditLog[]>> {
    await delay(400);
    return success(getAuditLogs().slice(0, limit));
  },

  async getLoginHistory(userId: string): Promise<ApiResponse<LoginHistoryEntry[]>> {
    await delay(300);
    const history = getLoginHistory().filter(h => h.userId === userId);
    return success(history.slice(0, 50));
  },
};
