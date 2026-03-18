import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  GitBranch,
  BarChart3,
  Loader2,
} from 'lucide-react';
import api from '../../services/api';

interface CallFlow {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  isActive: boolean;
  version: number;
  totalCalls: number;
  successfulCalls: number;
  conversionRate: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
  _count?: {
    voiceAgents: number;
    callLogs: number;
  };
}

const CallFlowsPage: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<CallFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const response = await api.get('/call-flows');
      setFlows(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch call flows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this call flow?')) return;
    try {
      await api.delete(`/call-flows/${id}`);
      setFlows(flows.filter((f) => f.id !== id));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete');
    }
    setMenuOpen(null);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await api.post(`/call-flows/${id}/duplicate`);
      setFlows([response.data.data, ...flows]);
    } catch (error) {
      console.error('Failed to duplicate:', error);
    }
    setMenuOpen(null);
  };

  const filteredFlows = flows.filter((flow) =>
    flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flow.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Flow Builder</h1>
          <p className="text-gray-600 mt-1">Create structured conversation flows for your voice agents</p>
        </div>
        <button
          onClick={() => navigate('/call-flows/builder')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Create Flow
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search call flows..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Flows Grid */}
      {filteredFlows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <GitBranch size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No call flows yet</h3>
          <p className="text-gray-500 mb-4">Create your first structured call flow</p>
          <button
            onClick={() => navigate('/call-flows/builder')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            Create Flow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFlows.map((flow) => (
            <div
              key={flow.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <GitBranch size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{flow.name}</h3>
                      {flow.industry && (
                        <span className="text-xs text-gray-500">{flow.industry}</span>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === flow.id ? null : flow.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical size={18} className="text-gray-400" />
                    </button>
                    {menuOpen === flow.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            navigate(`/call-flows/builder/${flow.id}`);
                            setMenuOpen(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDuplicate(flow.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          <Copy size={14} />
                          Duplicate
                        </button>
                        <button
                          onClick={() => handleDelete(flow.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {flow.description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{flow.description}</p>
                )}
              </div>

              {/* Stats */}
              <div className="px-4 py-3 bg-gray-50 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{flow._count?.callLogs || 0}</div>
                  <div className="text-xs text-gray-500">Calls</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-600">
                    {flow.conversionRate ? `${flow.conversionRate.toFixed(1)}%` : '0%'}
                  </div>
                  <div className="text-xs text-gray-500">Conversion</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-blue-600">{flow._count?.voiceAgents || 0}</div>
                  <div className="text-xs text-gray-500">Agents</div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 flex gap-2">
                <button
                  onClick={() => navigate(`/call-flows/builder/${flow.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  <Edit size={14} />
                  Edit Flow
                </button>
                <button className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                  <BarChart3 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CallFlowsPage;
