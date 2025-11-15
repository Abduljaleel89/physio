import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import Layout from '../../components/Layout';
import { exercisesApi, completionEventsApi, therapyPlansApi } from '../../lib/api';

export default function ExerciseViewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id, therapyPlanExerciseId, therapyPlanId } = router.query;
  const [exercise, setExercise] = useState<any>(null);
  const [therapyPlanExercise, setTherapyPlanExercise] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [videoWatched, setVideoWatched] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionForm, setCompletionForm] = useState({
    notes: '',
    painLevel: '',
    satisfaction: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (id && user) {
      loadExercise();
    }
  }, [id, user, authLoading, router]);

  const loadExercise = async () => {
    try {
      setLoading(true);
      const exerciseRes = await exercisesApi.get(parseInt(id as string));
      
      if (exerciseRes.success) {
        setExercise(exerciseRes.data.exercise);
      }

      // If viewing from therapy plan, load the therapy plan exercise info
      if (therapyPlanExerciseId && therapyPlanId) {
        try {
          const planRes = await therapyPlansApi.get(parseInt(therapyPlanId as string));
          if (planRes.success && planRes.data.therapyPlan) {
            const plan = planRes.data.therapyPlan;
            const planExercise = plan.exercises?.find(
              (ex: any) => ex.id === parseInt(therapyPlanExerciseId as string)
            );
            if (planExercise) {
              setTherapyPlanExercise(planExercise);
            }
          }
        } catch (err) {
          console.error('Failed to load therapy plan exercise:', err);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load exercise');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoEnded = () => {
    setVideoWatched(true);
  };

  const handleVideoProgress = () => {
    // Mark as watched if video has been played significantly
    setVideoWatched(true);
  };

  const handleCompleteExercise = async () => {
    if (!therapyPlanExerciseId || !user) {
      setError('Cannot complete exercise without therapy plan context');
      return;
    }

    setError('');
    setCompleting(true);

    try {
      // Get patient ID from user - need to fetch patient profile
      let patientId = user.id;
      if (user.role === 'PATIENT') {
        // Try to get patient ID from therapy plan if available
        if (therapyPlanId) {
          try {
            const planRes = await therapyPlansApi.get(parseInt(therapyPlanId as string));
            if (planRes.success && planRes.data.therapyPlan?.patientId) {
              patientId = planRes.data.therapyPlan.patientId;
            }
          } catch (e) {
            console.error('Failed to get patient ID from plan:', e);
          }
        }
      }
      
      const completionData = {
        therapyPlanExerciseId: parseInt(therapyPlanExerciseId as string),
        therapyPlanId: therapyPlanId ? parseInt(therapyPlanId as string) : undefined,
        exerciseId: exercise?.id,
        notes: completionForm.notes || undefined,
        painLevel: completionForm.painLevel ? parseInt(completionForm.painLevel) : undefined,
        painRating: completionForm.painLevel ? parseInt(completionForm.painLevel) : undefined,
        satisfaction: completionForm.satisfaction ? parseInt(completionForm.satisfaction) : undefined,
      };

      const response = await completionEventsApi.create(patientId, completionData);
      
      if (response.success) {
        setSuccess('Exercise marked as completed successfully!');
        setCompletionForm({
          notes: '',
          painLevel: '',
          satisfaction: '',
        });
        // Redirect back to therapy plans after a delay
        setTimeout(() => {
          router.push('/therapy-plans');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete exercise');
    } finally {
      setCompleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading exercise...</div>
        </div>
      </Layout>
    );
  }

  if (!user || !exercise) {
    return null;
  }

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'BEGINNER':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'INTERMEDIATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ADVANCED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-6">
          <Link
            href={therapyPlanId ? `/therapy-plans/${therapyPlanId}` : '/therapy-plans'}
            className="text-blue-600 hover:text-blue-800 flex items-center mb-4"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{exercise.name}</h1>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(exercise.difficulty)}`}>
              {exercise.difficulty}
            </span>
            {exercise.duration && (
              <span className="text-sm text-gray-600">
                Duration: {exercise.duration} minutes
              </span>
            )}
          </div>
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

        {success && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="ml-3 text-sm text-green-700">{success}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
              {exercise.videoUrl ? (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Exercise Video</h2>
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <video
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                      controls
                      onEnded={handleVideoEnded}
                      onTimeUpdate={handleVideoProgress}
                    >
                      <source src={exercise.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    {videoWatched 
                      ? '✓ Video watched. You can now mark this exercise as completed.' 
                      : 'Please watch the video to understand how to perform this exercise.'}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No video available for this exercise</p>
                </div>
              )}
            </div>

            {exercise.description && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{exercise.description}</p>
              </div>
            )}

            {exercise.instructions && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
                <div className="text-gray-700 whitespace-pre-wrap">{exercise.instructions}</div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            {therapyPlanExerciseId && user.role === 'PATIENT' && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Complete Exercise</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pain Level (1-10)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={completionForm.painLevel}
                      onChange={(e) => setCompletionForm({ ...completionForm, painLevel: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Satisfaction (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={completionForm.satisfaction}
                      onChange={(e) => setCompletionForm({ ...completionForm, satisfaction: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={completionForm.notes}
                      onChange={(e) => setCompletionForm({ ...completionForm, notes: e.target.value })}
                      placeholder="How did the exercise feel? Any observations?"
                    />
                  </div>

                  <button
                    onClick={handleCompleteExercise}
                    disabled={completing || (!videoWatched && !!exercise.videoUrl)}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {completing ? 'Completing...' : 'Mark as Completed'}
                  </button>

                  {!videoWatched && exercise.videoUrl && (
                    <p className="text-xs text-gray-500 text-center">
                      Please watch the video before marking as completed
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

