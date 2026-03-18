import React, { useState, useEffect } from 'react';
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface AuditLog {
  id: string;
  actorType: string;
  actorId: string | null;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  action: string;
  description: string | null;
  changes: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface ActivitySummary {
  totalActions: number;
  byAction: Record<string, number>;
  byActor: Record<string, number>;
  byTarget: Record<string, number>;
  recentActivity: any[];
}

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs();
    fetchSummary();
  }, [search, actionFilter, targetTypeFilter, page]);

  const fetchLogs = async () => {
    try {
      const params: any = { page, limit: 50 };
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      if (targetTypeFilter) params.targetType = targetTypeFilter;

      const response = await api.get('/audit-logs', { params });
      setLogs(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/audit-logs/summary');
      setSummary(response.data.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const handleExport = async () => {
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const response = await api.get('/audit-logs/export', { params: { startDate, endDate } });
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (error) {
      console.error('Failed to export:', error);
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

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'bg-green-100 text-green-700';
    if (action.includes('updated')) return 'bg-blue-100 text-blue-700';
    if (action.includes('deleted')) return 'bg-red-100 text-red-700';
    if (action.includes('login')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
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
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-1">Track all actions and changes in your organization</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          Export
        </button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{summary.totalActions}</div>
            <div className="text-sm text-gray-500">Total Actions (30 days)</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{summary.byActor.user || 0}</div>
            <div className="text-sm text-gray-500">User Actions</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">{summary.byActor.api_key || 0}</div>
            <div className="text-sm text-gray-500">API Actions</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-600">{summary.byActor.system || 0}</div>
            <div className="text-sm text-gray-500">System Actions</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by description, email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
        </select>
        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="lead">Lead</option>
          <option value="user">User</option>
          <option value="campaign">Campaign</option>
          <option value="api_key">API Key</option>
          <option value="webhook">Webhook</option>
          <option value="template">Template</option>
        </select>
      </div>

      {/* Logs Table */}
      {logs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Audit Logs</h3>
          <p className="text-gray-600 mt-1">Actions will be logged here automatically</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.actorEmail || log.actorType}</div>
                    <div className="text-xs text-gray-500">{log.actorType}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.targetType || '-'}</div>
                    <div className="text-xs text-gray-500 font-mono">{log.targetId?.slice(0, 8) || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {log.description || '-'}
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
    </div>
  );
};

export default AuditLogsPage;
