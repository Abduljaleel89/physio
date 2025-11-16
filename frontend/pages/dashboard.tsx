import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import Layout from '../components/Layout';
import { appointmentsApi, therapyPlansApi, analyticsApi } from '../lib/api';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    appointments: 0,
    therapyPlans: 0,
  });
  const [loading, setLoading] = useState(true);
  const [adherenceData, setAdherenceData] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadStats();
      loadAdherence();
    }
  }, [user, authLoading, router]);

  const loadStats = async () => {
    try {
      const [appointmentsRes, plansRes] = await Promise.all([
        appointmentsApi.list().catch(() => ({ success: false, data: [] })),
        therapyPlansApi.list().catch(() => ({ success: false, data: [] })),
      ]);

      const getArrayLength = (data: any) => {
        if (Array.isArray(data)) return data.length;
        if (data?.appointments) return data.appointments.length;
        if (data?.plans) return data.plans.length;
        if (data?.therapyPlans) return data.therapyPlans.length;
        if (data?.data) return Array.isArray(data.data) ? data.data.length : 0;
        return 0;
      };

      setStats({
        appointments: appointmentsRes.success ? getArrayLength(appointmentsRes.data) : 0,
        therapyPlans: plansRes.success ? getArrayLength(plansRes.data) : 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdherence = async () => {
    try {
      // last 14 days
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 13);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const res = await analyticsApi.adherence(fmt(start), fmt(end));
      if (res.success && res.data?.therapyPlans) {
        // flatten to daily counts by plan
        const plans = res.data.therapyPlans as any[];
        // build simple series: plan name with totalCompletions
        const chart = plans.map((p) => ({
          name: p.therapyPlanName || `Plan ${p.therapyPlanId}`,
          completions: p.totalCompletions || 0,
        }));
        setAdherenceData(chart);
      } else {
        setAdherenceData([]);
      }
    } catch (e) {
      setAdherenceData([]);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const welcomeMessage = () => {
    switch (user.role) {
      case 'ADMIN':
        return 'Welcome, Administrator';
      case 'PHYSIOTHERAPIST':
        return 'Welcome, Doctor';
      case 'RECEPTIONIST':
        return 'Welcome, Receptionist';
      case 'PATIENT':
        return 'Welcome to your Patient Portal';
      default:
        return 'Welcome';
    }
  };

      return (
        <Layout>
          <div className="w-full animate-fade-in">
            <div className="mb-6 sm:mb-8 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-primary-600 to-gray-900 dark:from-gray-100 dark:via-primary-400 dark:to-gray-100 bg-clip-text text-transparent mb-2 break-words animate-shimmer bg-[length:200%_auto]">
                    {welcomeMessage()}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-2">
                    <svg className="w-4 h-4 text-primary-500 dark:text-primary-400 flex-shrink-0 animate-float" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="truncate">{user.email}</span>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/20 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-600 whitespace-nowrap shadow-sm">
                      {user.role}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary-500 via-primary-400 to-primary-600 dark:from-primary-600 dark:via-primary-500 dark:to-primary-700 rounded-2xl flex items-center justify-center shadow-glow animate-float">
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4 sm:ml-5 flex-1 min-w-0">
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Appointments</dt>
                      <dd className="mt-1 text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 dark:from-primary-400 dark:to-primary-300 bg-clip-text text-transparent">{stats.appointments}</dd>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 via-emerald-400 to-emerald-600 dark:from-emerald-600 dark:via-emerald-500 dark:to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg animate-float" style={{ animationDelay: '0.2s' }}>
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4 sm:ml-5 flex-1 min-w-0">
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Therapy Plans</dt>
                      <dd className="mt-1 text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">{stats.therapyPlans}</dd>
                    </div>
                  </div>
                </div>
              </div>

          {user.role === 'PATIENT' && (
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-accent-500 via-accent-400 to-accent-600 dark:from-accent-600 dark:via-accent-500 dark:to-accent-700 rounded-2xl flex items-center justify-center shadow-lg animate-float" style={{ animationDelay: '0.3s' }}>
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 sm:ml-5 flex-1 min-w-0">
                  <dt className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 truncate">My Exercises</dt>
                  <dd className="mt-1">
                    <a href="/therapy-plans" className="text-base sm:text-lg font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                      View Plans →
                    </a>
                  </dd>
                </div>
              </div>
            </div>
          )}
        </div>

        {user.role === 'ADMIN' && (
          <div className="mt-6 sm:mt-8 mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50 mb-4 sm:mb-6">Admin Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <a
                href="/admin/users"
                className="group relative card hover:border-primary-400 dark:hover:border-primary-500"
              >
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-900/60 transition-colors">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-50 mb-1">User Management</h3>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Create users and manage accounts</p>
                <span className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-lg sm:text-xl">→</span>
              </a>
              <a
                href="/admin/assignments"
                className="group relative card hover:border-primary-400 dark:hover:border-primary-500"
              >
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-900/60 transition-colors">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-50 mb-1">Assignments</h3>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Assign doctors to patients</p>
                <span className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-lg sm:text-xl">→</span>
              </a>
            </div>
          </div>
        )}

        <div className="mt-6 sm:mt-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50 mb-4 sm:mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {user.role !== 'PATIENT' && (
              <a
                href="/exercises"
                className="group relative card hover:border-primary-400 dark:hover:border-primary-500"
              >
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-900/60 transition-colors">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-50 mb-1">Manage Exercises</h3>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Create and edit exercises</p>
                <span className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-lg sm:text-xl">→</span>
              </a>
            )}
            <a
              href="/therapy-plans"
              className="group relative card hover:border-primary-400 dark:hover:border-primary-500"
            >
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-900/60 transition-colors">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-50 mb-1">View Therapy Plans</h3>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                {user.role === 'PATIENT' ? 'View your assigned plans' : 'Manage therapy plans'}
              </p>
              <span className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-lg sm:text-xl">→</span>
            </a>
            <a
              href="/appointments"
              className="group relative card hover:border-primary-400 dark:hover:border-primary-500"
            >
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-900/60 transition-colors">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-50 mb-1">Appointments</h3>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">View and manage appointments</p>
              <span className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-lg sm:text-xl">→</span>
            </a>
          </div>
        </div>

        <div className="mt-6 sm:mt-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50 mb-4 sm:mb-6">Adherence Overview</h2>
          <div className="card">
            {adherenceData.length === 0 ? (
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 text-center py-4 sm:py-8">No adherence data available for the selected period.</p>
            ) : (
              <div className="w-full h-48 sm:h-64 lg:h-80 overflow-x-auto">
                <ResponsiveContainer width="100%" height="100%" minHeight={192}>
                  <LineChart data={adherenceData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="5 5" className="stroke-gray-300 dark:stroke-slate-600" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="completions" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

