// ============================================================
// SHIFT MANAGEMENT ENGINE
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import { dbPut, dbGet, dbGetAll, dbGetByIndex, dbDelete } from '../db/database';
import type { Shift, ShiftAssignment, Employee } from '../db/schema';

export async function createShift(data: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>): Promise<Shift> {
  const shift: Shift = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await dbPut('shifts', shift);
  return shift;
}

export async function updateShift(id: string, data: Partial<Shift>): Promise<Shift> {
  const existing = await dbGet<Shift>('shifts', id);
  if (!existing) throw new Error('Shift not found');
  const updated: Shift = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
  await dbPut('shifts', updated);
  return updated;
}

export async function deleteShift(id: string): Promise<void> {
  await dbDelete('shifts', id);
}

export async function getAllShifts(): Promise<Shift[]> {
  return dbGetAll<Shift>('shifts');
}

export async function assignShift(
  employeeId: string,
  shiftId: string,
  startDate: string,
  endDate?: string
): Promise<ShiftAssignment> {
  // End previous assignments
  const existing = await dbGetByIndex<ShiftAssignment>('shift_assignments', 'by_employee', employeeId);
  for (const sa of existing) {
    if (!sa.endDate) {
      await dbPut('shift_assignments', { ...sa, endDate: startDate });
    }
  }

  // Update employee record
  const employee = await dbGet<Employee>('employees', employeeId);
  if (employee) {
    await dbPut('employees', { ...employee, shiftId, updatedAt: new Date().toISOString() });
  }

  const assignment: ShiftAssignment = {
    id: uuidv4(),
    employeeId,
    shiftId,
    startDate,
    endDate,
    createdAt: new Date().toISOString(),
  };
  await dbPut('shift_assignments', assignment);
  return assignment;
}

export async function getEmployeeShift(employeeId: string): Promise<Shift | undefined> {
  const employee = await dbGet<Employee>('employees', employeeId);
  if (!employee?.shiftId) return undefined;
  return dbGet<Shift>('shifts', employee.shiftId);
}

export function formatShiftTime(shift: Shift): string {
  return `${shift.startTime} – ${shift.endTime}${shift.isOvernightShift ? ' (+1)' : ''}`;
}

export function getShiftDayNames(shift: Shift): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return shift.workingDays.map((d) => names[d]).join(', ');
}
