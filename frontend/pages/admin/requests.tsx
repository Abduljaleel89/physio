import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/auth';
import { visitRequestsApi, adminApi } from '../../lib/api';

export default function RequestsAdminPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [assignForm, setAssignForm] = useState<Record<number, { doctorId?: number; date?: string; time?: string; duration?: number; notes?: string }>>({});

  useEffect(() => {
    if (!loading && user) {
      load();
      loadDoctors();
    }
  }, [loading, user]);

  const loadDoctors = async () => {
    try {
      const res = await adminApi.getDoctors();
      const data = res.data || res;
      const list = Array.isArray(data) ? data : (data?.doctors || []);
      setDoctors(list || []);
    } catch (e) {}
  };

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

  const onAssign = async (id: number) => {
    const f = assignForm[id] || {};
    if (!f.doctorId) { setErr('Select a doctor'); return; }
    const dateISO = f.date && f.time ? new Date(`${f.date}T${f.time}:00`).toISOString() : undefined;
    try {
      const res = await visitRequestsApi.assign(id, { doctorId: f.doctorId!, date: dateISO, duration: f.duration, notes: f.notes });
      if (!res.success) throw new Error(res.error || 'Failed to assign');
      await load();
    } catch (e:any) {
      setErr(e.message || 'Failed to assign');
    }
  };

  const onRespond = async (id: number, status: 'APPROVED'|'REJECTED') => {
    try {
      const res = await visitRequestsApi.respond(id, { status });
      if (!res.success) throw new Error(res.error || 'Failed');
      await load();
    } catch (e:any) {
      setErr(e.message || 'Failed');
    }
  };

  const isStaff = user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST';
  const isDoctor = user?.role === 'PHYSIOTHERAPIST';

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-2">Visit Requests</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Manage incoming patient requests.</p>
        {err && <div className="mb-4 p-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-300">{err}</div>}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700 text-left">
              <tr>
                <th className="px-4 py-2 text-gray-900 dark:text-gray-50">Patient</th>
                <th className="px-4 py-2 text-gray-900 dark:text-gray-50">Requested</th>
                <th className="px-4 py-2 text-gray-900 dark:text-gray-50">Reason</th>
                <th className="px-4 py-2 text-gray-900 dark:text-gray-50">Status</th>
                <th className="px-4 py-2 text-gray-900 dark:text-gray-50">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-slate-700">
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-50">{r.patient?.firstName} {r.patient?.lastName}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{new Date(r.requestedAt || r.requestedDate || r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.reason || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full border ${r.status==='APPROVED' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' : r.status==='REJECTED' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700' : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700'}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {isDoctor && (
                      <div className="space-x-2">
                        <button onClick={()=>onRespond(r.id, 'APPROVED')} className="px-3 py-1 text-sm bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600">Approve</button>
                        <button onClick={()=>onRespond(r.id, 'REJECTED')} className="px-3 py-1 text-sm bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600">Reject</button>
                      </div>
                    )}
                    {isStaff && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50" value={(assignForm[r.id]?.doctorId as any)||''} onChange={(e)=> setAssignForm(s=>({...s, [r.id]: {...s[r.id], doctorId: parseInt(e.target.value)}}))}>
                            <option value="">Doctor…</option>
                            {doctors.map((d)=> (<option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>))}
                          </select>
                          <input type="date" className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50" value={assignForm[r.id]?.date || ''} onChange={(e)=> setAssignForm(s=>({...s, [r.id]: {...s[r.id], date: e.target.value}}))} />
                          <input type="time" className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50" value={assignForm[r.id]?.time || ''} onChange={(e)=> setAssignForm(s=>({...s, [r.id]: {...s[r.id], time: e.target.value}}))} />
                          <input type="number" className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50" placeholder="Duration (min)" value={(assignForm[r.id]?.duration as any)||60} onChange={(e)=> setAssignForm(s=>({...s, [r.id]: {...s[r.id], duration: parseInt(e.target.value||'60')}}))} />
                          <input type="text" className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 col-span-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50" placeholder="Notes (optional)" value={assignForm[r.id]?.notes || ''} onChange={(e)=> setAssignForm(s=>({...s, [r.id]: {...s[r.id], notes: e.target.value}}))} />
                        </div>
                        <button onClick={()=>onAssign(r.id)} className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600">Assign & Schedule</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
