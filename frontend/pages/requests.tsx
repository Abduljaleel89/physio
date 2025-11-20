import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/auth';
import { visitRequestsApi } from '../lib/api';

export default function RequestsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!loading && user) {
      load();
    }
  }, [loading, user]);

  const load = async () => {
    try {
      setErr('');
      const res = await visitRequestsApi.list();
      const data = res.data || res;
      const list = Array.isArray(data) ? data : (data?.requests || data?.data || []);
      setItems(list || []);
    } catch (e:any) {
      setErr(e.message || 'Failed to load');
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-2">My Visit Requests</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Track your appointment requests and their status.</p>
        {err && (
          <div className="mb-4 p-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-300">{err}</div>
        )}
        <div className="flex justify-end mb-4">
          <a href="/appointments" className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600">New Request</a>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow">
          {items.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">No requests yet.</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-slate-700">
              {items.map((r) => (
                <li key={r.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-50">{new Date(r.requestedAt || r.requestedDate || r.createdAt).toLocaleString()}</div>
                    {r.reason && <div className="text-sm text-gray-600 dark:text-gray-400">Reason: {r.reason}</div>}
                    {r.doctor && <div className="text-sm text-gray-600 dark:text-gray-400">Doctor: Dr. {r.doctor.firstName} {r.doctor.lastName}</div>}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full border ${r.status==='APPROVED' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' : r.status==='REJECTED' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700' : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700'}`}>{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
