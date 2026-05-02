import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  Edit2,
  Save,
  X,
  RefreshCw,
  ShoppingCart,
  ArrowLeft,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface UserUsage {
  userId: string;
  name: string;
  email: string;
  limit: number | null;
  used: number;
}

interface UsageData {
  limit: number;
  used: number;
  remaining: number;
  resetDate: string;
  userBreakdown: UserUsage[];
}

export const VoiceMinutesPage: React.FC = () => {
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsage();
  }, []);

  const handleBuyMinutes = () => {
    navigate('/subscription?buyCredits=voiceMinutes');
  };

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const response = await api.get('/voice-minutes/usage');
      setUsage(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch voice minutes usage');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLimit = (user: UserUsage) => {
    setEditingUser(user.userId);
    setEditLimit(user.limit?.toString() || '');
  };

  const handleSaveLimit = async (userId: string) => {
    try {
      setSaving(true);
      const limit = editLimit === '' ? null : parseInt(editLimit);

      await api.put(`/voice-minutes/users/${userId}/limit`, { limit });
      toast.success('Limit updated successfully');
      setEditingUser(null);
      fetchUsage();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update limit');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditLimit('');
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min(100, (used / limit) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="p-6 text-center text-gray-500">
        Failed to load voice minutes data
      </div>
    );
  }

  const usagePercentage = getUsagePercentage(usage.used, usage.limit);

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Voice Minutes Management</h1>
            <p className="text-gray-600">Monitor and manage AI voice calling minutes for your team</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBuyMinutes}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ShoppingCart size={18} />
            Buy Extra Minutes
          </button>
          <button
            onClick={fetchUsage}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Organization Usage Card */}
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Organization Usage</h2>
          <span className="text-sm text-gray-500">
            Resets on {new Date(usage.resetDate).toLocaleDateString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Limit</p>
                <p className="text-2xl font-bold text-gray-900">{usage.limit} min</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Used</p>
                <p className="text-2xl font-bold text-gray-900">{usage.used.toFixed(1)} min</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Remaining</p>
                <p className="text-2xl font-bold text-gray-900">{usage.remaining.toFixed(1)} min</p>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Usage Progress</span>
            <span className={`font-medium ${usagePercentage >= 90 ? 'text-red-600' : 'text-gray-900'}`}>
              {usagePercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${getUsageColor(usagePercentage)}`}
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        </div>

        {usagePercentage >= 80 && (
          <div className="mt-4 flex items-center justify-between bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">
                {usagePercentage >= 100
                  ? 'Voice minutes limit reached!'
                  : 'Voice minutes running low!'}
              </span>
            </div>
            <button
              onClick={handleBuyMinutes}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
            >
              Buy Extra Minutes
            </button>
          </div>
        )}
      </div>

      {/* User Breakdown */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Employee Voice Minutes</h2>
          <p className="text-sm text-gray-600">Set individual limits to control usage per employee</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Employee</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Email</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Limit (min)</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Used (min)</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Usage</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usage.userBreakdown.map((user) => {
                const userUsagePercentage = user.limit
                  ? getUsagePercentage(user.used, user.limit)
                  : 0;

                return (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-center">
                      {editingUser === user.userId ? (
                        <input
                          type="number"
                          value={editLimit}
                          onChange={(e) => setEditLimit(e.target.value)}
                          placeholder="Unlimited"
                          className="w-24 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      ) : (
                        <span className={user.limit === null ? 'text-gray-400 italic' : ''}>
                          {user.limit === null ? 'Unlimited' : user.limit}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {user.used.toFixed(1)}
                    </td>
                    <td className="px-4 py-3">
                      {user.limit !== null ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getUsageColor(userUsagePercentage)}`}
                              style={{ width: `${userUsagePercentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 w-10">
                            {userUsagePercentage.toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {editingUser === user.userId ? (
                          <>
                            <button
                              onClick={() => handleSaveLimit(user.userId)}
                              disabled={saving}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Save"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEditLimit(user)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit limit"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {usage.userBreakdown.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No employees found
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">How Voice Minutes Work</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>- Organization has a shared pool of voice minutes based on your subscription plan</li>
          <li>- Set individual limits per employee to control usage (leave empty for unlimited within pool)</li>
          <li>- Usage resets automatically on the 1st of each month</li>
          <li>- When an employee reaches their limit, they cannot make new AI voice calls</li>
        </ul>
      </div>
    </div>
  );
};

export default VoiceMinutesPage;
