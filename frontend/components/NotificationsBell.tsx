import { useEffect, useRef, useState } from 'react';
import { notificationsApi } from '../lib/api';

interface NotificationItem {
  id: number;
  title?: string | null;
  message?: string | null;
  type?: string;
  read?: boolean;
  createdAt?: string;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    let mounted = true;
    let timer: any;

    const load = async () => {
      try {
        setLoading(true);
        const res = await notificationsApi.list();
        const data = res.data || res;
        const list = Array.isArray(data) ? data : (data?.notifications || data?.data || []);
        if (!mounted) return;
        setItems(list);
        setUnread(list.filter((n: any) => !n.read).length);
      } catch (_) {
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    timer = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const markRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      setUnread((u) => Math.max(0, u - 1));
    } catch(_) {}
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAll();
      setItems((prev)=> prev.map((n)=> ({ ...n, read: true })));
      setUnread(0);
    } catch(_) {}
  };

  return (
    <div className="relative flex-shrink-0" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center justify-center p-1.5 sm:p-2 rounded-xl hover:bg-gradient-to-br hover:from-primary-50 hover:to-accent-50 dark:hover:from-primary-900/30 dark:hover:to-accent-900/30 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 group"
        aria-label="Notifications"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-all duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 rounded-2xl shadow-soft-lg z-50 transition-all duration-300 animate-scale-in">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors duration-300">Notifications</span>
            <button onClick={markAll} className="text-xs text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-300 whitespace-nowrap">Mark all as read</button>
          </div>
          <div className="max-h-[calc(100vh-12rem)] sm:max-h-80 overflow-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">No notifications</div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((n) => (
                  <li key={n.id} className={`p-3 transition-colors duration-300 ${!n.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors duration-300 break-words">{n.title || 'Notification'}</p>
                        {n.message && <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 transition-colors duration-300 break-words">{n.message}</p>}
                        {n.createdAt && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 transition-colors duration-300">{new Date(n.createdAt).toLocaleString()}</p>
                        )}
                      </div>
                      {!n.read && (
                        <button onClick={() => markRead(n.id)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-2 transition-colors duration-300 flex-shrink-0 whitespace-nowrap">Mark read</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
