// ============================================================
// ATTENDANCE ENGINE — DATABASE SCHEMA & TYPES
// ============================================================

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half_day'
  | 'on_leave'
  | 'holiday'
  | 'remote';

export type LeaveType = 'annual' | 'sick' | 'emergency' | 'maternity' | 'paternity' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ShiftType = 'fixed' | 'flexible' | 'rotating' | 'overnight';
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';
export type BreakType = 'lunch' | 'tea' | 'prayer' | 'personal';

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  managerId?: string;
  shiftId?: string;
  status: EmployeeStatus;
  joinDate: string;
  phone: string;
  avatar?: string;
  workLocationId?: string;
  annualLeaveBalance: number;
  sickLeaveBalance: number;
  emergencyLeaveBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  name: string;
  type: ShiftType;
  startTime: string;       // HH:mm
  endTime: string;         // HH:mm
  gracePeriodMinutes: number;
  overtimeThresholdMinutes: number;
  breakDurationMinutes: number;
  workingDays: number[];   // 0=Sun … 6=Sat
  isOvernightShift: boolean;
  rotationWeeks?: number;
  flexStartEarliest?: string;
  flexStartLatest?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;            // YYYY-MM-DD
  shiftId: string;
  clockInTime?: string;    // ISO timestamp
  clockOutTime?: string;   // ISO timestamp
  clockInLat?: number;
  clockInLng?: number;
  clockOutLat?: number;
  clockOutLng?: number;
  clockInLocationValid: boolean;
  clockOutLocationValid: boolean;
  status: AttendanceStatus;
  workingMinutes: number;
  overtimeMinutes: number;
  latenessMinutes: number;
  earlyDepartureMinutes: number;
  breaks: BreakEntry[];
  totalBreakMinutes: number;
  netWorkingMinutes: number;
  notes?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BreakEntry {
  id: string;
  type: BreakType;
  startTime: string;       // ISO timestamp
  endTime?: string;
  durationMinutes: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  attachmentUrl?: string;
}

export interface AttendanceLog {
  id: string;
  attendanceRecordId: string;
  employeeId: string;
  action: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  locationValid: boolean;
  metadata?: Record<string, unknown>;
}

export interface LocationHistory {
  id: string;
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  locationName?: string;
}

export interface Notification {
  id: string;
  employeeId?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: string;
}

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  shiftId: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
}
