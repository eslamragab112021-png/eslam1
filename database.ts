// ============================================================
// REAL IndexedDB DATABASE ENGINE
// ============================================================
import { openDB, IDBPDatabase } from 'idb';
import type {
  Employee, Shift, WorkLocation, AttendanceRecord,
  LeaveRequest, AttendanceLog, LocationHistory,
  Notification, ShiftAssignment,
} from './schema';

const DB_NAME = 'AttendanceIQ';
const DB_VERSION = 1;

export type DBStores = {
  employees: Employee;
  shifts: Shift;
  work_locations: WorkLocation;
  attendance_records: AttendanceRecord;
  leave_requests: LeaveRequest;
  attendance_logs: AttendanceLog;
  location_history: LocationHistory;
  notifications: Notification;
  shift_assignments: ShiftAssignment;
};

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // employees
      if (!db.objectStoreNames.contains('employees')) {
        const emp = db.createObjectStore('employees', { keyPath: 'id' });
        emp.createIndex('by_code', 'employeeCode', { unique: true });
        emp.createIndex('by_department', 'department');
        emp.createIndex('by_status', 'status');
        emp.createIndex('by_shift', 'shiftId');
      }

      // shifts
      if (!db.objectStoreNames.contains('shifts')) {
        db.createObjectStore('shifts', { keyPath: 'id' });
      }

      // work_locations
      if (!db.objectStoreNames.contains('work_locations')) {
        const wl = db.createObjectStore('work_locations', { keyPath: 'id' });
        wl.createIndex('by_active', 'isActive');
      }

      // attendance_records
      if (!db.objectStoreNames.contains('attendance_records')) {
        const ar = db.createObjectStore('attendance_records', { keyPath: 'id' });
        ar.createIndex('by_employee', 'employeeId');
        ar.createIndex('by_date', 'date');
        ar.createIndex('by_employee_date', ['employeeId', 'date'], { unique: true });
        ar.createIndex('by_status', 'status');
      }

      // leave_requests
      if (!db.objectStoreNames.contains('leave_requests')) {
        const lr = db.createObjectStore('leave_requests', { keyPath: 'id' });
        lr.createIndex('by_employee', 'employeeId');
        lr.createIndex('by_status', 'status');
        lr.createIndex('by_type', 'type');
      }

      // attendance_logs
      if (!db.objectStoreNames.contains('attendance_logs')) {
        const al = db.createObjectStore('attendance_logs', { keyPath: 'id' });
        al.createIndex('by_record', 'attendanceRecordId');
        al.createIndex('by_employee', 'employeeId');
        al.createIndex('by_timestamp', 'timestamp');
      }

      // location_history
      if (!db.objectStoreNames.contains('location_history')) {
        const lh = db.createObjectStore('location_history', { keyPath: 'id' });
        lh.createIndex('by_employee', 'employeeId');
        lh.createIndex('by_timestamp', 'timestamp');
      }

      // notifications
      if (!db.objectStoreNames.contains('notifications')) {
        const n = db.createObjectStore('notifications', { keyPath: 'id' });
        n.createIndex('by_employee', 'employeeId');
        n.createIndex('by_read', 'read');
      }

      // shift_assignments
      if (!db.objectStoreNames.contains('shift_assignments')) {
        const sa = db.createObjectStore('shift_assignments', { keyPath: 'id' });
        sa.createIndex('by_employee', 'employeeId');
        sa.createIndex('by_shift', 'shiftId');
      }
    },
  });

  return dbInstance;
}

// Generic CRUD helpers
export async function dbPut<T>(store: keyof DBStores, record: T): Promise<T> {
  const db = await getDB();
  await db.put(store, record);
  return record;
}

export async function dbGet<T>(store: keyof DBStores, id: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(store, id) as Promise<T | undefined>;
}

export async function dbGetAll<T>(store: keyof DBStores): Promise<T[]> {
  const db = await getDB();
  return db.getAll(store) as Promise<T[]>;
}

export async function dbDelete(store: keyof DBStores, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(store, id);
}

export async function dbGetByIndex<T>(
  store: keyof DBStores,
  index: string,
  value: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const db = await getDB();
  return db.getAllFromIndex(store, index, value) as Promise<T[]>;
}

export async function dbGetOneByIndex<T>(
  store: keyof DBStores,
  index: string,
  value: IDBValidKey
): Promise<T | undefined> {
  const db = await getDB();
  return db.getFromIndex(store, index, value) as Promise<T | undefined>;
}

export async function dbCount(store: keyof DBStores): Promise<number> {
  const db = await getDB();
  return db.count(store);
}
