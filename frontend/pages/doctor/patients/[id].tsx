import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../lib/auth';
import { therapyPlansApi, analyticsApi } from '../../../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

export default function PatientProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patient, setPatient] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignName, setAssignName] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && id) {
      init();
    }
  }, [user, authLoading, id]);

  const init = async () => {
    try {
      setLoading(true);
      const plansRes = await therapyPlansApi.list();
      const pdata = plansRes.data || plansRes;
      const plist = Array.isArray(pdata) ? pdata : (pdata?.therapyPlans || pdata?.data || []);
      const patientPlans = (plist || []).filter((pl:any)=> String(pl.patientId || pl.patient?.id) === String(id));
      setPlans(patientPlans);
      const pinfo = patientPlans.find((pl:any)=> !!pl.patient)?.patient || (patientPlans[0] ? { id: patientPlans[0].patientId } : null);
      setPatient(pinfo);

      // analytics for last 14 days with proper daily aggregation
      const endDate = new Date();
      const startDate = subDays(endDate, 14);
      try {
        const ares = await analyticsApi.adherence(startDate.toISOString(), endDate.toISOString());
        const adata = ares.data || ares;
        // Use daily series from backend if available
        if (adata?.daily && Array.isArray(adata.daily)) {
          const points = adata.daily.map((item: any) => ({
            date: format(new Date(item.date), 'MMM dd'),
            completions: item.count || 0,
          }));
          setChartData(points);
        } else {
          // Fallback to manual aggregation
          const therapyPlans = adata?.therapyPlans || [];
          const daily: Record<string, number> = {};
          therapyPlans.forEach((tp:any)=> {
            if (String(tp.patientId) === String(id)) {
              tp.exerciseBreakdown?.forEach((ex:any)=> {
                const key = format(new Date(), 'yyyy-MM-dd');
                daily[key] = (daily[key] || 0) + (ex.completions || 0);
              });
            }
          });
          const points: any[] = [];
          for (let i = 0; i <= 14; i++) {
            const d = subDays(endDate, 14 - i);
            const key = format(d, 'yyyy-MM-dd');
            points.push({ date: format(d, 'MMM dd'), completions: daily[key] || 0 });
          }
          setChartData(points);
        }
      } catch (err) {
        console.error('Analytics error', err);
        setChartData([]);
      }
      setError('');
    } catch (e:any) {
      setError(e.message || 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  const assignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setAssigning(true);
      const res = await therapyPlansApi.create({ patientId: parseInt(id), name: assignName || 'Therapy Plan' });
      if (!res.success) throw new Error(res.error || 'Failed');
      setShowAssign(false);
      setAssignName('');
      await init();
    } catch (e:any) {
      setError(e.message || 'Failed to assign plan');
    } finally {
      setAssigning(false);
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
        <div className="text-gray-600">For physiotherapists only.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
          <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <button onClick={()=> window.history.back()} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Patient Progress</h1>
                {patient && (
                  <p className="text-gray-600 mt-1">
                    {patient.firstName} {patient.lastName}
                    {patient.regNumber && <span className="ml-2 text-sm text-gray-500">({patient.regNumber})</span>}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button onClick={()=> setShowAssign(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all">
            Create Therapy Plan
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Adherence Overview (Last 14 days)</h2>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis dataKey="date" className="text-sm text-gray-600" />
                  <YAxis allowDecimals={false} className="text-sm text-gray-600" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderColor: '#e5e7eb',
                      borderRadius: '0.5rem',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    }}
                    labelStyle={{ color: '#1f2937', fontWeight: '600' }}
                    itemStyle={{ color: '#4b5563' }}
                  />
                  <Line type="monotone" dataKey="completions" stroke="#2563eb" strokeWidth={2} activeDot={{ r: 8 }} name="Completions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No adherence data available for this patient yet.</p>
              <p className="text-sm mt-2">Data will appear once the patient starts completing exercises.</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Therapy Plans</h2>
            <button onClick={()=> setShowAssign(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Create Plan</button>
          </div>
          <div className="p-4">
            {plans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No therapy plans assigned to this patient yet.</p>
                <p className="text-sm mt-2">Create a plan to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((pl:any)=> (
                  <div key={pl.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{pl.name || 'Therapy Plan'}</h3>
                          <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">v{pl.version || 1}</span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            pl.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            pl.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {pl.status || 'ACTIVE'}
                          </span>
                        </div>
                        {pl.exercises?.length ? (
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">{pl.exercises.length}</span> {pl.exercises.length === 1 ? 'exercise' : 'exercises'}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 mb-2">No exercises in this plan</div>
                        )}
                        {pl.description && (
                          <p className="text-sm text-gray-600 mt-2">{pl.description}</p>
                        )}
                      </div>
                      <div className="ml-4">
                        <a href={`/therapy-plans/detail?id=${pl.id}`} className="px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                          View Details
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showAssign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b"><h2 className="text-xl font-semibold">Assign Therapy Plan</h2></div>
              <form onSubmit={assignPlan} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Plan name</label>
                  <input className="w-full px-3 py-2 border rounded-lg" value={assignName} onChange={(e)=> setAssignName(e.target.value)} placeholder="e.g., Back Rehab" />
                </div>
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={()=> setShowAssign(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button type="submit" disabled={assigning} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{assigning ? 'Assigning…' : 'Assign'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
