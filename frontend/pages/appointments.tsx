import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import Layout from '../components/Layout';
import { appointmentsApi, adminApi, patientsApi, visitRequestsApi } from '../lib/api';
import AppointmentCalendar from '../components/AppointmentCalendar';
import toast from 'react-hot-toast';

interface Appointment {
  id: number;
  date: string;
  duration: number;
  status: string;
  patient?: {
    firstName: string;
    lastName: string;
    id?: number;
  };
  doctor?: {
    firstName: string;
    lastName: string;
    id?: number;
  };
}

export default function Appointments() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<any>('week');
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDuration, setCreateDuration] = useState(60);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [editAppt, setEditAppt] = useState<any>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDuration, setEditDuration] = useState<number>(60);
  const [editReason, setEditReason] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadAppointments();
      loadMasterData();
    }
  }, [user, authLoading, router]);

  const loadMasterData = async () => {
    try {
      if (!user) return;
      if (user.role === 'PATIENT') {
        // get doctors list for selection
        const docsRes = await adminApi.getDoctors();
        const docs = (docsRes.data && Array.isArray(docsRes.data)) ? docsRes.data : (docsRes.data?.doctors || []);
        setDoctors(docs || []);
        // resolve patient id for this user
        try {
          const pid = await patientsApi.getMyPatientId();
          if (pid) setPatientId(pid);
        } catch(_){}}
      else {
        const patsRes = await adminApi.getPatients();
        const docsRes = await adminApi.getDoctors();
        const pats = (patsRes.data && Array.isArray(patsRes.data)) ? patsRes.data : (patsRes.data?.patients || []);
        const docs = (docsRes.data && Array.isArray(docsRes.data)) ? docsRes.data : (docsRes.data?.doctors || []);
        setPatients(pats || []);
        setDoctors(docs || []);
      }
    } catch (e) {
      // ignore
    }
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentsApi.list();
      if (response.success) {
        const appointmentsData = response.data;
        const appointmentsList = Array.isArray(appointmentsData)
          ? appointmentsData
          : (appointmentsData?.appointments || appointmentsData?.data || []);
        setAppointments(appointmentsList);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const events = useMemo(() => {
    return appointments.map((a) => {
      const start = new Date(a.date);
      const end = new Date(start.getTime() + a.duration * 60 * 1000);
      return {
        start,
        end,
        title: `${a.patient ? a.patient.firstName + ' ' + a.patient.lastName : 'Patient'} with ${a.doctor ? 'Dr. ' + a.doctor.firstName : 'Doctor'} (${a.status})`,
        resource: a,
      } as any;
    });
  }, [appointments]);

  const onSelectSlot = (slotInfo: any) => {
    setError('');
    const start = new Date(slotInfo.start);
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
    setDateStr(start.toISOString().slice(0,10));
    const hh = String(start.getHours()).padStart(2,'0');
    const mm = String(start.getMinutes()).padStart(2,'0');
    setTimeStr(`${hh}:${mm}`);
    setCreateDuration(60);
    setReason('');
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      let dateISO: string;
      if (dateStr && timeStr) {
        dateISO = new Date(`${dateStr}T${timeStr}:00`).toISOString();
      } else if (selectedSlot) {
        dateISO = selectedSlot.start.toISOString();
      } else {
        dateISO = new Date().toISOString();
      }

      if (user?.role === 'PATIENT') {
        // Patients submit a visit request
        const payload: any = {
          requestedDate: dateISO,
          reason: reason || undefined,
          doctorId: doctorId || undefined,
        };
        const res = await visitRequestsApi.create(payload);
        if (!res.success) throw new Error(res.error || 'Failed to request visit');
        toast.success('Visit request submitted');
        setSelectedSlot(null);
        setReason('');
        return;
      }

      // Staff create appointments directly
      const payload: any = {
        patientId: patientId || undefined,
        doctorId: doctorId || undefined,
        date: dateISO,
        duration: createDuration,
        status: 'SCHEDULED',
        notes: reason || undefined,
      };

      const res = await appointmentsApi.create(payload);
      if (!res.success) throw new Error(res.error || 'Failed');
      toast.success('Appointment created');
      setSelectedSlot(null);
      setReason('');
      await loadAppointments();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create appointment');
    } finally {
      setCreating(false);
    }
  };

  const onSelectEvent = (event: any) => {
    if (!user || (user.role === 'PATIENT')) return; // patient view only
    const a = event.resource;
    setEditAppt(a);
    const d = new Date(a.date);
    setEditDate(d.toISOString().slice(0,10));
    setEditTime(d.toTimeString().slice(0,5));
    setEditDuration(a.duration);
    setEditReason(a.notes || '');
  };

  const onSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAppt) return;
    try {
      setCreating(true);
      const iso = new Date(`${editDate}T${editTime}:00`).toISOString();
      const res = await appointmentsApi.update(editAppt.id, { date: iso, duration: editDuration, notes: editReason });
      if (!res.success) throw new Error(res.error || 'Failed');
      setEditAppt(null);
      await loadAppointments();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Failed to update';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const onCancelAppt = async () => {
    if (!editAppt) return;
    try {
      setCreating(true);
      const res = await appointmentsApi.cancel(editAppt.id, editReason || '');
      if (!res.success) throw new Error(res.error || 'Failed');
      setEditAppt(null);
      await loadAppointments();
    } catch (err:any) {
      setError(err?.response?.data?.error || err.message || 'Failed to cancel');
    } finally {
      setCreating(false);
    }
  };

  const onEventDrop = async ({ event, start, end }: { event: any; start: Date; end: Date }) => {
    if (!user || user.role === 'PATIENT') return;
    try {
      const durationMins = Math.max(15, Math.round((end.getTime() - start.getTime()) / (60*1000)));
      const iso = start.toISOString();
      await appointmentsApi.update(event.resource.id, { date: iso, duration: durationMins });
      toast.success('Appointment rescheduled');
      await loadAppointments();
    } catch (e:any) {
      toast.error(e?.response?.data?.error || 'Failed to reschedule');
    }
  };

  const onEventResize = async ({ event, start, end }: { event: any; start: Date; end: Date }) => {
    if (!user || user.role === 'PATIENT') return;
    try {
      const durationMins = Math.max(15, Math.round((end.getTime() - start.getTime()) / (60*1000)));
      await appointmentsApi.update(event.resource.id, { duration: durationMins });
      toast.success('Appointment duration updated');
      await loadAppointments();
    } catch (e:any) {
      toast.error(e?.response?.data?.error || 'Failed to resize');
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

  const canPickPatient = user.role === 'ADMIN' || user.role === 'RECEPTIONIST';

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Appointments</h1>
            <p className="text-gray-600">Calendar view and quick scheduling</p>
          </div>
          <button
            onClick={() => {
              const now = new Date();
              setSelectedSlot({ start: now, end: new Date(now.getTime() + 60 * 60 * 1000) });
              setDateStr(now.toISOString().slice(0, 10));
              setTimeStr(now.toTimeString().slice(0, 5));
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            New Appointment
          </button>
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

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3">
          <AppointmentCalendar
            events={events}
            defaultView={view}
            onView={(v) => setView(v)}
            selectable
            onSelectSlot={onSelectSlot}
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
            style={{ height: 600 }}
          />
        </div>

        {selectedSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">{user?.role === 'PATIENT' ? 'Request Appointment' : 'Create Appointment'}</h2>
              </div>
              <form onSubmit={onCreate} className="p-4 space-y-4">
                {user?.role !== 'PATIENT' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                      <select
                        className="w-full px-3 py-2 border rounded-lg"
                        value={patientId || ''}
                        onChange={(e) => setPatientId(parseInt(e.target.value))}
                      >
                        <option value="">Select patient…</option>
                        {Array.isArray(patients) && patients.map((p:any)=> (
                          <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                      <select
                        className="w-full px-3 py-2 border rounded-lg"
                        value={doctorId || ''}
                        onChange={(e) => setDoctorId(parseInt(e.target.value))}
                      >
                        <option value="">Select doctor…</option>
                        {Array.isArray(doctors) && doctors.map((d:any)=> (
                          <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
                      <select
                        className="w-full px-3 py-2 border rounded-lg"
                        value={doctorId || ''}
                        onChange={(e) => setDoctorId(parseInt(e.target.value))}
                      >
                        <option value="">Choose a doctor…</option>
                        {Array.isArray(doctors) && doctors.map((d:any)=> (
                          <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border rounded-lg"
                          value={dateStr}
                          onChange={(e)=> setDateStr(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                        <input
                          type="time"
                          className="w-full px-3 py-2 border rounded-lg"
                          value={timeStr}
                          onChange={(e) => setTimeStr(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                      <textarea className="w-full px-3 py-2 border rounded-lg" rows={3} value={reason} onChange={(e)=> setReason(e.target.value)} />
                    </div>
                  </>
                )}
                {/* Common fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <input type="text" readOnly className="w-full px-3 py-2 border rounded-lg bg-gray-50" value={selectedSlot.start.toLocaleString()} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input type="number" min={15} step={15} value={createDuration} onChange={(e) => setCreateDuration(parseInt(e.target.value || '60'))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setSelectedSlot(null)} className="px-4 py-2 border rounded-lg text-gray-700">Cancel</button>
                  <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{creating ? (user?.role === 'PATIENT' ? 'Requesting…' : 'Creating…') : (user?.role === 'PATIENT' ? 'Request' : 'Create')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editAppt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Edit Appointment</h2>
              </div>
              <form onSubmit={onSaveEdit} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" value={editDate} onChange={(e)=> setEditDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input type="time" value={editTime} onChange={(e)=> setEditTime(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input type="number" min={15} step={15} value={editDuration} onChange={(e)=> setEditDuration(parseInt(e.target.value||'60'))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Cancel Reason</label>
                  <textarea rows={3} value={editReason} onChange={(e)=> setEditReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="flex justify-between pt-2">
                  <button type="button" onClick={onCancelAppt} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Cancel Appointment</button>
                  <div className="space-x-3">
                    <button type="button" onClick={()=> setEditAppt(null)} className="px-4 py-2 border rounded-lg text-gray-700">Close</button>
                    <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{creating ? 'Saving…' : 'Save'}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

