import { format, parseISO, formatDistanceToNow } from 'date-fns';

export function formatTime(iso?: string): string {
  if (!iso) return '--:--';
  return format(parseISO(iso), 'HH:mm');
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return format(parseISO(iso), 'dd MMM yyyy, HH:mm');
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  return format(parseISO(iso), 'dd MMM yyyy');
}

export function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDuration(startIso: string, endIso?: string): string {
  const start = parseISO(startIso);
  const end = endIso ? parseISO(endIso) : new Date();
  const diff = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
  return formatMinutes(diff);
}

export function fromNow(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

export const STATUS_COLORS: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  absent: 'bg-red-100 text-red-700 border-red-200',
  late: 'bg-amber-100 text-amber-700 border-amber-200',
  half_day: 'bg-orange-100 text-orange-700 border-orange-200',
  on_leave: 'bg-blue-100 text-blue-700 border-blue-200',
  holiday: 'bg-purple-100 text-purple-700 border-purple-200',
  remote: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  on_leave_emp: 'bg-blue-100 text-blue-700 border-blue-200',
  terminated: 'bg-red-100 text-red-700 border-red-200',
};

export const STATUS_LABELS: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half Day',
  on_leave: 'On Leave',
  holiday: 'Holiday',
  remote: 'Remote',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  annual: 'Annual',
  sick: 'Sick',
  emergency: 'Emergency',
  maternity: 'Maternity',
  paternity: 'Paternity',
  unpaid: 'Unpaid',
};
