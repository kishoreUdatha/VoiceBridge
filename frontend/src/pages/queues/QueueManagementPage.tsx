import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Clock,
  CheckCircle,
  Trash2,
  Edit,
  Play,
  Pause,
  UserPlus,
  BarChart2,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Queue {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  routingStrategy: string;
  maxWaitTime: number;
  maxQueueSize: number;
  slaSeconds: number;
  serviceLevel: number;
  totalCalls: number;
  answeredCalls: number;
  abandonedCalls: number;
  avgWaitTime: number;
  avgHandleTime: number;
  members: Array<{
    id: string;
    userId: string;
    status: string;
    priority: number;
  }>;
  _count: {
    entries: number;
  };
}

export const QueueManagementPage: React.FC = () => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_showMemberModal, setShowMemberModal] = useState<string | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    routingStrategy: 'ROUND_ROBIN',
    maxWaitTime: 300,
    maxQueueSize: 50,
    slaSeconds: 30,
    holdMessage: '',
    overflowAction: 'VOICEMAIL',
  });

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      const response = await api.get('/call-queues');
      setQueues(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch queues');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQueue = async () => {
    if (!formData.name) {
      toast.error('Please enter a queue name');
      return;
    }

    try {
      if (selectedQueue) {
        await api.put(`/call-queues/${selectedQueue.id}`, formData);
        toast.success('Queue updated');
      } else {
        await api.post('/call-queues', formData);
        toast.success('Queue created');
      }
      setShowCreateModal(false);
      setSelectedQueue(null);
      setFormData({
        name: '',
        description: '',
        routingStrategy: 'ROUND_ROBIN',
        maxWaitTime: 300,
        maxQueueSize: 50,
        slaSeconds: 30,
        holdMessage: '',
        overflowAction: 'VOICEMAIL',
      });
      fetchQueues();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save queue');
    }
  };

  const handleEditQueue = (queue: Queue) => {
    setSelectedQueue(queue);
    setFormData({
      name: queue.name,
      description: queue.description || '',
      routingStrategy: queue.routingStrategy,
      maxWaitTime: queue.maxWaitTime,
      maxQueueSize: queue.maxQueueSize,
      slaSeconds: queue.slaSeconds,
      holdMessage: '',
      overflowAction: 'VOICEMAIL',
    });
    setShowCreateModal(true);
  };

  const handleDeleteQueue = async (id: string) => {
    if (!confirm('Are you sure you want to delete this queue?')) return;

    try {
      await api.delete(`/call-queues/${id}`);
      toast.success('Queue deleted');
      fetchQueues();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete queue');
    }
  };

  const handleToggleActive = async (queue: Queue) => {
    try {
      await api.put(`/call-queues/${queue.id}`, { isActive: !queue.isActive });
      toast.success(`Queue ${queue.isActive ? 'deactivated' : 'activated'}`);
      fetchQueues();
    } catch (error) {
      toast.error('Failed to update queue');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-700';
      case 'ON_CALL': return 'bg-blue-100 text-blue-700';
      case 'WRAP_UP': return 'bg-yellow-100 text-yellow-700';
      case 'BUSY': return 'bg-orange-100 text-orange-700';
      case 'AWAY': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const routingStrategies = [
    { value: 'ROUND_ROBIN', label: 'Round Robin' },
    { value: 'LONGEST_IDLE', label: 'Longest Idle' },
    { value: 'LEAST_CALLS', label: 'Least Calls' },
    { value: 'SKILLS_BASED', label: 'Skills Based' },
    { value: 'PRIORITY_BASED', label: 'Priority Based' },
    { value: 'RANDOM', label: 'Random' },
  ];

  const overflowActions = [
    { value: 'VOICEMAIL', label: 'Send to Voicemail' },
    { value: 'TRANSFER', label: 'Transfer to Number' },
    { value: 'QUEUE', label: 'Move to Another Queue' },
    { value: 'CALLBACK', label: 'Offer Callback' },
    { value: 'DISCONNECT', label: 'Disconnect' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Queues</h1>
          <p className="text-gray-600">Manage call queues and agent assignments</p>
        </div>
        <button
          onClick={() => {
            setSelectedQueue(null);
            setFormData({
              name: '',
              description: '',
              routingStrategy: 'ROUND_ROBIN',
              maxWaitTime: 300,
              maxQueueSize: 50,
              slaSeconds: 30,
              holdMessage: '',
              overflowAction: 'VOICEMAIL',
            });
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Create Queue
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Queues</p>
              <p className="text-xl font-semibold">{queues.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Queues</p>
              <p className="text-xl font-semibold">
                {queues.filter(q => q.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Waiting</p>
              <p className="text-xl font-semibold">
                {queues.reduce((acc, q) => acc + (q._count?.entries || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart2 className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Service Level</p>
              <p className="text-xl font-semibold">
                {queues.length > 0
                  ? Math.round(queues.reduce((acc, q) => acc + q.serviceLevel, 0) / queues.length)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Queue List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : queues.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Call Queues</h3>
          <p className="text-gray-600 mb-4">
            Create your first queue to manage inbound calls
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Create Queue
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {queues.map((queue) => (
            <div key={queue.id} className="bg-white rounded-lg border">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      queue.isActive ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Users className={
                        queue.isActive ? 'text-green-600' : 'text-gray-400'
                      } size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{queue.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          queue.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {queue.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {queue.description && (
                        <p className="text-sm text-gray-500">{queue.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(queue)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title={queue.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {queue.isActive ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button
                      onClick={() => handleEditQueue(queue)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => setShowMemberModal(queue.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Manage Members"
                    >
                      <UserPlus size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteQueue(queue.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-2xl font-semibold text-blue-600">
                      {queue._count?.entries || 0}
                    </p>
                    <p className="text-xs text-gray-500">Waiting</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-2xl font-semibold text-green-600">
                      {queue.members?.length || 0}
                    </p>
                    <p className="text-xs text-gray-500">Agents</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-2xl font-semibold text-purple-600">
                      {queue.serviceLevel}%
                    </p>
                    <p className="text-xs text-gray-500">SLA</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-2xl font-semibold text-gray-700">
                      {Math.round(queue.avgWaitTime)}s
                    </p>
                    <p className="text-xs text-gray-500">Avg Wait</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-2xl font-semibold text-gray-700">
                      {queue.answeredCalls}
                    </p>
                    <p className="text-xs text-gray-500">Answered</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-2xl font-semibold text-red-600">
                      {queue.abandonedCalls}
                    </p>
                    <p className="text-xs text-gray-500">Abandoned</p>
                  </div>
                </div>

                {/* Members Preview */}
                {queue.members && queue.members.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Queue Members</p>
                    <div className="flex flex-wrap gap-2">
                      {queue.members.slice(0, 5).map((member) => (
                        <span
                          key={member.id}
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(member.status)}`}
                        >
                          Agent {member.priority}
                        </span>
                      ))}
                      {queue.members.length > 5 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          +{queue.members.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Queue Details */}
              <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500 flex gap-4">
                <span>Strategy: {queue.routingStrategy.replace('_', ' ')}</span>
                <span>Max Wait: {queue.maxWaitTime}s</span>
                <span>Max Size: {queue.maxQueueSize}</span>
                <span>SLA Target: {queue.slaSeconds}s</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Queue Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {selectedQueue ? 'Edit Queue' : 'Create Queue'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Queue Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Sales Support"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Routing Strategy
                </label>
                <select
                  value={formData.routingStrategy}
                  onChange={(e) => setFormData({ ...formData, routingStrategy: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {routingStrategies.map((strategy) => (
                    <option key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Wait Time (seconds)
                  </label>
                  <input
                    type="number"
                    value={formData.maxWaitTime}
                    onChange={(e) => setFormData({ ...formData, maxWaitTime: parseInt(e.target.value) || 300 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Queue Size
                  </label>
                  <input
                    type="number"
                    value={formData.maxQueueSize}
                    onChange={(e) => setFormData({ ...formData, maxQueueSize: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SLA Target (seconds)
                </label>
                <input
                  type="number"
                  value={formData.slaSeconds}
                  onChange={(e) => setFormData({ ...formData, slaSeconds: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Calls answered within this time count toward service level
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overflow Action
                </label>
                <select
                  value={formData.overflowAction}
                  onChange={(e) => setFormData({ ...formData, overflowAction: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {overflowActions.map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedQueue(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateQueue}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
              >
                {selectedQueue ? 'Update' : 'Create'} Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
