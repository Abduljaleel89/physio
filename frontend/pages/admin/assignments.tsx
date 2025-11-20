import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import Layout from '../../components/Layout';
import { adminApi } from '../../lib/api';

export default function AdminAssignmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/dashboard');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [patientsRes, doctorsRes] = await Promise.all([
        adminApi.getPatients(),
        adminApi.getDoctors(),
      ]);
      if (patientsRes.success) {
        setPatients(patientsRes.data.patients || []);
      }
      if (doctorsRes.success) {
        setDoctors(doctorsRes.data.doctors || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedPatient || !selectedDoctor) {
      setError('Please select both a patient and a doctor');
      return;
    }

    setError('');
    setSuccess('');

    // Check if patient already has assigned doctors
    const patient = patients.find((p) => p.id === selectedPatient);
    if (patient && patient.therapyPlans && patient.therapyPlans.length > 0) {
      const existingDoctors = patient.therapyPlans.map((plan: any) => 
        `Dr. ${plan.doctor.firstName} ${plan.doctor.lastName}`
      ).join(', ');
      
      const shouldUnassign = window.confirm(
        `This patient is already assigned to: ${existingDoctors}\n\n` +
        `Would you like to unassign the existing doctor(s) and assign the new one?`
      );
      
      if (shouldUnassign) {
        // Unassign all existing doctors first
        for (const plan of patient.therapyPlans) {
          try {
            await adminApi.unassignDoctor(selectedPatient, plan.doctorId || plan.doctor.id);
          } catch (err: any) {
            console.error('Failed to unassign doctor:', err);
          }
        }
      } else {
        return; // User cancelled
      }
    }

    try {
      const response = await adminApi.assignDoctor(selectedPatient, selectedDoctor);
      if (response.success) {
        setSuccess('Doctor assigned to patient successfully!');
        setSelectedPatient(null);
        setSelectedDoctor(null);
        loadData();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to assign doctor';
      if (err.response?.status === 400 && err.response?.data?.data?.existingAssignments) {
        // Backend already checked and found existing assignments
        const existingDoctors = err.response.data.data.existingAssignments.map((plan: any) => 
          `Dr. ${plan.doctor.firstName} ${plan.doctor.lastName}`
        ).join(', ');
        
        const shouldUnassign = window.confirm(
          `This patient is already assigned to: ${existingDoctors}\n\n` +
          `Would you like to unassign the existing doctor(s) and assign the new one?`
        );
        
        if (shouldUnassign) {
          // Unassign all existing doctors first
          for (const plan of err.response.data.data.existingAssignments) {
            try {
              await adminApi.unassignDoctor(selectedPatient, plan.doctorId || plan.doctor?.id);
            } catch (unassignErr: any) {
              console.error('Failed to unassign doctor:', unassignErr);
            }
          }
          // Retry assignment
          try {
            const retryResponse = await adminApi.assignDoctor(selectedPatient, selectedDoctor);
            if (retryResponse.success) {
              setSuccess('Doctor assigned to patient successfully!');
              setSelectedPatient(null);
              setSelectedDoctor(null);
              loadData();
            }
          } catch (retryErr: any) {
            setError(retryErr.response?.data?.error || 'Failed to assign doctor after unassigning');
          }
        }
      } else {
        setError(errorMessage);
      }
    }
  };

  // REMOVED: handleUnassign function - now using inline handler in button

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-2">Doctor-Patient Assignments</h1>
          <p className="text-gray-600 dark:text-gray-400">Assign doctors to patients</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-4">Select Patient</h2>
            <select
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedPatient || ''}
              onChange={(e) => setSelectedPatient(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">-- Select Patient --</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName} ({patient.regNumber})
                  {patient.therapyPlans && patient.therapyPlans.length > 0 && 
                    ` - Assigned to Dr. ${patient.therapyPlans[0].doctor.firstName} ${patient.therapyPlans[0].doctor.lastName}`
                  }
                </option>
              ))}
            </select>
            {selectedPatient && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                {(() => {
                  const patient = patients.find((p) => p.id === selectedPatient);
                  return patient ? (
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-50">{patient.firstName} {patient.lastName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Reg: {patient.regNumber}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email: {patient.user.email}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-4">Select Doctor</h2>
            <select
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedDoctor || ''}
              onChange={(e) => setSelectedDoctor(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">-- Select Doctor --</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.firstName} {doctor.lastName}
                  {doctor.specialization && ` - ${doctor.specialization}`}
                </option>
              ))}
            </select>
            {selectedDoctor && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                {(() => {
                  const doctor = doctors.find((d) => d.id === selectedDoctor);
                  return doctor ? (
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-50">Dr. {doctor.firstName} {doctor.lastName}</p>
                      {doctor.specialization && <p className="text-sm text-gray-600 dark:text-gray-400">{doctor.specialization}</p>}
                      {doctor.licenseNumber && <p className="text-sm text-gray-600 dark:text-gray-400">License: {doctor.licenseNumber}</p>}
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email: {doctor.user.email}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleAssign}
            disabled={!selectedPatient || !selectedDoctor}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Assign Doctor to Patient
          </button>
        </div>

        <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Patient-Doctor Assignments</h2>
          </div>
          {patients.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No patients found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {patients.map((patient) => (
                <div key={patient.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Reg: {patient.regNumber}</p>
                      {patient.therapyPlans && patient.therapyPlans.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {patient.therapyPlans.map((plan: any) => (
                            <div key={plan.id} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Assigned to:</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                  {plan.doctor ? `Dr. ${plan.doctor.firstName} ${plan.doctor.lastName}` : 'Unknown Doctor'}
                                </span>
                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700">
                                  {plan.status}
                                </span>
                              </div>
                              <button
                                onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  const doctorId = plan.doctorId ?? plan.doctor?.id;
                                  const doctorName = plan.doctor ? `Dr. ${plan.doctor.firstName} ${plan.doctor.lastName}` : 'Doctor';
                                  
                                  if (!doctorId || !patient.id) {
                                    setError('Invalid patient or doctor ID');
                                    return;
                                  }
                                  
                                  if (!window.confirm(`Are you sure you want to unassign ${doctorName} from this patient?`)) {
                                    return;
                                  }
                                  
                                  setError('');
                                  setSuccess('');
                                  
                                  try {
                                    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
                                    
                                    console.log('🚀 UNASSIGN_START_V3', { patientId: patient.id, doctorId, patientIdType: typeof patient.id, doctorIdType: typeof doctorId });
                                    
                                    const response = await fetch('http://localhost:4000/api/admin/unassign-doctor', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                      },
                                      body: JSON.stringify({ 
                                        patientId: Number(patient.id), 
                                        doctorId: Number(doctorId) 
                                      })
                                    });
                                    
                                    console.log('📡 RESPONSE_STATUS_V3', response.status);
                                    
                                    const data = await response.json();
                                    console.log('📦 RESPONSE_DATA_V3', data);
                                    
                                    if (response.ok && data.success) {
                                      console.log('✅ SUCCESS_V3');
                                      setSuccess(`${doctorName} unassigned from patient successfully!`);
                                      setError('');
                                      await loadData();
                                    } else {
                                      console.error('❌ FAILED_V3', data);
                                      setError(data.error || data.data?.error || data.message || 'Failed to unassign doctor');
                                    }
                                  } catch (err: any) {
                                    console.error('💥 UNASSIGN_ERROR_V3', err);
                                    setError(err.message || 'Failed to unassign doctor');
                                  }
                                }}
                                className="ml-4 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              >
                                Unassign V3
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">No doctor assigned</p>
                      )}
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

