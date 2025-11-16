import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/auth';
import { analyticsApi } from '../../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { subDays, format } from 'date-fns';

export default function PatientHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [start, setStart] = useState<string>(format(subDays(new Date(), 14), 'yyyy-MM-dd'));
  const [end, setEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [daily, setDaily] = useState<Array<{ date: string; count: number }>>([]);
  const [summary, setSummary] = useState<{ totalCompletions: number; totalPlans: number } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
      return;
    }
    if (user) load();
  }, [user, authLoading]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await analyticsApi.adherence(start + 'T00:00:00.000Z', end + 'T23:59:59.999Z');
      const data = res.data || res;
      setDaily(data?.daily || []);
      setSummary(data?.summary || null);
      setError('');
    } catch (e:any) {
      setError(e.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const apply = async (e: React.FormEvent) => { e.preventDefault(); await load(); };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64"><div className="text-gray-500">Loading…</div></div>
      </Layout>
    );
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Completions History</h1>
          {summary && (
            <p className="text-gray-600">Total completions: {summary.totalCompletions}</p>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <form onSubmit={apply} className="mb-4 bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex items-end space-x-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
            <input type="date" value={start} onChange={(e)=> setStart(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
            <input type="date" value={end} onChange={(e)=> setEnd(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Apply</button>
          </div>
        </form>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily.map(d => ({ ...d, label: format(new Date(d.date), 'MMM dd') }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
}
