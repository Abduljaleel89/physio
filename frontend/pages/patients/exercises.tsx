import { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/auth';
import { patientsApi, therapyPlansApi, completionEventsApi } from '../../lib/api';

export default function MyExercisesPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patientId, setPatientId] = useState<number | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [pain, setPain] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      if (!authLoading && !user) {
        window.location.href = '/login';
        return;
      }
      if (user && user.role === 'PATIENT') {
        try {
          setLoading(true);
          const pid = await patientsApi.getMyPatientId();
          if (pid) setPatientId(pid);
          const res = await therapyPlansApi.list();
          const data = res.data || res;
          const list = Array.isArray(data) ? data : (data?.therapyPlans || data?.data || []);
          // Filter plans for this patient
          const filtered = list.filter((p: any) => p.patientId === pid || p.patient?.id === pid);
          setPlans(filtered);
          setError('');
        } catch (e: any) {
          setError(e.message || 'Failed to load data');
        } finally {
          setLoading(false);
        }
      }
    };
    init();
  }, [user, authLoading]);

  const openComplete = (exercise: any) => {
    setSelectedExercise(exercise);
    setPain(0);
    setNotes('');
    setFile(null);
  };

  const submitCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !selectedExercise) return;
    try {
      setSaving(true);
      const payload: any = {
        therapyPlanExerciseId: selectedExercise.id || selectedExercise.therapyPlanExerciseId,
        pain: String(pain),
        notes,
      };
      if (file) payload.file = file;
      const res = await completionEventsApi.create(patientId, payload);
      if (!res.success) throw new Error(res.error || 'Failed');
      setSelectedExercise(null);
      setNotes('');
      setPain(0);
      setFile(null);
      // reload recent
      try {
        const recentRes = await patientsApi.getCompletions(undefined);
        const rdata = recentRes.data || recentRes;
        const rlist = Array.isArray(rdata) ? rdata : (rdata?.completionEvents || rdata?.data || []);
        setRecent(rlist.slice(0, 10));
      } catch(_){}
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const undoCompletion = async (ev: any) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
      const apiUrl = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;
      const res = await fetch(`${apiUrl}/completion-events/${ev.id}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' ? { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } : {}) },
        body: JSON.stringify({ reason: 'Self undo' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed');
      setRecent((prev) => prev.filter((e) => e.id !== ev.id));
    } catch (e:any) {
      setError(e.message || 'Failed to undo');
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading…</div>
        </div>
      </Layout>
    );
  }

  if (!user || user.role !== 'PATIENT' || !patientId) {
    return (
      <Layout>
        <div className="text-gray-600">This page is for patients.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Exercises</h1>
          <p className="text-gray-600">View your therapy plans and log completions</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3 text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {plans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-gray-600">
            No therapy plans assigned yet.
          </div>
        ) : (
          <div className="space-y-6">
            {plans.map((p:any) => (
              <div key={p.id} className="bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="p-4 border-b">
                  <h2 className="text-xl font-semibold text-gray-900">{p.name || 'Therapy Plan'} <span className="text-sm text-gray-500">(v{p.version || 1})</span></h2>
                  {p.doctor && (
                    <p className="text-sm text-gray-600">Doctor: Dr. {p.doctor.firstName} {p.doctor.lastName}</p>
                  )}
                </div>
                <div className="p-4">
                  {!p.exercises || p.exercises.length === 0 ? (
                    <p className="text-gray-500">No exercises in this plan.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {p.exercises.map((tpe:any) => (
                        <li key={tpe.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{tpe.exercise?.name || tpe.name || 'Exercise'}</div>
                            {tpe.exercise?.description && (
                              <div className="text-sm text-gray-600">{tpe.exercise.description}</div>
                            )}
                          </div>
                          <button
                            onClick={() => openComplete(tpe)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Mark Complete
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedExercise && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Log Completion</h3>
                <p className="text-sm text-gray-600">{selectedExercise.exercise?.name || 'Exercise'}</p>
              </div>
              <form onSubmit={submitCompletion} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pain level (0-10)</label>
                  <input type="number" min={0} max={10} value={pain} onChange={(e)=> setPain(parseInt(e.target.value||'0'))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={3} value={notes} onChange={(e)=> setNotes(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attach photo/video (optional)</label>
                  <input type="file" accept="image/*,video/*" onChange={(e)=> setFile(e.target.files?.[0] || null)} className="w-full" />
                </div>
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={()=> setSelectedExercise(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {recent.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Recent Completions</h3>
            </div>
            <ul className="divide-y divide-gray-100">
              {recent.map((ev:any) => (
                <li key={ev.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{ev.exercise?.name || ev.exerciseName || 'Exercise'}</div>
                    <div className="text-xs text-gray-500">{new Date(ev.completedAt || ev.createdAt).toLocaleString()}</div>
                  </div>
                  {!ev.undone && ev.canUndo && (
                    <button onClick={()=> undoCompletion(ev)} className="px-3 py-1 text-sm border rounded">Undo</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}

