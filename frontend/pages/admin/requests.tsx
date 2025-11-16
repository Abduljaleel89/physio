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
        <h1 className="text-3xl font-bold mb-2">Visit Requests</h1>
        <p className="text-gray-600 mb-4">Manage incoming patient requests.</p>
        {err && <div className="mb-4 p-3 border border-red-200 bg-red-50 text-sm text-red-700">{err}</div>}
        <div className="bg-white border rounded-lg shadow overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Requested</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3">{r.patient?.firstName} {r.patient?.lastName}</td>
                  <td className="px-4 py-3">{new Date(r.requestedAt || r.requestedDate || r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{r.reason || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full border ${r.status==='APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : r.status==='REJECTED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {isDoctor && (
                      <div className="space-x-2">
                        <button onClick={()=>onRespond(r.id, 'APPROVED')} className="px-3 py-1 text-sm bg-green-600 text-white rounded">Approve</button>
                        <button onClick={()=>onRespond(r.id, 'REJECTED')} className="px-3 py-1 text-sm bg-red-600 text-white rounded">Reject</button>
                      </div>
                    )}
                    {isStaff && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select className="border rounded px-2 py-1" value={(assignForm[r.id]?.doctorId as any)||''} onChange={(e)=> setAssignForm(s=>({...s, [r.id]: {...s[r.id], doctorId: parseInt(e.target.value)}}))}>
                            <option value="">Doctor…</option>
                            {doctors.map((d)=> (<option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>))}
                          </select>
                          <input type="date" className="border rounded px-2 py-1" value={assignForm[r.id]?.date || ''} onChange={(e)=> setAssignForm(s=>({...s, [r.id]: {...s[r.id], date: e.target.value}}))} />
                          <input type="time" className="border rounded px-2 py-1" value={assignForm[r.id]?.time || ''} onChange={(e)=> setAssignForm(s=>({...s, [r.id]: {...s[r.id], time: e.target.value}}))} />
                          <input type="number" className="border rounded px-2 py-1" placeholder="Duration (min)" value={(assignForm[r.id]?.duration as any)||60} onChange={(e)=> setAssignForm(s=>({...s, [r.id]: {...s[r.id], duration: parseInt(e.target.value||'60')}}))} />
                          <input type="text" className="border rounded px-2 py-1 col-span-2" placeholder="Notes (optional)" value={assignForm[r.id]?.notes || ''} onChange={(e)=> setAssignForm(s=>({...s, [r.id]: {...s[r.id], notes: e.target.value}}))} />
                        </div>
                        <button onClick={()=>onAssign(r.id)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Assign & Schedule</button>
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
