import React, { useRef } from 'react';

interface InvoiceLineItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  subtotal: number;
  amount: number;
  currency: string;
  taxable: boolean;
  taxRate?: number | null;
  taxAmount?: number | null;
  status: string;
  dueDate?: string | Date | null;
  paidDate?: string | Date | null;
  createdAt: string | Date;
  notes?: string | null;
  paymentProofUploadId?: number | null;
  paymentProofReviewedAt?: string | Date | null;
  paymentProofUpload?: {
    id: number;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize?: number | null;
    createdAt: string | Date;
  } | null;
  lineItems?: InvoiceLineItem[];
  patient?: {
    firstName: string;
    lastName: string;
    regNumber?: string;
  };
  therapyPlan?: {
    name: string;
  } | null;
  appointment?: {
    date: string | Date;
    doctor?: {
      firstName: string;
      lastName: string;
    };
  } | null;
}

interface ProfessionalInvoiceProps {
  invoice: Invoice;
  onDownloadPDF?: () => void;
  onUploadPaymentProof?: (file: File) => void;
  showActions?: boolean;
  isPatient?: boolean;
}

export default function ProfessionalInvoice({ invoice, onDownloadPDF, onUploadPaymentProof, showActions = true, isPatient = false }: ProfessionalInvoiceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string | Date | null) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Invoice Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">INVOICE</h2>
            <p className="text-blue-100 text-sm">Physio Platform</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{invoice.invoiceNumber}</div>
            <div className="text-blue-100 text-sm mt-1">
              {formatDate(invoice.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Body */}
      <div className="p-6">
        {/* Patient and Clinic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Bill To</h3>
            <div className="text-gray-900 dark:text-gray-50">
              <p className="font-semibold">{invoice.patient?.firstName} {invoice.patient?.lastName}</p>
              {invoice.patient?.regNumber && (
                <p className="text-sm text-gray-600 dark:text-gray-400">ID: {invoice.patient.regNumber}</p>
              )}
            </div>
          </div>
          <div className="text-right md:text-left">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">From</h3>
            <div className="text-gray-900 dark:text-gray-50">
              <p className="font-semibold">Physio Platform</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Healthcare Services</p>
            </div>
          </div>
        </div>

        {/* Related Information */}
        {(invoice.therapyPlan || invoice.appointment) && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {invoice.therapyPlan && (
                <p>
                  <span className="font-medium">Therapy Plan:</span> {invoice.therapyPlan.name}
                </p>
              )}
              {invoice.appointment && (
                <p>
                  <span className="font-medium">Appointment:</span> {formatDateTime(invoice.appointment.date)}
                  {invoice.appointment.doctor && (
                    <span> with Dr. {invoice.appointment.doctor.firstName} {invoice.appointment.doctor.lastName}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Line Items Table */}
        {invoice.lineItems && invoice.lineItems.length > 0 ? (
          <div className="mb-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-slate-600">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Description</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Quantity</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Unit Price</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-50">{item.description}</td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                      {formatCurrency(item.unitPrice, invoice.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-gray-50">
                      {formatCurrency(item.total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center text-gray-500 dark:text-gray-400">
            No line items available
          </div>
        )}

        {/* Summary */}
        <div className="flex justify-end">
          <div className="w-full md:w-80">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              {invoice.taxable && invoice.taxRate && invoice.taxAmount && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax ({invoice.taxRate}%):</span>
                  <span className="font-medium">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-gray-50 pt-2 border-t-2 border-gray-200 dark:border-slate-600">
                <span>Total:</span>
                <span>{formatCurrency(invoice.amount, invoice.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-sm">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Notes:</span>
              <span className="text-gray-600 dark:text-gray-400 ml-2">{invoice.notes}</span>
            </p>
          </div>
        )}

        {/* Payment Proof Section */}
        {isPatient && invoice.status === 'PENDING' && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-3">Payment Proof</h3>
            {invoice.paymentProofUpload ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Payment proof uploaded
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {invoice.paymentProofUpload.fileName} • {invoice.paymentProofReviewedAt ? 'Under review' : 'Pending review'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api'}/uploads/${invoice.paymentProofUpload.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600"
                  >
                    View
                  </a>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  id={`payment-proof-${invoice.id}`}
                  ref={fileInputRef}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onUploadPaymentProof) {
                      console.log('File selected:', file.name, file.size, 'bytes');
                      onUploadPaymentProof(file);
                    }
                  }}
                  style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}
                />
                <label
                  htmlFor={`payment-proof-${invoice.id}`}
                  className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{ display: 'inline-flex' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Upload Payment Proof</span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max 20MB)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Invoice Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {invoice.dueDate && (
                <p>
                  <span className="font-medium">Due Date:</span> {formatDate(invoice.dueDate)}
                </p>
              )}
              {invoice.paidDate && (
                <p>
                  <span className="font-medium">Paid Date:</span> {formatDate(invoice.paidDate)}
                </p>
              )}
            </div>
            {showActions && onDownloadPDF && (
              <button
                onClick={onDownloadPDF}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium text-sm flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

