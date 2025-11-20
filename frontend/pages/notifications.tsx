import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/auth';
import { notificationsApi } from '../lib/api';

interface NotificationItem {
  id: number;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  read?: boolean;
  createdAt?: string;
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // filters
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [type, setType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
      return;
    }
    if (user) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, page, pageSize]);

  const buildParams = () => {
    const params: any = { page, pageSize };
    if (type) params.type = type;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (showUnreadOnly) params.read = 'false';
    return params;
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.list(buildParams());
      // Support both paginated and non-paginated responses
      const data = res.data || res;
      const list = Array.isArray(data)
        ? data
        : (data?.notifications || data?.data || []);
      const totalCount = typeof data?.total === 'number' ? data.total : list.length;
      setItems(list);
      setTotal(totalCount);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await load();
  };

  const clearFilters = async () => {
    setType('');
    setStartDate('');
    setEndDate('');
    setShowUnreadOnly(false);
    setPage(1);
    await load();
  };

  const markRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setItems((prev)=> prev.map((n)=> n.id === id ? { ...n, read: true } : n));
    } catch(_) {}
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAll();
      setItems((prev)=> prev.map((n)=> ({ ...n, read: true })));
    } catch(_) {}
  };

  const exportCsv = async () => {
    try {
      // Fetch full dataset for current filters (set a large pageSize for export)
      const params = { ...buildParams(), page: 1, pageSize: 1000 };
      const res = await notificationsApi.list(params);
      const data = res.data || res;
      const list: NotificationItem[] = Array.isArray(data)
        ? data
        : (data?.notifications || data?.data || []);

      const headers = ['id','title','message','type','read','createdAt'];
      const rows = list.map(n => [
        String(n.id ?? ''),
        (n.title ?? '').replaceAll('"','""'),
        (n.message ?? '').replaceAll('"','""'),
        String(n.type ?? ''),
        n.read ? 'true' : 'false',
        n.createdAt ? new Date(n.createdAt).toISOString() : ''
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.map(v => /[",\n]/.test(v) ? `"${v}"` : v).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const datePart = new Date().toISOString().slice(0,10);
      a.download = `notifications-${datePart}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      // silent fail
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50 mb-2">Notifications</h1>
            <p className="text-gray-700 dark:text-gray-300">Filter and review your notifications</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCsv} className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">Export CSV</button>
            <button onClick={markAll} className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">Mark all as read</button>
            <button onClick={load} className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">Refresh</button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3 text-sm text-red-800 dark:text-red-300 font-medium">{error}</div>
            </div>
          </div>
        )}

        <form onSubmit={applyFilters} className="mb-4 card">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select value={type} onChange={(e)=> setType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">All</option>
                <option value="INFO">Info</option>
                <option value="WARNING">Warning</option>
                <option value="ALERT">Alert</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start date</label>
              <input type="date" value={startDate} onChange={(e)=> setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End date</label>
              <input type="date" value={endDate} onChange={(e)=> setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="flex items-center space-x-2">
              <input id="unreadOnly" type="checkbox" className="rounded w-4 h-4 text-primary-600 border-gray-300 dark:border-slate-600 focus:ring-primary-500" checked={showUnreadOnly} onChange={(e)=> setShowUnreadOnly(e.target.checked)} />
              <label htmlFor="unreadOnly" className="text-sm text-gray-700 dark:text-gray-300">Unread only</label>
            </div>
            <div className="flex items-center space-x-2 md:justify-end">
              <button type="button" onClick={clearFilters} className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">Clear</button>
              <button type="submit" className="px-3 py-2 bg-gradient-to-r from-primary-600 to-primary-500 dark:from-primary-500 dark:to-primary-600 text-white rounded-lg text-sm hover:from-primary-700 hover:to-primary-600 dark:hover:from-primary-600 dark:hover:to-primary-700 transition-all shadow-md hover:shadow-lg">Apply</button>
            </div>
          </div>
        </form>

        <div className="card">
          {loading ? (
            <div className="p-6 text-gray-700 dark:text-gray-300">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-gray-700 dark:text-gray-300">No notifications</div>
          ) : (
            <>
              <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                {items.map((n)=> (
                  <li key={n.id} className={`p-3 sm:p-4 ${!n.read ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-50 break-words">{n.title || 'Notification'}</div>
                        {n.type && <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{n.type}</div>}
                        {n.message && <div className="text-sm text-gray-800 dark:text-gray-200 mt-1 break-words">{n.message}</div>}
                        {n.createdAt && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>}
                      </div>
                      {!n.read && (
                        <button onClick={()=> markRead(n.id)} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline font-medium transition-colors flex-shrink-0 whitespace-nowrap">Mark read</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border-t border-gray-200 dark:border-slate-700">
                <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Page {page} of {totalPages} • {total} total</div>
                <div className="flex items-center space-x-2">
                  <select value={pageSize} onChange={(e)=> { setPageSize(parseInt(e.target.value)); setPage(1); }} className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {[10,20,50,100].map((s)=> (<option key={s} value={s}>{s} / page</option>))}
                  </select>
                  <button disabled={page<=1} onClick={()=> setPage((p)=> Math.max(1, p-1))} className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Prev</button>
                  <button disabled={page>=totalPages} onClick={()=> setPage((p)=> Math.min(totalPages, p+1))} className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
