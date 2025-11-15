import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import Layout from '../../components/Layout';
import { therapyPlansApi } from '../../lib/api';
import Link from 'next/link';

export default function TherapyPlanDetail() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (id && user) {
      loadPlan();
    }
  }, [id, user, authLoading, router]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const response = await therapyPlansApi.get(parseInt(id as string));
      if (response.success) {
        setPlan(response.data.therapyPlan);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load therapy plan');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading therapy plan...</div>
        </div>
      </Layout>
    );
  }

  if (!user || !plan) {
    return null;
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-6">
          <Link href="/therapy-plans" className="text-blue-600 hover:text-blue-800 flex items-center mb-4">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Therapy Plans
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{plan.name}</h1>
          {plan.description && (
            <p className="text-gray-600 mb-4">{plan.description}</p>
          )}
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

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Exercises</h2>
          {plan.exercises && plan.exercises.length > 0 ? (
            <div className="space-y-4">
              {plan.exercises.map((planExercise: any) => (
                <div
                  key={planExercise.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {planExercise.exercise?.name || 'Exercise'}
                      </h3>
                      {planExercise.exercise?.description && (
                        <p className="text-sm text-gray-600 mb-2">{planExercise.exercise.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {planExercise.reps && <span>Reps: {planExercise.reps}</span>}
                        {planExercise.sets && <span>Sets: {planExercise.sets}</span>}
                        {planExercise.exercise?.videoUrl && (
                          <span className="flex items-center text-green-600">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Video Available
                          </span>
                        )}
                      </div>
                    </div>
                    {user.role === 'PATIENT' && planExercise.exercise?.id && (
                      <Link
                        href={`/exercises/view?id=${planExercise.exercise.id}&therapyPlanExerciseId=${planExercise.id}&therapyPlanId=${plan.id}`}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Exercise
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No exercises assigned to this therapy plan.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

