import { useEffect, useState } from 'react';
import {
  AcademicCapIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  BanknotesIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { admissionService, Admission, AdmissionType, RecordPaymentInput } from '../../services/admission.service';
import { universityService, University } from '../../services/university.service';

const ADMISSION_TYPE_LABELS: Record<AdmissionType, string> = {
  DONATION: 'Donation',
  NON_DONATION: 'Non-Donation',
  NRI: 'NRI',
  SCHOLARSHIP: 'Scholarship',
};

const ADMISSION_TYPE_COLORS: Record<AdmissionType, string> = {
  DONATION: 'bg-purple-100 text-purple-700',
  NON_DONATION: 'bg-blue-100 text-blue-700',
  NRI: 'bg-amber-100 text-amber-700',
  SCHOLARSHIP: 'bg-green-100 text-green-700',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-red-100 text-red-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
};

export default function AdmissionsPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [universityFilter, setUniversityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<AdmissionType | ''>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  const [showDetailModal, setShowDetailModal] = useState<Admission | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<Admission | null>(null);
  const [paymentData, setPaymentData] = useState<RecordPaymentInput>({
    amount: 0,
    paymentType: 'FEE',
    paymentMode: 'ONLINE',
    referenceNumber: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAdmissions();
  }, [searchQuery, universityFilter, typeFilter, paymentStatusFilter, yearFilter, pagination.page]);

  useEffect(() => {
    loadUniversities();
    loadAcademicYears();
  }, []);

  const loadAdmissions = async () => {
    try {
      setIsLoading(true);
      const result = await admissionService.getAll({
        search: searchQuery || undefined,
        universityId: universityFilter || undefined,
        admissionType: typeFilter || undefined,
        paymentStatus: paymentStatusFilter || undefined,
        academicYear: yearFilter || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setAdmissions(result.admissions);
      setPagination((prev) => ({ ...prev, ...result.pagination }));
    } catch (err: any) {
      setError(err.message || 'Failed to load admissions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUniversities = async () => {
    try {
      const result = await universityService.getAll({ isActive: true, limit: 100 });
      setUniversities(result.universities);
    } catch (err) {
      console.error('Failed to load universities:', err);
    }
  };

  const loadAcademicYears = async () => {
    try {
      const years = await admissionService.getAcademicYears();
      setAcademicYears(years);
    } catch (err) {
      console.error('Failed to load academic years:', err);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    try {
      setSubmitting(true);
      await admissionService.recordPayment(showPaymentModal.id, paymentData);
      setShowPaymentModal(null);
      loadAdmissions();
      // Reload detail if open
      if (showDetailModal?.id === showPaymentModal.id) {
        const updated = await admissionService.getById(showPaymentModal.id);
        setShowDetailModal(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkCommissionReceived = async (admission: Admission) => {
    if (!confirm('Mark commission as received?')) return;
    try {
      await admissionService.markCommissionReceived(admission.id);
      loadAdmissions();
    } catch (err: any) {
      setError(err.message || 'Failed to update commission status');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h1 className="text-lg font-semibold text-slate-900">Admissions</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-primary-500 outline-none"
            />
          </div>
          <select
            value={universityFilter}
            onChange={(e) => setUniversityFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-primary-500 outline-none"
          >
            <option value="">All Universities</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>{u.shortName || u.name}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AdmissionType | '')}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-primary-500 outline-none"
          >
            <option value="">All Types</option>
            {Object.entries(ADMISSION_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-primary-500 outline-none"
          >
            <option value="">All Payment Status</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-primary-500 outline-none"
          >
            <option value="">All Years</option>
            {academicYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-800">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <XMarkIcon className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500">Loading admissions...</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && admissions.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Admission #</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Student</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">University</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Total Fee</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Paid / Pending</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Commission</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admissions.map((admission) => (
                <tr key={admission.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-slate-700">{admission.admissionNumber}</p>
                    <p className="text-xs text-slate-500">{admission.academicYear}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{admission.lead.firstName} {admission.lead.lastName}</p>
                    <p className="text-xs text-slate-500">{admission.lead.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900">{admission.university.shortName || admission.university.name}</p>
                    {admission.courseName && <p className="text-xs text-slate-500">{admission.courseName}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${ADMISSION_TYPE_COLORS[admission.admissionType]}`}>
                      {ADMISSION_TYPE_LABELS[admission.admissionType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(admission.totalFee)}
                    {admission.donationAmount > 0 && (
                      <p className="text-xs text-slate-500">+{formatCurrency(admission.donationAmount)} donation</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-green-600 font-medium">{formatCurrency(admission.paidAmount)}</p>
                    <p className="text-xs text-red-600">{formatCurrency(admission.pendingAmount)} pending</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${PAYMENT_STATUS_COLORS[admission.paymentStatus]}`}>
                      {admission.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-medium text-slate-900">{formatCurrency(admission.commissionAmount)}</p>
                    <span className={`inline-flex items-center gap-1 text-xs ${admission.commissionStatus === 'RECEIVED' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {admission.commissionStatus === 'RECEIVED' ? <CheckCircleIcon className="w-3 h-3" /> : <ClockIcon className="w-3 h-3" />}
                      {admission.commissionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setShowDetailModal(admission)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      {admission.paymentStatus !== 'PAID' && (
                        <button
                          onClick={() => {
                            setPaymentData({ amount: admission.pendingAmount, paymentType: 'FEE', paymentMode: 'ONLINE', referenceNumber: '', notes: '' });
                            setShowPaymentModal(admission);
                          }}
                          className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Record Payment"
                        >
                          <BanknotesIcon className="w-4 h-4" />
                        </button>
                      )}
                      {admission.commissionStatus === 'PENDING' && (
                        <button
                          onClick={() => handleMarkCommissionReceived(admission)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Mark Commission Received"
                        >
                          <DocumentCheckIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && admissions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-200">
          <AcademicCapIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-800">No admissions found</h3>
          <p className="text-sm text-slate-500 mt-1">
            Close admissions from the lead detail page.
          </p>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p className="text-slate-600">Student: <span className="font-medium text-slate-900">{showPaymentModal.lead.firstName} {showPaymentModal.lead.lastName}</span></p>
                <p className="text-slate-600">Pending Amount: <span className="font-medium text-red-600">{formatCurrency(showPaymentModal.pendingAmount)}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Type *</label>
                  <select
                    value={paymentData.paymentType}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentType: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  >
                    <option value="FEE">Fee</option>
                    <option value="DONATION">Donation</option>
                    <option value="MISCELLANEOUS">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentData.paymentMode}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="ONLINE">Online</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reference Number</label>
                <input
                  type="text"
                  value={paymentData.referenceNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  placeholder="Transaction ID / Cheque Number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(null)} className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Admission Details</h3>
                <p className="text-xs text-slate-500 font-mono">{showDetailModal.admissionNumber}</p>
              </div>
              <button onClick={() => setShowDetailModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-6">
              {/* Student Info */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Student Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs text-slate-500">Name</label>
                    <p className="font-medium text-slate-900">{showDetailModal.lead.firstName} {showDetailModal.lead.lastName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Phone</label>
                    <p className="text-slate-900">{showDetailModal.lead.phone}</p>
                  </div>
                  {showDetailModal.lead.email && (
                    <div>
                      <label className="text-xs text-slate-500">Email</label>
                      <p className="text-slate-900">{showDetailModal.lead.email}</p>
                    </div>
                  )}
                  {showDetailModal.lead.fatherName && (
                    <div>
                      <label className="text-xs text-slate-500">Father's Name</label>
                      <p className="text-slate-900">{showDetailModal.lead.fatherName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Admission Info */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Admission Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs text-slate-500">University</label>
                    <p className="font-medium text-slate-900">{showDetailModal.university.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Academic Year</label>
                    <p className="text-slate-900">{showDetailModal.academicYear}</p>
                  </div>
                  {showDetailModal.courseName && (
                    <div>
                      <label className="text-xs text-slate-500">Course</label>
                      <p className="text-slate-900">{showDetailModal.courseName}</p>
                    </div>
                  )}
                  {showDetailModal.branch && (
                    <div>
                      <label className="text-xs text-slate-500">Branch</label>
                      <p className="text-slate-900">{showDetailModal.branch}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-slate-500">Admission Type</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${ADMISSION_TYPE_COLORS[showDetailModal.admissionType]}`}>
                      {ADMISSION_TYPE_LABELS[showDetailModal.admissionType]}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Closed Date</label>
                    <p className="text-slate-900">{formatDate(showDetailModal.closedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Financial Summary</h4>
                <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="text-xs text-slate-500">Total Fee</label>
                    <p className="text-lg font-semibold text-slate-900">{formatCurrency(showDetailModal.totalFee)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Donation</label>
                    <p className="text-lg font-semibold text-purple-600">{formatCurrency(showDetailModal.donationAmount)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Commission ({showDetailModal.commissionPercent}%)</label>
                    <p className="text-lg font-semibold text-emerald-600">{formatCurrency(showDetailModal.commissionAmount)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Paid Amount</label>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(showDetailModal.paidAmount)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Pending</label>
                    <p className="text-lg font-semibold text-red-600">{formatCurrency(showDetailModal.pendingAmount)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Payment Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${PAYMENT_STATUS_COLORS[showDetailModal.paymentStatus]}`}>
                      {showDetailModal.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {showDetailModal.payments && showDetailModal.payments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">Payment History</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">#</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Amount</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Mode</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {showDetailModal.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="px-3 py-2 text-slate-600">{payment.paymentNumber}</td>
                            <td className="px-3 py-2 font-medium text-green-600">{formatCurrency(payment.amount)}</td>
                            <td className="px-3 py-2 text-slate-600">{payment.paymentType}</td>
                            <td className="px-3 py-2 text-slate-600">{payment.paymentMode || '-'}</td>
                            <td className="px-3 py-2 text-slate-600">{payment.paidAt ? formatDate(payment.paidAt) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
