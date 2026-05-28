// ============================================================
// PAYROLL SERVICE — Real payroll calculation engine
// AttendX Enterprise SaaS Platform
// ============================================================

import { query } from '../lib/database';
import { generateUUID } from '../lib/crypto';
import type { PayrollRecord } from '../types';

const mapPayroll = (row: Record<string, unknown>): PayrollRecord => ({
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
    salary: Number(row.emp_salary),
    currency: row.emp_currency as string || 'USD',
    hireDate: '',
    isActive: true,
    annualLeaveBalance: 0,
    sickLeaveBalance: 0,
    personalLeaveBalance: 0,
    createdAt: '',
    updatedAt: '',
    department: row.dept_name ? { id: '', name: row.dept_name as string, code: '', companyId: '', createdAt: '' } : undefined,
  } : undefined,
  period: row.period as string,
  periodStart: row.period_start as string,
  periodEnd: row.period_end as string,
  baseSalary: Number(row.base_salary),
  overtimePay: Number(row.overtime_pay),
  deductions: Number(row.deductions),
  bonuses: Number(row.bonuses),
  grossPay: Number(row.gross_pay),
  taxAmount: Number(row.tax_amount),
  netPay: Number(row.net_pay),
  currency: row.currency as string,
  status: row.status as PayrollRecord['status'],
  paidAt: row.paid_at as string,
  workingDays: Number(row.working_days),
  presentDays: Number(row.present_days),
  absentDays: Number(row.absent_days),
  leaveDays: Number(row.leave_days),
  overtimeHours: Number(row.overtime_hours),
  createdAt: row.created_at as string,
});

export const payrollService = {
  async list(companyId: string, filters: { period?: string; status?: string; employeeId?: string; page?: number; limit?: number } = {}): Promise<{ data: PayrollRecord[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const offset = (page - 1) * limit;

    let where = 'WHERE pr.company_id = $1';
    const params: unknown[] = [companyId];
    let idx = 2;

    if (filters.period) {
      where += ` AND pr.period = $${idx++}`;
      params.push(filters.period);
    }
    if (filters.status) {
      where += ` AND pr.status = $${idx++}`;
      params.push(filters.status);
    }
    if (filters.employeeId) {
      where += ` AND pr.employee_id = $${idx++}`;
      params.push(filters.employeeId);
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM payroll_records pr ${where}`,
      params
    );

    const result = await query(
      `SELECT pr.*, e.id as emp_id, e.employee_code as emp_code, e.first_name as emp_first,
              e.last_name as emp_last, e.email as emp_email, e.job_title as emp_title,
              e.salary as emp_salary, e.currency as emp_currency, d.name as dept_name
       FROM payroll_records pr
       JOIN employees e ON e.id = pr.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       ${where}
       ORDER BY pr.period DESC, e.last_name
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const total = parseInt(countResult.rows[0]?.count || '0');
    return {
      data: result.rows.map(r => mapPayroll(r as Record<string, unknown>)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async processMonthlyPayroll(companyId: string, year: number, month: number): Promise<{ processed: number; errors: number }> {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const periodStart = `${period}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const periodEnd = `${period}-${lastDay}`;

    // Get all active employees
    const employees = await query<{
      id: string; salary: number; currency: string;
    }>(
      'SELECT id, salary, currency FROM employees WHERE company_id = $1 AND is_active = true',
      [companyId]
    );

    let processed = 0;
    let errors = 0;
    const TAX_RATE = 0.25;
    const OVERTIME_MULTIPLIER = 1.5;
    const HOURLY_RATE_DIVISOR = 160; // Standard monthly working hours

    for (const emp of employees.rows) {
      try {
        // Get attendance for period
        const attendanceResult = await query<{
          status: string; overtime_hours: string; total_hours: string;
        }>(
          `SELECT status, overtime_hours, total_hours FROM attendance_records
           WHERE company_id = $1 AND employee_id = $2 AND date BETWEEN $3 AND $4`,
          [companyId, emp.id, periodStart, periodEnd]
        );

        const records = attendanceResult.rows;
        const presentDays = records.filter(r => ['present', 'late'].includes(r.status)).length;
        const absentDays = records.filter(r => r.status === 'absent').length;
        const leaveDays = records.filter(r => r.status === 'on_leave').length;
        const overtimeHours = records.reduce((sum, r) => sum + parseFloat(r.overtime_hours || '0'), 0);

        const monthlySalary = Number(emp.salary) / 12;
        const hourlyRate = monthlySalary / HOURLY_RATE_DIVISOR;
        const overtimePay = overtimeHours * hourlyRate * OVERTIME_MULTIPLIER;
        const absentDeductions = absentDays > 0 ? (monthlySalary / 22) * absentDays : 0;
        const grossPay = monthlySalary + overtimePay - absentDeductions;
        const taxAmount = grossPay * TAX_RATE;
        const netPay = grossPay - taxAmount;

        await query(
          `INSERT INTO payroll_records (id, company_id, employee_id, period, period_start, period_end,
           base_salary, overtime_pay, deductions, bonuses, gross_pay, tax_amount, net_pay, currency,
           status, working_days, present_days, absent_days, leave_days, overtime_hours)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11,$12,$13,'draft',22,$14,$15,$16,$17)
           ON CONFLICT (company_id, employee_id, period) DO UPDATE SET
           base_salary = EXCLUDED.base_salary, overtime_pay = EXCLUDED.overtime_pay,
           deductions = EXCLUDED.deductions, gross_pay = EXCLUDED.gross_pay,
           tax_amount = EXCLUDED.tax_amount, net_pay = EXCLUDED.net_pay,
           present_days = EXCLUDED.present_days, absent_days = EXCLUDED.absent_days,
           overtime_hours = EXCLUDED.overtime_hours`,
          [
            generateUUID(), companyId, emp.id, period, periodStart, periodEnd,
            monthlySalary.toFixed(2), overtimePay.toFixed(2), absentDeductions.toFixed(2),
            grossPay.toFixed(2), taxAmount.toFixed(2), netPay.toFixed(2), emp.currency || 'USD',
            presentDays, absentDays, leaveDays, overtimeHours.toFixed(2),
          ]
        );
        processed++;
      } catch (err) {
        console.error(`Payroll error for employee ${emp.id}:`, err);
        errors++;
      }
    }

    return { processed, errors };
  },

  async markAsPaid(companyId: string, payrollIds: string[]): Promise<void> {
    for (const id of payrollIds) {
      await query(
        `UPDATE payroll_records SET status = 'paid', paid_at = NOW() WHERE id = $1 AND company_id = $2`,
        [id, companyId]
      );
    }
  },

  async getSummary(companyId: string): Promise<{
    currentMonthTotal: number;
    previousMonthTotal: number;
    pendingPayments: number;
    ytdTotal: number;
    avgSalary: number;
  }> {
    const [current, previous, pending, ytd, avg] = await Promise.all([
      query<{ total: string }>(
        `SELECT COALESCE(SUM(net_pay), 0) as total FROM payroll_records
         WHERE company_id = $1 AND DATE_TRUNC('month', period_start) = DATE_TRUNC('month', NOW())`,
        [companyId]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(net_pay), 0) as total FROM payroll_records
         WHERE company_id = $1 AND DATE_TRUNC('month', period_start) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')`,
        [companyId]
      ),
      query<{ total: string; count: string }>(
        `SELECT COALESCE(SUM(net_pay), 0) as total, COUNT(*) as count FROM payroll_records
         WHERE company_id = $1 AND status = 'draft'`,
        [companyId]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(net_pay), 0) as total FROM payroll_records
         WHERE company_id = $1 AND DATE_TRUNC('year', period_start) = DATE_TRUNC('year', NOW())`,
        [companyId]
      ),
      query<{ avg: string }>(
        `SELECT COALESCE(AVG(salary), 0) as avg FROM employees WHERE company_id = $1 AND is_active = true`,
        [companyId]
      ),
    ]);

    return {
      currentMonthTotal: parseFloat(current.rows[0]?.total || '0'),
      previousMonthTotal: parseFloat(previous.rows[0]?.total || '0'),
      pendingPayments: parseFloat(pending.rows[0]?.total || '0'),
      ytdTotal: parseFloat(ytd.rows[0]?.total || '0'),
      avgSalary: parseFloat(avg.rows[0]?.avg || '0'),
    };
  },
};
