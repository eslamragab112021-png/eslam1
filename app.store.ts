// ============================================================
// APP STORE — Global UI state
// AttendX Enterprise SaaS Platform
// ============================================================

import { create } from 'zustand';

type SidebarState = 'expanded' | 'collapsed' | 'mobile-open';

interface AppState {
  sidebarState: SidebarState;
  currentPage: string;
  dbStatus: 'connecting' | 'connected' | 'error' | 'initializing';
  dbError: string | null;

  setSidebarState: (state: SidebarState) => void;
  toggleSidebar: () => void;
  setCurrentPage: (page: string) => void;
  setDbStatus: (status: AppState['dbStatus'], error?: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  sidebarState: 'expanded',
  currentPage: 'dashboard',
  dbStatus: 'connecting',
  dbError: null,

  setSidebarState: (state) => set({ sidebarState: state }),

  toggleSidebar: () => {
    const current = get().sidebarState;
    if (current === 'expanded') set({ sidebarState: 'collapsed' });
    else if (current === 'collapsed') set({ sidebarState: 'expanded' });
    else set({ sidebarState: 'expanded' });
  },

  setCurrentPage: (page) => set({ currentPage: page }),

  setDbStatus: (status, error) => set({ dbStatus: status, dbError: error || null }),
}));
