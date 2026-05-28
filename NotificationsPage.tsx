import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle, Clock, DollarSign, Calendar } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { notificationService } from '../services/department.service';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { Notification } from '../types';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

const typeConfig: Record<string, { icon: React.ReactNode; bg: string; iconColor: string }> = {
  info: { icon: <Info size={16} />, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
  success: { icon: <CheckCircle size={16} />, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  warning: { icon: <AlertTriangle size={16} />, bg: 'bg-amber-50', iconColor: 'text-amber-600' },
  error: { icon: <XCircle size={16} />, bg: 'bg-red-50', iconColor: 'text-red-600' },
  attendance: { icon: <Clock size={16} />, bg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  leave: { icon: <Calendar size={16} />, bg: 'bg-violet-50', iconColor: 'text-violet-600' },
  payroll: { icon: <DollarSign size={16} />, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
};

export const NotificationsPage: React.FC = () => {
  const { user } = useAuthStore();
  const userId = user?.id || '';
  const companyId = user?.companyId || '';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!userId || !companyId) return;
    setLoading(true);
    try {
      const data = await notificationService.list(userId, companyId);
      setNotifications(data);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId, companyId]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id, userId);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(userId, companyId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-800">Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} leftIcon={<CheckCheck size={14} />}>
            Mark All Read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="text-center py-16">
          <div className="p-4 bg-slate-50 rounded-2xl inline-flex mb-4">
            <Bell size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">All caught up!</h3>
          <p className="text-slate-400 text-sm mt-1">You have no notifications.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => {
            const config = typeConfig[notification.type] || typeConfig.info;
            return (
              <div
                key={notification.id}
                className={cn(
                  'group flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all',
                  notification.isRead
                    ? 'bg-white border-slate-100 hover:border-slate-200'
                    : 'bg-indigo-50/30 border-indigo-100 hover:border-indigo-200'
                )}
                onClick={() => !notification.isRead && handleMarkRead(notification.id)}
              >
                <div className={cn('p-2.5 rounded-xl flex-shrink-0', config.bg)}>
                  <span className={config.iconColor}>{config.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-medium', notification.isRead ? 'text-slate-700' : 'text-slate-900')}>
                      {notification.title}
                    </p>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={cn('text-sm mt-0.5', notification.isRead ? 'text-slate-400' : 'text-slate-600')}>
                    {notification.message}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-600 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
