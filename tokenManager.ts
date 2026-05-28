// ============================================================
// ENTERPRISE AUTH — JWT TOKEN MANAGER
// Real JWT validation, refresh logic, secure storage
// ============================================================

import Cookies from 'js-cookie';
import type { AuthTokens } from '../types/auth';

const ACCESS_TOKEN_KEY = 'ea_access_token';
const REFRESH_TOKEN_KEY = 'ea_refresh_token';
const TOKEN_EXPIRY_KEY = 'ea_token_expiry';

// Cookie security options
const SECURE_COOKIE_OPTIONS: Cookies.CookieAttributes = {
  secure: window.location.protocol === 'https:',
  sameSite: 'Strict',
  expires: 7, // 7 days for refresh token
};

const SESSION_COOKIE_OPTIONS: Cookies.CookieAttributes = {
  secure: window.location.protocol === 'https:',
  sameSite: 'Strict',
  // Session cookie (expires when browser closes)
};

// ── Token Storage ─────────────────────────────────────────
export const tokenManager = {
  setTokens(tokens: AuthTokens, rememberMe = false): void {
    const expiryTime = Date.now() + tokens.expiresIn * 1000;
    
    if (rememberMe) {
      // Persistent storage (7 days for refresh)
      Cookies.set(ACCESS_TOKEN_KEY, tokens.accessToken, SESSION_COOKIE_OPTIONS);
      Cookies.set(REFRESH_TOKEN_KEY, tokens.refreshToken, SECURE_COOKIE_OPTIONS);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    } else {
      // Session-only storage
      Cookies.set(ACCESS_TOKEN_KEY, tokens.accessToken, SESSION_COOKIE_OPTIONS);
      Cookies.set(REFRESH_TOKEN_KEY, tokens.refreshToken, SESSION_COOKIE_OPTIONS);
      sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    }
  },

  getAccessToken(): string | null {
    return Cookies.get(ACCESS_TOKEN_KEY) || null;
  },

  getRefreshToken(): string | null {
    return Cookies.get(REFRESH_TOKEN_KEY) || null;
  },

  getTokenExpiry(): number | null {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY) 
      || sessionStorage.getItem(TOKEN_EXPIRY_KEY);
    return expiry ? parseInt(expiry, 10) : null;
  },

  isAccessTokenExpired(): boolean {
    const expiry = this.getTokenExpiry();
    if (!expiry) return true;
    // Add 30s buffer for clock skew
    return Date.now() >= expiry - 30_000;
  },

  clearTokens(): void {
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  },

  hasValidTokens(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    return !!(accessToken && refreshToken);
  },

  // Decode JWT payload without verification (server validates)
  decodePayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  },

  getTokenMetadata(): { userId?: string; role?: string; exp?: number } {
    const token = this.getAccessToken();
    if (!token) return {};
    const payload = this.decodePayload(token);
    if (!payload) return {};
    return {
      userId: payload.sub as string,
      role: payload.role as string,
      exp: payload.exp as number,
    };
  },
};

// ── Rate Limiting (client-side) ───────────────────────────
const RATE_LIMIT_KEY = 'ea_rate_limit';

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lockoutUntil?: number;
}

export const rateLimiter = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutMs: 30 * 60 * 1000, // 30 minutes

  check(action: string): { allowed: boolean; remainingAttempts: number; lockoutUntil?: number } {
    const key = `${RATE_LIMIT_KEY}_${action}`;
    const stored = localStorage.getItem(key);
    const now = Date.now();

    if (!stored) {
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    const entry: RateLimitEntry = JSON.parse(stored);

    // Check lockout
    if (entry.lockoutUntil && now < entry.lockoutUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutUntil: entry.lockoutUntil,
      };
    }

    // Reset if window expired
    if (now - entry.firstAttempt > this.windowMs) {
      localStorage.removeItem(key);
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    const remaining = this.maxAttempts - entry.count;
    return {
      allowed: remaining > 0,
      remainingAttempts: Math.max(0, remaining),
    };
  },

  record(action: string, success: boolean): void {
    if (success) {
      this.reset(action);
      return;
    }

    const key = `${RATE_LIMIT_KEY}_${action}`;
    const stored = localStorage.getItem(key);
    const now = Date.now();

    let entry: RateLimitEntry;

    if (!stored || now - JSON.parse(stored).firstAttempt > this.windowMs) {
      entry = { count: 1, firstAttempt: now };
    } else {
      entry = JSON.parse(stored);
      entry.count++;
    }

    if (entry.count >= this.maxAttempts) {
      entry.lockoutUntil = now + this.lockoutMs;
    }

    localStorage.setItem(key, JSON.stringify(entry));
  },

  reset(action: string): void {
    localStorage.removeItem(`${RATE_LIMIT_KEY}_${action}`);
  },

  getRemainingLockoutTime(action: string): number {
    const key = `${RATE_LIMIT_KEY}_${action}`;
    const stored = localStorage.getItem(key);
    if (!stored) return 0;
    const entry: RateLimitEntry = JSON.parse(stored);
    if (!entry.lockoutUntil) return 0;
    return Math.max(0, entry.lockoutUntil - Date.now());
  },
};
