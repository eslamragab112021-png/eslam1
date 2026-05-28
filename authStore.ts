// ============================================================
// ENTERPRISE AUTH — ZUSTAND AUTH STORE
// Persistent auth state with token refresh, auto-logout
// ============================================================

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { User, AuthState } from '../types/auth';
import { tokenManager } from '../lib/tokenManager';
import { authAPI } from '../lib/mockBackend';

interface AuthStore extends AuthState {
  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    company?: string;
  }) => Promise<{ verificationSent: boolean }>;
  logout: (allDevices?: boolean) => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  initialize: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  updateUserLocal: (updates: Partial<User>) => void;
}

let refreshInterval: ReturnType<typeof setInterval> | null = null;
let autoLogoutTimeout: ReturnType<typeof setTimeout> | null = null;

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function resetAutoLogout(logoutFn: () => void) {
  if (autoLogoutTimeout) clearTimeout(autoLogoutTimeout);
  autoLogoutTimeout = setTimeout(logoutFn, INACTIVITY_TIMEOUT);
}

function startTokenRefresh(refreshFn: () => Promise<boolean>) {
  if (refreshInterval) clearInterval(refreshInterval);
  // Refresh token 2 minutes before expiry (every 13 minutes)
  refreshInterval = setInterval(async () => {
    if (tokenManager.isAccessTokenExpired()) {
      const success = await refreshFn();
      if (!success) {
        // Token refresh failed — handled by refreshFn
      }
    }
  }, 13 * 60 * 1000);
}

function stopTokenRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  if (autoLogoutTimeout) {
    clearTimeout(autoLogoutTimeout);
    autoLogoutTimeout = null;
  }
}

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: false,
        error: null,

        clearError: () => set({ error: null }),

        setUser: (user: User) => set({ user }),

        updateUserLocal: (updates: Partial<User>) => {
          const { user } = get();
          if (user) set({ user: { ...user, ...updates } });
        },

        initialize: async () => {
          set({ isLoading: true });
          try {
            if (!tokenManager.hasValidTokens()) {
              set({ isInitialized: true, isLoading: false });
              return;
            }

            // Try to refresh tokens on startup
            const accessToken = tokenManager.getAccessToken();
            if (!accessToken) {
              tokenManager.clearTokens();
              set({ isInitialized: true, isLoading: false });
              return;
            }

            // Try to refresh if expired
            if (tokenManager.isAccessTokenExpired()) {
              const refreshed = await get().refreshTokens();
              if (!refreshed) {
                set({ isInitialized: true, isLoading: false });
                return;
              }
            }

            // Get current user
            const metadata = tokenManager.getTokenMetadata();
            if (!metadata.userId) {
              tokenManager.clearTokens();
              set({ isInitialized: true, isLoading: false });
              return;
            }

            const result = await authAPI.getMe(metadata.userId);
            if (result.success) {
              set({
                user: result.data,
                tokens: {
                  accessToken: tokenManager.getAccessToken()!,
                  refreshToken: tokenManager.getRefreshToken()!,
                  expiresIn: 15 * 60,
                },
                isAuthenticated: true,
              });

              startTokenRefresh(get().refreshTokens);
              resetAutoLogout(() => get().logout());

              // Activity listeners
              ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
                document.addEventListener(event, () => resetAutoLogout(() => get().logout()), { passive: true });
              });
            } else {
              tokenManager.clearTokens();
            }
          } catch {
            tokenManager.clearTokens();
          } finally {
            set({ isInitialized: true, isLoading: false });
          }
        },

        login: async (email: string, password: string, rememberMe = false) => {
          set({ isLoading: true, error: null });
          try {
            const result = await authAPI.login(email, password);

            if (!result.success) {
              set({ error: result.error, isLoading: false });
              return;
            }

            const { user, tokens } = result.data;
            tokenManager.setTokens(tokens, rememberMe);

            set({
              user,
              tokens,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            startTokenRefresh(get().refreshTokens);
            resetAutoLogout(() => get().logout());

            ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
              document.addEventListener(event, () => resetAutoLogout(() => get().logout()), { passive: true });
            });
          } catch (err) {
            set({ error: 'An unexpected error occurred. Please try again.', isLoading: false });
          }
        },

        register: async (data) => {
          set({ isLoading: true, error: null });
          try {
            const result = await authAPI.register(data);

            if (!result.success) {
              set({ error: result.error, isLoading: false });
              throw new Error(result.error);
            }

            const { user, tokens, verificationSent } = result.data;
            tokenManager.setTokens(tokens, false);

            set({
              user,
              tokens,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            startTokenRefresh(get().refreshTokens);
            return { verificationSent };
          } catch (err) {
            set({ isLoading: false });
            throw err;
          }
        },

        logout: async (allDevices = false) => {
          const { user, tokens } = get();
          stopTokenRefresh();

          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            error: null,
          });

          if (user) {
            await authAPI.logout(user.id, allDevices ? undefined : tokens?.refreshToken);
          }

          tokenManager.clearTokens();
        },

        refreshTokens: async () => {
          const refreshToken = tokenManager.getRefreshToken();
          if (!refreshToken) {
            get().logout();
            return false;
          }

          try {
            const result = await authAPI.refreshToken(refreshToken);

            if (!result.success) {
              get().logout();
              return false;
            }

            const newTokens = result.data;
            tokenManager.setTokens(newTokens, !!localStorage.getItem('ea_token_expiry'));

            set(state => ({
              tokens: newTokens,
              ...(state.tokens ? {} : {}),
            }));

            return true;
          } catch {
            get().logout();
            return false;
          }
        },
      }),
      {
        name: 'ea_auth_state',
        partialize: (state) => ({
          // Only persist non-sensitive state flags
          isAuthenticated: state.isAuthenticated,
        }),
      }
    )
  )
);

// Selector hooks
export const useUser = () => useAuthStore(s => s.user);
export const useIsAuthenticated = () => useAuthStore(s => s.isAuthenticated);
export const useAuthLoading = () => useAuthStore(s => s.isLoading);
export const useAuthError = () => useAuthStore(s => s.error);
export const useIsInitialized = () => useAuthStore(s => s.isInitialized);
