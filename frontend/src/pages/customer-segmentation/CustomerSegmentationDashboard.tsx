import { useState, useEffect } from 'react';
import {
  Users,
  Layers,
  Target,
  TrendingUp,
  RefreshCw,
  Plus,
  BarChart3,
  Clock,
  DollarSign,
  AlertTriangle,
  Settings,
  Trash2
} from 'lucide-react';
import {
  customerSegmentationService,
  RFMDashboard,
  CustomerSegment,
  SegmentType,
  RFM_SEGMENT_DESCRIPTIONS
} from '../../services/customer-segmentation.service';

export default function CustomerSegmentationDashboard() {
  const [rfmDashboard, setRfmDashboard] = useState<RFMDashboard | null>(null);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rfm, segs] = await Promise.all([
        customerSegmentationService.getRFMDashboard(),
        customerSegmentationService.getSegments(),
      ]);
      setRfmDashboard(rfm);
      setSegments(segs);
    } catch (error) {
      console.error('Failed to load segmentation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCalculate = async () => {
    try {
      setCalculating(true);
      await customerSegmentationService.batchCalculateRFM(100);
      await loadData();
    } catch (error) {
      console.error('Failed to batch calculate RFM:', error);
    } finally {
      setCalculating(false);
    }
  };

  const handleDeleteSegment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) return;
    try {
      await customerSegmentationService.deleteSegment(id);
      setSegments(segments.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete segment:', error);
    }
  };

  const handleRefreshSegment = async (id: string) => {
    try {
      await customerSegmentationService.refreshSegment(id);
      await loadData();
    } catch (error) {
      console.error('Failed to refresh segment:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Convert segment distribution to array for chart
  const segmentData = Object.entries(rfmDashboard?.segmentDistribution || {})
    .map(([segment, count]) => ({ segment, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-7 w-7 text-indigo-600" />
            Customer Segmentation
          </h1>
          <p className="text-gray-500 mt-1">RFM analysis and dynamic customer segments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleBatchCalculate}
            disabled={calculating}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
            {calculating ? 'Calculating...' : 'Recalculate RFM'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Create Segment
          </button>
        </div>
      </div>

      {/* RFM Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Analyzed"
          value={rfmDashboard?.totalAnalyzed || 0}
          color="blue"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Avg Recency (days)"
          value={(rfmDashboard?.avgRecency || 0).toFixed(0)}
          color="green"
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Avg Frequency"
          value={(rfmDashboard?.avgFrequency || 0).toFixed(1)}
          color="purple"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Avg Monetary"
          value={`₹${((rfmDashboard?.avgMonetary || 0) / 1000).toFixed(1)}K`}
          color="amber"
        />
      </div>

      {/* RFM Segment Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" />
            RFM Segment Distribution
          </h3>
          <div className="space-y-3">
            {segmentData.slice(0, 8).map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{item.segment}</span>
                    <span className="text-gray-500">{item.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getSegmentColor(item.segment)}`}
                      style={{ width: `${(item.count / (rfmDashboard?.totalAnalyzed || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Segments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Top Performing Segments
          </h3>
          <div className="space-y-3">
            {(rfmDashboard?.topSegments || []).map((seg, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{seg.segment}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {RFM_SEGMENT_DESCRIPTIONS[seg.segment] || 'No description'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{seg.count}</p>
                    <p className="text-xs text-gray-500">Avg: ₹{(seg.avgRevenue / 1000).toFixed(1)}K</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* At-Risk Customers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          At-Risk Customers (Need Re-engagement)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(rfmDashboard?.atRiskCustomers || []).map((customer, idx) => (
            <div key={idx} className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <p className="font-medium text-gray-900">{customer.leadName}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-red-600 font-medium">{customer.rfmSegment}</span>
                <span className="text-xs text-gray-500">
                  Last: {customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          ))}
          {(!rfmDashboard?.atRiskCustomers || rfmDashboard.atRiskCustomers.length === 0) && (
            <p className="col-span-3 text-center text-gray-500 py-4">No at-risk customers</p>
          )}
        </div>
      </div>

      {/* Custom Segments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-600" />
          Custom Segments
        </h3>
        {segments.length === 0 ? (
          <div className="text-center py-8">
            <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No custom segments created yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-3 text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Create your first segment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((segment) => (
              <div key={segment.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{segment.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{segment.description || 'No description'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(segment.type)}`}>
                    {segment.type}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{segment.memberCount}</span>
                    <span className="text-xs text-gray-500">members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRefreshSegment(segment.id)}
                      className="p-1.5 text-gray-400 hover:text-primary-600"
                      title="Refresh membership"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSegment(segment.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                      title="Delete segment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Segment Modal */}
      {showCreateModal && (
        <CreateSegmentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function CreateSegmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<SegmentType>('CUSTOM');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      await customerSegmentationService.createSegment({
        name,
        description,
        type,
        rules: {},
        isDynamic: true,
      });
      onCreated();
    } catch (error) {
      console.error('Failed to create segment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Segment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., High Value Customers"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows={2}
              placeholder="Optional description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SegmentType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="CUSTOM">Custom</option>
              <option value="RFM">RFM-based</option>
              <option value="BEHAVIORAL">Behavioral</option>
              <option value="DEMOGRAPHIC">Demographic</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function getSegmentColor(segment: string): string {
  const colorMap: Record<string, string> = {
    'Champions': 'bg-emerald-500',
    'Loyal Customers': 'bg-green-500',
    'Potential Loyalists': 'bg-blue-500',
    'Recent Customers': 'bg-cyan-500',
    'Promising': 'bg-indigo-500',
    'Needs Attention': 'bg-amber-500',
    'About to Sleep': 'bg-orange-500',
    'At Risk': 'bg-red-400',
    'Can\'t Lose Them': 'bg-red-500',
    'Hibernating': 'bg-gray-400',
    'Lost': 'bg-gray-500',
  };
  return colorMap[segment] || 'bg-gray-400';
}

function getTypeColor(type: SegmentType): string {
  const colors: Record<SegmentType, string> = {
    RFM: 'bg-purple-100 text-purple-700',
    BEHAVIORAL: 'bg-blue-100 text-blue-700',
    DEMOGRAPHIC: 'bg-green-100 text-green-700',
    CUSTOM: 'bg-gray-100 text-gray-700',
  };
  return colors[type] || colors.CUSTOM;
}
