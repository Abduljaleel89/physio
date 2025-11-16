import { useEffect, useMemo, useState } from 'react';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../lib/auth';
import { therapyPlansApi } from '../../../lib/api';

export default function DoctorPatientsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
      return;
    }
    if (user && user.role === 'PHYSIOTHERAPIST') {
      loadAssignedPatients();
    }
  }, [user, authLoading]);

  const loadAssignedPatients = async () => {
    try {
      setLoading(true);
      const plansRes = await therapyPlansApi.list();
      const data = plansRes.data || plansRes;
      const planList = Array.isArray(data) ? data : (data?.therapyPlans || data?.data || []);
      const mine = (planList || []).filter((pl:any) => pl.doctorId === user?.id || pl.doctor?.userId === user?.id);
      setPlans(mine);
      const patientMap = new Map<number, any>();
      for (const pl of mine) {
        const pid = pl.patientId || pl.patient?.id;
        if (pid && !patientMap.has(pid)) {
          patientMap.set(pid, pl.patient || { id: pid, firstName: 'Patient', lastName: String(pid) });
        }
      }
      setPatients(Array.from(patientMap.values()));
      setError('');
    } catch (e:any) {
      console.error('DoctorPatients load error', e);
      if (e?.response?.status === 403) {
        // Treat as no data for now
        setPlans([]);
        setPatients([]);
        setError('');
      } else {
        setError(e.message || 'Failed to load');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return (patients || []).filter((p:any) => {
      const name = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
      return !term || name.includes(term) || String(p.id).includes(term);
    });
  }, [patients, filter]);

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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Patients</h1>
            <p className="text-gray-600">Patients with therapy plans assigned to you</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <input 
                placeholder="Search patients…" 
                value={filter} 
                onChange={(e)=> setFilter(e.target.value)} 
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          {(filteredPatients.length === 0) ? (
            <div className="p-12 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-lg font-medium">No assigned patients found</p>
              <p className="text-sm mt-1">Patients will appear here once therapy plans are assigned to you.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredPatients.map((p:any) => (
                <div key={p.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-700 font-semibold text-sm">
                            {p.firstName?.[0]?.toUpperCase() || ''}{p.lastName?.[0]?.toUpperCase() || ''}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-lg">{p.firstName} {p.lastName}</div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            Patient ID: {p.id}
                            {p.regNumber && <span className="ml-2">• {p.regNumber}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <a 
                        href={`/doctor/patients/${p.id}`} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm hover:shadow-md transition-all"
                      >
                        View Progress
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
