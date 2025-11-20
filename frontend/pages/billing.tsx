import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/auth';
import { invoicesApi } from '../lib/api';
import ProfessionalInvoice from '../components/ProfessionalInvoice';
import api from '../lib/api';

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
      return;
    }
    if (user && user.role === 'PATIENT') {
      loadInvoices();
    }
  }, [user, authLoading]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await invoicesApi.list();
      if (response.success) {
        const invoiceList = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.invoices || response.data?.data || []);
        // Fetch full details for each invoice to get payment proof
        const invoicesWithDetails = await Promise.all(
          invoiceList.map(async (invoice: any) => {
            try {
              const detailResponse = await invoicesApi.get(invoice.id);
              if (detailResponse.success && detailResponse.data?.invoice) {
                return detailResponse.data.invoice;
              }
              return invoice;
            } catch (e) {
              console.error(`Failed to load details for invoice ${invoice.id}:`, e);
              return invoice;
            }
          })
        );
        setInvoices(invoicesWithDetails);
      } else {
        setError(response.error || 'Failed to load invoices');
      }
    } catch (e: any) {
      console.error('Failed to load invoices:', e);
      setError(e.response?.data?.error || e.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | string, currency: string = 'USD') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(numAmount);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
      case 'OVERDUE':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
      case 'CANCELLED':
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      case 'REFUNDED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const isOverdue = (invoice: any): boolean => {
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED') {
      return false;
    }
    if (invoice.dueDate) {
      const dueDate = new Date(invoice.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    }
    return false;
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return isOverdue(invoice);
    return invoice.status === filter;
  });

  const totalAmount = filteredInvoices.reduce((sum, inv) => {
    const amount = inv.amountCents ? inv.amountCents / 100 : (inv.amount || 0);
    return sum + amount;
  }, 0);

  const pendingAmount = filteredInvoices
    .filter((inv) => inv.status === 'PENDING' || isOverdue(inv))
    .reduce((sum, inv) => {
      const amount = inv.amountCents ? inv.amountCents / 100 : (inv.amount || 0);
      return sum + amount;
    }, 0);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading invoices...</div>
        </div>
      </Layout>
    );
  }

  if (!user || user.role !== 'PATIENT') {
    return (
      <Layout>
        <div className="text-gray-600 dark:text-gray-400">This page is for patients only.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-2">Billing & Invoices</h1>
          <p className="text-gray-600 dark:text-gray-400">Review and manage your invoices</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="text-sm text-red-800 dark:text-red-300 font-medium">{error}</div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Invoices</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">{filteredInvoices.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Amount</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {formatCurrency(totalAmount)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending Amount</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(pendingAmount)}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex space-x-2 border-b border-gray-200 dark:border-slate-700">
          {['all', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filter === status
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-50">No invoices found</p>
            <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
              {filter === 'all' 
                ? 'You don\'t have any invoices yet.' 
                : `No ${filter.toLowerCase()} invoices found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredInvoices.map((invoice) => {
              const overdue = isOverdue(invoice);
              
              const handleDownloadPDF = async () => {
                try {
                  // Fetch full invoice details with line items
                  const response = await invoicesApi.get(invoice.id);
                  if (response.success && response.data.invoice) {
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
                  }
                } catch (error) {
                  console.error('Failed to generate PDF:', error);
                  alert('Failed to generate PDF. Please try again.');
                }
              };
              
              return (
                <div key={invoice.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                        overdue ? 'OVERDUE' : invoice.status
                      )}`}
                    >
                      {overdue ? 'OVERDUE' : invoice.status}
                    </span>
                    {invoice.status === 'PENDING' && (
                      <button
                        className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 text-sm font-medium"
                        onClick={() => {
                          alert('Payment functionality will be implemented here. Please contact the clinic for payment options.');
                        }}
                      >
                        Pay Now
                      </button>
                    )}
                  </div>
                  <ProfessionalInvoice 
                    invoice={invoice} 
                    onDownloadPDF={handleDownloadPDF}
                    onUploadPaymentProof={async (file) => {
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        const response = await api.post(`/invoices/${invoice.id}/upload-payment-proof`, formData, {
                          headers: {
                            'Content-Type': 'multipart/form-data',
                          },
                        });
                        
                        if (response.data.success) {
                          alert('Payment proof uploaded successfully! Admin/Receptionist will review it shortly.');
                          await loadInvoices(); // Reload invoices to show updated status
                        } else {
                          alert(response.data.error || 'Failed to upload payment proof');
                        }
                      } catch (error: any) {
                        console.error('Upload error:', error);
                        alert(error.response?.data?.error || error.message || 'Failed to upload payment proof');
                      }
                    }}
                    showActions={true}
                    isPatient={true}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

