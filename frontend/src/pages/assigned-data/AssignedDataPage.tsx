import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  PhoneIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserPlusIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

interface RawRecord {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  status: string;
  notes?: string;
  callSummary?: string;
  callSentiment?: string;
  interestLevel?: string;
  callAttempts: number;
  lastCallAt?: string;
  assignedAt: string;
  bulkImport?: { fileName: string };
  assignedBy?: { firstName: string; lastName: string };
  customFields?: {
    aiAnalyzed?: boolean;
    lastCallOutcome?: string;
    buyingSignals?: string[];
    objections?: string[];
    qualificationData?: Record<string, any>;
    [key: string]: any;
  };
}

interface Stats {
  total: number;
  assigned: number;
  interested: number;
  notInterested: number;
  noAnswer: number;
  callback: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ASSIGNED: { label: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-100' },
  CALLING: { label: 'Calling', color: 'text-purple-700', bg: 'bg-purple-100' },
  INTERESTED: { label: 'Interested', color: 'text-green-700', bg: 'bg-green-100' },
  NOT_INTERESTED: { label: 'Not Interested', color: 'text-red-700', bg: 'bg-red-100' },
  NO_ANSWER: { label: 'No Answer', color: 'text-gray-700', bg: 'bg-gray-100' },
  CALLBACK_REQUESTED: { label: 'Callback', color: 'text-amber-700', bg: 'bg-amber-100' },
  CONVERTED: { label: 'Converted', color: 'text-emerald-700', bg: 'bg-emerald-100' },
};

export default function AssignedDataPage() {
  const [records, setRecords] = useState<RawRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState<RawRecord | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [uploadingRecording, setUploadingRecording] = useState(false);

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/telecaller/assigned-data', { params });
      setRecords(res.data?.data?.records || []);
    } catch (error) {
      console.error('Failed to fetch assigned data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/telecaller/assigned-data/stats');
      setStats(res.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleCall = (record: RawRecord) => {
    setSelectedRecord(record);
    setShowCallModal(true);
    // Open phone dialer
    window.location.href = `tel:${record.phone}`;
  };

  const updateStatus = async (id: string, status: string, notes?: string) => {
    try {
      setUpdating(true);
      await api.put(`/telecaller/assigned-data/${id}/status`, { status, notes });
      fetchData();
      fetchStats();
      setShowCallModal(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const convertToLead = async (id: string, notes?: string) => {
    try {
      setUpdating(true);
      const res = await api.post(`/telecaller/assigned-data/${id}/convert`, { notes });
      alert('Successfully converted to lead!');
      fetchData();
      fetchStats();
      setShowCallModal(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Failed to convert:', error);
      alert('Failed to convert to lead');
    } finally {
      setUpdating(false);
    }
  };

  const uploadRecording = async (id: string, file: File) => {
    try {
      setUploadingRecording(true);
      const formData = new FormData();
      formData.append('recording', file);

      await api.post(`/telecaller/assigned-data/${id}/recording`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Recording uploaded! AI will analyze and update the status automatically.');
      fetchData();
      fetchStats();
    } catch (error) {
      console.error('Failed to upload recording:', error);
      alert('Failed to upload recording');
    } finally {
      setUploadingRecording(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen -m-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Assigned Data</h1>
          <p className="text-sm text-slate-500">Contacts assigned to you for calling (not yet leads)</p>
        </div>
        <button
          onClick={() => { fetchData(); fetchStats(); }}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition-all shadow-sm bg-white"
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Assigned</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-2xl font-bold text-blue-600">{stats.assigned}</p>
            <p className="text-xs text-blue-600">To Call</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <p className="text-2xl font-bold text-green-600">{stats.interested}</p>
            <p className="text-xs text-green-600">Interested</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
            <p className="text-2xl font-bold text-red-600">{stats.notInterested}</p>
            <p className="text-xs text-red-600">Not Interested</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-2xl font-bold text-gray-600">{stats.noAnswer}</p>
            <p className="text-xs text-gray-600">No Answer</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
            <p className="text-2xl font-bold text-amber-600">{stats.callback}</p>
            <p className="text-xs text-amber-600">Callback</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-100 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </form>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Actionable</option>
              <option value="ASSIGNED">To Call</option>
              <option value="NO_ANSWER">No Answer</option>
              <option value="CALLBACK_REQUESTED">Callback Requested</option>
              <option value="INTERESTED">Interested</option>
              <option value="NOT_INTERESTED">Not Interested</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No assigned data found</p>
            <p className="text-sm">Ask your manager to assign contacts to you</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Contact</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Phone</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Attempts</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Last Call</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">
                          {record.firstName} {record.lastName || ''}
                        </p>
                        {record.customFields?.aiAnalyzed && (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded" title="AI Analyzed">
                            <SparklesIcon className="w-3 h-3" />
                            AI
                          </span>
                        )}
                      </div>
                      {record.email && (
                        <p className="text-xs text-slate-400">{record.email}</p>
                      )}
                      {record.callSummary && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1" title={record.callSummary}>
                          <ChatBubbleLeftRightIcon className="w-3 h-3 inline mr-1" />
                          {record.callSummary}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-600">{record.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium w-fit ${STATUS_CONFIG[record.status]?.bg || 'bg-slate-100'} ${STATUS_CONFIG[record.status]?.color || 'text-slate-700'}`}>
                        {STATUS_CONFIG[record.status]?.label || record.status}
                      </span>
                      {record.callSentiment && (
                        <span className={`text-xs px-2 py-0.5 rounded w-fit ${
                          record.callSentiment === 'positive' ? 'text-green-600 bg-green-50' :
                          record.callSentiment === 'negative' ? 'text-red-600 bg-red-50' :
                          'text-slate-500 bg-slate-50'
                        }`}>
                          {record.callSentiment}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-600">{record.callAttempts || 0}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-400">
                      {record.lastCallAt ? new Date(record.lastCallAt).toLocaleDateString() : '-'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Call Button */}
                      <button
                        onClick={() => handleCall(record)}
                        className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                        title="Call"
                      >
                        <PhoneIcon className="w-4 h-4" />
                      </button>

                      {/* Convert to Lead (if interested) */}
                      {record.status === 'INTERESTED' && (
                        <button
                          onClick={() => convertToLead(record.id)}
                          className="p-2 text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
                          title="Convert to Lead"
                        >
                          <UserPlusIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Call Outcome Modal */}
      {showCallModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Call Outcome
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {selectedRecord.firstName} {selectedRecord.lastName} - {selectedRecord.phone}
            </p>

            {/* AI Analysis Results (if available) */}
            {selectedRecord.customFields?.aiAnalyzed && (
              <div className="mb-4 p-3 bg-purple-50 border border-purple-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">AI Analysis</span>
                </div>
                {selectedRecord.callSummary && (
                  <p className="text-sm text-slate-600 mb-2">{selectedRecord.callSummary}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {selectedRecord.callSentiment && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      selectedRecord.callSentiment === 'positive' ? 'text-green-600 bg-green-100' :
                      selectedRecord.callSentiment === 'negative' ? 'text-red-600 bg-red-100' :
                      'text-slate-600 bg-slate-100'
                    }`}>
                      Sentiment: {selectedRecord.callSentiment}
                    </span>
                  )}
                  {selectedRecord.customFields?.lastCallOutcome && (
                    <span className="text-xs px-2 py-1 rounded text-purple-600 bg-purple-100">
                      Detected: {selectedRecord.customFields.lastCallOutcome}
                    </span>
                  )}
                </div>
                {selectedRecord.customFields?.buyingSignals && selectedRecord.customFields.buyingSignals.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-green-700">Buying Signals:</p>
                    <ul className="text-xs text-green-600 list-disc list-inside">
                      {selectedRecord.customFields.buyingSignals.slice(0, 3).map((signal: string, i: number) => (
                        <li key={i}>{signal}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedRecord.customFields?.objections && selectedRecord.customFields.objections.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-red-700">Objections:</p>
                    <ul className="text-xs text-red-600 list-disc list-inside">
                      {selectedRecord.customFields.objections.slice(0, 3).map((objection: string, i: number) => (
                        <li key={i}>{objection}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-slate-700">How did the call go?</p>

              <button
                onClick={() => updateStatus(selectedRecord.id, 'INTERESTED')}
                disabled={updating}
                className="w-full flex items-center gap-3 p-3 border border-green-200 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-green-700">Interested</p>
                  <p className="text-xs text-green-600">Contact showed interest</p>
                </div>
              </button>

              <button
                onClick={() => updateStatus(selectedRecord.id, 'NOT_INTERESTED')}
                disabled={updating}
                className="w-full flex items-center gap-3 p-3 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <XCircleIcon className="w-5 h-5 text-red-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-red-700">Not Interested</p>
                  <p className="text-xs text-red-600">Contact declined</p>
                </div>
              </button>

              <button
                onClick={() => updateStatus(selectedRecord.id, 'CALLBACK_REQUESTED')}
                disabled={updating}
                className="w-full flex items-center gap-3 p-3 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
              >
                <ClockIcon className="w-5 h-5 text-amber-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-amber-700">Callback Requested</p>
                  <p className="text-xs text-amber-600">Contact asked to call later</p>
                </div>
              </button>

              <button
                onClick={() => updateStatus(selectedRecord.id, 'NO_ANSWER')}
                disabled={updating}
                className="w-full flex items-center gap-3 p-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <PhoneIcon className="w-5 h-5 text-slate-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-700">No Answer</p>
                  <p className="text-xs text-slate-500">Could not reach contact</p>
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCallModal(false); setSelectedRecord(null); }}
                className="flex-1 px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {selectedRecord.status === 'INTERESTED' && (
                <button
                  onClick={() => convertToLead(selectedRecord.id)}
                  disabled={updating}
                  className="flex-1 px-4 py-2 text-sm text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
                >
                  Convert to Lead
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
