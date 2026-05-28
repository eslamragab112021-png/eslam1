// ============================================================
// AUTHENTICATION SERVICE — Real JWT + PBKDF2 Auth
// AttendX Enterprise SaaS Platform
// ============================================================

import { query } from '../lib/database';
import { hashPassword, verifyPassword, generateToken, generateRefreshToken, decodeToken, generateUUID } from '../lib/crypto';
import { storage } from '../lib/storage';
import type { User, Company, LoginResponse, AuthTokens } from '../types';

export interface RegisterPayload {
  companyName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  industry?: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    // Query real database
    const result = await query<{
      id: string; company_id: string; email: string; password_hash: string;
      first_name: string; last_name: string; role: string; is_active: boolean;
      last_login_at: string; failed_login_attempts: number; locked_until: string | null;
      company_name: string; company_slug: string; subscription_plan: string;
      subscription_status: string; company_timezone: string;
    }>(
      `SELECT u.id, u.company_id, u.email, u.password_hash, u.first_name, u.last_name, 
              u.role, u.is_active, u.last_login_at, u.failed_login_attempts, u.locked_until,
              c.name as company_name, c.slug as company_slug, 
              c.subscription_plan, c.subscription_status, c.timezone as company_timezone
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE LOWER(u.email) = LOWER($1) AND u.is_active = true`,
      [email]
    );

    if (result.rowCount === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Check account lock
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new Error('Account temporarily locked due to too many failed attempts');
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      // Increment failed attempts
      const attempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
      
      await query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
        [attempts, lockUntil, user.id]
      );
      throw new Error('Invalid email or password');
    }

    // Reset failed attempts & update last login
    const refreshToken = generateRefreshToken();
    await query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), refresh_token = $1 WHERE id = $2',
      [refreshToken, user.id]
    );

    // Log audit
    await query(
      `INSERT INTO audit_logs (company_id, user_id, action, resource, resource_id) VALUES ($1, $2, 'LOGIN', 'users', $3)`,
      [user.company_id, user.id, user.id]
    );

    const userObj: User = {
      id: user.id,
      companyId: user.company_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role as User['role'],
      isActive: user.is_active,
      lastLoginAt: user.last_login_at,
      createdAt: new Date().toISOString(),
      company: user.company_id ? {
        id: user.company_id,
        name: user.company_name,
        slug: user.company_slug,
        email: user.email,
        subscriptionPlan: user.subscription_plan as Company['subscriptionPlan'],
        subscriptionStatus: user.subscription_status as Company['subscriptionStatus'],
        timezone: user.company_timezone,
        employeeCount: 0,
        workingHoursPerDay: 8,
        workingDaysPerWeek: 5,
        overtimeThreshold: 8,
        geofencingEnabled: false,
        geofenceRadius: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } : undefined,
    };

    const accessToken = generateToken({ userId: user.id, companyId: user.company_id, role: user.role, email: user.email }, 3600000);
    
    const tokens: AuthTokens = {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };

    storage.setToken(accessToken);
    storage.setRefreshToken(refreshToken);
    storage.setUser(userObj);

    return { user: userObj, tokens };
  },

  async register(payload: RegisterPayload): Promise<LoginResponse> {
    // Check if email exists
    const existing = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [payload.email]
    );

    if (existing.rowCount > 0) {
      throw new Error('An account with this email already exists');
    }

    const companyId = generateUUID();
    const userId = generateUUID();
    const slug = payload.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);
    const hashedPassword = await hashPassword(payload.password);

    // Create company
    await query(
      `INSERT INTO companies (id, name, slug, email, phone, industry, subscription_plan, subscription_status, trial_ends_at, timezone, working_hours_per_day, working_days_per_week)
       VALUES ($1, $2, $3, $4, $5, $6, 'trial', 'trial', NOW() + INTERVAL '14 days', 'UTC', 8, 5)`,
      [companyId, payload.companyName, slug, payload.email, payload.phone || null, payload.industry || null]
    );

    // Create subscription
    await query(
      `INSERT INTO subscriptions (company_id, plan, status, max_employees, monthly_amount) VALUES ($1, 'trial', 'active', 10, 0)`,
      [companyId]
    );

    // Create admin user
    await query(
      `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, 'company_admin', true)`,
      [userId, companyId, payload.email, hashedPassword, payload.firstName, payload.lastName]
    );

    // Seed demo data
    try {
      const { seedDemoData } = await import('../lib/schema');
      await seedDemoData(companyId, userId);
    } catch (err) {
      console.warn('Demo data seeding warning:', err);
    }

    // Auto-login after registration
    return this.login(payload.email, payload.password);
  },

  async logout(): Promise<void> {
    const token = storage.getToken();
    if (token) {
      const decoded = decodeToken<{ userId: string; companyId: string }>(token);
      if (decoded?.userId) {
        await query(
          `UPDATE users SET refresh_token = NULL WHERE id = $1`,
          [decoded.userId]
        ).catch(() => {});
        await query(
          `INSERT INTO audit_logs (company_id, user_id, action, resource) VALUES ($1, $2, 'LOGOUT', 'users')`,
          [decoded.companyId, decoded.userId]
        ).catch(() => {});
      }
    }
    storage.clear();
  },

  getCurrentUser(): User | null {
    return storage.getUser<User>();
  },

  getToken(): string | null {
    return storage.getToken();
  },

  isAuthenticated(): boolean {
    const token = storage.getToken();
    if (!token) return false;
    const decoded = decodeToken(token);
    return decoded !== null;
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const result = await query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rowCount === 0) throw new Error('User not found');
    
    const isValid = await verifyPassword(oldPassword, result.rows[0].password_hash);
    if (!isValid) throw new Error('Current password is incorrect');
    
    const newHash = await hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
  },
};
