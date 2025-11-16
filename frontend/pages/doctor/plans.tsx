import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/auth';
import { doctorApi, therapyPlansApi } from '../../lib/api';

export default function DoctorPlansPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createPatientId, setCreatePatientId] = useState('');
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [exName, setExName] = useState('');
  const [exDesc, setExDesc] = useState('');
  const [exSets, setExSets] = useState<number>(3);
  const [exReps, setExReps] = useState<number>(10);
  const [exFrequency, setExFrequency] = useState<string>('daily');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
      return;
    }
    if (user && user.role === 'PHYSIOTHERAPIST') {
      load();
      loadPatients();
    }
  }, [user, authLoading]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await therapyPlansApi.list();
      const data = res.data || res;
      const list = Array.isArray(data) ? data : (data?.therapyPlans || data?.data || []);
      const mine = list.filter((p:any) => p.doctor?.userId === user?.id);
      setPlans(mine);
      setError('');
    } catch (e:any) {
      setError(e.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const res = await doctorApi.myPatients();
      const data = res.data || res;
      const list = Array.isArray(data) ? data : (data?.patients || data?.data || []);
      setPatients(list);
    } catch(_){ setPatients([]); }
  };

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const payload: any = { patientId: parseInt(createPatientId), name: createName || 'Therapy Plan' };
      const res = await therapyPlansApi.create(payload);
      if (!res.success) throw new Error(res.error || 'Failed');
      setShowCreate(false);
      setCreatePatientId('');
      setCreateName('');
      await load();
    } catch (e:any) {
      setError(e.message || 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  const addExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    try {
      setAdding(true);
      const payload: any = { name: exName, description: exDesc, sets: exSets, reps: exReps, frequency: exFrequency };
      const res = await therapyPlansApi.addExercise(selectedPlan.id, payload);
      if (!res.success) throw new Error(res.error || 'Failed');
      setExName(''); setExDesc(''); setExSets(3); setExReps(10); setExFrequency('daily');
      setSelectedPlan(null);
      await load();
    } catch (e:any) {
      setError(e.message || 'Failed to add exercise');
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (exercise: any, plan: any) => {
    setEditingExercise({ ...exercise, planId: plan.id });
    setExName(exercise.exercise?.name || exercise.name || '');
    setExDesc(exercise.exercise?.description || exercise.description || '');
    setExSets(exercise.sets || 3);
    setExReps(exercise.reps || 10);
    setExFrequency(exercise.frequency || 'daily');
  };

  const updateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExercise) return;
    try {
      setEditing(true);
      const payload: any = { name: exName, description: exDesc, sets: exSets, reps: exReps, frequency: exFrequency };
      const res = await therapyPlansApi.editExercise(editingExercise.planId, editingExercise.exerciseId || editingExercise.exercise?.id, payload);
      if (!res.success) throw new Error(res.error || 'Failed');
      setEditingExercise(null);
      setExName(''); setExDesc(''); setExSets(3); setExReps(10); setExFrequency('daily');
      await load();
    } catch (e:any) {
      setError(e.message || 'Failed to update exercise');
    } finally {
      setEditing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64"><div className="text-gray-500">Loading…</div></div>
      </Layout>
    );
  }

  if (!user || user.role !== 'PHYSIOTHERAPIST') {
    return (
      <Layout>
        <div className="text-gray-600">This page is for physiotherapists.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Therapy Plans</h1>
            <p className="text-gray-600">Create and manage plans for your patients</p>
          </div>
          <button onClick={()=> setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">New Plan</button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {plans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-gray-600">No plans yet.</div>
        ) : (
          <div className="space-y-6">
            {plans.map((p:any) => (
              <div key={p.id} className="bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{p.name || 'Therapy Plan'} <span className="text-sm text-gray-500">(v{p.version || 1})</span></div>
                    <div className="text-sm text-gray-600">Patient: {p.patient?.firstName} {p.patient?.lastName}</div>
                  </div>
                  <div className="space-x-2">
                    <button onClick={()=> setSelectedPlan(p)} className="px-3 py-1.5 text-sm border rounded">Add Exercise</button>
                  </div>
                </div>
                <div className="p-4">
                  {!p.exercises || p.exercises.length === 0 ? (
                    <div className="text-gray-500">No exercises in this plan.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {p.exercises
                        .slice()
                        .sort((a:any,b:any)=> (a.order||0)-(b.order||0))
                        .map((tpe:any, idx:number) => (
                        <li key={tpe.id} className="py-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{tpe.exercise?.name || tpe.name}</div>
                              {tpe.exercise?.description && (
                                <div className="text-sm text-gray-600">{tpe.exercise.description}</div>
                              )}
                              <div className="text-xs text-gray-500">{(tpe.sets ?? '-') } sets x {(tpe.reps ?? '-') } reps • {tpe.frequency || '—'}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button onClick={()=> openEditModal(tpe, p)} className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">Edit</button>
                              <button onClick={async()=>{ if(confirm('Delete this exercise?')) { await therapyPlansApi.archiveExercise(p.id, tpe.exerciseId || tpe.exercise?.id); await load(); } }} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">Delete</button>
                              <button disabled={idx===0} onClick={async()=>{ const items=p.exercises.map((e:any,i:number)=>({ id:e.id, order: i })); const tmp=items[idx]; items[idx]=items[idx-1]; items[idx-1]=tmp; await therapyPlansApi.reorderExercises(p.id, items); await load(); }} className="px-2 py-1.5 text-xs border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" title="Move up">↑</button>
                              <button disabled={idx===p.exercises.length-1} onClick={async()=>{ const items=p.exercises.map((e:any,i:number)=>({ id:e.id, order: i })); const tmp=items[idx]; items[idx]=items[idx+1]; items[idx+1]=tmp; await therapyPlansApi.reorderExercises(p.id, items); await load(); }} className="px-2 py-1.5 text-xs border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" title="Move down">↓</button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b"><h2 className="text-xl font-semibold">Create Plan</h2></div>
              <form onSubmit={createPlan} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Patient</label>
                  <select className="w-full px-3 py-2 border rounded-lg" required value={createPatientId} onChange={(e)=> setCreatePatientId(e.target.value)}>
                    <option value="">Select patient…</option>
                    {patients.map((p:any)=>(
                      <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Plan name</label>
                  <input className="w-full px-3 py-2 border rounded-lg" value={createName} onChange={(e)=> setCreateName(e.target.value)} placeholder="e.g., Shoulder Rehab" />
                </div>
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={()=> setShowCreate(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{creating ? 'Creating…' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {selectedPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b"><h2 className="text-xl font-semibold">Add Exercise to Plan</h2></div>
              <form onSubmit={addExercise} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Exercise name</label>
                  <input className="w-full px-3 py-2 border rounded-lg" value={exName} onChange={(e)=> setExName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea className="w-full px-3 py-2 border rounded-lg" rows={3} value={exDesc} onChange={(e)=> setExDesc(e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Sets</label>
                    <input type="number" min={1} value={exSets} onChange={(e)=> setExSets(parseInt(e.target.value||'1'))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Reps</label>
                    <input type="number" min={1} value={exReps} onChange={(e)=> setExReps(parseInt(e.target.value||'1'))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Frequency</label>
                    <input value={exFrequency} onChange={(e)=> setExFrequency(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., daily" />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={()=> { setSelectedPlan(null); setExName(''); setExDesc(''); setExSets(3); setExReps(10); setExFrequency('daily'); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={adding} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{adding ? 'Adding…' : 'Add Exercise'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingExercise && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b"><h2 className="text-xl font-semibold">Edit Exercise</h2></div>
              <form onSubmit={updateExercise} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Exercise name</label>
                  <input className="w-full px-3 py-2 border rounded-lg" value={exName} onChange={(e)=> setExName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea className="w-full px-3 py-2 border rounded-lg" rows={3} value={exDesc} onChange={(e)=> setExDesc(e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Sets</label>
                    <input type="number" min={1} value={exSets} onChange={(e)=> setExSets(parseInt(e.target.value||'1'))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Reps</label>
                    <input type="number" min={1} value={exReps} onChange={(e)=> setExReps(parseInt(e.target.value||'1'))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Frequency</label>
                    <input value={exFrequency} onChange={(e)=> setExFrequency(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., daily" />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={()=> { setEditingExercise(null); setExName(''); setExDesc(''); setExSets(3); setExReps(10); setExFrequency('daily'); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={editing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{editing ? 'Updating…' : 'Update Exercise'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
