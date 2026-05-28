// ============================================================
// LEAVE SERVICE — Real leave management with balance tracking
// AttendX Enterprise SaaS Platform
// ============================================================

import { query } from '../lib/database';
import { generateUUID } from '../lib/crypto';
import type { LeaveRequest } from '../types';

export interface CreateLeavePayload {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string;
}

const mapLeave = (row: Record<string, unknown>): LeaveRequest => ({
  id: row.id as string,
  companyId: row.company_id as string,
  employeeId: row.employee_id as string,
  employee: row.emp_id ? {
    id: row.emp_id as string,
    companyId: row.company_id as string,
    userId: '',
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
    annualLeaveBalance: Number(row.annual_leave_balance),
    sickLeaveBalance: Number(row.sick_leave_balance),
    personalLeaveBalance: Number(row.personal_leave_balance),
    createdAt: '',
    updatedAt: '',
    department: row.dept_name ? { id: '', name: row.dept_name as string, code: '', companyId: '', createdAt: '' } : undefined,
  } : undefined,
  leaveType: row.leave_type as LeaveRequest['leaveType'],
  startDate: row.start_date as string,
  endDate: row.end_date as string,
  totalDays: Number(row.total_days),
  reason: row.reason as string,
  status: row.status as LeaveRequest['status'],
  approvedById: row.approved_by_id as string,
  approvedAt: row.approved_at as string,
  rejectionReason: row.rejection_reason as string,
  attachmentUrl: row.attachment_url as string,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

function calculateBusinessDays(startDate: string, endDate: string): number {
  let count = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export const leaveService = {
  async create(companyId: string, employeeId: string, data: CreateLeavePayload): Promise<LeaveRequest> {
    // Check for overlapping leave
    const overlap = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM leave_requests 
       WHERE company_id = $1 AND employee_id = $2 AND status NOT IN ('rejected','cancelled')
       AND NOT (end_date < $3 OR start_date > $4)`,
      [companyId, employeeId, data.startDate, data.endDate]
    );

    if (parseInt(overlap.rows[0]?.count || '0') > 0) {
      throw new Error('Leave request overlaps with an existing approved or pending request');
    }

    // Validate leave balance
    const balanceResult = await query<{
      annual_leave_balance: string; sick_leave_balance: string; personal_leave_balance: string;
    }>(
      'SELECT annual_leave_balance, sick_leave_balance, personal_leave_balance FROM employees WHERE id = $1',
      [employeeId]
    );

    const balance = balanceResult.rows[0];
    const totalDays = calculateBusinessDays(data.startDate, data.endDate);

    if (data.leaveType === 'annual' && parseFloat(balance?.annual_leave_balance || '0') < totalDays) {
      throw new Error(`Insufficient annual leave balance. Available: ${balance?.annual_leave_balance} days, Requested: ${totalDays} days`);
    }
    if (data.leaveType === 'sick' && parseFloat(balance?.sick_leave_balance || '0') < totalDays) {
      throw new Error(`Insufficient sick leave balance. Available: ${balance?.sick_leave_balance} days`);
    }
    if (data.leaveType === 'personal' && parseFloat(balance?.personal_leave_balance || '0') < totalDays) {
      throw new Error(`Insufficient personal leave balance. Available: ${balance?.personal_leave_balance} days`);
    }

    const id = generateUUID();
    await query(
      `INSERT INTO leave_requests (id, company_id, employee_id, leave_type, start_date, end_date, total_days, reason, status, attachment_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9)`,
      [id, companyId, employeeId, data.leaveType, data.startDate, data.endDate, totalDays, data.reason, data.attachmentUrl || null]
    );

    const result = await this.getById(companyId, id);
    if (!result) throw new Error('Failed to create leave request');
    return result;
  },

  async getById(companyId: string, leaveId: string): Promise<LeaveRequest | null> {
    const result = await query(
      `SELECT lr.*, e.id as emp_id, e.employee_code as emp_code, e.first_name as emp_first,
              e.last_name as emp_last, e.email as emp_email, e.job_title as emp_title,
              e.annual_leave_balance, e.sick_leave_balance, e.personal_leave_balance,
              d.name as dept_name
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE lr.id = $1 AND lr.company_id = $2`,
      [leaveId, companyId]
    );
    if (result.rowCount === 0) return null;
    return mapLeave(result.rows[0] as Record<string, unknown>);
  },

  async list(companyId: string, filters: { employeeId?: string; status?: string; page?: number; limit?: number } = {}): Promise<{ data: LeaveRequest[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const offset = (page - 1) * limit;

    let where = 'WHERE lr.company_id = $1';
    const params: unknown[] = [companyId];
    let idx = 2;

    if (filters.employeeId) {
      where += ` AND lr.employee_id = $${idx++}`;
      params.push(filters.employeeId);
    }
    if (filters.status) {
      where += ` AND lr.status = $${idx++}`;
      params.push(filters.status);
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM leave_requests lr ${where}`,
      params
    );

    const result = await query(
      `SELECT lr.*, e.id as emp_id, e.employee_code as emp_code, e.first_name as emp_first,
              e.last_name as emp_last, e.email as emp_email, e.job_title as emp_title,
              e.annual_leave_balance, e.sick_leave_balance, e.personal_leave_balance,
              d.name as dept_name
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       ${where}
       ORDER BY lr.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const total = parseInt(countResult.rows[0]?.count || '0');
    return {
      data: result.rows.map(r => mapLeave(r as Record<string, unknown>)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async approve(companyId: string, leaveId: string, approverId: string): Promise<LeaveRequest> {
    const leave = await this.getById(companyId, leaveId);
    if (!leave) throw new Error('Leave request not found');
    if (leave.status !== 'pending') throw new Error('Can only approve pending requests');

    await query(
      `UPDATE leave_requests SET status = 'approved', approved_by_id = $1, approved_at = NOW() WHERE id = $2`,
      [approverId, leaveId]
    );

    // Deduct leave balance
    let balanceField = '';
    if (leave.leaveType === 'annual') balanceField = 'annual_leave_balance';
    else if (leave.leaveType === 'sick') balanceField = 'sick_leave_balance';
    else if (leave.leaveType === 'personal') balanceField = 'personal_leave_balance';

    if (balanceField) {
      await query(
        `UPDATE employees SET ${balanceField} = ${balanceField} - $1 WHERE id = $2`,
        [leave.totalDays, leave.employeeId]
      );
    }

    // Mark attendance records as on_leave
    await query(
      `UPDATE attendance_records SET status = 'on_leave' 
       WHERE company_id = $1 AND employee_id = $2 AND date >= $3 AND date <= $4`,
      [companyId, leave.employeeId, leave.startDate, leave.endDate]
    );

    const updated = await this.getById(companyId, leaveId);
    return updated!;
  },

  async reject(companyId: string, leaveId: string, approverId: string, reason: string): Promise<LeaveRequest> {
    const leave = await this.getById(companyId, leaveId);
    if (!leave) throw new Error('Leave request not found');
    if (leave.status !== 'pending') throw new Error('Can only reject pending requests');

    await query(
      `UPDATE leave_requests SET status = 'rejected', approved_by_id = $1, approved_at = NOW(), rejection_reason = $2 WHERE id = $3`,
      [approverId, reason, leaveId]
    );

    const updated = await this.getById(companyId, leaveId);
    return updated!;
  },

  async cancel(companyId: string, leaveId: string, employeeId: string): Promise<LeaveRequest> {
    const leave = await this.getById(companyId, leaveId);
    if (!leave) throw new Error('Leave request not found');
    if (leave.employeeId !== employeeId) throw new Error('Unauthorized');
    if (!['pending', 'approved'].includes(leave.status)) throw new Error('Cannot cancel this request');

    // Restore balance if was approved
    if (leave.status === 'approved') {
      let balanceField = '';
      if (leave.leaveType === 'annual') balanceField = 'annual_leave_balance';
      else if (leave.leaveType === 'sick') balanceField = 'sick_leave_balance';
      else if (leave.leaveType === 'personal') balanceField = 'personal_leave_balance';

      if (balanceField) {
        await query(
          `UPDATE employees SET ${balanceField} = ${balanceField} + $1 WHERE id = $2`,
          [leave.totalDays, employeeId]
        );
      }
    }

    await query(
      `UPDATE leave_requests SET status = 'cancelled' WHERE id = $1`,
      [leaveId]
    );

    const updated = await this.getById(companyId, leaveId);
    return updated!;
  },
};
