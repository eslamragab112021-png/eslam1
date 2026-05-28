// ============================================================
// EMPLOYEE SERVICE — Real CRUD with PostgreSQL
// AttendX Enterprise SaaS Platform
// ============================================================

import { query } from '../lib/database';
import { generateUUID } from '../lib/crypto';
import type { Employee, PaginatedResponse } from '../types';

export interface EmployeeFilters {
  search?: string;
  departmentId?: string;
  status?: 'active' | 'inactive';
  employmentType?: string;
  page?: number;
  limit?: number;
}

export interface CreateEmployeePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: string;
  city?: string;
  country?: string;
  departmentId?: string;
  shiftId?: string;
  jobTitle: string;
  employmentType: string;
  salary: number;
  currency?: string;
  hireDate: string;
  managerId?: string;
  annualLeaveBalance?: number;
  sickLeaveBalance?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

const mapEmployee = (row: Record<string, unknown>): Employee => ({
  id: row.id as string,
  companyId: row.company_id as string,
  userId: row.user_id as string,
  employeeCode: row.employee_code as string,
  firstName: row.first_name as string,
  lastName: row.last_name as string,
  email: row.email as string,
  phone: row.phone as string,
  avatar: row.avatar_url as string,
  gender: row.gender as Employee['gender'],
  dateOfBirth: row.date_of_birth as string,
  nationality: row.nationality as string,
  address: row.address as string,
  city: row.city as string,
  country: row.country as string,
  departmentId: row.department_id as string,
  department: row.dept_id ? {
    id: row.dept_id as string,
    name: row.dept_name as string,
    code: row.dept_code as string,
    companyId: row.company_id as string,
    createdAt: '',
  } : undefined,
  shiftId: row.shift_id as string,
  shift: row.shift_id ? {
    id: row.shift_id as string,
    name: row.shift_name as string,
    type: row.shift_type as Employee['shift'] extends { type: infer T } ? T : never,
    startTime: row.shift_start as string,
    endTime: row.shift_end as string,
    breakDuration: row.shift_break as number,
    workingDays: row.shift_days as number[],
    gracePeriodMinutes: 15,
    overtimeStartMinutes: 30,
    companyId: row.company_id as string,
    isActive: true,
    createdAt: '',
  } : undefined,
  jobTitle: row.job_title as string,
  employmentType: row.employment_type as Employee['employmentType'],
  salary: Number(row.salary),
  currency: row.currency as string,
  hireDate: row.hire_date as string,
  terminationDate: row.termination_date as string,
  managerId: row.manager_id as string,
  isActive: row.is_active as boolean,
  annualLeaveBalance: Number(row.annual_leave_balance),
  sickLeaveBalance: Number(row.sick_leave_balance),
  personalLeaveBalance: Number(row.personal_leave_balance),
  emergencyContactName: row.emergency_contact_name as string,
  emergencyContactPhone: row.emergency_contact_phone as string,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

export const employeeService = {
  async list(companyId: string, filters: EmployeeFilters = {}): Promise<PaginatedResponse<Employee>> {
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE e.company_id = $1';
    const params: unknown[] = [companyId];
    let paramIdx = 2;

    if (filters.search) {
      whereClause += ` AND (
        LOWER(e.first_name) LIKE LOWER($${paramIdx}) OR 
        LOWER(e.last_name) LIKE LOWER($${paramIdx}) OR 
        LOWER(e.email) LIKE LOWER($${paramIdx}) OR 
        LOWER(e.employee_code) LIKE LOWER($${paramIdx}) OR
        LOWER(e.job_title) LIKE LOWER($${paramIdx})
      )`;
      params.push(`%${filters.search}%`);
      paramIdx++;
    }

    if (filters.departmentId) {
      whereClause += ` AND e.department_id = $${paramIdx}`;
      params.push(filters.departmentId);
      paramIdx++;
    }

    if (filters.status) {
      whereClause += ` AND e.is_active = $${paramIdx}`;
      params.push(filters.status === 'active');
      paramIdx++;
    }

    if (filters.employmentType) {
      whereClause += ` AND e.employment_type = $${paramIdx}`;
      params.push(filters.employmentType);
      paramIdx++;
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM employees e ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0');

    const result = await query(
      `SELECT e.*, 
              d.id as dept_id, d.name as dept_name, d.code as dept_code,
              s.name as shift_name, s.type as shift_type, s.start_time as shift_start, 
              s.end_time as shift_end, s.break_duration as shift_break, s.working_days as shift_days
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN shifts s ON s.id = e.shift_id
       ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    return {
      data: result.rows.map(mapEmployee),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(companyId: string, employeeId: string): Promise<Employee | null> {
    const result = await query(
      `SELECT e.*, 
              d.id as dept_id, d.name as dept_name, d.code as dept_code,
              s.name as shift_name, s.type as shift_type, s.start_time as shift_start, 
              s.end_time as shift_end, s.break_duration as shift_break, s.working_days as shift_days
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN shifts s ON s.id = e.shift_id
       WHERE e.id = $1 AND e.company_id = $2`,
      [employeeId, companyId]
    );

    if (result.rowCount === 0) return null;
    return mapEmployee(result.rows[0] as Record<string, unknown>);
  },

  async create(companyId: string, data: CreateEmployeePayload): Promise<Employee> {
    // Generate employee code
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM employees WHERE company_id = $1',
      [companyId]
    );
    const count = parseInt(countResult.rows[0]?.count || '0') + 1;
    const employeeCode = `EMP-${String(count).padStart(3, '0')}`;

    const id = generateUUID();
    await query(
      `INSERT INTO employees (id, company_id, employee_code, first_name, last_name, email, phone, gender, date_of_birth,
        nationality, address, city, country, department_id, shift_id, job_title, employment_type, salary, currency,
        hire_date, manager_id, annual_leave_balance, sick_leave_balance, personal_leave_balance, 
        emergency_contact_name, emergency_contact_phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`,
      [
        id, companyId, employeeCode, data.firstName, data.lastName, data.email,
        data.phone || null, data.gender, data.dateOfBirth || null,
        data.nationality || null, data.address || null, data.city || null, data.country || null,
        data.departmentId || null, data.shiftId || null, data.jobTitle, data.employmentType,
        data.salary, data.currency || 'USD', data.hireDate, data.managerId || null,
        data.annualLeaveBalance ?? 21, data.sickLeaveBalance ?? 10, 5,
        data.emergencyContactName || null, data.emergencyContactPhone || null,
      ]
    );

    // Update company employee count
    await query(
      'UPDATE companies SET employee_count = employee_count + 1 WHERE id = $1',
      [companyId]
    );

    const emp = await this.getById(companyId, id);
    if (!emp) throw new Error('Failed to create employee');
    return emp;
  },

  async update(companyId: string, employeeId: string, data: Partial<CreateEmployeePayload>): Promise<Employee> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      firstName: 'first_name', lastName: 'last_name', email: 'email',
      phone: 'phone', gender: 'gender', dateOfBirth: 'date_of_birth',
      nationality: 'nationality', address: 'address', city: 'city', country: 'country',
      departmentId: 'department_id', shiftId: 'shift_id', jobTitle: 'job_title',
      employmentType: 'employment_type', salary: 'salary', currency: 'currency',
      hireDate: 'hire_date', managerId: 'manager_id',
      annualLeaveBalance: 'annual_leave_balance', sickLeaveBalance: 'sick_leave_balance',
      emergencyContactName: 'emergency_contact_name', emergencyContactPhone: 'emergency_contact_phone',
    };

    for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
      if (data[jsKey as keyof CreateEmployeePayload] !== undefined) {
        fields.push(`${dbKey} = $${idx}`);
        params.push(data[jsKey as keyof CreateEmployeePayload]);
        idx++;
      }
    }

    if (fields.length === 0) throw new Error('No fields to update');

    params.push(employeeId, companyId);
    await query(
      `UPDATE employees SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`,
      params
    );

    const emp = await this.getById(companyId, employeeId);
    if (!emp) throw new Error('Employee not found');
    return emp;
  },

  async deactivate(companyId: string, employeeId: string): Promise<void> {
    await query(
      'UPDATE employees SET is_active = false, termination_date = CURRENT_DATE WHERE id = $1 AND company_id = $2',
      [employeeId, companyId]
    );
    await query(
      'UPDATE companies SET employee_count = GREATEST(0, employee_count - 1) WHERE id = $1',
      [companyId]
    );
  },

  async getStats(companyId: string): Promise<{
    total: number; active: number; inactive: number;
    byDepartment: Array<{ name: string; count: number }>;
    byEmploymentType: Array<{ type: string; count: number }>;
    newThisMonth: number;
  }> {
    const [totalResult, deptResult, typeResult, newResult] = await Promise.all([
      query<{ total: string; active: string; inactive: string }>(
        `SELECT COUNT(*) as total, 
         SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active,
         SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END) as inactive
         FROM employees WHERE company_id = $1`,
        [companyId]
      ),
      query<{ name: string; count: string }>(
        `SELECT d.name, COUNT(e.id) as count 
         FROM employees e JOIN departments d ON d.id = e.department_id
         WHERE e.company_id = $1 AND e.is_active = true
         GROUP BY d.name ORDER BY count DESC`,
        [companyId]
      ),
      query<{ employment_type: string; count: string }>(
        `SELECT employment_type, COUNT(*) as count FROM employees WHERE company_id = $1 AND is_active = true GROUP BY employment_type`,
        [companyId]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) as count FROM employees WHERE company_id = $1 AND DATE_TRUNC('month', hire_date) = DATE_TRUNC('month', NOW())`,
        [companyId]
      ),
    ]);

    const totals = totalResult.rows[0];
    return {
      total: parseInt(totals?.total || '0'),
      active: parseInt(totals?.active || '0'),
      inactive: parseInt(totals?.inactive || '0'),
      byDepartment: deptResult.rows.map(r => ({ name: r.name, count: parseInt(r.count) })),
      byEmploymentType: typeResult.rows.map(r => ({ type: r.employment_type, count: parseInt(r.count) })),
      newThisMonth: parseInt(newResult.rows[0]?.count || '0'),
    };
  },
};
