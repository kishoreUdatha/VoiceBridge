/**
 * Pending Approvals Page
 * Shows approvals waiting for current user's action
 */

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  CurrencyRupeeIcon,
  UserIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import {
  approvalService,
  ApprovalRequest,
  ApprovalDecision,
  ApprovalEntityType,
} from '../../services/approval.service';

const ENTITY_TYPE_LABELS: Record<ApprovalEntityType, string> = {
  LEAD_CONVERSION: 'Lead Conversion',
  PAYMENT: 'Payment',
  ADMISSION: 'Admission',
  DISCOUNT: 'Discount',
  REFUND: 'Refund',
  FEE_WAIVER: 'Fee Waiver',
  COMMISSION: 'Commission',
  QUOTATION: 'Quotation',
  CUSTOM: 'Custom',
};

const ENTITY_TYPE_COLORS: Record<ApprovalEntityType, string> = {
  LEAD_CONVERSION: 'bg-blue-100 text-blue-700',
  PAYMENT: 'bg-green-100 text-green-700',
  ADMISSION: 'bg-purple-100 text-purple-700',
  DISCOUNT: 'bg-orange-100 text-orange-700',
  REFUND: 'bg-red-100 text-red-700',
  FEE_WAIVER: 'bg-yellow-100 text-yellow-700',
  COMMISSION: 'bg-emerald-100 text-emerald-700',
  QUOTATION: 'bg-indigo-100 text-indigo-700',
  CUSTOM: 'bg-slate-100 text-slate-700',
};

export default function PendingApprovalsPage() {
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([]);
  const [myRequests, setMyRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'my-requests'>('pending');
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    request: ApprovalRequest | null;
    decision: ApprovalDecision | null;
  }>({ isOpen: false, request: null, decision: null });
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pending, mine] = await Promise.all([
        approvalService.getPendingApprovals(),
        approvalService.getMyRequests(),
      ]);
      setPendingRequests(pending);
      setMyRequests(mine);
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async () => {
    if (!actionModal.request || !actionModal.decision) return;

    try {
      setProcessing(true);
      await approvalService.takeAction(
        actionModal.request.id,
        actionModal.decision,
        comments
      );

      toast.success(
        actionModal.decision === 'APPROVED'
          ? 'Request approved successfully'
          : actionModal.decision === 'REJECTED'
          ? 'Request rejected'
          : 'Changes requested'
      );

      setActionModal({ isOpen: false, request: null, decision: null });
      setComments('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process action');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;

    try {
      await approvalService.cancelRequest(requestId);
      toast.success('Request cancelled');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel request');
    }
  };

  const openActionModal = (request: ApprovalRequest, decision: ApprovalDecision) => {
    setActionModal({ isOpen: true, request, decision });
    setComments('');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      IN_PROGRESS: 'bg-blue-100 text-blue-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-slate-100 text-slate-700',
      EXPIRED: 'bg-orange-100 text-orange-700',
    };
    return styles[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen -m-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Approvals</h1>
          <p className="text-sm text-slate-500">
            Manage approval requests and workflows
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition-all"
        >
          <ArrowPathIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-800">
                {pendingRequests.length}
              </p>
              <p className="text-sm text-slate-500">Pending Approvals</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-800">
                {myRequests.filter((r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length}
              </p>
              <p className="text-sm text-slate-500">My Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleSolidIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-800">
                {myRequests.filter((r) => r.status === 'APPROVED').length}
              </p>
              <p className="text-sm text-slate-500">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-800">
                {myRequests.filter((r) => r.status === 'REJECTED').length}
              </p>
              <p className="text-sm text-slate-500">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'pending'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pending Approvals ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('my-requests')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'my-requests'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          My Requests ({myRequests.length})
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : activeTab === 'pending' ? (
          pendingRequests.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircleSolidIcon className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <p className="text-slate-600 font-medium">All caught up!</p>
              <p className="text-sm text-slate-500">No pending approvals</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            ENTITY_TYPE_COLORS[request.entityType]
                          }`}
                        >
                          {ENTITY_TYPE_LABELS[request.entityType]}
                        </span>
                        <span className="text-xs text-slate-400">
                          Step {request.currentStep} of{' '}
                          {request.workflow?.steps?.length || '?'}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-slate-800 mb-1">
                        {request.title}
                      </h3>
                      {request.description && (
                        <p className="text-sm text-slate-500 mb-2 line-clamp-2">
                          {request.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5" />
                          {request.submittedBy?.firstName}{' '}
                          {request.submittedBy?.lastName}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {formatDate(request.submittedAt)}
                        </span>
                        {request.amount && (
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <CurrencyRupeeIcon className="w-3.5 h-3.5" />
                            {formatCurrency(request.amount)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openActionModal(request, 'APPROVED')}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openActionModal(request, 'REJECTED')}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => openActionModal(request, 'REQUEST_CHANGES')}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Request Changes
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : myRequests.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No requests yet</p>
            <p className="text-sm text-slate-500">
              Requests you submit will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ENTITY_TYPE_COLORS[request.entityType]
                        }`}
                      >
                        {ENTITY_TYPE_LABELS[request.entityType]}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-800 mb-1">
                      {request.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {formatDate(request.submittedAt)}
                      </span>
                      {request.amount && (
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <CurrencyRupeeIcon className="w-3.5 h-3.5" />
                          {formatCurrency(request.amount)}
                        </span>
                      )}
                      {request.actions && request.actions.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                          {request.actions.length} action(s)
                        </span>
                      )}
                    </div>
                    {request.finalComments && (
                      <p className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
                        <strong>Comments:</strong> {request.finalComments}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(request.status === 'PENDING' ||
                      request.status === 'IN_PROGRESS') && (
                      <button
                        onClick={() => handleCancel(request.id)}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionModal.isOpen && actionModal.request && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              {actionModal.decision === 'APPROVED' ? (
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
              ) : actionModal.decision === 'REJECTED' ? (
                <div className="p-2 bg-red-100 rounded-full">
                  <XCircleIcon className="w-6 h-6 text-red-600" />
                </div>
              ) : (
                <div className="p-2 bg-yellow-100 rounded-full">
                  <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {actionModal.decision === 'APPROVED'
                    ? 'Approve Request'
                    : actionModal.decision === 'REJECTED'
                    ? 'Reject Request'
                    : 'Request Changes'}
                </h3>
                <p className="text-sm text-slate-500">
                  {actionModal.request.title}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Comments {actionModal.decision !== 'APPROVED' && '(Required)'}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={
                  actionModal.decision === 'APPROVED'
                    ? 'Add optional comments...'
                    : 'Please provide a reason...'
                }
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setActionModal({ isOpen: false, request: null, decision: null })
                }
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={
                  processing ||
                  (actionModal.decision !== 'APPROVED' && !comments.trim())
                }
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${
                  actionModal.decision === 'APPROVED'
                    ? 'bg-green-600 hover:bg-green-700'
                    : actionModal.decision === 'REJECTED'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
