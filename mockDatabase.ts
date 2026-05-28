// ============================================================
// ATTENDIQ — MOCK DATABASE (simulates real backend/DB calls)
// In production this would be replaced by actual API calls
// to your backend (Node/Express, Supabase, PlanetScale, etc.)
// ============================================================

import type {
  Company, User, Department, Subscription, Invoice,
  BillingHistory, AttendanceRecord, Notification, TenantSettings,
  RevenueAnalytics, UsageAnalytics, OnboardingState
} from '../types';
import { subDays, format } from 'date-fns';

// ─── TENANT SETTINGS ──────────────────────────────────────────
export const TENANT_SETTINGS: Record<string, TenantSettings> = {
  'company-acme': {
    companyId: 'company-acme',
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    lateThresholdMinutes: 15,
    overtimeThresholdMinutes: 30,
    allowRemoteWork: true,
    requireLocationCheckin: false,
    notifyOnLate: true,
    notifyOnAbsent: true,
    notifyOnOvertime: true,
    customBranding: true,
    primaryColor: '#6366f1',
    accentColor: '#f59e0b',
    twoFactorRequired: false,
    sessionTimeoutMinutes: 480,
  },
  'company-techcorp': {
    companyId: 'company-techcorp',
    workingHoursStart: '08:30',
    workingHoursEnd: '17:30',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    lateThresholdMinutes: 10,
    overtimeThresholdMinutes: 60,
    allowRemoteWork: true,
    requireLocationCheckin: true,
    notifyOnLate: true,
    notifyOnAbsent: true,
    notifyOnOvertime: false,
    customBranding: true,
    primaryColor: '#0ea5e9',
    accentColor: '#10b981',
    twoFactorRequired: true,
    sessionTimeoutMinutes: 240,
  },
};

// ─── COMPANIES ────────────────────────────────────────────────
export const COMPANIES: Company[] = [
  {
    id: 'company-acme',
    name: 'Acme Corporation',
    slug: 'acme',
    domain: 'acme.com',
    logo: '🏢',
    industry: 'Technology',
    size: '51-200',
    country: 'United States',
    timezone: 'America/New_York',
    currency: 'USD',
    address: '123 Business Ave, New York, NY 10001',
    phone: '+1 (212) 555-0100',
    email: 'admin@acme.com',
    website: 'https://acme.com',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
    isActive: true,
    stripeCustomerId: 'cus_acme_12345',
    settings: TENANT_SETTINGS['company-acme'],
  },
  {
    id: 'company-techcorp',
    name: 'TechCorp Solutions',
    slug: 'techcorp',
    domain: 'techcorp.io',
    logo: '⚡',
    industry: 'Software',
    size: '201-500',
    country: 'United Kingdom',
    timezone: 'Europe/London',
    currency: 'GBP',
    address: '45 Tech Street, London, EC2A 4BX',
    phone: '+44 20 7946 0958',
    email: 'admin@techcorp.io',
    website: 'https://techcorp.io',
    createdAt: '2024-03-20T09:00:00Z',
    updatedAt: '2025-06-10T14:30:00Z',
    isActive: true,
    stripeCustomerId: 'cus_techcorp_67890',
    settings: TENANT_SETTINGS['company-techcorp'],
  },
  {
    id: 'company-startup',
    name: 'Startup Hub',
    slug: 'startup',
    domain: 'startuphub.co',
    logo: '🚀',
    industry: 'Consulting',
    size: '1-10',
    country: 'Canada',
    timezone: 'America/Toronto',
    currency: 'CAD',
    address: '789 Innovation Dr, Toronto, ON M5V 2H1',
    phone: '+1 (416) 555-0199',
    email: 'admin@startuphub.co',
    createdAt: '2025-02-10T11:00:00Z',
    updatedAt: '2025-06-15T09:00:00Z',
    isActive: true,
    stripeCustomerId: 'cus_startup_11111',
    settings: {
      companyId: 'company-startup',
      workingHoursStart: '10:00',
      workingHoursEnd: '19:00',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      lateThresholdMinutes: 30,
      overtimeThresholdMinutes: 60,
      allowRemoteWork: true,
      requireLocationCheckin: false,
      notifyOnLate: false,
      notifyOnAbsent: true,
      notifyOnOvertime: false,
      customBranding: false,
      primaryColor: '#6366f1',
      accentColor: '#f59e0b',
      twoFactorRequired: false,
      sessionTimeoutMinutes: 1440,
    },
  },
];

// ─── SUBSCRIPTIONS ────────────────────────────────────────────
export const SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-acme-001',
    companyId: 'company-acme',
    planId: 'enterprise',
    status: 'active',
    billingCycle: 'annual',
    currentPeriodStart: '2025-06-01T00:00:00Z',
    currentPeriodEnd: '2026-06-01T00:00:00Z',
    cancelAtPeriodEnd: false,
    stripeSubscriptionId: 'sub_acme_stripe_001',
    stripePriceId: 'price_enterprise_annual',
    quantity: 1,
    unitAmount: 99 * 12,
    currency: 'USD',
    metadata: { companyName: 'Acme Corporation' },
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'sub-techcorp-001',
    companyId: 'company-techcorp',
    planId: 'pro',
    status: 'active',
    billingCycle: 'monthly',
    currentPeriodStart: '2025-06-01T00:00:00Z',
    currentPeriodEnd: '2025-07-01T00:00:00Z',
    cancelAtPeriodEnd: false,
    stripeSubscriptionId: 'sub_techcorp_stripe_001',
    stripePriceId: 'price_pro_monthly',
    quantity: 1,
    unitAmount: 29,
    currency: 'USD',
    metadata: { companyName: 'TechCorp Solutions' },
    createdAt: '2024-03-20T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'sub-startup-001',
    companyId: 'company-startup',
    planId: 'free',
    status: 'active',
    billingCycle: 'monthly',
    currentPeriodStart: '2025-06-01T00:00:00Z',
    currentPeriodEnd: '2025-07-01T00:00:00Z',
    cancelAtPeriodEnd: false,
    stripeSubscriptionId: 'sub_startup_stripe_001',
    stripePriceId: 'price_free_monthly',
    quantity: 1,
    unitAmount: 0,
    currency: 'USD',
    metadata: { companyName: 'Startup Hub' },
    createdAt: '2025-02-10T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  },
];

// ─── INVOICES ─────────────────────────────────────────────────
export const INVOICES: Invoice[] = [
  {
    id: 'inv-001',
    companyId: 'company-acme',
    subscriptionId: 'sub-acme-001',
    stripeInvoiceId: 'in_acme_001',
    number: 'INV-2025-001',
    status: 'paid',
    amount: 1188,
    amountPaid: 1188,
    amountDue: 0,
    currency: 'USD',
    periodStart: '2025-06-01T00:00:00Z',
    periodEnd: '2026-06-01T00:00:00Z',
    dueDate: '2025-06-08T00:00:00Z',
    paidAt: '2025-06-01T10:23:00Z',
    items: [
      {
        id: 'li-001',
        description: 'Enterprise Plan — Annual (Jun 2025 – Jun 2026)',
        quantity: 1,
        unitAmount: 1188,
        amount: 1188,
        currency: 'USD',
        period: { start: '2025-06-01T00:00:00Z', end: '2026-06-01T00:00:00Z' },
      },
    ],
    paymentMethodType: 'card',
    last4: '4242',
    downloadUrl: '#',
    createdAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'inv-002',
    companyId: 'company-acme',
    subscriptionId: 'sub-acme-001',
    stripeInvoiceId: 'in_acme_002',
    number: 'INV-2024-012',
    status: 'paid',
    amount: 1188,
    amountPaid: 1188,
    amountDue: 0,
    currency: 'USD',
    periodStart: '2024-06-01T00:00:00Z',
    periodEnd: '2025-06-01T00:00:00Z',
    dueDate: '2024-06-08T00:00:00Z',
    paidAt: '2024-06-01T09:15:00Z',
    items: [
      {
        id: 'li-002',
        description: 'Enterprise Plan — Annual (Jun 2024 – Jun 2025)',
        quantity: 1,
        unitAmount: 1188,
        amount: 1188,
        currency: 'USD',
      },
    ],
    paymentMethodType: 'card',
    last4: '4242',
    downloadUrl: '#',
    createdAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'inv-003',
    companyId: 'company-techcorp',
    subscriptionId: 'sub-techcorp-001',
    stripeInvoiceId: 'in_techcorp_001',
    number: 'INV-2025-045',
    status: 'paid',
    amount: 29,
    amountPaid: 29,
    amountDue: 0,
    currency: 'USD',
    periodStart: '2025-06-01T00:00:00Z',
    periodEnd: '2025-07-01T00:00:00Z',
    dueDate: '2025-06-08T00:00:00Z',
    paidAt: '2025-06-01T12:00:00Z',
    items: [
      {
        id: 'li-003',
        description: 'Professional Plan — Monthly (Jun 2025)',
        quantity: 1,
        unitAmount: 29,
        amount: 29,
        currency: 'USD',
      },
    ],
    paymentMethodType: 'card',
    last4: '5555',
    downloadUrl: '#',
    createdAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'inv-004',
    companyId: 'company-techcorp',
    subscriptionId: 'sub-techcorp-001',
    stripeInvoiceId: 'in_techcorp_002',
    number: 'INV-2025-038',
    status: 'paid',
    amount: 29,
    amountPaid: 29,
    amountDue: 0,
    currency: 'USD',
    periodStart: '2025-05-01T00:00:00Z',
    periodEnd: '2025-06-01T00:00:00Z',
    dueDate: '2025-05-08T00:00:00Z',
    paidAt: '2025-05-01T11:30:00Z',
    items: [
      {
        id: 'li-004',
        description: 'Professional Plan — Monthly (May 2025)',
        quantity: 1,
        unitAmount: 29,
        amount: 29,
        currency: 'USD',
      },
    ],
    paymentMethodType: 'card',
    last4: '5555',
    downloadUrl: '#',
    createdAt: '2025-05-01T00:00:00Z',
  },
];

// ─── BILLING HISTORY ──────────────────────────────────────────
export const BILLING_HISTORY: BillingHistory[] = [
  {
    id: 'bh-001',
    companyId: 'company-acme',
    event: 'payment_succeeded',
    amount: 1188,
    currency: 'USD',
    description: 'Annual enterprise plan payment received',
    metadata: { invoiceId: 'inv-001', stripePaymentIntentId: 'pi_acme_001' },
    createdAt: '2025-06-01T10:23:00Z',
  },
  {
    id: 'bh-002',
    companyId: 'company-acme',
    event: 'plan_upgraded',
    amount: 1188,
    currency: 'USD',
    description: 'Plan upgraded from Professional to Enterprise',
    metadata: { fromPlan: 'pro', toPlan: 'enterprise' },
    createdAt: '2024-06-01T09:00:00Z',
  },
  {
    id: 'bh-003',
    companyId: 'company-techcorp',
    event: 'payment_succeeded',
    amount: 29,
    currency: 'USD',
    description: 'Monthly pro plan payment received',
    metadata: { invoiceId: 'inv-003' },
    createdAt: '2025-06-01T12:00:00Z',
  },
  {
    id: 'bh-004',
    companyId: 'company-techcorp',
    event: 'payment_failed',
    amount: 29,
    currency: 'USD',
    description: 'Payment failed — card declined (insufficient funds)',
    metadata: { failureCode: 'insufficient_funds', retryAt: '2025-05-04T12:00:00Z' },
    createdAt: '2025-05-01T08:00:00Z',
  },
];

// ─── USERS ─────────────────────────────────────────────────────
export const USERS: User[] = [
  // Super Admin
  {
    id: 'user-superadmin',
    companyId: 'system',
    email: 'admin@attendiq.com',
    firstName: 'Alex',
    lastName: 'Rivera',
    role: 'superadmin',
    avatar: '👑',
    phone: '+1 (800) 555-0000',
    employeeId: 'SA-001',
    jobTitle: 'Platform Administrator',
    hireDate: '2024-01-01',
    isActive: true,
    lastLoginAt: '2025-06-20T08:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    twoFactorEnabled: true,
    preferences: {
      emailNotifications: true,
      pushNotifications: true,
      weeklyReport: true,
      theme: 'light',
      language: 'en',
    },
  },
  // Acme Admin
  {
    id: 'user-acme-admin',
    companyId: 'company-acme',
    email: 'sarah@acme.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'company_admin',
    avatar: '👩‍💼',
    phone: '+1 (212) 555-0101',
    employeeId: 'ACM-001',
    jobTitle: 'HR Director',
    hireDate: '2024-01-15',
    isActive: true,
    lastLoginAt: '2025-06-20T09:15:00Z',
    createdAt: '2024-01-15T10:00:00Z',
    twoFactorEnabled: false,
    preferences: {
      emailNotifications: true,
      pushNotifications: true,
      weeklyReport: true,
      theme: 'light',
      language: 'en',
    },
  },
  // Acme employees
  {
    id: 'user-acme-emp1',
    companyId: 'company-acme',
    email: 'mike@acme.com',
    firstName: 'Mike',
    lastName: 'Chen',
    role: 'employee',
    departmentId: 'dept-acme-eng',
    avatar: '👨‍💻',
    phone: '+1 (212) 555-0102',
    employeeId: 'ACM-002',
    jobTitle: 'Senior Engineer',
    hireDate: '2024-02-01',
    isActive: true,
    createdAt: '2024-02-01T10:00:00Z',
    twoFactorEnabled: false,
    preferences: {
      emailNotifications: true,
      pushNotifications: false,
      weeklyReport: false,
      theme: 'dark',
      language: 'en',
    },
  },
  {
    id: 'user-acme-emp2',
    companyId: 'company-acme',
    email: 'emma@acme.com',
    firstName: 'Emma',
    lastName: 'Williams',
    role: 'hr_manager',
    departmentId: 'dept-acme-hr',
    avatar: '👩‍🎨',
    phone: '+1 (212) 555-0103',
    employeeId: 'ACM-003',
    jobTitle: 'HR Manager',
    hireDate: '2024-01-20',
    isActive: true,
    createdAt: '2024-01-20T10:00:00Z',
    twoFactorEnabled: true,
    preferences: {
      emailNotifications: true,
      pushNotifications: true,
      weeklyReport: true,
      theme: 'light',
      language: 'en',
    },
  },
  {
    id: 'user-acme-emp3',
    companyId: 'company-acme',
    email: 'james@acme.com',
    firstName: 'James',
    lastName: 'Martinez',
    role: 'employee',
    departmentId: 'dept-acme-sales',
    avatar: '🧑‍💼',
    phone: '+1 (212) 555-0104',
    employeeId: 'ACM-004',
    jobTitle: 'Sales Executive',
    hireDate: '2024-03-15',
    isActive: true,
    createdAt: '2024-03-15T10:00:00Z',
    twoFactorEnabled: false,
    preferences: {
      emailNotifications: false,
      pushNotifications: true,
      weeklyReport: false,
      theme: 'system',
      language: 'en',
    },
  },
  {
    id: 'user-acme-emp4',
    companyId: 'company-acme',
    email: 'lisa@acme.com',
    firstName: 'Lisa',
    lastName: 'Park',
    role: 'employee',
    departmentId: 'dept-acme-eng',
    avatar: '👩‍🔬',
    phone: '+1 (212) 555-0105',
    employeeId: 'ACM-005',
    jobTitle: 'Product Designer',
    hireDate: '2024-04-01',
    isActive: true,
    createdAt: '2024-04-01T10:00:00Z',
    twoFactorEnabled: false,
    preferences: {
      emailNotifications: true,
      pushNotifications: false,
      weeklyReport: true,
      theme: 'light',
      language: 'en',
    },
  },
  // TechCorp Admin
  {
    id: 'user-techcorp-admin',
    companyId: 'company-techcorp',
    email: 'david@techcorp.io',
    firstName: 'David',
    lastName: 'Thompson',
    role: 'company_admin',
    avatar: '👨‍💼',
    phone: '+44 20 7946 0959',
    employeeId: 'TC-001',
    jobTitle: 'Operations Manager',
    hireDate: '2024-03-20',
    isActive: true,
    lastLoginAt: '2025-06-19T14:00:00Z',
    createdAt: '2024-03-20T09:00:00Z',
    twoFactorEnabled: true,
    preferences: {
      emailNotifications: true,
      pushNotifications: true,
      weeklyReport: true,
      theme: 'light',
      language: 'en',
    },
  },
];

// ─── DEPARTMENTS ──────────────────────────────────────────────
export const DEPARTMENTS: Department[] = [
  { id: 'dept-acme-eng', companyId: 'company-acme', name: 'Engineering', code: 'ENG', managerId: 'user-acme-emp1', headcount: 23, location: 'Floor 3', createdAt: '2024-01-15T10:00:00Z' },
  { id: 'dept-acme-hr', companyId: 'company-acme', name: 'Human Resources', code: 'HR', managerId: 'user-acme-emp2', headcount: 8, location: 'Floor 1', createdAt: '2024-01-15T10:00:00Z' },
  { id: 'dept-acme-sales', companyId: 'company-acme', name: 'Sales', code: 'SALES', managerId: 'user-acme-emp3', headcount: 15, location: 'Floor 2', createdAt: '2024-01-15T10:00:00Z' },
  { id: 'dept-acme-design', companyId: 'company-acme', name: 'Design', code: 'DES', managerId: 'user-acme-emp4', headcount: 6, location: 'Floor 3', createdAt: '2024-01-15T10:00:00Z' },
  { id: 'dept-acme-finance', companyId: 'company-acme', name: 'Finance', code: 'FIN', headcount: 5, location: 'Floor 1', createdAt: '2024-01-15T10:00:00Z' },
];

// ─── ATTENDANCE RECORDS ───────────────────────────────────────
function generateAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const employees = USERS.filter(u => u.companyId === 'company-acme' && u.role !== 'company_admin');
  const statuses: AttendanceRecord['status'][] = ['present', 'present', 'present', 'present', 'late', 'absent', 'remote'];

  for (let i = 29; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    employees.forEach((emp) => {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const checkInHour = status === 'late' ? 9 + Math.floor(Math.random() * 2) : 8;
      const checkInMin = status === 'late' ? 20 + Math.floor(Math.random() * 40) : Math.floor(Math.random() * 30);
      const checkIn = status === 'absent' ? undefined : `${dateStr}T0${checkInHour}:${checkInMin.toString().padStart(2, '0')}:00Z`;
      const checkOut = status === 'absent' ? undefined : `${dateStr}T18:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00Z`;
      const hoursWorked = status === 'absent' ? 0 : status === 'half_day' ? 4 : 8 + Math.random() * 2;

      records.push({
        id: `att-${dateStr}-${emp.id}`,
        companyId: 'company-acme',
        userId: emp.id,
        date: dateStr,
        checkIn,
        checkOut,
        status,
        hoursWorked: Math.round(hoursWorked * 10) / 10,
        overtimeHours: Math.max(0, hoursWorked - 8),
        breakMinutes: 60,
        createdAt: `${dateStr}T00:00:00Z`,
      });
    });
  }
  return records;
}

export const ATTENDANCE_RECORDS = generateAttendance();

// ─── NOTIFICATIONS ────────────────────────────────────────────
export const NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    companyId: 'company-acme',
    userId: 'user-acme-admin',
    type: 'in_app',
    category: 'billing',
    title: '✅ Payment Successful',
    message: 'Your Enterprise plan payment of $1,188.00 was processed successfully.',
    isRead: false,
    actionUrl: '/billing',
    actionLabel: 'View Invoice',
    createdAt: '2025-06-01T10:23:00Z',
  },
  {
    id: 'notif-002',
    companyId: 'company-acme',
    userId: 'user-acme-admin',
    type: 'in_app',
    category: 'attendance',
    title: '⚠️ High Absenteeism Alert',
    message: '3 employees are absent today in the Engineering department.',
    isRead: false,
    actionUrl: '/attendance',
    actionLabel: 'View Attendance',
    createdAt: '2025-06-20T09:00:00Z',
  },
  {
    id: 'notif-003',
    companyId: 'company-acme',
    userId: 'user-acme-admin',
    type: 'in_app',
    category: 'subscription',
    title: '📊 Usage Report Ready',
    message: 'Your June 2025 usage report is ready to download.',
    isRead: true,
    actionUrl: '/reports',
    actionLabel: 'Download Report',
    createdAt: '2025-06-15T08:00:00Z',
    readAt: '2025-06-15T09:30:00Z',
  },
  {
    id: 'notif-004',
    companyId: 'company-acme',
    userId: 'user-acme-admin',
    type: 'in_app',
    category: 'attendance',
    title: '🕐 Late Arrivals Detected',
    message: '5 employees checked in late this morning (after 9:15 AM).',
    isRead: true,
    actionUrl: '/attendance',
    createdAt: '2025-06-20T10:00:00Z',
    readAt: '2025-06-20T10:30:00Z',
  },
  {
    id: 'notif-005',
    companyId: 'company-techcorp',
    userId: 'user-techcorp-admin',
    type: 'in_app',
    category: 'billing',
    title: '❌ Payment Failed',
    message: 'Your payment of $29.00 failed. Please update your payment method.',
    isRead: false,
    actionUrl: '/billing',
    actionLabel: 'Update Payment',
    createdAt: '2025-05-01T08:00:00Z',
  },
  {
    id: 'notif-006',
    companyId: 'company-techcorp',
    userId: 'user-techcorp-admin',
    type: 'in_app',
    category: 'subscription',
    title: '🚀 Upgrade to Enterprise',
    message: 'You\'ve used 87% of your employee limit. Consider upgrading to Enterprise for unlimited employees.',
    isRead: false,
    actionUrl: '/billing/upgrade',
    actionLabel: 'Upgrade Now',
    createdAt: '2025-06-18T14:00:00Z',
  },
];

// ─── ONBOARDING STATE ─────────────────────────────────────────
export const ONBOARDING_STATES: Record<string, OnboardingState> = {
  'company-acme': {
    companyId: 'company-acme',
    currentStep: 5,
    completedAt: '2024-01-20T16:00:00Z',
    steps: [
      { id: 'company-profile', title: 'Company Profile', description: 'Set up your company information', completed: true, required: true },
      { id: 'invite-admins', title: 'Invite Admins', description: 'Add HR managers and admins', completed: true, required: true },
      { id: 'departments', title: 'Create Departments', description: 'Set up your org structure', completed: true, required: true },
      { id: 'import-employees', title: 'Import Employees', description: 'Add your workforce', completed: true, required: true },
      { id: 'configure-rules', title: 'Configure Rules', description: 'Set attendance policies', completed: true, required: false },
      { id: 'billing', title: 'Set Up Billing', description: 'Choose and activate your plan', completed: true, required: true },
    ],
  },
};

// ─── REVENUE ANALYTICS (Super Admin) ─────────────────────────
export const REVENUE_ANALYTICS: RevenueAnalytics = {
  mrr: 7843,
  arr: 94116,
  mrrGrowth: 12.4,
  churnRate: 2.1,
  ltv: 2840,
  arpu: 52.3,
  newMrr: 1240,
  expansionMrr: 380,
  contractionMrr: 120,
  churnedMrr: 290,
  activeSubscriptions: 150,
  trialingSubscriptions: 23,
  cancelledThisMonth: 4,
  totalRevenue: 284750,
  revenueByPlan: [
    { planId: 'free', revenue: 0, count: 67 },
    { planId: 'pro', revenue: 2523, count: 87 },
    { planId: 'enterprise', revenue: 5320, count: 54 },
  ],
  monthlyRevenue: [
    { month: 'Jan 2025', revenue: 6120, subscriptions: 118 },
    { month: 'Feb 2025', revenue: 6450, subscriptions: 124 },
    { month: 'Mar 2025', revenue: 6800, subscriptions: 131 },
    { month: 'Apr 2025', revenue: 7100, subscriptions: 138 },
    { month: 'May 2025', revenue: 7520, subscriptions: 144 },
    { month: 'Jun 2025', revenue: 7843, subscriptions: 150 },
  ],
};

// ─── USAGE ANALYTICS ──────────────────────────────────────────
export const USAGE_ANALYTICS: UsageAnalytics = {
  companyId: 'company-acme',
  period: format(new Date(), 'yyyy-MM'),
  totalEmployees: 52,
  activeEmployees: 49,
  totalCheckIns: 1043,
  avgAttendanceRate: 91.4,
  lateArrivals: 47,
  absences: 23,
  overtimeHours: 128.5,
  remoteCheckIns: 215,
  apiCallsUsed: 3420,
  reportsGenerated: 12,
  storageUsedMb: 245,
};

// ─── TENANT-AWARE QUERY HELPERS ───────────────────────────────
export const db = {
  // Tenant-scoped queries — always filters by companyId
  getCompany: (companyId: string) => COMPANIES.find(c => c.id === companyId),
  getCompanies: () => COMPANIES,
  
  getSubscription: (companyId: string) => SUBSCRIPTIONS.find(s => s.companyId === companyId),
  getSubscriptions: () => SUBSCRIPTIONS,
  
  getInvoices: (companyId: string) => INVOICES.filter(i => i.companyId === companyId),
  getAllInvoices: () => INVOICES,
  
  getBillingHistory: (companyId: string) => BILLING_HISTORY.filter(b => b.companyId === companyId),
  
  getUsers: (companyId: string) => USERS.filter(u => u.companyId === companyId),
  getUser: (userId: string) => USERS.find(u => u.id === userId),
  
  getDepartments: (companyId: string) => DEPARTMENTS.filter(d => d.companyId === companyId),
  
  getAttendance: (companyId: string, userId?: string) => {
    const records = ATTENDANCE_RECORDS.filter(a => a.companyId === companyId);
    return userId ? records.filter(a => a.userId === userId) : records;
  },
  
  getNotifications: (userId: string) => NOTIFICATIONS.filter(n => n.userId === userId),
  getUnreadCount: (userId: string) => NOTIFICATIONS.filter(n => n.userId === userId && !n.isRead).length,
  
  getOnboarding: (companyId: string) => ONBOARDING_STATES[companyId],
  
  getTenantSettings: (companyId: string) => TENANT_SETTINGS[companyId],
  
  getRevenueAnalytics: () => REVENUE_ANALYTICS,
  getUsageAnalytics: (companyId: string) => ({ ...USAGE_ANALYTICS, companyId }),
};
