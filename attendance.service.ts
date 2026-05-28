// ============================================================
// ATTENDANCE SERVICE — Real clock-in/out + GPS + geofencing
// AttendX Enterprise SaaS Platform
// ============================================================

import { query } from '../lib/database';
import { generateUUID } from '../lib/crypto';
import type { AttendanceRecord, DashboardStats, ClockEventPayload } from '../types';

export interface AttendanceFilters {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
}

const mapRecord = (row: Record<string, unknown>): AttendanceRecord => ({
  id: row.id as string,
  companyId: row.company_id as string,
  employeeId: row.employee_id as string,
  employee: row.emp_id ? {
    id: row.emp_id as string,
    companyId: row.company_id as string,
    userId: row.user_id as string,
    employeeCode: row.emp_code as string,
    firstName: row.emp_first as string,
    lastName: row.emp_last as string,
    email: row.emp_email as string,
    gender: 'prefer_not_to_say',
    jobTitle: row.emp_title as string,
    employmentType: 'full_time',
    salary: 0,
    currency: 'USD',
    hireDate: '',
    isActive: true,
    annualLeaveBalance: 0,
    sickLeaveBalance: 0,
    personalLeaveBalance: 0,
    createdAt: '',
    updatedAt: '',
    department: row.dept_name ? { id: '', name: row.dept_name as string, code: '', companyId: '', createdAt: '' } : undefined,
  } : undefined,
  date: row.date as string,
  clockIn: row.clock_in as string,
  clockOut: row.clock_out as string,
  clockInLat: row.clock_in_lat as number,
  clockInLng: row.clock_in_lng as number,
  clockOutLat: row.clock_out_lat as number,
  clockOutLng: row.clock_out_lng as number,
  clockInAddress: row.clock_in_address as string,
  clockOutAddress: row.clock_out_address as string,
  isWithinGeofence: row.is_within_geofence as boolean,
  status: row.status as AttendanceRecord['status'],
  regularHours: Number(row.regular_hours),
  overtimeHours: Number(row.overtime_hours),
  totalHours: Number(row.total_hours),
  lateMinutes: Number(row.late_minutes),
  earlyLeaveMinutes: Number(row.early_leave_minutes),
  breakMinutes: Number(row.break_minutes),
  notes: row.notes as string,
  approvedBy: row.approved_by as string,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

// Haversine formula for GPS distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const attendanceService = {
  async clockEvent(companyId: string, employeeId: string, payload: ClockEventPayload): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Get company geofencing settings
    const companyResult = await query<{
      geofencing_enabled: boolean; geofence_lat: number; geofence_lng: number;
      geofence_radius: number; working_hours_per_day: number; overtime_threshold: number;
    }>(
      'SELECT geofencing_enabled, geofence_lat, geofence_lng, geofence_radius, working_hours_per_day, overtime_threshold FROM companies WHERE id = $1',
      [companyId]
    );

    const company = companyResult.rows[0];
    
    // Get employee shift
    const shiftResult = await query<{
      start_time: string; end_time: string; grace_period_minutes: number; break_duration: number;
    }>(
      `SELECT s.start_time, s.end_time, s.grace_period_minutes, s.break_duration
       FROM employees e LEFT JOIN shifts s ON s.id = e.shift_id WHERE e.id = $1`,
      [employeeId]
    );
    const shift = shiftResult.rows[0];

    // Check geofence
    let isWithinGeofence: boolean | null = null;
    if (company?.geofencing_enabled && company.geofence_lat && company.geofence_lng && payload.latitude && payload.longitude) {
      const distance = calculateDistance(payload.latitude, payload.longitude, company.geofence_lat, company.geofence_lng);
      isWithinGeofence = distance <= (company.geofence_radius || 100);
    }

    // Get or create today's attendance record
    const existing = await query<{ id: string; clock_in: string; status: string }>(
      'SELECT id, clock_in, status FROM attendance_records WHERE company_id = $1 AND employee_id = $2 AND date = $3',
      [companyId, employeeId, today]
    );

    if (payload.type === 'clock_in') {
      if (existing.rowCount > 0 && existing.rows[0].clock_in) {
        throw new Error('Already clocked in today');
      }

      // Calculate late minutes
      let lateMinutes = 0;
      if (shift?.start_time) {
        const [shiftHour, shiftMin] = shift.start_time.split(':').map(Number);
        const now2 = new Date();
        const actualMinutes = now2.getHours() * 60 + now2.getMinutes();
        const shiftMinutes = shiftHour * 60 + shiftMin + (shift.grace_period_minutes || 15);
        lateMinutes = Math.max(0, actualMinutes - shiftMinutes);
      }

      const status = lateMinutes > 0 ? 'late' : 'present';

      if (existing.rowCount > 0) {
        await query(
          `UPDATE attendance_records SET clock_in = $1, clock_in_lat = $2, clock_in_lng = $3, clock_in_address = $4,
           is_within_geofence = $5, status = $6, late_minutes = $7, notes = $8, updated_at = NOW()
           WHERE id = $9`,
          [now, payload.latitude || null, payload.longitude || null, payload.address || null,
           isWithinGeofence, status, lateMinutes, payload.notes || null, existing.rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO attendance_records (id, company_id, employee_id, date, clock_in, clock_in_lat, clock_in_lng,
           clock_in_address, is_within_geofence, status, late_minutes, break_minutes, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [generateUUID(), companyId, employeeId, today, now, payload.latitude || null, payload.longitude || null,
           payload.address || null, isWithinGeofence, status, lateMinutes, shift?.break_duration || 60, payload.notes || null]
        );
      }

      // Log activity
      await query(
        `INSERT INTO activity_logs (company_id, employee_id, action, details) VALUES ($1, $2, 'CLOCK_IN', $3)`,
        [companyId, employeeId, JSON.stringify({ time: now, lat: payload.latitude, lng: payload.longitude })]
      );

    } else {
      // Clock out
      if (existing.rowCount === 0 || !existing.rows[0].clock_in) {
        throw new Error('No active clock-in found for today');
      }

      const clockInTime = new Date(existing.rows[0].clock_in);
      const clockOutTime = new Date(now);
      const totalMinutes = (clockOutTime.getTime() - clockInTime.getTime()) / 60000;
      const breakMinutes = shift?.break_duration || 60;
      const workMinutes = totalMinutes - breakMinutes;
      const totalHours = Math.max(0, workMinutes / 60);
      const workingHours = company?.working_hours_per_day || 8;
      const regularHours = Math.min(workingHours, totalHours);
      const overtimeHours = Math.max(0, totalHours - workingHours);

      // Calculate early leave
      let earlyLeaveMinutes = 0;
      if (shift?.end_time) {
        const [endHour, endMin] = shift.end_time.split(':').map(Number);
        const now2 = new Date();
        const actualMinutes = now2.getHours() * 60 + now2.getMinutes();
        const endMinutes = endHour * 60 + endMin;
        earlyLeaveMinutes = Math.max(0, endMinutes - actualMinutes);
      }

      await query(
        `UPDATE attendance_records SET clock_out = $1, clock_out_lat = $2, clock_out_lng = $3, clock_out_address = $4,
         total_hours = $5, regular_hours = $6, overtime_hours = $7, early_leave_minutes = $8, updated_at = NOW()
         WHERE id = $9`,
        [now, payload.latitude || null, payload.longitude || null, payload.address || null,
         totalHours.toFixed(2), regularHours.toFixed(2), overtimeHours.toFixed(2), earlyLeaveMinutes,
         existing.rows[0].id]
      );

      await query(
        `INSERT INTO activity_logs (company_id, employee_id, action, details) VALUES ($1, $2, 'CLOCK_OUT', $3)`,
        [companyId, employeeId, JSON.stringify({ time: now, totalHours: totalHours.toFixed(2) })]
      );
    }

    // Fetch updated record
    const updatedResult = await query(
      `SELECT ar.*, e.id as emp_id, e.user_id, e.employee_code as emp_code, e.first_name as emp_first, 
              e.last_name as emp_last, e.email as emp_email, e.job_title as emp_title, d.name as dept_name
       FROM attendance_records ar
       JOIN employees e ON e.id = ar.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE ar.company_id = $1 AND ar.employee_id = $2 AND ar.date = $3`,
      [companyId, employeeId, today]
    );

    return mapRecord(updatedResult.rows[0] as Record<string, unknown>);
  },

  async getTodayRecord(companyId: string, employeeId: string): Promise<AttendanceRecord | null> {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
      `SELECT ar.*, e.id as emp_id, e.user_id, e.employee_code as emp_code, e.first_name as emp_first,
              e.last_name as emp_last, e.email as emp_email, e.job_title as emp_title, d.name as dept_name
       FROM attendance_records ar
       JOIN employees e ON e.id = ar.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE ar.company_id = $1 AND ar.employee_id = $2 AND ar.date = $3`,
      [companyId, employeeId, today]
    );
    if (result.rowCount === 0) return null;
    return mapRecord(result.rows[0] as Record<string, unknown>);
  },

  async list(companyId: string, filters: AttendanceFilters = {}): Promise<{ data: AttendanceRecord[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const offset = (page - 1) * limit;

    let where = 'WHERE ar.company_id = $1';
    const params: unknown[] = [companyId];
    let idx = 2;

    if (filters.employeeId) {
      where += ` AND ar.employee_id = $${idx++}`;
      params.push(filters.employeeId);
    }
    if (filters.startDate) {
      where += ` AND ar.date >= $${idx++}`;
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      where += ` AND ar.date <= $${idx++}`;
      params.push(filters.endDate);
    }
    if (filters.status) {
      where += ` AND ar.status = $${idx++}`;
      params.push(filters.status);
    }
    if (filters.departmentId) {
      where += ` AND e.department_id = $${idx++}`;
      params.push(filters.departmentId);
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM attendance_records ar
       JOIN employees e ON e.id = ar.employee_id
       ${where}`,
      params
    );

    const result = await query(
      `SELECT ar.*, e.id as emp_id, e.user_id, e.employee_code as emp_code, e.first_name as emp_first,
              e.last_name as emp_last, e.email as emp_email, e.job_title as emp_title, d.name as dept_name
       FROM attendance_records ar
       JOIN employees e ON e.id = ar.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       ${where}
       ORDER BY ar.date DESC, ar.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const total = parseInt(countResult.rows[0]?.count || '0');
    return {
      data: result.rows.map(r => mapRecord(r as Record<string, unknown>)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getDashboardStats(companyId: string): Promise<DashboardStats> {
    const today = new Date().toISOString().split('T')[0];

    const [todayStats, weeklyTrend, deptBreakdown, monthlyOvertime, pendingLeave, newHires, recentActivity] = await Promise.all([
      query<{
        total_employees: string; present: string; absent: string;
        on_leave: string; late: string;
      }>(
        `SELECT 
           (SELECT COUNT(*) FROM employees WHERE company_id = $1 AND is_active = true) as total_employees,
           COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present,
           COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent,
           COUNT(CASE WHEN ar.status = 'on_leave' THEN 1 END) as on_leave,
           COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late
         FROM attendance_records ar
         WHERE ar.company_id = $1 AND ar.date = $2`,
        [companyId, today]
      ),
      query<{ date: string; present: string; absent: string; late: string }>(
        `SELECT date::text, 
           COUNT(CASE WHEN status = 'present' OR status = 'late' THEN 1 END) as present,
           COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
           COUNT(CASE WHEN status = 'late' THEN 1 END) as late
         FROM attendance_records
         WHERE company_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
         GROUP BY date ORDER BY date`,
        [companyId]
      ),
      query<{ department: string; present: string; absent: string; total: string }>(
        `SELECT d.name as department,
           COUNT(CASE WHEN ar.status IN ('present','late') THEN 1 END) as present,
           COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent,
           COUNT(e.id) as total
         FROM departments d
         JOIN employees e ON e.department_id = d.id AND e.company_id = d.company_id AND e.is_active = true
         LEFT JOIN attendance_records ar ON ar.employee_id = e.id AND ar.date = $2
         WHERE d.company_id = $1
         GROUP BY d.name ORDER BY total DESC`,
        [companyId, today]
      ),
      query<{ total_overtime: string }>(
        `SELECT COALESCE(SUM(overtime_hours), 0) as total_overtime
         FROM attendance_records
         WHERE company_id = $1 AND DATE_TRUNC('month', date) = DATE_TRUNC('month', NOW())`,
        [companyId]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) as count FROM leave_requests WHERE company_id = $1 AND status = 'pending'`,
        [companyId]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) as count FROM employees WHERE company_id = $1 AND DATE_TRUNC('month', hire_date) = DATE_TRUNC('month', NOW())`,
        [companyId]
      ),
      query<{ first_name: string; last_name: string; action: string; created_at: string }>(
        `SELECT e.first_name, e.last_name, al.action, al.created_at
         FROM activity_logs al
         JOIN employees e ON e.id = al.employee_id
         WHERE al.company_id = $1
         ORDER BY al.created_at DESC LIMIT 10`,
        [companyId]
      ),
    ]);

    const stats = todayStats.rows[0];
    const totalEmployees = parseInt(stats?.total_employees || '0');
    const present = parseInt(stats?.present || '0');
    const absent = parseInt(stats?.absent || '0');
    const onLeave = parseInt(stats?.on_leave || '0');
    const late = parseInt(stats?.late || '0');
    const attendanceRate = totalEmployees > 0 ? Math.round(((present + late) / totalEmployees) * 100) : 0;

    return {
      totalEmployees,
      presentToday: present,
      absentToday: absent,
      onLeaveToday: onLeave,
      lateToday: late,
      attendanceRate,
      pendingLeaveRequests: parseInt(pendingLeave.rows[0]?.count || '0'),
      overtimeHoursThisMonth: parseFloat(monthlyOvertime.rows[0]?.total_overtime || '0'),
      newHiresThisMonth: parseInt(newHires.rows[0]?.count || '0'),
      departmentBreakdown: deptBreakdown.rows.map(r => ({
        department: r.department,
        present: parseInt(r.present),
        absent: parseInt(r.absent),
        total: parseInt(r.total),
      })),
      weeklyTrend: weeklyTrend.rows.map(r => ({
        date: r.date,
        present: parseInt(r.present),
        absent: parseInt(r.absent),
        late: parseInt(r.late),
      })),
      topDepartments: deptBreakdown.rows.slice(0, 5).map(r => ({
        name: r.department,
        attendanceRate: parseInt(r.total) > 0 ? Math.round((parseInt(r.present) / parseInt(r.total)) * 100) : 0,
      })),
      recentActivity: recentActivity.rows.map(r => ({
        employeeName: `${r.first_name} ${r.last_name}`,
        action: r.action === 'CLOCK_IN' ? 'Clocked In' : r.action === 'CLOCK_OUT' ? 'Clocked Out' : r.action,
        time: r.created_at,
      })),
    };
  },

  async getEmployeeMonthlyReport(companyId: string, employeeId: string, year: number, month: number): Promise<{
    records: AttendanceRecord[];
    summary: {
      presentDays: number; absentDays: number; lateDays: number; onLeaveDays: number;
      totalHours: number; regularHours: number; overtimeHours: number; attendanceRate: number;
    };
  }> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const result = await this.list(companyId, { employeeId, startDate, endDate, limit: 100 });

    const summary = result.data.reduce((acc, r) => {
      if (r.status === 'present' || r.status === 'late') acc.presentDays++;
      if (r.status === 'absent') acc.absentDays++;
      if (r.status === 'late') acc.lateDays++;
      if (r.status === 'on_leave') acc.onLeaveDays++;
      acc.totalHours += r.totalHours;
      acc.regularHours += r.regularHours;
      acc.overtimeHours += r.overtimeHours;
      return acc;
    }, { presentDays: 0, absentDays: 0, lateDays: 0, onLeaveDays: 0, totalHours: 0, regularHours: 0, overtimeHours: 0, attendanceRate: 0 });

    const workingDays = result.data.filter(r => r.status !== 'weekend' && r.status !== 'holiday').length;
    summary.attendanceRate = workingDays > 0 ? Math.round((summary.presentDays / workingDays) * 100) : 0;

    return { records: result.data, summary };
  },
};
