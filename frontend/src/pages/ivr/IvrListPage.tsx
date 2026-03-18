import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  GitBranch,
  Phone,
  Trash2,
  Edit,
  Play,
  Pause,
  Search,
  MoreVertical,
  Copy,
  CheckCircle,
  Clock,
  BarChart2,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface IvrFlow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  totalCalls: number;
  completedCalls: number;
  avgDuration: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  phoneNumbers: Array<{
    id: string;
    phoneNumber: string;
    isActive: boolean;
  }>;
  _count: {
    callLogs: number;
  };
}

export const IvrListPage: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<IvrFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  useEffect(() => {
    fetchFlows();
  }, [search, statusFilter]);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') {
        params.isActive = statusFilter === 'active' ? 'true' : 'false';
      }

      const response = await api.get('/ivr/flows', { params });
      setFlows(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch IVR flows');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this IVR flow?')) return;

    try {
      await api.delete(`/ivr/flows/${id}`);
      toast.success('IVR flow deleted');
      fetchFlows();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete flow');
    }
    setShowDropdown(null);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/ivr/flows/${id}`, { isActive: !isActive });
      toast.success(`Flow ${isActive ? 'deactivated' : 'activated'}`);
      fetchFlows();
    } catch (error) {
      toast.error('Failed to update flow');
    }
    setShowDropdown(null);
  };

  const handleDuplicate = async (flow: IvrFlow) => {
    try {
      await api.post('/ivr/flows', {
        name: `${flow.name} (Copy)`,
        description: flow.description,
      });
      toast.success('Flow duplicated');
      fetchFlows();
    } catch (error) {
      toast.error('Failed to duplicate flow');
    }
    setShowDropdown(null);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IVR Builder</h1>
          <p className="text-gray-600">Create and manage interactive voice response flows</p>
        </div>
        <button
          onClick={() => navigate('/ivr/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Create IVR Flow
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <GitBranch className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Flows</p>
              <p className="text-xl font-semibold">{flows.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Flows</p>
              <p className="text-xl font-semibold">
                {flows.filter(f => f.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Phone className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Assigned Numbers</p>
              <p className="text-xl font-semibold">
                {flows.reduce((acc, f) => acc + f.phoneNumbers.length, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BarChart2 className="text-orange-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Calls</p>
              <p className="text-xl font-semibold">
                {flows.reduce((acc, f) => acc + f.totalCalls, 0)}
              </p>
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
              placeholder="Search flows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'inactive'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as typeof statusFilter)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  statusFilter === status
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Flow List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : flows.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <GitBranch className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No IVR Flows</h3>
          <p className="text-gray-600 mb-4">
            Create your first IVR flow to handle incoming calls
          </p>
          <button
            onClick={() => navigate('/ivr/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Create IVR Flow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flows.map((flow) => (
            <div
              key={flow.id}
              className="bg-white rounded-lg border hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      flow.isActive ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <GitBranch className={
                        flow.isActive ? 'text-green-600' : 'text-gray-400'
                      } size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{flow.name}</h3>
                      {flow.description && (
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {flow.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(showDropdown === flow.id ? null : flow.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical size={18} className="text-gray-400" />
                    </button>
                    {showDropdown === flow.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-10">
                        <button
                          onClick={() => {
                            navigate(`/ivr/${flow.id}`);
                            setShowDropdown(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit size={16} />
                          Edit Flow
                        </button>
                        <button
                          onClick={() => handleToggleActive(flow.id, flow.isActive)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          {flow.isActive ? <Pause size={16} /> : <Play size={16} />}
                          {flow.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDuplicate(flow)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Copy size={16} />
                          Duplicate
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={() => handleDelete(flow.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Phone size={14} />
                    <span>{flow.phoneNumbers.length} numbers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart2 size={14} />
                    <span>{flow.totalCalls} calls</span>
                  </div>
                </div>

                {/* Phone Numbers */}
                {flow.phoneNumbers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {flow.phoneNumbers.slice(0, 2).map((pn) => (
                      <span
                        key={pn.id}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {pn.phoneNumber}
                      </span>
                    ))}
                    {flow.phoneNumbers.length > 2 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                        +{flow.phoneNumbers.length - 2} more
                      </span>
                    )}
                  </div>
                )}

                {/* Status Badge */}
                <div className="mt-4 flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    flow.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {flow.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {flow.publishedAt && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={12} />
                      Published {new Date(flow.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="px-4 py-3 border-t bg-gray-50">
                <button
                  onClick={() => navigate(`/ivr/${flow.id}`)}
                  className="w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium"
                >
                  Open Flow Editor
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
