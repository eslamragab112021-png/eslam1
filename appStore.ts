import { create } from 'zustand';
import type { User, Company, Subscription, Plan, Notification } from '../types';
import { PLANS } from '../data/plans';
import { db, USERS } from '../data/mockDatabase';

interface AppStore {
  // Auth & Tenant
  currentUser: User | null;
  currentCompany: Company | null;
  currentSubscription: Subscription | null;
  currentPlan: Plan | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;

  // UI
  sidebarCollapsed: boolean;
  activeView: string;
  notifications: Notification[];
  unreadCount: number;

  // Modals
  showUpgradeModal: boolean;
  showOnboarding: boolean;
  stripePaymentStatus: 'idle' | 'processing' | 'success' | 'failed';

  // Actions
  login: (email: string, password: string) => boolean;
  logout: () => void;
  setActiveView: (view: string) => void;
  toggleSidebar: () => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  setShowUpgradeModal: (show: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  setStripePaymentStatus: (status: 'idle' | 'processing' | 'success' | 'failed') => void;
  switchCompany: (companyId: string) => void;
  upgradePlan: (planId: string, billingCycle: 'monthly' | 'annual') => void;
  cancelSubscription: () => void;
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
}

// Credential map for demo login
const CREDENTIALS: Record<string, string> = {
  'admin@attendiq.com': 'superadmin',    // Super Admin
  'sarah@acme.com': 'company-acme',       // Acme Admin
  'david@techcorp.io': 'company-techcorp', // TechCorp Admin
  'mike@acme.com': 'company-acme',        // Employee
};

export const useAppStore = create<AppStore>((set, get) => ({
  currentUser: null,
  currentCompany: null,
  currentSubscription: null,
  currentPlan: null,
  isAuthenticated: false,
  isSuperAdmin: false,
  sidebarCollapsed: false,
  activeView: 'dashboard',
  notifications: [],
  unreadCount: 0,
  showUpgradeModal: false,
  showOnboarding: false,
  stripePaymentStatus: 'idle',

  login: (email: string, _password: string) => {
    const user = USERS.find(u => u.email === email);
    if (!user) return false;

    const companyId = CREDENTIALS[email];
    if (!companyId) return false;

    const isSuperAdmin = user.role === 'superadmin';
    const company = isSuperAdmin ? null : db.getCompany(companyId) || null;
    const subscription = isSuperAdmin ? null : db.getSubscription(companyId) || null;
    const plan = subscription ? PLANS.find(p => p.id === subscription.planId) || null : null;
    const notifications = db.getNotifications(user.id);
    const unreadCount = db.getUnreadCount(user.id);

    set({
      currentUser: user,
      currentCompany: company,
      currentSubscription: subscription,
      currentPlan: plan,
      isAuthenticated: true,
      isSuperAdmin,
      activeView: isSuperAdmin ? 'superadmin-dashboard' : 'dashboard',
      notifications,
      unreadCount,
      showOnboarding: !isSuperAdmin && !db.getOnboarding(companyId)?.completedAt,
    });

    return true;
  },

  logout: () => set({
    currentUser: null,
    currentCompany: null,
    currentSubscription: null,
    currentPlan: null,
    isAuthenticated: false,
    isSuperAdmin: false,
    activeView: 'dashboard',
    notifications: [],
    unreadCount: 0,
  }),

  setActiveView: (view) => set({ activeView: view }),
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  markNotificationRead: (id) => set(s => {
    const notifications = s.notifications.map(n =>
      n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
    );
    return { notifications, unreadCount: notifications.filter(n => !n.isRead).length };
  }),

  markAllRead: () => set(s => {
    const notifications = s.notifications.map(n => ({ ...n, isRead: true }));
    return { notifications, unreadCount: 0 };
  }),

  setShowUpgradeModal: (show) => set({ showUpgradeModal: show }),
  setShowOnboarding: (show) => set({ showOnboarding: show }),
  setStripePaymentStatus: (status) => set({ stripePaymentStatus: status }),

  switchCompany: (companyId) => {
    const company = db.getCompany(companyId);
    const subscription = db.getSubscription(companyId);
    const plan = subscription ? PLANS.find(p => p.id === subscription.planId) || null : null;
    if (company) set({ currentCompany: company, currentSubscription: subscription || null, currentPlan: plan });
  },

  upgradePlan: (planId, billingCycle) => {
    const newPlan = PLANS.find(p => p.id === planId);
    const { currentSubscription } = get();
    if (!newPlan || !currentSubscription) return;

    const updatedSub: Subscription = {
      ...currentSubscription,
      planId: newPlan.id,
      billingCycle,
      unitAmount: newPlan.price[billingCycle],
      updatedAt: new Date().toISOString(),
      status: 'active',
    };

    set({
      currentPlan: newPlan,
      currentSubscription: updatedSub,
      stripePaymentStatus: 'success',
    });

    // Add billing notification
    get().addNotification({
      companyId: get().currentCompany?.id || '',
      userId: get().currentUser?.id || '',
      type: 'in_app',
      category: 'subscription',
      title: `✅ Plan Upgraded to ${newPlan.name}`,
      message: `You've successfully upgraded to the ${newPlan.name} plan.`,
      actionUrl: '/billing',
      actionLabel: 'View Billing',
    });
  },

  cancelSubscription: () => {
    const { currentSubscription } = get();
    if (!currentSubscription) return;
    set({
      currentSubscription: { ...currentSubscription, cancelAtPeriodEnd: true, status: 'active' },
    });
    get().addNotification({
      companyId: get().currentCompany?.id || '',
      userId: get().currentUser?.id || '',
      type: 'in_app',
      category: 'subscription',
      title: '⚠️ Subscription Cancellation Scheduled',
      message: 'Your subscription will be cancelled at the end of the billing period.',
      actionUrl: '/billing',
    });
  },

  addNotification: (notif) => set(s => {
    const newNotif: Notification = {
      ...notif,
      id: `notif-${Date.now()}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    const notifications = [newNotif, ...s.notifications];
    return { notifications, unreadCount: notifications.filter(n => !n.isRead).length };
  }),
}));

// Re-export type for convenience
export type { Subscription };
