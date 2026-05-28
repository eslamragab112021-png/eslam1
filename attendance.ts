// ============================================================
// REAL ATTENDANCE ENGINE — Clock In/Out, Break, Overtime
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { dbPut, dbGetByIndex, dbGetOneByIndex, dbGet, dbGetAll } from '../db/database';
import type {
  AttendanceRecord, BreakEntry, AttendanceLog,
  LocationHistory, Employee, Shift, WorkLocation,
} from '../db/schema';

// ── GEOFENCING ────────────────────────────────────────────
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function validateGeofence(
  userLat: number, userLng: number,
  location: WorkLocation
): { valid: boolean; distanceMeters: number } {
  const distance = haversineDistance(userLat, userLng, location.latitude, location.longitude);
  return { valid: distance <= location.radiusMeters, distanceMeters: Math.round(distance) };
}

// ── GPS ───────────────────────────────────────────────────
export async function getCurrentPosition(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(new Error(`GPS Error: ${err.message}`)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

// ── LATENESS CALCULATION ──────────────────────────────────
export function calculateLateness(
  clockInTime: Date,
  shift: Shift,
  date: string
): number {
  const [sh, sm] = shift.startTime.split(':').map(Number);
  const shiftStart = new Date(`${date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`);
  const graceEnd = new Date(shiftStart.getTime() + shift.gracePeriodMinutes * 60000);

  if (clockInTime <= graceEnd) return 0;
  return differenceInMinutes(clockInTime, shiftStart);
}

// ── OVERTIME CALCULATION ──────────────────────────────────
export function calculateOvertime(
  clockOutTime: Date,
  shift: Shift,
  date: string
): number {
  const [eh, em] = shift.endTime.split(':').map(Number);
  let shiftEnd = new Date(`${date}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`);

  if (shift.isOvernightShift && eh < 12) {
    // End time is next day
    shiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);
  }

  const excess = differenceInMinutes(clockOutTime, shiftEnd);
  if (excess <= shift.overtimeThresholdMinutes) return 0;
  return excess;
}

// ── CLOCK IN ─────────────────────────────────────────────
export async function clockIn(
  employeeId: string,
  lat?: number,
  lng?: number,
  bypassGeo: boolean = false
): Promise<{ record: AttendanceRecord; log: AttendanceLog; geoValid: boolean; distance?: number }> {
  const now = new Date();
  const dateStr = format(now, 'yyyy-MM-dd');

  // Check already clocked in today
  const existing = await dbGetOneByIndex<AttendanceRecord>(
    'attendance_records', 'by_employee_date', [employeeId, dateStr]
  );
  if (existing?.clockInTime) {
    throw new Error('Already clocked in today');
  }

  // Get employee & shift
  const employee = await dbGet<Employee>('employees', employeeId);
  if (!employee) throw new Error('Employee not found');

  const shift = await dbGet<Shift>('shifts', employee.shiftId || 'shift-morning');
  if (!shift) throw new Error('Shift not found');

  // Geofencing validation
  let geoValid = bypassGeo;
  let distance: number | undefined;

  if (lat !== undefined && lng !== undefined && employee.workLocationId) {
    const location = await dbGet<WorkLocation>('work_locations', employee.workLocationId);
    if (location) {
      const geo = validateGeofence(lat, lng, location);
      geoValid = geo.valid;
      distance = geo.distanceMeters;
    }
  }

  // Calculate lateness
  const latenessMin = calculateLateness(now, shift, dateStr);

  // Determine status
  let status: AttendanceRecord['status'] = 'present';
  if (latenessMin > shift.gracePeriodMinutes) status = 'late';

  const recordId = existing?.id || uuidv4();
  const record: AttendanceRecord = {
    ...(existing || {}),
    id: recordId,
    employeeId,
    date: dateStr,
    shiftId: shift.id,
    clockInTime: now.toISOString(),
    clockInLat: lat,
    clockInLng: lng,
    clockInLocationValid: geoValid,
    clockOutLocationValid: false,
    status,
    workingMinutes: 0,
    overtimeMinutes: 0,
    latenessMinutes: latenessMin,
    earlyDepartureMinutes: 0,
    breaks: existing?.breaks || [],
    totalBreakMinutes: existing?.totalBreakMinutes || 0,
    netWorkingMinutes: 0,
    createdAt: existing?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await dbPut('attendance_records', record);

  // Log entry
  const log: AttendanceLog = {
    id: uuidv4(),
    attendanceRecordId: recordId,
    employeeId,
    action: 'CLOCK_IN',
    timestamp: now.toISOString(),
    latitude: lat,
    longitude: lng,
    locationValid: geoValid,
    metadata: { latenessMinutes: latenessMin, distance },
  };
  await dbPut('attendance_logs', log);

  // Save location history
  if (lat !== undefined && lng !== undefined) {
    await dbPut<LocationHistory>('location_history', {
      id: uuidv4(),
      employeeId,
      latitude: lat,
      longitude: lng,
      accuracy: 10,
      timestamp: now.toISOString(),
      locationName: 'Clock In',
    });
  }

  return { record, log, geoValid, distance };
}

// ── CLOCK OUT ─────────────────────────────────────────────
export async function clockOut(
  employeeId: string,
  lat?: number,
  lng?: number,
  bypassGeo: boolean = false
): Promise<{ record: AttendanceRecord; log: AttendanceLog }> {
  const now = new Date();
  const dateStr = format(now, 'yyyy-MM-dd');

  const existing = await dbGetOneByIndex<AttendanceRecord>(
    'attendance_records', 'by_employee_date', [employeeId, dateStr]
  );
  if (!existing?.clockInTime) throw new Error('Not clocked in today');
  if (existing.clockOutTime) throw new Error('Already clocked out today');

  const shift = await dbGet<Shift>('shifts', existing.shiftId);
  if (!shift) throw new Error('Shift not found');

  // Close any open breaks
  const breaks = [...existing.breaks];
  const openBreak = breaks.find((b) => !b.endTime);
  if (openBreak) {
    openBreak.endTime = now.toISOString();
    openBreak.durationMinutes = differenceInMinutes(now, parseISO(openBreak.startTime));
  }

  // Calculations
  const clockIn = parseISO(existing.clockInTime);
  const totalWorkMin = differenceInMinutes(now, clockIn);
  const totalBreakMin = breaks.reduce((sum, b) => sum + b.durationMinutes, 0);
  const netWorkMin = Math.max(0, totalWorkMin - totalBreakMin);
  const overtimeMin = calculateOvertime(now, shift, dateStr);

  // Early departure
  const [eh, em] = shift.endTime.split(':').map(Number);
  let shiftEnd = new Date(`${dateStr}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`);
  if (shift.isOvernightShift) shiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);
  const earlyMin = Math.max(0, differenceInMinutes(shiftEnd, now));

  // Geofencing
  const employee = await dbGet<Employee>('employees', employeeId);
  let geoValid = bypassGeo;
  if (lat !== undefined && lng !== undefined && employee?.workLocationId) {
    const location = await dbGet<WorkLocation>('work_locations', employee.workLocationId);
    if (location) {
      geoValid = validateGeofence(lat, lng, location).valid;
    }
  }

  // Determine final status
  let status: AttendanceRecord['status'] = existing.status;
  if (netWorkMin < 4 * 60) status = 'half_day';

  const record: AttendanceRecord = {
    ...existing,
    clockOutTime: now.toISOString(),
    clockOutLat: lat,
    clockOutLng: lng,
    clockOutLocationValid: geoValid,
    status,
    workingMinutes: Math.round(totalWorkMin),
    overtimeMinutes: Math.round(overtimeMin),
    earlyDepartureMinutes: Math.round(earlyMin),
    breaks,
    totalBreakMinutes: Math.round(totalBreakMin),
    netWorkingMinutes: Math.round(netWorkMin),
    updatedAt: now.toISOString(),
  };

  await dbPut('attendance_records', record);

  const log: AttendanceLog = {
    id: uuidv4(),
    attendanceRecordId: existing.id,
    employeeId,
    action: 'CLOCK_OUT',
    timestamp: now.toISOString(),
    latitude: lat,
    longitude: lng,
    locationValid: geoValid,
    metadata: { totalWorkMin, netWorkMin, overtimeMin, earlyMin },
  };
  await dbPut('attendance_logs', log);

  if (lat !== undefined && lng !== undefined) {
    await dbPut<LocationHistory>('location_history', {
      id: uuidv4(),
      employeeId,
      latitude: lat,
      longitude: lng,
      accuracy: 10,
      timestamp: now.toISOString(),
      locationName: 'Clock Out',
    });
  }

  return { record, log };
}

// ── BREAK START ───────────────────────────────────────────
export async function startBreak(
  employeeId: string,
  type: BreakEntry['type']
): Promise<AttendanceRecord> {
  const now = new Date();
  const dateStr = format(now, 'yyyy-MM-dd');

  const record = await dbGetOneByIndex<AttendanceRecord>(
    'attendance_records', 'by_employee_date', [employeeId, dateStr]
  );
  if (!record?.clockInTime) throw new Error('Not clocked in');
  if (record.clockOutTime) throw new Error('Already clocked out');

  const openBreak = record.breaks.find((b) => !b.endTime);
  if (openBreak) throw new Error('Break already in progress');

  const newBreak: BreakEntry = {
    id: uuidv4(),
    type,
    startTime: now.toISOString(),
    durationMinutes: 0,
  };

  const updated: AttendanceRecord = {
    ...record,
    breaks: [...record.breaks, newBreak],
    updatedAt: now.toISOString(),
  };

  await dbPut('attendance_records', updated);
  return updated;
}

// ── BREAK END ─────────────────────────────────────────────
export async function endBreak(employeeId: string): Promise<AttendanceRecord> {
  const now = new Date();
  const dateStr = format(now, 'yyyy-MM-dd');

  const record = await dbGetOneByIndex<AttendanceRecord>(
    'attendance_records', 'by_employee_date', [employeeId, dateStr]
  );
  if (!record) throw new Error('No attendance record found');

  const breaks = [...record.breaks];
  const openBreak = breaks.find((b) => !b.endTime);
  if (!openBreak) throw new Error('No active break to end');

  openBreak.endTime = now.toISOString();
  openBreak.durationMinutes = differenceInMinutes(now, parseISO(openBreak.startTime));

  const totalBreakMin = breaks.reduce((sum, b) => sum + b.durationMinutes, 0);

  const updated: AttendanceRecord = {
    ...record,
    breaks,
    totalBreakMinutes: Math.round(totalBreakMin),
    updatedAt: now.toISOString(),
  };

  await dbPut('attendance_records', updated);
  return updated;
}

// ── TODAY'S RECORD ────────────────────────────────────────
export async function getTodayRecord(employeeId: string): Promise<AttendanceRecord | undefined> {
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  return dbGetOneByIndex<AttendanceRecord>('attendance_records', 'by_employee_date', [employeeId, dateStr]);
}

// ── ANALYTICS ────────────────────────────────────────────
export interface AttendanceAnalytics {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalHalfDay: number;
  totalOnLeave: number;
  avgWorkingMinutes: number;
  avgOvertimeMinutes: number;
  avgLatenessMinutes: number;
  attendanceRate: number;
  latenessRate: number;
  overtimeRate: number;
  recordsByDate: Record<string, number>;
}

export async function getAttendanceAnalytics(
  employeeId?: string,
  startDate?: string,
  endDate?: string
): Promise<AttendanceAnalytics> {
  let records: AttendanceRecord[];

  if (employeeId) {
    records = await dbGetByIndex<AttendanceRecord>('attendance_records', 'by_employee', employeeId);
  } else {
    records = await dbGetAll<AttendanceRecord>('attendance_records');
  }

  if (startDate) records = records.filter((r) => r.date >= startDate);
  if (endDate) records = records.filter((r) => r.date <= endDate);

  const total = records.length;
  if (total === 0) {
    return {
      totalPresent: 0, totalAbsent: 0, totalLate: 0, totalHalfDay: 0, totalOnLeave: 0,
      avgWorkingMinutes: 0, avgOvertimeMinutes: 0, avgLatenessMinutes: 0,
      attendanceRate: 0, latenessRate: 0, overtimeRate: 0, recordsByDate: {},
    };
  }

  const present = records.filter((r) => r.status === 'present' || r.status === 'late').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const late = records.filter((r) => r.status === 'late').length;
  const halfDay = records.filter((r) => r.status === 'half_day').length;
  const onLeave = records.filter((r) => r.status === 'on_leave').length;

  const withClock = records.filter((r) => r.clockInTime);
  const avgWork = withClock.length
    ? withClock.reduce((s, r) => s + r.netWorkingMinutes, 0) / withClock.length
    : 0;
  const avgOT = withClock.length
    ? withClock.reduce((s, r) => s + r.overtimeMinutes, 0) / withClock.length
    : 0;
  const avgLate = withClock.length
    ? withClock.reduce((s, r) => s + r.latenessMinutes, 0) / withClock.length
    : 0;

  const recordsByDate: Record<string, number> = {};
  for (const r of records) {
    recordsByDate[r.date] = (recordsByDate[r.date] || 0) + 1;
  }

  return {
    totalPresent: present,
    totalAbsent: absent,
    totalLate: late,
    totalHalfDay: halfDay,
    totalOnLeave: onLeave,
    avgWorkingMinutes: Math.round(avgWork),
    avgOvertimeMinutes: Math.round(avgOT),
    avgLatenessMinutes: Math.round(avgLate),
    attendanceRate: Math.round((present / total) * 100),
    latenessRate: Math.round((late / total) * 100),
    overtimeRate: Math.round((records.filter((r) => r.overtimeMinutes > 0).length / total) * 100),
    recordsByDate,
  };
}

// ── EMPLOYEE ATTENDANCE LIST ──────────────────────────────
export async function getEmployeeAttendanceRecords(
  employeeId: string,
  limit = 30
): Promise<AttendanceRecord[]> {
  const records = await dbGetByIndex<AttendanceRecord>('attendance_records', 'by_employee', employeeId);
  return records.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

// ── ALL TODAY'S ATTENDANCE ────────────────────────────────
export async function getAllTodayAttendance(): Promise<AttendanceRecord[]> {
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  return dbGetByIndex<AttendanceRecord>('attendance_records', 'by_date', dateStr);
}
