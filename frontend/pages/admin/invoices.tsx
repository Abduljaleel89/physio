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
  const [form, setForm] = useState({ 
    patientId: '', 
    amountCents: '', 
    currency: 'PKR', 
    notes: '',
    taxable: false,
    taxRate: '10.00',
    dueDate: ''
  });
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 0, unitCents: 0 }]);

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

  // Calculate subtotal from line items
  const subtotalCents = items.reduce((sum, it) => {
    const quantity = Number(it.quantity || 0);
    const unitCents = Number(it.unitCents || 0);
    return sum + (quantity * unitCents);
  }, 0);
  
  const subtotal = subtotalCents / 100;
  
  // Calculate tax if applicable
  const taxRate = form.taxable ? parseFloat(form.taxRate || '0') : 0;
  const taxAmount = form.taxable && taxRate > 0 ? (subtotal * taxRate / 100) : 0;
  const total = subtotal + taxAmount;
  const totalCents = Math.round(total * 100);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      
      // Prepare line items with unit prices in dollars (will be converted to cents in backend)
      const lineItems = items
        .filter((it) => it.description.trim() && it.quantity > 0 && it.unitCents > 0)
        .map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: (it.unitCents / 100).toFixed(2), // Convert cents to dollars
        }));
      
      const payload: any = {
        patientId: parseInt(form.patientId),
        currency: form.currency,
        notes: form.notes || undefined,
        taxable: form.taxable,
        taxRate: form.taxable ? parseFloat(form.taxRate || '0') : undefined,
        dueDate: form.dueDate || undefined,
      };
      
      // Use line items if available, otherwise use amountCents
      if (lineItems.length > 0) {
        payload.lineItems = lineItems;
      } else if (form.amountCents) {
        payload.amountCents = parseInt(form.amountCents);
      } else {
        throw new Error('Please add line items or enter an amount');
      }
      
      const res = await invoicesApi.create(payload);
      if (!res.success) throw new Error(res.error || 'Failed');
      setForm({ patientId: '', amountCents: '', currency: 'PKR', notes: '', taxable: false, taxRate: '10.00', dueDate: '' });
      setItems([{ description: '', quantity: 0, unitCents: 0 }]);
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const addItem = () => setItems((x) => [...x, { description: '', quantity: 0, unitCents: 0 }]);
  const removeItem = (idx: number) => setItems((x) => x.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<LineItem>) => setItems((x) => x.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const downloadPdf = async (inv: any) => {
    try {
      // Fetch full invoice details with line items
      const response = await invoicesApi.get(inv.id);
      if (!response.success || !response.data.invoice) {
        alert('Failed to load invoice details');
        return;
      }
      
      const fullInvoice = response.data.invoice;
      
      const formatCurrency = (amount: number | string, currency: string = 'USD') => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
        }).format(numAmount);
      };

      const formatDate = (date: string | Date | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      };
      
      // Create a new window for printing/PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to download the invoice PDF.');
        return;
      }
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${fullInvoice.invoiceNumber}</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .invoice-header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .invoice-body { background: white; padding: 40px; border: 1px solid #e5e7eb; }
            .invoice-footer { background: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; }
            h1 { font-size: 28px; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background-color: #f3f4f6; font-weight: 600; }
            .text-right { text-align: right; }
            .summary { width: 300px; margin-left: auto; margin-top: 20px; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .total-row { border-top: 2px solid #e5e7eb; font-size: 18px; font-weight: bold; margin-top: 10px; padding-top: 10px; }
            @media print {
              @page { margin: 0; size: A4; }
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h1>INVOICE</h1>
            <p>Physio Platform</p>
            <div style="text-align: right; margin-top: -50px;">
              <div style="font-size: 24px; font-weight: bold;">${fullInvoice.invoiceNumber}</div>
              <div style="margin-top: 5px; opacity: 0.9;">${formatDate(fullInvoice.createdAt)}</div>
            </div>
          </div>
          <div class="invoice-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
              <div>
                <h3 style="font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 10px;">Bill To</h3>
                <p style="font-weight: 600; font-size: 16px;">${fullInvoice.patient?.firstName || ''} ${fullInvoice.patient?.lastName || ''}</p>
                ${fullInvoice.patient?.regNumber ? `<p style="color: #6b7280; font-size: 14px;">ID: ${fullInvoice.patient.regNumber}</p>` : ''}
              </div>
              <div>
                <h3 style="font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 10px;">From</h3>
                <p style="font-weight: 600; font-size: 16px;">Physio Platform</p>
                <p style="color: #6b7280; font-size: 14px;">Healthcare Services</p>
              </div>
            </div>
            ${fullInvoice.lineItems && fullInvoice.lineItems.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th class="text-right">Quantity</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${fullInvoice.lineItems.map((item: any) => `
                    <tr>
                      <td>${item.description}</td>
                      <td class="text-right">${item.quantity}</td>
                      <td class="text-right">${formatCurrency(item.unitPrice, fullInvoice.currency || 'USD')}</td>
                      <td class="text-right" style="font-weight: 600;">${formatCurrency(item.total, fullInvoice.currency || 'USD')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
            <div class="summary">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span style="font-weight: 600;">${formatCurrency(fullInvoice.subtotal, fullInvoice.currency || 'USD')}</span>
              </div>
              ${fullInvoice.taxable && fullInvoice.taxRate && fullInvoice.taxAmount ? `
                <div class="summary-row">
                  <span>Tax (${fullInvoice.taxRate}%):</span>
                  <span style="font-weight: 600;">${formatCurrency(fullInvoice.taxAmount, fullInvoice.currency || 'USD')}</span>
                </div>
              ` : ''}
              <div class="summary-row total-row">
                <span>Total:</span>
                <span>${formatCurrency(fullInvoice.amount, fullInvoice.currency || 'USD')}</span>
              </div>
            </div>
            ${fullInvoice.notes ? `
              <div style="margin-top: 30px; padding: 15px; background-color: #f9fafb; border-radius: 4px;">
                <strong>Notes:</strong><br>
                ${fullInvoice.notes}
              </div>
            ` : ''}
          </div>
          <div class="invoice-footer">
            <p style="color: #6b7280; font-size: 14px;">Thank you for your business!</p>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
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
          <div className="text-gray-500 dark:text-gray-400">Loading invoices...</div>
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
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-2">Invoices</h1>
          <p className="text-gray-600 dark:text-gray-400">Create and manage invoices</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-4">Existing Invoices</h2>
            {(!Array.isArray(invoices) || invoices.length === 0) ? (
              <p className="text-gray-500 dark:text-gray-400">No invoices found.</p>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Invoice</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">#{inv.invoiceNumber || inv.id}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Patient ID: {inv.patientId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">{(inv.amountCents ? inv.amountCents / 100 : inv.amount)} {inv.currency || 'USD'}</p>
                        <span className="text-xs inline-flex mt-1 px-2 py-1 rounded-full border bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-600">{inv.status}</span>
                        <div className="mt-2 space-x-2">
                          <button onClick={()=> downloadPdf(inv)} className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600">Download PDF</button>
                          <button onClick={()=> emailInvoice(inv)} className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600">Email</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-4">Create Invoice</h2>
            <form onSubmit={onCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patient *</label>
                <select
                  required
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50"
                >
                  <option value="">Select patient</option>
                  {patients.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} (#{p.id})</option>
                  ))}
                </select>
              </div>

              <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Items</label>
                  <button type="button" onClick={addItem} className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600">+ Add</button>
                </div>
                {/* Column Headers */}
                <div className="grid grid-cols-6 gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-slate-600">
                  <div className="col-span-3 text-xs font-semibold text-gray-600 dark:text-gray-400">Description</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 text-center">Quantity</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 text-center">Unit Price</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 text-center">Action</div>
                </div>
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Enter service description"
                        className="col-span-3 px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={it.description}
                        onChange={(e)=> updateItem(idx, { description: e.target.value })}
                      />
                      <input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="Qty"
                        className="px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={it.quantity > 0 ? it.quantity : ''}
                        onChange={(e)=> {
                          const val = e.target.value;
                          updateItem(idx, { quantity: val === '' ? 0 : parseInt(val) || 0 });
                        }}
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Amount"
                        className="px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={it.unitCents > 0 ? (it.unitCents / 100) : ''}
                        onChange={(e)=> {
                          const val = e.target.value;
                          if (val === '' || val === null || val === undefined) {
                            updateItem(idx, { unitCents: 0 });
                          } else {
                            const value = parseFloat(val);
                            if (!isNaN(value) && value >= 0) {
                              updateItem(idx, { unitCents: Math.round(value * 100) });
                            }
                          }
                        }}
                      />
                      <button type="button" onClick={()=> removeItem(idx)} className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600">Remove</button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Subtotal:</span>
                      <span className="font-medium">{subtotal.toFixed(2)} {form.currency}</span>
                    </div>
                    {form.taxable && taxRate > 0 && (
                      <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Tax ({taxRate}%):</span>
                        <span className="font-medium">{taxAmount.toFixed(2)} {form.currency}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-gray-50 pt-1 border-t border-gray-200 dark:border-slate-600">
                      <span>Total:</span>
                      <span>{total.toFixed(2)} {form.currency}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50"
                />
              </div>

              <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-700/50">
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="checkbox"
                    id="taxable"
                    checked={form.taxable}
                    onChange={(e) => setForm({ ...form, taxable: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="taxable" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Apply Tax
                  </label>
                </div>
                {form.taxable && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.taxRate}
                      onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50"
                      placeholder="10.00"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter tax percentage (e.g., 10.00 for 10%)
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date (Optional)</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50"
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50">
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
