import { useState } from 'react';
import {
  Bell, CreditCard, Clock, AlertTriangle, Check, Trash2,
  Filter, CheckCheck, Star, Info, Zap
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { useAppStore } from '../store/appStore';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import type { Notification } from '../types';

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  billing: { icon: <CreditCard className="h-4 w-4" />, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  attendance: { icon: <Clock className="h-4 w-4" />, color: 'text-amber-600', bg: 'bg-amber-100' },
  subscription: { icon: <Star className="h-4 w-4" />, color: 'text-violet-600', bg: 'bg-violet-100' },
  hr: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  system: { icon: <Info className="h-4 w-4" />, color: 'text-slate-600', bg: 'bg-slate-100' },
};

const EMAIL_TEMPLATES = [
  {
    id: 'attendance_alert',
    name: 'Attendance Alert',
    subject: 'Daily Attendance Summary — {{company}}',
    trigger: 'Daily at 10 AM',
    enabled: true,
    category: 'attendance',
  },
  {
    id: 'late_arrival',
    name: 'Late Arrival Notification',
    subject: '⚠️ Late Arrival: {{employee_name}} at {{company}}',
    trigger: 'When employee checks in late',
    enabled: true,
    category: 'attendance',
  },
  {
    id: 'payment_success',
    name: 'Payment Confirmation',
    subject: '✅ Payment Received — AttendIQ Receipt',
    trigger: 'On successful payment',
    enabled: true,
    category: 'billing',
  },
  {
    id: 'payment_failed',
    name: 'Payment Failed Alert',
    subject: '❌ Payment Failed — Action Required',
    trigger: 'On payment failure',
    enabled: true,
    category: 'billing',
  },
  {
    id: 'subscription_renewal',
    name: 'Subscription Renewal Reminder',
    subject: '📅 Your subscription renews in 7 days',
    trigger: '7 days before renewal',
    enabled: true,
    category: 'subscription',
  },
  {
    id: 'plan_limit',
    name: 'Plan Limit Warning',
    subject: '⚠️ Approaching your plan limit',
    trigger: 'When 90% of limit used',
    enabled: false,
    category: 'subscription',
  },
];

export function Notifications() {
  const { notifications, markNotificationRead, markAllRead } = useAppStore();
  const [activeTab, setActiveTab] = useState<'inbox' | 'email_templates' | 'preferences'>('inbox');
  const [filterCat, setFilterCat] = useState('all');

  const filtered = notifications.filter(n =>
    filterCat === 'all' || n.category === filterCat
  );

  const unread = filtered.filter(n => !n.isRead).length;

  const [emailTemplates, setEmailTemplates] = useState(EMAIL_TEMPLATES);

  const toggleTemplate = (id: string) => {
    setEmailTemplates(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  };

  const catConfig = (cat: string) => CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.system;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
          <p className="text-slate-500 text-sm">{unread} unread notifications</p>
        </div>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <Button variant="outline" size="sm" icon={<CheckCheck className="h-4 w-4" />} onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { id: 'inbox', label: 'Inbox', badge: unread },
          { id: 'email_templates', label: 'Email Templates' },
          { id: 'preferences', label: 'Preferences' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
            {tab.badge ? (
              <span className="bg-indigo-600 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Inbox */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            {['all', 'billing', 'attendance', 'subscription', 'system'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                  filterCat === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <Card>
            <div className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-500">No notifications</p>
                  <p className="text-sm text-slate-400 mt-1">You're all caught up!</p>
                </div>
              ) : (
                filtered.map(n => {
                  const config = catConfig(n.category);
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors cursor-pointer',
                        !n.isRead && 'bg-indigo-50/30'
                      )}
                      onClick={() => markNotificationRead(n.id)}
                    >
                      <div className={cn('p-2.5 rounded-xl flex-shrink-0 mt-0.5', config.bg)}>
                        <span className={config.color}>{config.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className={cn('text-sm', !n.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!n.isRead && <div className="w-2 h-2 bg-indigo-500 rounded-full" />}
                            <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className="capitalize text-xs">{n.category}</Badge>
                          {n.actionLabel && n.actionUrl && (
                            <button className="text-xs text-indigo-600 font-medium hover:underline">{n.actionLabel} →</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Email Templates */}
      {activeTab === 'email_templates' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Email notifications via SendGrid</p>
              <p className="text-xs text-blue-600 mt-0.5">Configure which automated emails get sent to your team. All templates are sent from notifications@attendiq.com</p>
            </div>
          </div>

          <Card>
            <div className="divide-y divide-slate-100">
              {emailTemplates.map(template => {
                const config = catConfig(template.category);
                return (
                  <div key={template.id} className="flex items-start justify-between p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn('p-2 rounded-lg', config.bg)}>
                        <span className={config.color}>{config.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{template.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">{template.subject}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="capitalize text-xs">{template.trigger}</Badge>
                          <Badge variant={template.category === 'billing' ? 'info' : template.category === 'attendance' ? 'warning' : 'purple'} className="text-xs capitalize">{template.category}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button className="text-xs text-indigo-600 hover:underline">Edit Template</button>
                      <button
                        onClick={() => toggleTemplate(template.id)}
                        className={cn(
                          'relative inline-flex h-5 w-9 rounded-full transition-colors',
                          template.enabled ? 'bg-indigo-600' : 'bg-slate-200'
                        )}
                      >
                        <span className={cn(
                          'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                          template.enabled && 'translate-x-4'
                        )} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Preferences */}
      {activeTab === 'preferences' && (
        <div className="space-y-4 max-w-lg">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-5">Notification Preferences</h3>
            <div className="space-y-5">
              {[
                { id: 'email', label: 'Email Notifications', desc: 'Receive important updates via email', enabled: true },
                { id: 'push', label: 'Push Notifications', desc: 'Browser and mobile push alerts', enabled: true },
                { id: 'late', label: 'Late Arrival Alerts', desc: 'Alert when employees check in late', enabled: true },
                { id: 'absent', label: 'Absence Alerts', desc: 'Daily summary of absent employees', enabled: true },
                { id: 'billing', label: 'Billing Notifications', desc: 'Payment receipts and billing alerts', enabled: true },
                { id: 'weekly', label: 'Weekly Report', desc: 'Weekly attendance summary email', enabled: false },
              ].map(pref => (
                <div key={pref.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{pref.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{pref.desc}</p>
                  </div>
                  <button className={cn('relative inline-flex h-5 w-9 rounded-full transition-colors', pref.enabled ? 'bg-indigo-600' : 'bg-slate-200')}>
                    <span className={cn('absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', pref.enabled && 'translate-x-4')} />
                  </button>
                </div>
              ))}
            </div>
            <Button className="mt-6 w-full">Save Preferences</Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Webhook Integrations</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Slack Webhook URL</label>
                <input type="url" placeholder="https://hooks.slack.com/services/..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Microsoft Teams Webhook</label>
                <input type="url" placeholder="https://outlook.office.com/webhook/..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <Button variant="outline" className="mt-4">Save Webhooks</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
