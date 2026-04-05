import { useEffect, useState } from 'react';
import {
  CalendarDaysIcon,
  MapPinIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  EyeIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { studentVisitService, StudentVisit, StudentVisitStatus, CompleteVisitInput } from '../../services/student-visit.service';
import { universityService, University } from '../../services/university.service';

const STATUS_COLORS: Record<StudentVisitStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-yellow-100 text-yellow-700',
};

const STATUS_ICONS: Record<StudentVisitStatus, React.ReactNode> = {
  SCHEDULED: <ClockIcon className="w-3.5 h-3.5" />,
  CONFIRMED: <CheckCircleIcon className="w-3.5 h-3.5" />,
  COMPLETED: <CheckCircleIcon className="w-3.5 h-3.5" />,
  CANCELLED: <XCircleIcon className="w-3.5 h-3.5" />,
  NO_SHOW: <ExclamationTriangleIcon className="w-3.5 h-3.5" />,
};

export default function StudentVisitsPage() {
  const [visits, setVisits] = useState<StudentVisit[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StudentVisitStatus | ''>('');
  const [universityFilter, setUniversityFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<StudentVisit | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<StudentVisit | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [completeData, setCompleteData] = useState<CompleteVisitInput>({
    feedback: '',
    studentRating: undefined,
    interestedInAdmission: undefined,
    notes: '',
  });

  useEffect(() => {
    loadVisits();
    loadUniversities();
  }, [statusFilter, universityFilter, pagination.page]);

  const loadVisits = async () => {
    try {
      setIsLoading(true);
      const result = await studentVisitService.getAll({
        status: statusFilter || undefined,
        universityId: universityFilter || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setVisits(result.visits);
      setPagination((prev) => ({ ...prev, ...result.pagination }));
    } catch (err: any) {
      setError(err.message || 'Failed to load visits');
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

  const handleConfirm = async (visit: StudentVisit) => {
    try {
      await studentVisitService.confirm(visit.id);
      loadVisits();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm visit');
    }
  };

  const handleCancel = async (visit: StudentVisit) => {
    if (!confirm('Are you sure you want to cancel this visit?')) return;
    try {
      await studentVisitService.cancel(visit.id);
      loadVisits();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel visit');
    }
  };

  const handleMarkNoShow = async (visit: StudentVisit) => {
    if (!confirm('Mark this visit as no-show?')) return;
    try {
      await studentVisitService.markNoShow(visit.id);
      loadVisits();
    } catch (err: any) {
      setError(err.message || 'Failed to mark as no-show');
    }
  };

  const openCompleteModal = (visit: StudentVisit) => {
    setSelectedVisit(visit);
    setCompleteData({ feedback: '', studentRating: undefined, interestedInAdmission: undefined, notes: '' });
    setShowCompleteModal(true);
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;
    try {
      setSubmitting(true);
      await studentVisitService.complete(selectedVisit.id, completeData);
      setShowCompleteModal(false);
      loadVisits();
    } catch (err: any) {
      setError(err.message || 'Failed to complete visit');
    } finally {
      setSubmitting(false);
    }
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-900">Student Visits</h1>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StudentVisitStatus | '')}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white focus:border-primary-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </select>
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
          <p className="mt-3 text-sm text-slate-500">Loading visits...</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && visits.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Student</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">University</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Visit Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Arranged By</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visits.map((visit) => (
                <tr key={visit.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{visit.lead.firstName} {visit.lead.lastName}</p>
                      <p className="text-xs text-slate-500">{visit.lead.phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-slate-900">{visit.university.shortName || visit.university.name}</p>
                        {visit.university.city && <p className="text-xs text-slate-500">{visit.university.city}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-slate-900">{formatDate(visit.visitDate)}</p>
                        {visit.visitTime && <p className="text-xs text-slate-500">{visit.visitTime}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[visit.status]}`}>
                      {STATUS_ICONS[visit.status]}
                      {visit.status.replace('_', ' ')}
                    </span>
                    {visit.studentRating && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarIcon
                            key={star}
                            className={`w-3 h-3 ${star <= visit.studentRating! ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`}
                          />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{visit.arrangedBy.firstName} {visit.arrangedBy.lastName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setShowDetailModal(visit)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      {visit.status === 'SCHEDULED' && (
                        <>
                          <button
                            onClick={() => handleConfirm(visit)}
                            className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleCancel(visit)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {(visit.status === 'SCHEDULED' || visit.status === 'CONFIRMED') && (
                        <>
                          <button
                            onClick={() => openCompleteModal(visit)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleMarkNoShow(visit)}
                            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                          >
                            No Show
                          </button>
                        </>
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
      {!isLoading && visits.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-200">
          <CalendarDaysIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-800">No visits found</h3>
          <p className="text-sm text-slate-500 mt-1">
            Schedule visits from the lead detail page.
          </p>
        </div>
      )}

      {/* Complete Visit Modal */}
      {showCompleteModal && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Complete Visit</h3>
              <button onClick={() => setShowCompleteModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleComplete} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Student Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setCompleteData({ ...completeData, studentRating: rating })}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        completeData.studentRating === rating
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-slate-200 hover:border-yellow-300'
                      }`}
                    >
                      <StarIcon
                        className={`w-5 h-5 ${completeData.studentRating && completeData.studentRating >= rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Interested in Admission?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCompleteData({ ...completeData, interestedInAdmission: true })}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium ${
                      completeData.interestedInAdmission === true
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-200 text-slate-600 hover:border-green-300'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompleteData({ ...completeData, interestedInAdmission: false })}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium ${
                      completeData.interestedInAdmission === false
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-600 hover:border-red-300'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Feedback</label>
                <textarea
                  value={completeData.feedback}
                  onChange={(e) => setCompleteData({ ...completeData, feedback: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  placeholder="Student's feedback about the visit..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={completeData.notes}
                  onChange={(e) => setCompleteData({ ...completeData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
                  placeholder="Any additional notes..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCompleteModal(false)} className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {submitting ? 'Completing...' : 'Complete Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Visit Details</h3>
              <button onClick={() => setShowDetailModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Student</label>
                  <p className="text-slate-900 font-medium">{showDetailModal.lead.firstName} {showDetailModal.lead.lastName}</p>
                  <p className="text-slate-500">{showDetailModal.lead.phone}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">University</label>
                  <p className="text-slate-900 font-medium">{showDetailModal.university.name}</p>
                  <p className="text-slate-500">{showDetailModal.university.city}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Visit Date</label>
                  <p className="text-slate-900">{formatDate(showDetailModal.visitDate)} {showDetailModal.visitTime}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Status</label>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[showDetailModal.status]}`}>
                    {showDetailModal.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Arranged By</label>
                  <p className="text-slate-900">{showDetailModal.arrangedBy.firstName} {showDetailModal.arrangedBy.lastName}</p>
                </div>
                {showDetailModal.accompaniedBy && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">Accompanied By</label>
                    <p className="text-slate-900">{showDetailModal.accompaniedBy.firstName} {showDetailModal.accompaniedBy.lastName}</p>
                  </div>
                )}
              </div>

              {showDetailModal.feedback && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Feedback</label>
                  <p className="text-slate-700 mt-1">{showDetailModal.feedback}</p>
                </div>
              )}

              {showDetailModal.studentRating && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Rating</label>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon
                        key={star}
                        className={`w-5 h-5 ${star <= showDetailModal.studentRating! ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {showDetailModal.interestedInAdmission !== null && showDetailModal.interestedInAdmission !== undefined && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Interested in Admission</label>
                  <p className={`font-medium ${showDetailModal.interestedInAdmission ? 'text-green-600' : 'text-red-600'}`}>
                    {showDetailModal.interestedInAdmission ? 'Yes' : 'No'}
                  </p>
                </div>
              )}

              {showDetailModal.notes && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Notes</label>
                  <p className="text-slate-700 mt-1">{showDetailModal.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
