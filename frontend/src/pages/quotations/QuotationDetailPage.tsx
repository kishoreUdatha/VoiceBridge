/**
 * Quotation Detail Page
 * View quotation details, track status, manage payments
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Edit,
  Send,
  Copy,
  Link as LinkIcon,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Download,
  Printer,
  MoreVertical,
  IndianRupee,
  Calendar,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  History,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface QuotationItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountPercent?: number;
  totalPrice: number;
}

interface QuotationPayment {
  id: string;
  amount: number;
  method: string;
  status: string;
  reference?: string;
  receivedAt?: string;
  createdAt: string;
}

interface QuotationVersion {
  id: string;
  versionNumber: number;
  changeNotes?: string;
  createdAt: string;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  title: string;
  description?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  clientAddress?: string;
  clientGSTIN?: string;
  issueDate: string;
  validUntil?: string;
  subtotal: number;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  taxType?: string;
  taxPercentage?: number;
  taxAmount?: number;
  totalAmount: number;
  currency: string;
  termsConditions?: string;
  notes?: string;
  paymentTerms?: string;
  status: string;
  viewCount: number;
  viewedAt?: string;
  signatureStatus?: string;
  signedAt?: string;
  signedByName?: string;
  paymentStatus?: string;
  paymentLinkUrl?: string;
  paidAmount?: number;
  items: QuotationItem[];
  versions: QuotationVersion[];
  payments: QuotationPayment[];
  lead?: {
    id: string;
    firstName: string;
    lastName?: string;
    email?: string;
    phone: string;
  };
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: FileText },
  SENT: { label: 'Sent', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Send },
  VIEWED: { label: 'Viewed', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Eye },
  ACCEPTED: { label: 'Accepted', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
  EXPIRED: { label: 'Expired', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
  CONVERTED: { label: 'Converted', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: CheckCircle },
};

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'bank_transfer',
    reference: '',
    notes: '',
  });
  const [creatingPaymentLink, setCreatingPaymentLink] = useState(false);

  useEffect(() => {
    loadQuotation();
  }, [id]);

  const loadQuotation = async () => {
    try {
      const response = await api.get(`/quotations/${id}`);
      setQuotation(response.data.data);
      setPaymentForm((prev) => ({
        ...prev,
        amount: Number(response.data.data.totalAmount) - (Number(response.data.data.paidAmount) || 0),
      }));
    } catch (error) {
      console.error('Error loading quotation:', error);
      toast.error('Failed to load quotation');
      navigate('/quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    try {
      await api.post(`/quotations/${id}/send`, { sendVia: ['email'] });
      toast.success('Quotation sent');
      loadQuotation();
    } catch (error) {
      toast.error('Failed to send quotation');
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await api.post(`/quotations/${id}/duplicate`);
      toast.success('Quotation duplicated');
      navigate(`/quotations/${response.data.data.id}/edit`);
    } catch (error) {
      toast.error('Failed to duplicate quotation');
    }
  };

  const handleCreatePaymentLink = async () => {
    if (!quotation) return;
    setCreatingPaymentLink(true);
    try {
      const response = await api.post(`/quotations/${id}/payment-link`);
      toast.success('Payment link created');
      loadQuotation();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create payment link');
    } finally {
      setCreatingPaymentLink(false);
    }
  };

  const handleRecordPayment = async () => {
    try {
      await api.post(`/quotations/${id}/payments`, paymentForm);
      toast.success('Payment recorded');
      setShowPaymentModal(false);
      loadQuotation();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!quotation) {
    return null;
  }

  const statusInfo = statusConfig[quotation.status] || statusConfig.DRAFT;
  const StatusIcon = statusInfo.icon;
  const publicUrl = `${window.location.origin}/quotation/${quotation.quotationNumber}`;
  const remainingAmount = Number(quotation.totalAmount) - (Number(quotation.paidAmount) || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/quotations')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{quotation.quotationNumber}</h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
              >
                <StatusIcon className="w-3 h-3" />
                {statusInfo.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">{quotation.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => copyToClipboard(publicUrl)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <LinkIcon className="w-4 h-4" />
            Copy Link
          </button>
          <Link
            to={`/quotations/${id}/edit`}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          {quotation.status === 'DRAFT' && (
            <button
              onClick={handleSend}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          )}
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quotation Preview */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{quotation.title}</h2>
                  {quotation.description && (
                    <p className="text-sm text-gray-600 mt-1">{quotation.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Quotation #</p>
                  <p className="font-mono font-semibold">{quotation.quotationNumber}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Client Info */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">BILL TO</h3>
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">{quotation.clientName}</p>
                  {quotation.clientCompany && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Building className="w-4 h-4" />
                      {quotation.clientCompany}
                    </p>
                  )}
                  {quotation.clientEmail && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {quotation.clientEmail}
                    </p>
                  )}
                  {quotation.clientPhone && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {quotation.clientPhone}
                    </p>
                  )}
                  {quotation.clientAddress && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {quotation.clientAddress}
                    </p>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="flex gap-8 mb-6 text-sm">
                <div>
                  <p className="text-gray-500">Issue Date</p>
                  <p className="font-medium">{formatDate(quotation.issueDate)}</p>
                </div>
                {quotation.validUntil && (
                  <div>
                    <p className="text-gray-500">Valid Until</p>
                    <p className="font-medium">{formatDate(quotation.validUntil)}</p>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full mb-6">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-sm font-medium text-gray-500">Item</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500">Qty</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500">Price</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-gray-500">{item.description}</p>
                        )}
                      </td>
                      <td className="text-right py-3 text-sm">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="text-right py-3 text-sm">
                        {formatCurrency(item.unitPrice, quotation.currency)}
                      </td>
                      <td className="text-right py-3 font-medium">
                        {formatCurrency(item.totalPrice, quotation.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatCurrency(Number(quotation.subtotal), quotation.currency)}</span>
                  </div>
                  {quotation.discountAmount && Number(quotation.discountAmount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Discount
                        {quotation.discountType === 'percentage' &&
                          ` (${quotation.discountValue}%)`}
                      </span>
                      <span className="text-red-600">
                        -{formatCurrency(Number(quotation.discountAmount), quotation.currency)}
                      </span>
                    </div>
                  )}
                  {quotation.taxAmount && Number(quotation.taxAmount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {quotation.taxType} ({quotation.taxPercentage}%)
                      </span>
                      <span>
                        +{formatCurrency(Number(quotation.taxAmount), quotation.currency)}
                      </span>
                    </div>
                  )}
                  <hr className="border-gray-200" />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary-600">
                      {formatCurrency(Number(quotation.totalAmount), quotation.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              {(quotation.paymentTerms || quotation.termsConditions) && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  {quotation.paymentTerms && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Payment Terms</h4>
                      <p className="text-sm text-gray-600">{quotation.paymentTerms}</p>
                    </div>
                  )}
                  {quotation.termsConditions && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Terms & Conditions</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {quotation.termsConditions}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Version History */}
          {quotation.versions && quotation.versions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Version History
              </h3>
              <div className="space-y-3">
                {quotation.versions.map((version) => (
                  <div key={version.id} className="flex items-center gap-4 text-sm">
                    <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-medium">
                      v{version.versionNumber}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-900">{version.changeNotes || 'Updated quotation'}</p>
                      <p className="text-gray-500">{formatDateTime(version.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Status</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Views</span>
                <span className="font-medium">{quotation.viewCount}</span>
              </div>
              {quotation.viewedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Viewed</span>
                  <span className="text-sm">{formatDateTime(quotation.viewedAt)}</span>
                </div>
              )}
              {quotation.signedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Signed At</span>
                  <span className="text-sm">{formatDateTime(quotation.signedAt)}</span>
                </div>
              )}
              {quotation.signedByName && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Signed By</span>
                  <span className="text-sm">{quotation.signedByName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Amount</span>
                <span className="font-semibold">
                  {formatCurrency(Number(quotation.totalAmount), quotation.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Paid</span>
                <span className="text-green-600 font-medium">
                  {formatCurrency(Number(quotation.paidAmount) || 0, quotation.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Remaining</span>
                <span className="font-semibold text-primary-600">
                  {formatCurrency(remainingAmount, quotation.currency)}
                </span>
              </div>

              {quotation.paymentStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      quotation.paymentStatus === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : quotation.paymentStatus === 'partial'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {quotation.paymentStatus}
                  </span>
                </div>
              )}

              <hr className="border-gray-200" />

              {/* Payment Actions */}
              <div className="space-y-2">
                {quotation.paymentLinkUrl ? (
                  <button
                    onClick={() => copyToClipboard(quotation.paymentLinkUrl!)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Copy Payment Link
                  </button>
                ) : (
                  <button
                    onClick={handleCreatePaymentLink}
                    disabled={creatingPaymentLink}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    {creatingPaymentLink ? 'Creating...' : 'Create Payment Link'}
                  </button>
                )}

                {remainingAmount > 0 && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <IndianRupee className="w-4 h-4" />
                    Record Payment
                  </button>
                )}
              </div>
            </div>

            {/* Payment History */}
            {quotation.payments && quotation.payments.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Payment History</h4>
                <div className="space-y-2">
                  {quotation.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{formatCurrency(Number(payment.amount))}</p>
                        <p className="text-xs text-gray-500">
                          {payment.method} • {formatDateTime(payment.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          payment.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Linked Lead */}
          {quotation.lead && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Linked Lead
              </h3>
              <Link
                to={`/leads/${quotation.lead.id}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {quotation.lead.firstName} {quotation.lead.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {quotation.lead.email || quotation.lead.phone}
                  </p>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Payment</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method *</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="razorpay">Razorpay</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  placeholder="e.g., UTR number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
