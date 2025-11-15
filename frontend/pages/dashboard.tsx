import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import Layout from '../components/Layout';
import { appointmentsApi, therapyPlansApi } from '../lib/api';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    appointments: 0,
    therapyPlans: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadStats();
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
      <div className="px-4 sm:px-0">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{welcomeMessage()}</h1>
              <p className="text-gray-600 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {user.email}
                <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {user.role}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Appointments</dt>
                  <dd className="mt-1 text-3xl font-bold text-gray-900">{stats.appointments}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Therapy Plans</dt>
                  <dd className="mt-1 text-3xl font-bold text-gray-900">{stats.therapyPlans}</dd>
                </div>
              </div>
            </div>
          </div>

          {user.role === 'PATIENT' && (
            <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 flex-1">
                    <dt className="text-sm font-medium text-gray-500 truncate">My Exercises</dt>
                    <dd className="mt-1">
                      <a href="/therapy-plans" className="text-lg font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                        View Plans →
                      </a>
                    </dd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {user.role === 'ADMIN' && (
          <div className="mt-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Tools</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <a
                href="/admin/users"
                className="group relative block p-6 bg-white border-2 border-gray-200 rounded-xl shadow-md hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">User Management</h3>
                <p className="text-sm text-gray-500">Create users and manage accounts</p>
                <span className="absolute top-4 right-4 text-gray-400 group-hover:text-blue-600 transition-colors">→</span>
              </a>
              <a
                href="/admin/assignments"
                className="group relative block p-6 bg-white border-2 border-gray-200 rounded-xl shadow-md hover:shadow-xl hover:border-green-300 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Assignments</h3>
                <p className="text-sm text-gray-500">Assign doctors to patients</p>
                <span className="absolute top-4 right-4 text-gray-400 group-hover:text-green-600 transition-colors">→</span>
              </a>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {user.role !== 'PATIENT' && (
              <a
                href="/exercises"
                className="group relative block p-6 bg-white border-2 border-gray-200 rounded-xl shadow-md hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Manage Exercises</h3>
                <p className="text-sm text-gray-500">Create and edit exercises</p>
                <span className="absolute top-4 right-4 text-gray-400 group-hover:text-blue-600 transition-colors">→</span>
              </a>
            )}
            <a
              href="/therapy-plans"
              className="group relative block p-6 bg-white border-2 border-gray-200 rounded-xl shadow-md hover:shadow-xl hover:border-green-300 transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">View Therapy Plans</h3>
              <p className="text-sm text-gray-500">
                {user.role === 'PATIENT' ? 'View your assigned plans' : 'Manage therapy plans'}
              </p>
              <span className="absolute top-4 right-4 text-gray-400 group-hover:text-green-600 transition-colors">→</span>
            </a>
            <a
              href="/appointments"
              className="group relative block p-6 bg-white border-2 border-gray-200 rounded-xl shadow-md hover:shadow-xl hover:border-purple-300 transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Appointments</h3>
              <p className="text-sm text-gray-500">View and manage appointments</p>
              <span className="absolute top-4 right-4 text-gray-400 group-hover:text-purple-600 transition-colors">→</span>
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}

