"use client";

import { useState, useRef, useEffect } from 'react';
import { Bell, AlertCircle, Rocket, FileText, Sparkles, Monitor, Check } from 'lucide-react';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import { formatTimeAgo } from '@/lib/utils';
import Link from 'next/link';

const typeIcons: Record<string, React.ElementType> = {
  alert: AlertCircle, deployment: Rocket, report: FileText, recommendation: Sparkles, system: Monitor,
};
const typeColors: Record<string, string> = {
  alert: 'text-red-400 bg-red-500/10', deployment: 'text-cyan-400 bg-cyan-500/10',
  report: 'text-blue-400 bg-blue-500/10', recommendation: 'text-emerald-400 bg-emerald-500/10',
  system: 'text-gray-400 bg-gray-500/10',
};

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-white/5 transition-colors" suppressHydrationWarning>
        <Bell className="w-5 h-5 text-gray-400" />
        {unreadCount > 0 && (
          <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-cyan-400 text-black text-[10px] font-bold rounded-full">
            {unreadCount}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                suppressHydrationWarning
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">No notifications</div>
            ) : (
              notifications.map(n => {
                const Icon = typeIcons[n.type] || Monitor;
                const colorClass = typeColors[n.type] || typeColors.system;
                return (
                  <Link
                    key={n.id}
                    href={n.actionUrl || '#'}
                    onClick={() => { if (!n.read) markRead.mutate(n.id); setOpen(false); }}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 ${!n.read ? 'bg-cyan-500/5' : ''}`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${n.read ? 'text-gray-300' : 'text-white'}`}>{n.title}</span>
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-600 mt-1">{formatTimeAgo(n.createdAt)}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <Link href="/alerts" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-center text-xs text-cyan-400 hover:text-cyan-300 border-t border-white/10 transition-colors">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
