import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/auth';
import { invoicesApi } from '../../lib/api';
import api from '../../lib/api';

export default function PaymentProofsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
      return;
    }
    if (user && (user.role === 'ADMIN' || user.role === 'RECEPTIONIST')) {
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
        // Filter invoices with payment proof uploaded but not yet reviewed
        const withProof = invoiceList.filter((inv: any) => 
          inv.paymentProofUploadId && 
          inv.status === 'PENDING' &&
          !inv.paymentProofReviewedAt
        );
        setInvoices(withProof);
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

  const handleReview = async (invoiceId: number, approved: boolean) => {
    try {
      setReviewing(invoiceId);
      const response = await api.post(`/invoices/${invoiceId}/review-payment-proof`, {
        approved,
        notes: reviewNotes || undefined,
      });

      if (response.data.success) {
        alert(approved 
          ? 'Payment proof approved and invoice marked as paid!' 
          : 'Payment proof rejected.');
        setReviewNotes('');
        setSelectedInvoice(null);
        await loadInvoices();
      } else {
        alert(response.data.error || 'Failed to review payment proof');
      }
    } catch (error: any) {
      console.error('Review error:', error);
      alert(error.response?.data?.error || error.message || 'Failed to review payment proof');
    } finally {
      setReviewing(null);
    }
  };

  const formatCurrency = (amount: number | string, currency: string = 'USD') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(numAmount);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading payment proofs...</div>
        </div>
      </Layout>
    );
  }

  if (!user || !(user.role === 'ADMIN' || user.role === 'RECEPTIONIST')) {
    return (
      <Layout>
        <div className="text-gray-600 dark:text-gray-400">This page is for admins and receptionists only.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-0">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-2">Payment Proof Reviews</h1>
          <p className="text-gray-600 dark:text-gray-400">Review and verify payment proofs uploaded by patients</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="text-sm text-red-800 dark:text-red-300 font-medium">{error}</div>
          </div>
        )}

        {invoices.length === 0 ? (
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-50">No payment proofs to review</p>
            <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
              All payment proofs have been reviewed or no payment proofs have been uploaded yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-2">
                      Invoice {invoice.invoiceNumber}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>
                        <span className="font-medium">Patient: </span>
                        {invoice.patient?.firstName} {invoice.patient?.lastName}
                        {invoice.patient?.regNumber && ` (${invoice.patient.regNumber})`}
                      </p>
                      <p>
                        <span className="font-medium">Amount: </span>
                        {formatCurrency(invoice.amount, invoice.currency || 'USD')}
                      </p>
                      <p>
                        <span className="font-medium">Uploaded: </span>
                        {formatDate(invoice.paymentProofUpload?.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Proof File */}
                {invoice.paymentProofUpload && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                            {invoice.paymentProofUpload.fileName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {invoice.paymentProofUpload.fileType} • 
                            {invoice.paymentProofUpload.fileSize 
                              ? ` ${(invoice.paymentProofUpload.fileSize / 1024).toFixed(2)} KB`
                              : ' Size unknown'}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api'}/uploads/${invoice.paymentProofUpload.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm font-medium"
                      >
                        View File
                      </a>
                    </div>
                  </div>
                )}

                {/* Review Section */}
                <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Review Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add any notes about the payment proof review..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleReview(invoice.id, true)}
                      disabled={reviewing === invoice.id}
                      className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reviewing === invoice.id ? 'Processing...' : 'Approve & Mark as Paid'}
                    </button>
                    <button
                      onClick={() => handleReview(invoice.id, false)}
                      disabled={reviewing === invoice.id}
                      className="px-6 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reviewing === invoice.id ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

