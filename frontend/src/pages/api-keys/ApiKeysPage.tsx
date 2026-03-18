import React, { useState, useEffect } from 'react';
import {
  KeyIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  allowedAgents: string[];
  rateLimit: number;
  isActive: boolean;
  expiresAt: string | null;
  environment: string;
  totalRequests: number;
  lastUsedAt: string | null;
  description: string | null;
  createdAt: string;
}

interface Permission {
  key: string;
  value: string;
  description: string;
}

const ApiKeysPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ key: string; name: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
    fetchPermissions();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await api.get('/api-keys');
      setApiKeys(response.data.data);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/api-keys/permissions');
      setPermissions(response.data.data);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const handleCreateKey = async (data: any) => {
    try {
      const response = await api.post('/api-keys', data);
      setNewKeyData({
        key: response.data.data.key,
        name: response.data.data.name,
      });
      fetchApiKeys();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api-keys/${id}`);
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/api-keys/${id}`, { isActive: !isActive });
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to toggle API key:', error);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600 mt-1">
            Manage API keys for external integrations with your AI agents
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          Create API Key
        </button>
      </div>

      {/* New Key Created Alert */}
      {newKeyData && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-green-800">API Key Created: {newKeyData.name}</h3>
              <p className="text-sm text-green-700 mt-1">
                Copy your API key now. You won't be able to see it again!
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 bg-green-100 px-3 py-2 rounded font-mono text-sm text-green-900 break-all">
                  {newKeyData.key}
                </code>
                <button
                  onClick={() => copyToClipboard(newKeyData.key, 'new')}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {copiedKey === 'new' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <button
                onClick={() => setNewKeyData(null)}
                className="mt-3 text-sm text-green-700 hover:text-green-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Documentation Link */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800">API Documentation</h3>
        <p className="text-sm text-blue-700 mt-1">
          Base URL: <code className="bg-blue-100 px-2 py-1 rounded">{window.location.origin}/api/v1</code>
        </p>
        <p className="text-sm text-blue-700 mt-1">
          Use your API key in the Authorization header: <code className="bg-blue-100 px-2 py-1 rounded">Bearer sk_live_...</code>
        </p>
      </div>

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <KeyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No API Keys</h3>
          <p className="text-gray-600 mt-1">Create your first API key to start integrating</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create API Key
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiKeys.map((apiKey) => (
                <tr key={apiKey.id} className={!apiKey.isActive ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{apiKey.name}</div>
                      <div className="text-sm text-gray-500">
                        Created {formatDate(apiKey.createdAt)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {apiKey.keyPrefix}...
                      </code>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        apiKey.environment === 'production'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {apiKey.environment}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {apiKey.permissions.slice(0, 2).map((perm: string) => (
                        <span key={perm} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {perm.split(':')[0]}
                        </span>
                      ))}
                      {apiKey.permissions.length > 2 && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          +{apiKey.permissions.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">{apiKey.totalRequests.toLocaleString()} requests</div>
                      <div className="text-gray-500">
                        Last used: {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : 'Never'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(apiKey.id, apiKey.isActive)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                        apiKey.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {apiKey.isActive ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-4 w-4" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRevokeKey(apiKey.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Revoke Key"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateApiKeyModal
          permissions={permissions}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateKey}
        />
      )}
    </div>
  );
};

// Create API Key Modal Component
interface CreateApiKeyModalProps {
  permissions: Permission[];
  onClose: () => void;
  onCreate: (data: any) => void;
}

const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({ permissions, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [rateLimit, setRateLimit] = useState(1000);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onCreate({
        name,
        description: description || undefined,
        permissions: selectedPermissions,
        rateLimit,
        expiresAt: expiresAt || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const selectAllPermissions = () => {
    setSelectedPermissions(permissions.map((p) => p.value));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create API Key</h2>
          <p className="text-gray-600 mt-1">Generate a new API key for external integrations</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Integration"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will this key be used for?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Permissions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Permissions *
              </label>
              <button
                type="button"
                onClick={selectAllPermissions}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Select All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {permissions.map((perm) => (
                <label
                  key={perm.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${
                    selectedPermissions.includes(perm.value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm.value)}
                    onChange={() => togglePermission(perm.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{perm.value}</div>
                    <div className="text-sm text-gray-500">{perm.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Rate Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rate Limit (requests/hour)
            </label>
            <input
              type="number"
              value={rateLimit}
              onChange={(e) => setRateLimit(parseInt(e.target.value))}
              min={10}
              max={100000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires At (optional)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name || selectedPermissions.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create API Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiKeysPage;
