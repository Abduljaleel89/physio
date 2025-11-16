import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/auth';
import { adminApi, invoicesApi } from '../../lib/api';

interface LineItem { description: string; quantity: number; unitCents: number; }

export default function InvoicesPage() {
  const { user, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ patientId: '', amountCents: '', currency: 'USD', notes: '' });
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitCents: 0 }]);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
      return;
    }

    if (user && (user.role === 'ADMIN' || user.role === 'RECEPTIONIST')) {
      loadAll();
    }
  }, [user, authLoading]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [inv, pats] = await Promise.all([
        invoicesApi.list().catch(() => ({ success: false, data: [] })),
        adminApi.getPatients().catch(() => ({ success: false, data: [] })),
      ]);
      const invData: any = (inv && inv.success !== undefined) ? inv.data : inv;
      const patData: any = (pats && pats.success !== undefined) ? pats.data : pats;
      const invList = Array.isArray(invData) ? invData : (invData?.invoices || invData?.data || []);
      const patList = Array.isArray(patData) ? patData : (patData?.patients || patData?.data || []);
      setInvoices(invList || []);
      setPatients(patList || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const totalCents = items.reduce((sum, it) => sum + (Number(it.quantity||0) * Number(it.unitCents||0)), 0);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const payload: any = {
        patientId: parseInt(form.patientId),
        amountCents: totalCents || (form.amountCents ? parseInt(form.amountCents) : undefined),
        currency: form.currency,
        notes: form.notes || undefined,
      };
      const res = await invoicesApi.create(payload);
      if (!res.success) throw new Error(res.error || 'Failed');
      setForm({ patientId: '', amountCents: '', currency: 'USD', notes: '' });
      setItems([{ description: '', quantity: 1, unitCents: 0 }]);
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const addItem = () => setItems((x) => [...x, { description: '', quantity: 1, unitCents: 0 }]);
  const removeItem = (idx: number) => setItems((x) => x.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<LineItem>) => setItems((x) => x.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const downloadPdf = async (inv: any) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const y0 = 20;
    doc.setFontSize(16);
    doc.text('Invoice', 20, y0);
    doc.setFontSize(11);
    doc.text(`Invoice #${inv.invoiceNumber || inv.id}`, 20, y0 + 10);
    doc.text(`Patient ID: ${inv.patientId}`, 20, y0 + 16);
    doc.text(`Amount: ${(inv.amountCents ? inv.amountCents/100 : inv.amount)} ${inv.currency || 'USD'}`, 20, y0 + 22);
    if (inv.notes) doc.text(`Notes: ${inv.notes}`, 20, y0 + 28, { maxWidth: 170 });
    doc.save(`invoice-${inv.invoiceNumber || inv.id}.pdf`);
  };

  const emailInvoice = async (inv: any) => {
    try {
      const res = await invoicesApi.sendEmail(inv.id);
      if (!res.success) throw new Error(res.error || 'Failed to send');
      alert('Invoice email queued/sent');
    } catch (e:any) {
      alert(e.message || 'Failed to send invoice email');
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading invoices...</div>
        </div>
      </Layout>
    );
  }

  if (!user || !(user.role === 'ADMIN' || user.role === 'RECEPTIONIST')) {
    return null;
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Invoices</h1>
          <p className="text-gray-600">Create and manage invoices</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Existing Invoices</h2>
            {(!Array.isArray(invoices) || invoices.length === 0) ? (
              <p className="text-gray-500">No invoices found.</p>
            ) : (
              <div className="divide-y divide-gray-200">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Invoice</p>
                        <p className="text-lg font-semibold text-gray-900">#{inv.invoiceNumber || inv.id}</p>
                        <p className="text-sm text-gray-600">Patient ID: {inv.patientId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">{(inv.amountCents ? inv.amountCents / 100 : inv.amount)} {inv.currency || 'USD'}</p>
                        <span className="text-xs inline-flex mt-1 px-2 py-1 rounded-full border bg-gray-50 text-gray-700">{inv.status}</span>
                        <div className="mt-2 space-x-2">
                          <button onClick={()=> downloadPdf(inv)} className="px-3 py-1 text-sm border rounded">Download PDF</button>
                          <button onClick={()=> emailInvoice(inv)} className="px-3 py-1 text-sm border rounded">Email</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Invoice</h2>
            <form onSubmit={onCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
                <select
                  required
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select patient</option>
                  {patients.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} (#{p.id})</option>
                  ))}
                </select>
              </div>

              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Line Items</label>
                  <button type="button" onClick={addItem} className="px-2 py-1 text-xs border rounded">+ Add</button>
                </div>
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Description"
                        className="col-span-3 px-2 py-1 border rounded"
                        value={it.description}
                        onChange={(e)=> updateItem(idx, { description: e.target.value })}
                      />
                      <input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        className="px-2 py-1 border rounded"
                        value={it.quantity}
                        onChange={(e)=> updateItem(idx, { quantity: parseInt(e.target.value||'1') })}
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Unit (cents)"
                        className="px-2 py-1 border rounded"
                        value={it.unitCents}
                        onChange={(e)=> updateItem(idx, { unitCents: parseInt(e.target.value||'0') })}
                      />
                      <button type="button" onClick={()=> removeItem(idx)} className="px-2 py-1 text-xs border rounded">Remove</button>
                    </div>
                  ))}
                </div>
                <div className="text-right text-sm text-gray-700 mt-2">Total: {totalCents/100} {form.currency}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {creating ? 'Creating…' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
