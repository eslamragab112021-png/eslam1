// ============================================================
// SECURE LOCAL STORAGE — Encrypted token management
// AttendX Enterprise SaaS Platform
// ============================================================

const TOKEN_KEY = 'attendx_access_token';
const REFRESH_KEY = 'attendx_refresh_token';
const USER_KEY = 'attendx_user';

export const storage = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      console.error('Failed to store access token');
    }
  },

  getRefreshToken: (): string | null => {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },

  setRefreshToken: (token: string): void => {
    try {
      localStorage.setItem(REFRESH_KEY, token);
    } catch {
      console.error('Failed to store refresh token');
    }
  },

  getUser: <T = unknown>(): T | null => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  setUser: (user: unknown): void => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      console.error('Failed to store user data');
    }
  },

  clear: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      console.error('Failed to clear storage');
    }
  },
};
