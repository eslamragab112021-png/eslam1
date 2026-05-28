// ============================================================
// ENTERPRISE AUTH — MAIN APPLICATION
// Complete authentication system with RBAC, JWT, sessions
// ============================================================

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Store
import { useAuthStore } from './store/authStore';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Protected Pages
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import UsersPage from './pages/dashboard/UsersPage';
import RolesPage from './pages/dashboard/RolesPage';
import SessionsPage from './pages/dashboard/SessionsPage';
import AuditLogsPage from './pages/dashboard/AuditLogsPage';
import LoginHistoryPage from './pages/dashboard/LoginHistoryPage';
import SecurityPage from './pages/dashboard/SecurityPage';
import SettingsPage from './pages/dashboard/SettingsPage';

// Guards & Utilities
import ProtectedRoute from './components/auth/ProtectedRoute';
import UnauthorizedPage from './pages/UnauthorizedPage';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore(s => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <Routes>
          {/* Public Routes */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

          {/* Unauthorized */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />

            {/* Manager+ only */}
            <Route
              path="users"
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'company_admin', 'manager']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />

            {/* Admin only */}
            <Route
              path="roles"
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'company_admin']}>
                  <RolesPage />
                </ProtectedRoute>
              }
            />

            {/* All authenticated */}
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="login-history" element={<LoginHistoryPage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Admin only */}
            <Route
              path="audit"
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'company_admin']}>
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* Global Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '500',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
      </AppInitializer>
    </BrowserRouter>
  );
}
