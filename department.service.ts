// ============================================================
// DEPARTMENT & SHIFT SERVICES
// AttendX Enterprise SaaS Platform
// ============================================================

import { query } from '../lib/database';
import { generateUUID } from '../lib/crypto';
import type { Department, Shift, Notification } from '../types';

export const departmentService = {
  async list(companyId: string): Promise<Department[]> {
    const result = await query(
      `SELECT d.*, e.first_name as mgr_first, e.last_name as mgr_last,
              COUNT(emp.id) as employee_count
       FROM departments d
       LEFT JOIN employees e ON e.id = d.manager_id
       LEFT JOIN employees emp ON emp.department_id = d.id AND emp.is_active = true
       WHERE d.company_id = $1 AND d.is_active = true
       GROUP BY d.id, e.first_name, e.last_name
       ORDER BY d.name`,
      [companyId]
    );

    return result.rows.map(r => ({
      id: r.id as string,
      companyId: r.company_id as string,
      name: r.name as string,
      code: r.code as string,
      description: r.description as string,
      managerId: r.manager_id as string,
      employeeCount: parseInt(r.employee_count as string),
      createdAt: r.created_at as string,
    }));
  },

  async create(companyId: string, data: { name: string; code: string; description?: string; managerId?: string }): Promise<Department> {
    const id = generateUUID();
    await query(
      `INSERT INTO departments (id, company_id, name, code, description, manager_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, companyId, data.name, data.code.toUpperCase(), data.description || null, data.managerId || null]
    );
    const result = await query(
      'SELECT *, 0 as employee_count FROM departments WHERE id = $1',
      [id]
    );
    const r = result.rows[0] as Record<string, unknown>;
    return {
      id: r.id as string, companyId: r.company_id as string, name: r.name as string,
      code: r.code as string, description: r.description as string, createdAt: r.created_at as string,
      employeeCount: 0,
    };
  },

  async update(companyId: string, deptId: string, data: { name?: string; description?: string; managerId?: string }): Promise<void> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.name) { fields.push(`name = $${idx++}`); params.push(data.name); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); params.push(data.description); }
    if (data.managerId !== undefined) { fields.push(`manager_id = $${idx++}`); params.push(data.managerId || null); }

    if (fields.length === 0) return;
    params.push(deptId, companyId);
    await query(
      `UPDATE departments SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`,
      params
    );
  },

  async delete(companyId: string, deptId: string): Promise<void> {
    await query(
      'UPDATE departments SET is_active = false WHERE id = $1 AND company_id = $2',
      [deptId, companyId]
    );
  },
};

export const shiftService = {
  async list(companyId: string): Promise<Shift[]> {
    const result = await query(
      'SELECT * FROM shifts WHERE company_id = $1 AND is_active = true ORDER BY name',
      [companyId]
    );

    return result.rows.map(r => ({
      id: r.id as string,
      companyId: r.company_id as string,
      name: r.name as string,
      type: r.type as Shift['type'],
      startTime: r.start_time as string,
      endTime: r.end_time as string,
      breakDuration: Number(r.break_duration),
      workingDays: r.working_days as number[],
      gracePeriodMinutes: Number(r.grace_period_minutes),
      overtimeStartMinutes: Number(r.overtime_start_minutes),
      isActive: r.is_active as boolean,
      createdAt: r.created_at as string,
    }));
  },

  async create(companyId: string, data: {
    name: string; type: string; startTime: string; endTime: string;
    breakDuration?: number; workingDays?: number[]; gracePeriodMinutes?: number;
  }): Promise<Shift> {
    const id = generateUUID();
    await query(
      `INSERT INTO shifts (id, company_id, name, type, start_time, end_time, break_duration, working_days, grace_period_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, companyId, data.name, data.type, data.startTime, data.endTime,
       data.breakDuration || 60, data.workingDays || [1, 2, 3, 4, 5], data.gracePeriodMinutes || 15]
    );
    const result = await query('SELECT * FROM shifts WHERE id = $1', [id]);
    const r = result.rows[0] as Record<string, unknown>;
    return {
      id: r.id as string, companyId: r.company_id as string, name: r.name as string,
      type: r.type as Shift['type'], startTime: r.start_time as string, endTime: r.end_time as string,
      breakDuration: Number(r.break_duration), workingDays: r.working_days as number[],
      gracePeriodMinutes: Number(r.grace_period_minutes), overtimeStartMinutes: 30,
      isActive: true, createdAt: r.created_at as string,
    };
  },
};

export const notificationService = {
  async list(userId: string, companyId: string): Promise<Notification[]> {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 AND company_id = $2 ORDER BY created_at DESC LIMIT 50',
      [userId, companyId]
    );

    return result.rows.map(r => ({
      id: r.id as string,
      userId: r.user_id as string,
      companyId: r.company_id as string,
      title: r.title as string,
      message: r.message as string,
      type: r.type as Notification['type'],
      isRead: r.is_read as boolean,
      actionUrl: r.action_url as string,
      createdAt: r.created_at as string,
    }));
  },

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  },

  async markAllAsRead(userId: string, companyId: string): Promise<void> {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND company_id = $2',
      [userId, companyId]
    );
  },

  async getUnreadCount(userId: string, companyId: string): Promise<number> {
    const result = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND company_id = $2 AND is_read = false',
      [userId, companyId]
    );
    return parseInt(result.rows[0]?.count || '0');
  },
};

export const auditService = {
  async log(data: {
    companyId?: string; userId?: string; action: string; resource: string;
    resourceId?: string; oldValues?: unknown; newValues?: unknown; ipAddress?: string;
  }): Promise<void> {
    await query(
      `INSERT INTO audit_logs (company_id, user_id, action, resource, resource_id, old_values, new_values)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [data.companyId || null, data.userId || null, data.action, data.resource,
       data.resourceId || null,
       data.oldValues ? JSON.stringify(data.oldValues) : null,
       data.newValues ? JSON.stringify(data.newValues) : null]
    );
  },

  async list(companyId: string, limit = 100): Promise<AuditLog[]> {
    const result = await query(
      `SELECT al.*, u.first_name, u.last_name, u.email as user_email
       FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
       WHERE al.company_id = $1 ORDER BY al.created_at DESC LIMIT $2`,
      [companyId, limit]
    );

    return result.rows.map(r => ({
      id: r.id as string,
      companyId: r.company_id as string,
      userId: r.user_id as string,
      user: r.first_name ? { firstName: r.first_name as string, lastName: r.last_name as string, email: r.user_email as string } : undefined,
      action: r.action as string,
      resource: r.resource as string,
      resourceId: r.resource_id as string,
      oldValues: r.old_values as Record<string, unknown>,
      newValues: r.new_values as Record<string, unknown>,
      ipAddress: r.ip_address as string,
      userAgent: r.user_agent as string,
      createdAt: r.created_at as string,
    }));
  },
};

interface AuditLog {
  id: string; companyId: string; userId: string;
  user?: { firstName?: string; lastName?: string; email?: string };
  action: string; resource: string; resourceId?: string;
  oldValues?: Record<string, unknown>; newValues?: Record<string, unknown>;
  ipAddress?: string; userAgent?: string; createdAt: string;
}
