// ============================================================
// LEAVE MANAGEMENT ENGINE
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import { parseISO, isWeekend, eachDayOfInterval } from 'date-fns';
import { dbPut, dbGet, dbGetByIndex } from '../db/database';
import type { LeaveRequest, Employee } from '../db/schema';

export function countWorkingDays(startDate: string, endDate: string): number {
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
  return days.filter((d) => !isWeekend(d)).length;
}

export async function applyForLeave(
  employeeId: string,
  type: LeaveRequest['type'],
  startDate: string,
  endDate: string,
  reason: string
): Promise<LeaveRequest> {
  const employee = await dbGet<Employee>('employees', employeeId);
  if (!employee) throw new Error('Employee not found');

  const totalDays = countWorkingDays(startDate, endDate);
  if (totalDays === 0) throw new Error('No working days in selected range');

  // Balance check
  if (type === 'annual' && employee.annualLeaveBalance < totalDays) {
    throw new Error(`Insufficient annual leave balance. Available: ${employee.annualLeaveBalance} days`);
  }
  if (type === 'sick' && employee.sickLeaveBalance < totalDays) {
    throw new Error(`Insufficient sick leave balance. Available: ${employee.sickLeaveBalance} days`);
  }
  if (type === 'emergency' && employee.emergencyLeaveBalance < totalDays) {
    throw new Error(`Insufficient emergency leave balance. Available: ${employee.emergencyLeaveBalance} days`);
  }

  // Check overlapping leave
  const existing = await dbGetByIndex<LeaveRequest>('leave_requests', 'by_employee', employeeId);
  const overlap = existing.find(
    (lr) =>
      lr.status === 'approved' &&
      lr.startDate <= endDate &&
      lr.endDate >= startDate
  );
  if (overlap) throw new Error('Leave dates overlap with an existing approved leave');

  const request: LeaveRequest = {
    id: uuidv4(),
    employeeId,
    type,
    startDate,
    endDate,
    totalDays,
    reason,
    status: 'pending',
    appliedAt: new Date().toISOString(),
  };

  await dbPut('leave_requests', request);
  return request;
}

export async function approveLeave(
  requestId: string,
  reviewerId: string,
  notes?: string
): Promise<LeaveRequest> {
  const request = await dbGet<LeaveRequest>('leave_requests', requestId);
  if (!request) throw new Error('Leave request not found');
  if (request.status !== 'pending') throw new Error('Only pending requests can be approved');

  const employee = await dbGet<Employee>('employees', request.employeeId);
  if (!employee) throw new Error('Employee not found');

  // Deduct balance
  const updated_employee: Employee = { ...employee };
  if (request.type === 'annual') updated_employee.annualLeaveBalance -= request.totalDays;
  if (request.type === 'sick') updated_employee.sickLeaveBalance -= request.totalDays;
  if (request.type === 'emergency') updated_employee.emergencyLeaveBalance -= request.totalDays;
  updated_employee.updatedAt = new Date().toISOString();
  await dbPut('employees', updated_employee);

  const updatedRequest: LeaveRequest = {
    ...request,
    status: 'approved',
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString(),
    reviewNotes: notes,
  };
  await dbPut('leave_requests', updatedRequest);
  return updatedRequest;
}

export async function rejectLeave(
  requestId: string,
  reviewerId: string,
  notes: string
): Promise<LeaveRequest> {
  const request = await dbGet<LeaveRequest>('leave_requests', requestId);
  if (!request) throw new Error('Leave request not found');
  if (request.status !== 'pending') throw new Error('Only pending requests can be rejected');

  const updatedRequest: LeaveRequest = {
    ...request,
    status: 'rejected',
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString(),
    reviewNotes: notes,
  };
  await dbPut('leave_requests', updatedRequest);
  return updatedRequest;
}

export async function getEmployeeLeaveHistory(employeeId: string): Promise<LeaveRequest[]> {
  const requests = await dbGetByIndex<LeaveRequest>('leave_requests', 'by_employee', employeeId);
  return requests.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
}

export async function getPendingLeaves(): Promise<LeaveRequest[]> {
  const requests = await dbGetByIndex<LeaveRequest>('leave_requests', 'by_status', 'pending');
  return requests.sort((a, b) => a.appliedAt.localeCompare(b.appliedAt));
}
