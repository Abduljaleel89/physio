import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import Layout from '../../components/Layout';
import { therapyPlansApi, exercisesApi } from '../../lib/api';
import Link from 'next/link';

export default function TherapyPlanDetail() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [plan, setPlan] = useState<any>(null);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [assigningExercise, setAssigningExercise] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      if (user.role === 'PHYSIOTHERAPIST') {
        loadAllPlans();
      } else if (id) {
        loadPlan();
      }
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

  const loadAllPlans = async () => {
    try {
      setLoading(true);
      const response = await therapyPlansApi.list();
      const data = response.data || response;
      const planList = Array.isArray(data) ? data : (data?.therapyPlans || data?.data || []);
      
      // Filter plans for this doctor
      const doctorPlans = planList.filter((pl: any) => 
        pl.doctor?.userId === user?.id || pl.doctorId === user?.id
      );
      
      setAllPlans(doctorPlans);
      
      // Group by patient
      const patientMap = new Map<number, any>();
      for (const pl of doctorPlans) {
        const pid = pl.patientId || pl.patient?.id;
        if (pid && !patientMap.has(pid)) {
          patientMap.set(pid, {
            ...pl.patient,
            plans: doctorPlans.filter((p: any) => (p.patientId || p.patient?.id) === pid),
          });
        }
      }
      setPatients(Array.from(patientMap.values()));
      
      // If id is provided, also load that specific plan
      if (id) {
        const specificPlan = doctorPlans.find((p: any) => p.id === parseInt(id as string));
        if (specificPlan) {
          setPlan(specificPlan);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load therapy plans');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableExercises = async () => {
    try {
      const response = await exercisesApi.list();
      if (response.success) {
        setAvailableExercises(response.data.exercises || []);
      }
    } catch (err: any) {
      console.error('Failed to load exercises:', err);
    }
  };

  const handlePatientClick = async (patientId: number) => {
    setSelectedPatient(patientId);
    await loadAvailableExercises();
    setShowExerciseModal(true);
  };

  const handleAssignExercise = async (exerciseId: number) => {
    if (!selectedPatient) return;
    
    // Find the therapy plan for this patient
    const patientPlans = patients.find(p => p.id === selectedPatient)?.plans || [];
    const activePlan = patientPlans.find((p: any) => 
      p.status === 'ACTIVE' || (p.status !== 'COMPLETED' && p.status !== 'CANCELLED')
    );
    
    if (!activePlan) {
      setError('No active therapy plan found for this patient');
      return;
    }

    try {
      setAssigningExercise(true);
      setError('');
      setSuccess('');
      
      const response = await therapyPlansApi.addExercise(activePlan.id, {
        exerciseId: exerciseId,
        order: 0,
      });
      
      if (response.success) {
        setSuccess('Exercise assigned successfully! Notifications sent to patient, admin, and receptionist.');
        setShowExerciseModal(false);
        setSelectedPatient(null);
        // Reload plans to show updated exercises
        await loadAllPlans();
      } else {
        setError(response.error || 'Failed to assign exercise');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign exercise');
    } finally {
      setAssigningExercise(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  // For doctors: Show all assigned patients
  if (user.role === 'PHYSIOTHERAPIST') {
    return (
      <Layout>
        <div className="px-4 sm:px-0">
          <div className="mb-6">
            <Link href="/therapy-plans" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center mb-4">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Therapy Plans
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-2">My Assigned Patients</h1>
            <p className="text-gray-600 dark:text-gray-400">View and manage exercises for your patients</p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3 text-sm text-red-800 dark:text-red-300 font-medium">{error}</div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="ml-3 text-sm text-green-800 dark:text-green-300 font-medium">{success}</div>
              </div>
            </div>
          )}

          {patients.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No assigned patients found.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {patients.map((patient: any) => {
                const activePlan = patient.plans?.find((p: any) => 
                  p.status === 'ACTIVE' || (p.status !== 'COMPLETED' && p.status !== 'CANCELLED')
                );
                const exercises = activePlan?.exercises || [];
                
                return (
                  <div key={patient.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
                          {patient.firstName} {patient.lastName}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Registration: {patient.regNumber}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePatientClick(patient.id)}
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
                      >
                        Assign Exercise
                      </button>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-3">Assigned Exercises</h3>
                      {exercises.length > 0 ? (
                        <div className="space-y-3">
                          {exercises.map((planExercise: any) => (
                            <div
                              key={planExercise.id}
                              className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-700/50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 dark:text-gray-50">
                                    {planExercise.exercise?.name || 'Exercise'}
                                  </h4>
                                  {planExercise.exercise?.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {planExercise.exercise.description}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    {planExercise.reps && <span>Reps: {planExercise.reps}</span>}
                                    {planExercise.sets && <span>Sets: {planExercise.sets}</span>}
                                    {planExercise.duration && <span>Duration: {planExercise.duration}s</span>}
                                    {planExercise.frequency && <span>Frequency: {planExercise.frequency}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">No exercises assigned yet.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Exercise Selection Modal */}
          {showExerciseModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Select Exercise to Assign</h2>
                    <button
                      onClick={() => {
                        setShowExerciseModal(false);
                        setSelectedPatient(null);
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {availableExercises.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">Loading exercises...</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableExercises.map((exercise: any) => (
                        <div
                          key={exercise.id}
                          className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer"
                          onClick={() => !assigningExercise && handleAssignExercise(exercise.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-1">
                                {exercise.name}
                              </h3>
                              {exercise.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {exercise.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-2">
                                {exercise.difficulty && (
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    exercise.difficulty === 'BEGINNER' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                    exercise.difficulty === 'INTERMEDIATE' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                  }`}>
                                    {exercise.difficulty}
                                  </span>
                                )}
                                {exercise.videoUrl && (
                                  <span className="text-xs text-green-600 dark:text-green-400">Video Available</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!assigningExercise) {
                                  handleAssignExercise(exercise.id);
                                }
                              }}
                              disabled={assigningExercise}
                              className="ml-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                            >
                              {assigningExercise ? 'Assigning...' : 'Assign'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // For patients: Show their own therapy plan (original behavior)
  if (!plan) {
    return null;
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-6">
          <Link href="/therapy-plans" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center mb-4">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Therapy Plans
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-2">{plan.name}</h1>
          {plan.description && (
            <p className="text-gray-600 dark:text-gray-400 mb-4">{plan.description}</p>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3 text-sm text-red-800 dark:text-red-300 font-medium">{error}</div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50 mb-6">Exercises</h2>
          {plan.exercises && plan.exercises.length > 0 ? (
            <div className="space-y-4">
              {plan.exercises.map((planExercise: any) => (
                <div
                  key={planExercise.id}
                  className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors bg-white dark:bg-slate-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
                        {planExercise.exercise?.name || 'Exercise'}
                      </h3>
                      {planExercise.exercise?.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{planExercise.exercise.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        {planExercise.reps && <span>Reps: {planExercise.reps}</span>}
                        {planExercise.sets && <span>Sets: {planExercise.sets}</span>}
                        {planExercise.exercise?.videoUrl && (
                          <span className="flex items-center text-green-600 dark:text-green-400">
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
                        className="ml-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                      >
                        View Exercise
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No exercises assigned to this therapy plan.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
