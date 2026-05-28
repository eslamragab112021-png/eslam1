// ============================================================
// DATABASE SEEDER — Enterprise realistic data
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import { dbPut, dbCount } from './database';
import { format, subDays, addMinutes, setHours, setMinutes } from 'date-fns';
import type { Employee, Shift, WorkLocation, AttendanceRecord, LeaveRequest } from './schema';

const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Operations', 'Sales', 'Marketing'];
const DESIGNATIONS: Record<string, string[]> = {
  Engineering: ['Software Engineer', 'Senior Engineer', 'Tech Lead', 'DevOps Engineer'],
  HR: ['HR Manager', 'HR Executive', 'Recruiter', 'Payroll Officer'],
  Finance: ['Accountant', 'Finance Manager', 'Analyst', 'Auditor'],
  Operations: ['Operations Manager', 'Coordinator', 'Logistics Officer'],
  Sales: ['Sales Executive', 'Account Manager', 'Sales Director'],
  Marketing: ['Marketing Manager', 'Content Writer', 'SEO Specialist'],
};

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function isoDate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}
function isoTs(d: Date) {
  return d.toISOString();
}

// Haversine helper
function offsetLatLng(lat: number, lng: number, meters: number): { lat: number; lng: number } {
  const angle = Math.random() * 2 * Math.PI;
  const dlat = (meters / 111320) * Math.cos(angle);
  const dlng = (meters / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
  return { lat: lat + dlat, lng: lng + dlng };
}

export async function seedDatabase(): Promise<void> {
  const count = await dbCount('employees');
  if (count > 0) return; // Already seeded

  // ── SHIFTS ───────────────────────────────────────────────
  const shifts: Shift[] = [
    {
      id: 'shift-morning',
      name: 'Morning Shift',
      type: 'fixed',
      startTime: '08:00',
      endTime: '17:00',
      gracePeriodMinutes: 15,
      overtimeThresholdMinutes: 30,
      breakDurationMinutes: 60,
      workingDays: [1, 2, 3, 4, 5],
      isOvernightShift: false,
      createdAt: isoTs(new Date()),
      updatedAt: isoTs(new Date()),
    },
    {
      id: 'shift-afternoon',
      name: 'Afternoon Shift',
      type: 'fixed',
      startTime: '14:00',
      endTime: '23:00',
      gracePeriodMinutes: 10,
      overtimeThresholdMinutes: 30,
      breakDurationMinutes: 45,
      workingDays: [1, 2, 3, 4, 5],
      isOvernightShift: false,
      createdAt: isoTs(new Date()),
      updatedAt: isoTs(new Date()),
    },
    {
      id: 'shift-night',
      name: 'Night Shift',
      type: 'overnight',
      startTime: '22:00',
      endTime: '06:00',
      gracePeriodMinutes: 15,
      overtimeThresholdMinutes: 30,
      breakDurationMinutes: 30,
      workingDays: [0, 1, 2, 3, 4, 5, 6],
      isOvernightShift: true,
      createdAt: isoTs(new Date()),
      updatedAt: isoTs(new Date()),
    },
    {
      id: 'shift-flexible',
      name: 'Flexible Hours',
      type: 'flexible',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodMinutes: 30,
      overtimeThresholdMinutes: 60,
      breakDurationMinutes: 60,
      workingDays: [1, 2, 3, 4, 5],
      isOvernightShift: false,
      flexStartEarliest: '07:00',
      flexStartLatest: '11:00',
      createdAt: isoTs(new Date()),
      updatedAt: isoTs(new Date()),
    },
  ];

  for (const s of shifts) await dbPut('shifts', s);

  // ── WORK LOCATIONS ────────────────────────────────────────
  const locations: WorkLocation[] = [
    {
      id: 'loc-hq',
      name: 'Headquarters',
      address: '123 Corporate Tower, Downtown Business District',
      latitude: 3.1390,
      longitude: 101.6869,
      radiusMeters: 150,
      isActive: true,
      createdAt: isoTs(new Date()),
    },
    {
      id: 'loc-branch-a',
      name: 'Branch Office A',
      address: '45 Industrial Park, North Zone',
      latitude: 3.1478,
      longitude: 101.7148,
      radiusMeters: 200,
      isActive: true,
      createdAt: isoTs(new Date()),
    },
    {
      id: 'loc-factory',
      name: 'Manufacturing Plant',
      address: '88 Factory Road, Industrial Zone',
      latitude: 3.0733,
      longitude: 101.5185,
      radiusMeters: 500,
      isActive: true,
      createdAt: isoTs(new Date()),
    },
  ];

  for (const l of locations) await dbPut('work_locations', l);

  // ── EMPLOYEES ─────────────────────────────────────────────
  const empNames = [
    'Alex Johnson', 'Maria Santos', 'David Chen', 'Sarah Williams', 'James Okafor',
    'Priya Patel', 'Michael Brown', 'Emma Thompson', 'Carlos Rivera', 'Fatima Al-Hassan',
    'Liam O\'Brien', 'Yuki Tanaka', 'Aisha Diallo', 'Robert Kim', 'Sophie Laurent',
    'Omar Abdullah', 'Grace Nwosu', 'Ivan Petrov', 'Zoe Anderson', 'Hassan Mohammed',
  ];

  const shiftIds = ['shift-morning', 'shift-afternoon', 'shift-flexible', 'shift-night'];
  const locationIds = ['loc-hq', 'loc-branch-a', 'loc-factory'];

  const employees: Employee[] = empNames.map((name, i) => {
    const dept = pickRandom(DEPARTMENTS);
    const designation = pickRandom(DESIGNATIONS[dept]);
    const shiftId = pickRandom(shiftIds);
    return {
      id: `emp-${String(i + 1).padStart(3, '0')}`,
      employeeCode: `EMP${String(i + 1).padStart(4, '0')}`,
      name,
      email: `${name.toLowerCase().replace(/[^a-z]/g, '.')}@company.com`,
      department: dept,
      designation,
      shiftId,
      workLocationId: pickRandom(locationIds),
      status: i < 18 ? 'active' : 'on_leave',
      joinDate: isoDate(subDays(new Date(), randomBetween(180, 1800))),
      phone: `+60 1${randomBetween(1, 9)}-${randomBetween(1000000, 9999999)}`,
      annualLeaveBalance: randomBetween(5, 18),
      sickLeaveBalance: randomBetween(5, 14),
      emergencyLeaveBalance: randomBetween(1, 3),
      createdAt: isoTs(new Date()),
      updatedAt: isoTs(new Date()),
    };
  });

  for (const e of employees) await dbPut('employees', e);

  // ── ATTENDANCE RECORDS — last 30 days ────────────────────
  const today = new Date();
  const shiftMap: Record<string, Shift> = {};
  for (const s of shifts) shiftMap[s.id] = s;
  const locMap: Record<string, WorkLocation> = {};
  for (const l of locations) locMap[l.id] = l;

  for (const emp of employees) {
    const shift = shiftMap[emp.shiftId || 'shift-morning'];
    const loc = locMap[emp.workLocationId || 'loc-hq'];

    for (let d = 30; d >= 1; d--) {
      const day = subDays(today, d);
      const dayOfWeek = day.getDay();

      // Skip non-working days
      if (!shift.workingDays.includes(dayOfWeek)) continue;

      const dateStr = isoDate(day);
      const dice = Math.random();

      // Absent probability
      if (dice < 0.06) {
        const rec: AttendanceRecord = {
          id: uuidv4(),
          employeeId: emp.id,
          date: dateStr,
          shiftId: shift.id,
          clockInLocationValid: false,
          clockOutLocationValid: false,
          status: 'absent',
          workingMinutes: 0,
          overtimeMinutes: 0,
          latenessMinutes: 0,
          earlyDepartureMinutes: 0,
          breaks: [],
          totalBreakMinutes: 0,
          netWorkingMinutes: 0,
          createdAt: isoTs(day),
          updatedAt: isoTs(day),
        };
        await dbPut('attendance_records', rec);
        continue;
      }

      // Parse shift times
      const [sh, sm] = shift.startTime.split(':').map(Number);
      const [eh, em] = shift.endTime.split(':').map(Number);

      // Clock in with possible lateness
      let latenessMin = 0;
      let isLate = false;
      if (dice > 0.78 && dice < 0.92) {
        latenessMin = randomBetween(shift.gracePeriodMinutes + 1, 60);
        isLate = true;
      }

      let clockIn = setMinutes(setHours(day, sh), sm);
      clockIn = addMinutes(clockIn, latenessMin);

      // Clock out — possible early departure
      let earlyMin = 0;
      let clockOut = setMinutes(setHours(day, eh), em);
      if (shift.isOvernightShift) {
        clockOut = addMinutes(clockOut, 24 * 60); // next day
      }
      if (dice > 0.90) {
        earlyMin = randomBetween(15, 45);
        clockOut = addMinutes(clockOut, -earlyMin);
      }
      // Possible overtime
      let overtimeMin = 0;
      if (dice < 0.25) {
        overtimeMin = randomBetween(shift.overtimeThresholdMinutes + 1, 120);
        clockOut = addMinutes(clockOut, overtimeMin);
      }

      const workMin = Math.max(0, (clockOut.getTime() - clockIn.getTime()) / 60000);
      const breakMin = shift.breakDurationMinutes;
      const netMin = Math.max(0, workMin - breakMin);

      // GPS location
      const offset = randomBetween(0, loc.radiusMeters * 1.3);
      const inPos = offsetLatLng(loc.latitude, loc.longitude, offset < loc.radiusMeters ? offset : loc.radiusMeters * 1.5);
      const outPos = offsetLatLng(loc.latitude, loc.longitude, randomBetween(0, loc.radiusMeters * 0.8));

      const clockInValid = offset <= loc.radiusMeters;

      const rec: AttendanceRecord = {
        id: uuidv4(),
        employeeId: emp.id,
        date: dateStr,
        shiftId: shift.id,
        clockInTime: isoTs(clockIn),
        clockOutTime: isoTs(clockOut),
        clockInLat: inPos.lat,
        clockInLng: inPos.lng,
        clockOutLat: outPos.lat,
        clockOutLng: outPos.lng,
        clockInLocationValid: clockInValid,
        clockOutLocationValid: true,
        status: isLate ? 'late' : (netMin < (shift.breakDurationMinutes + 4 * 60) ? 'half_day' : 'present'),
        workingMinutes: Math.round(workMin),
        overtimeMinutes: Math.round(overtimeMin),
        latenessMinutes: latenessMin,
        earlyDepartureMinutes: earlyMin,
        breaks: [
          {
            id: uuidv4(),
            type: 'lunch',
            startTime: isoTs(addMinutes(clockIn, 240)),
            endTime: isoTs(addMinutes(clockIn, 240 + breakMin)),
            durationMinutes: breakMin,
          },
        ],
        totalBreakMinutes: breakMin,
        netWorkingMinutes: Math.round(netMin),
        createdAt: isoTs(clockIn),
        updatedAt: isoTs(clockOut),
      };
      await dbPut('attendance_records', rec);
    }
  }

  // ── LEAVE REQUESTS ────────────────────────────────────────
  const leaveTypes: LeaveRequest['type'][] = ['annual', 'sick', 'emergency'];
  const leaveStatuses: LeaveRequest['status'][] = ['pending', 'approved', 'rejected', 'approved', 'approved'];
  for (const emp of employees.slice(0, 12)) {
    const start = subDays(today, randomBetween(1, 15));
    const duration = randomBetween(1, 5);
    const end = addMinutes(start, duration * 24 * 60);
    const lr: LeaveRequest = {
      id: uuidv4(),
      employeeId: emp.id,
      type: pickRandom(leaveTypes),
      startDate: isoDate(start),
      endDate: isoDate(end),
      totalDays: duration,
      reason: pickRandom([
        'Medical appointment', 'Family emergency', 'Personal matters',
        'Flu and fever', 'Annual vacation', 'Child care',
      ]),
      status: pickRandom(leaveStatuses),
      appliedAt: isoTs(subDays(start, randomBetween(1, 7))),
    };
    await dbPut('leave_requests', lr);
  }
}
