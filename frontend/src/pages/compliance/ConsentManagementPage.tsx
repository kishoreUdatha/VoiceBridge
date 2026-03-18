import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DocumentCheckIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface ConsentRecord {
  id: string;
  phoneNumber: string;
  consentType: string;
  consentGiven: boolean;
  consentMethod: string;
  callId: string | null;
  validFrom: string;
  validUntil: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
  createdAt: string;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
  } | null;
}

const CONSENT_TYPES = [
  { value: 'CALL_RECORDING', label: 'Call Recording' },
  { value: 'MARKETING_CALLS', label: 'Marketing Calls' },
  { value: 'DATA_PROCESSING', label: 'Data Processing' },
  { value: 'PAYMENT_COLLECTION', label: 'Payment Collection' },
];

const ConsentManagementPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneFilter, setPhoneFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [includeRevoked, setIncludeRevoked] = useState(searchParams.get('includeRevoked') === 'true');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<ConsentRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  useEffect(() => {
    fetchRecords();
  }, [phoneFilter, typeFilter, includeRevoked, page]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 50 };
      if (phoneFilter) params.phoneNumber = phoneFilter;
      if (typeFilter) params.consentType = typeFilter;
      if (includeRevoked) params.includeRevoked = 'true';

      const response = await api.get('/compliance/consent', { params });
      setRecords(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch consent records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedConsent) return;

    try {
      await api.delete(`/compliance/consent/${selectedConsent.id}`, {
        data: { reason: revokeReason },
      });
      setRevokeModalOpen(false);
      setSelectedConsent(null);
      setRevokeReason('');
      fetchRecords();
    } catch (error) {
      console.error('Failed to revoke consent:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConsentTypeLabel = (type: string) => {
    return CONSENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      VERBAL: 'bg-blue-100 text-blue-700',
      WRITTEN: 'bg-green-100 text-green-700',
      DIGITAL: 'bg-purple-100 text-purple-700',
      IVR_KEYPRESS: 'bg-orange-100 text-orange-700',
    };
    return colors[method] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <DocumentCheckIcon className="h-8 w-8 text-blue-600" />
          Consent Management
        </h1>
        <p className="text-gray-600 mt-1">
          View and manage consent records for your contacts
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value)}
              placeholder="Search by phone number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {CONSENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeRevoked}
              onChange={(e) => setIncludeRevoked(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Include revoked</span>
          </label>
          <button
            onClick={() => fetchRecords()}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Records Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <DocumentCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Consent Records</h3>
          <p className="text-gray-600 mt-1">Consent records will appear here as they are collected</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className={`hover:bg-gray-50 ${record.revokedAt ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {record.lead ? `${record.lead.firstName} ${record.lead.lastName}` : 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500">{record.phoneNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{getConsentTypeLabel(record.consentType)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.revokedAt ? (
                      <div className="flex items-center gap-1">
                        <XCircleIcon className="h-5 w-5 text-red-500" />
                        <span className="text-sm text-red-600">Revoked</span>
                      </div>
                    ) : record.consentGiven ? (
                      <div className="flex items-center gap-1">
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-600">Given</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <XCircleIcon className="h-5 w-5 text-gray-500" />
                        <span className="text-sm text-gray-600">Denied</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${getMethodBadge(record.consentMethod)}`}>
                      {record.consentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(record.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.consentGiven && !record.revokedAt && (
                      <button
                        onClick={() => {
                          setSelectedConsent(record);
                          setRevokeModalOpen(true);
                        }}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Revoke
                      </button>
                    )}
                    {record.revokedAt && (
                      <span className="text-xs text-gray-500">
                        {record.revokeReason || 'No reason'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-6 py-3 border-t flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {revokeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revoke Consent</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to revoke {getConsentTypeLabel(selectedConsent?.consentType || '')} consent
              for {selectedConsent?.phoneNumber}?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter reason for revoking consent..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setRevokeModalOpen(false);
                  setSelectedConsent(null);
                  setRevokeReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Revoke Consent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsentManagementPage;
