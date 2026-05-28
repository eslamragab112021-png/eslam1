// ============================================================
// GLOBAL STATE STORE (Zustand)
// ============================================================
import { create } from 'zustand';
import type { Employee, AttendanceRecord, Shift, WorkLocation, LeaveRequest, Notification } from '../db/schema';
import { dbGetAll, dbGetByIndex } from '../db/database';
import { getAllTodayAttendance } from '../engine/attendance';
import { getPendingLeaves } from '../engine/leave';
import { format } from 'date-fns';

export type View =
  | 'dashboard'
  | 'attendance'
  | 'clock'
  | 'shifts'
  | 'leaves'
  | 'locations'
  | 'reports'
  | 'employees'
  | 'notifications';

interface AppState {
  // Auth (demo user)
  currentEmployee: Employee | null;
  isAdmin: boolean;

  // Data
  employees: Employee[];
  shifts: Shift[];
  locations: WorkLocation[];
  todayRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  pendingLeaves: LeaveRequest[];
  notifications: Notification[];

  // Current employee today record
  todayRecord: AttendanceRecord | null;

  // UI
  activeView: View;
  loading: boolean;
  sidebarOpen: boolean;

  // Actions
  setView: (view: View) => void;
  toggleSidebar: () => void;
  setLoading: (v: boolean) => void;
  setCurrentEmployee: (emp: Employee) => void;
  toggleAdmin: () => void;

  // Data loaders
  loadAll: () => Promise<void>;
  loadEmployees: () => Promise<void>;
  loadShifts: () => Promise<void>;
  loadLocations: () => Promise<void>;
  loadTodayRecords: () => Promise<void>;
  loadTodayRecord: (employeeId: string) => Promise<void>;
  loadLeaves: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  addNotification: (n: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
}

let notifId = 0;

export const useStore = create<AppState>((set, get) => ({
  currentEmployee: null,
  isAdmin: true,
  employees: [],
  shifts: [],
  locations: [],
  todayRecords: [],
  leaveRequests: [],
  pendingLeaves: [],
  notifications: [],
  todayRecord: null,
  activeView: 'dashboard',
  loading: false,
  sidebarOpen: true,

  setView: (view) => set({ activeView: view }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setLoading: (v) => set({ loading: v }),
  setCurrentEmployee: (emp) => set({ currentEmployee: emp }),
  toggleAdmin: () => set((s) => ({ isAdmin: !s.isAdmin })),

  loadAll: async () => {
    set({ loading: true });
    await Promise.all([
      get().loadEmployees(),
      get().loadShifts(),
      get().loadLocations(),
      get().loadTodayRecords(),
      get().loadLeaves(),
      get().loadNotifications(),
    ]);
    // Auto-set first employee as current
    const emps = get().employees;
    if (!get().currentEmployee && emps.length > 0) {
      set({ currentEmployee: emps[0] });
      await get().loadTodayRecord(emps[0].id);
    }
    set({ loading: false });
  },

  loadEmployees: async () => {
    const employees = await dbGetAll<Employee>('employees');
    set({ employees: employees.sort((a, b) => a.name.localeCompare(b.name)) });
  },

  loadShifts: async () => {
    const shifts = await dbGetAll<Shift>('shifts');
    set({ shifts });
  },

  loadLocations: async () => {
    const locations = await dbGetAll<WorkLocation>('work_locations');
    set({ locations });
  },

  loadTodayRecords: async () => {
    const todayRecords = await getAllTodayAttendance();
    set({ todayRecords });
  },

  loadTodayRecord: async (employeeId: string) => {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const records = await dbGetByIndex<AttendanceRecord>('attendance_records', 'by_employee_date', [employeeId, dateStr]);
    set({ todayRecord: records[0] || null });
  },

  loadLeaves: async () => {
    const leaveRequests = await dbGetAll<LeaveRequest>('leave_requests');
    const pendingLeaves = await getPendingLeaves();
    set({ leaveRequests, pendingLeaves });
  },

  loadNotifications: async () => {
    const all = await dbGetAll<Notification>('notifications');
    set({ notifications: all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  },

  addNotification: (n) => {
    const notification: Notification = {
      ...n,
      id: `notif-${++notifId}-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ notifications: [notification, ...s.notifications] }));
  },

  markNotificationRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
    }));
  },
}));
