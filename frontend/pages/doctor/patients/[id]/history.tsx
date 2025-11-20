import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../components/Layout';
import { useAuth } from '../../../../lib/auth';
import { doctorApi } from '../../../../lib/api';

export default function PatientHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && user.role === 'PHYSIOTHERAPIST' && id) {
      loadHistory();
    }
  }, [user, authLoading, id, router]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await doctorApi.getPatientHistory(parseInt(id as string));
      if (response.success) {
        setHistory(response.data);
      } else {
        setError(response.error || 'Failed to load patient history');
      }
    } catch (e: any) {
      console.error('Failed to load patient history:', e);
      setError(e.response?.data?.error || e.message || 'Failed to load patient history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'BEGINNER':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
      case 'INTERMEDIATE':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
      case 'ADVANCED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'COMPLETED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'PAUSED':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'CANCELLED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading patient history...</div>
        </div>
      </Layout>
    );
  }

  if (!user || user.role !== 'PHYSIOTHERAPIST') {
    return (
      <Layout>
        <div className="text-gray-600 dark:text-gray-400">This page is for physiotherapists.</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="px-4 sm:px-0">
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="text-sm text-red-800 dark:text-red-300 font-medium">{error}</div>
          </div>
          <button
            onClick={() => router.push('/doctor/patients')}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            Back to Patients
          </button>
        </div>
      </Layout>
    );
  }

  if (!history) {
    return (
      <Layout>
        <div className="text-gray-600 dark:text-gray-400">No history data available.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-6">
          <button
            onClick={() => router.push('/doctor/patients')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center mb-4"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Patients
          </button>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-2">
            Patient History: {history.patient.firstName} {history.patient.lastName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {history.patient.regNumber && `Registration: ${history.patient.regNumber}`}
            {history.patient.email && ` • Email: ${history.patient.email}`}
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Plans</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">{history.statistics.totalPlans}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Exercises</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">{history.statistics.totalExercises}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Completions</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">{history.statistics.totalCompletions}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg. Pain Level</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {history.statistics.averagePainLevel !== null ? `${history.statistics.averagePainLevel}/10` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Therapy Plans */}
        <div className="space-y-6">
          {history.therapyPlans.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No therapy plans found for this patient.</p>
            </div>
          ) : (
            history.therapyPlans.map((plan: any) => (
              <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
                <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50 mb-2">
                        {plan.name || 'Therapy Plan'}
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">(v{plan.version || 1})</span>
                      </h2>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Created: {formatDate(plan.createdAt)}</span>
                        {plan.doctor && (
                          <span>Doctor: Dr. {plan.doctor.firstName} {plan.doctor.lastName}</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(plan.status)}`}>
                      {plan.status}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {plan.exercises.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No exercises in this plan.</p>
                  ) : (
                    <div className="space-y-6">
                      {plan.exercises.map((exercise: any) => (
                        <div key={exercise.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-1">
                                {exercise.exercise?.name || 'Exercise'}
                              </h3>
                              {exercise.exercise?.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {exercise.exercise.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-3 text-sm">
                                {exercise.exercise?.difficulty && (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(exercise.exercise.difficulty)}`}>
                                    {exercise.exercise.difficulty}
                                  </span>
                                )}
                                <span className="text-gray-600 dark:text-gray-400">
                                  {exercise.sets} sets × {exercise.reps} reps • {exercise.frequency}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Completion Events */}
                          {exercise.completionEvents.length === 0 ? (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                              <p className="text-sm text-gray-500 dark:text-gray-400">No completions yet.</p>
                            </div>
                          ) : (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">
                                Completion History ({exercise.completionEvents.length})
                              </h4>
                              <div className="space-y-3">
                                {exercise.completionEvents.map((completion: any) => (
                                  <div key={completion.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                                    <div className="flex items-start justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                        {formatDate(completion.completedAt)}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                      {completion.painLevel !== null && completion.painLevel !== undefined && (
                                        <div>
                                          <span className="text-gray-600 dark:text-gray-400">Pain Level: </span>
                                          <span className="font-semibold text-gray-900 dark:text-gray-50">
                                            {completion.painLevel}/10
                                          </span>
                                        </div>
                                      )}
                                      {completion.satisfaction !== null && completion.satisfaction !== undefined && (
                                        <div>
                                          <span className="text-gray-600 dark:text-gray-400">Satisfaction: </span>
                                          <span className="font-semibold text-gray-900 dark:text-gray-50">
                                            {completion.satisfaction}/5
                                          </span>
                                        </div>
                                      )}
                                      {completion.mediaUpload && (
                                        <div>
                                          <span className="text-gray-600 dark:text-gray-400">Media: </span>
                                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                                            Uploaded
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    {completion.notes && (
                                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                          <span className="font-medium">Notes: </span>
                                          {completion.notes}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

