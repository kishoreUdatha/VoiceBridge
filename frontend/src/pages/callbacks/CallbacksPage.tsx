import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Plus,
  Clock,
  Phone,
  CheckCircle,
  XCircle,
  Calendar,
  Search,
  RefreshCw,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Callback {
  id: string;
  phoneNumber: string;
  contactName: string | null;
  source: string;
  status: string;
  priority: number;
  scheduledAt: string | null;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: string | null;
  outcome: string | null;
  notes: string | null;
  createdAt: string;
}

export const CallbacksPage: React.FC = () => {
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    scheduled: 0,
    completed: 0,
    failed: 0,
    completionRate: 0,
  });
  const [formData, setFormData] = useState({
    phoneNumber: '',
    contactName: '',
    scheduledAt: '',
    priority: 5,
    notes: '',
  });

  useEffect(() => {
    fetchCallbacks();
    fetchStats();
  }, [search, statusFilter, sourceFilter]);

  const fetchCallbacks = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (sourceFilter) params.source = sourceFilter;

      const response = await api.get('/callbacks', { params });
      setCallbacks(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch callbacks');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/callbacks/stats/overview');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const handleCreateCallback = async () => {
    if (!formData.phoneNumber) {
      toast.error('Phone number is required');
      return;
    }

    try {
      await api.post('/callbacks', {
        phoneNumber: formData.phoneNumber,
        contactName: formData.contactName || undefined,
        scheduledAt: formData.scheduledAt || undefined,
        priority: formData.priority,
        notes: formData.notes || undefined,
        source: 'MANUAL',
      });
      toast.success('Callback scheduled');
      setShowCreateModal(false);
      setFormData({
        phoneNumber: '',
        contactName: '',
        scheduledAt: '',
        priority: 5,
        notes: '',
      });
      fetchCallbacks();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create callback');
    }
  };

  const handleExecuteCallback = async (id: string) => {
    try {
      await api.post(`/callbacks/${id}/execute`);
      toast.success('Callback initiated');
      fetchCallbacks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to execute callback');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this callback?')) return;

    try {
      await api.put(`/callbacks/${id}/cancel`);
      toast.success('Callback cancelled');
      fetchCallbacks();
      fetchStats();
    } catch (error) {
      toast.error('Failed to cancel callback');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'SCHEDULED': return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'FAILED': return 'bg-red-100 text-red-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'QUEUE_OVERFLOW': return 'Queue Overflow';
      case 'VOICEMAIL': return 'Voicemail';
      case 'IVR': return 'IVR';
      case 'MANUAL': return 'Manual';
      case 'ABANDONED': return 'Abandoned Call';
      case 'WEB_FORM': return 'Web Form';
      default: return source;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'text-red-600';
    if (priority <= 4) return 'text-orange-600';
    return 'text-gray-600';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Callback Queue</h1>
          <p className="text-gray-600">Manage scheduled callbacks and follow-ups</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { fetchCallbacks(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Schedule Callback
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <PhoneCall className="text-gray-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-xl font-semibold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-xl font-semibold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Scheduled</p>
              <p className="text-xl font-semibold text-blue-600">{stats.scheduled}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-xl font-semibold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-xl font-semibold text-red-600">{stats.failed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-xl font-semibold">{stats.completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by phone number or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sources</option>
            <option value="QUEUE_OVERFLOW">Queue Overflow</option>
            <option value="VOICEMAIL">Voicemail</option>
            <option value="IVR">IVR</option>
            <option value="MANUAL">Manual</option>
            <option value="ABANDONED">Abandoned Call</option>
            <option value="WEB_FORM">Web Form</option>
          </select>
        </div>
      </div>

      {/* Callback List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : callbacks.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <PhoneCall className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Callbacks</h3>
          <p className="text-gray-600 mb-4">
            Schedule a callback to follow up with contacts
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Schedule Callback
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {callbacks.map((cb) => (
                <tr key={cb.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{cb.phoneNumber}</p>
                      {cb.contactName && (
                        <p className="text-sm text-gray-500">{cb.contactName}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{getSourceLabel(cb.source)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(cb.status)}`}>
                      {cb.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {cb.scheduledAt ? (
                      <span className="text-sm text-gray-600">
                        {new Date(cb.scheduledAt).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Not scheduled</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {cb.attempts} / {cb.maxAttempts}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${getPriorityColor(cb.priority)}`}>
                      {cb.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {(cb.status === 'PENDING' || cb.status === 'SCHEDULED') && (
                        <>
                          <button
                            onClick={() => handleExecuteCallback(cb.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Execute Callback"
                          >
                            <Phone size={18} />
                          </button>
                          <button
                            onClick={() => handleCancel(cb.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Cancel"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                      {cb.status === 'COMPLETED' && (
                        <CheckCircle className="text-green-500" size={18} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Callback Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Schedule Callback</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule For
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (1-10, 1 is highest)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCallback}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
              >
                Schedule Callback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
