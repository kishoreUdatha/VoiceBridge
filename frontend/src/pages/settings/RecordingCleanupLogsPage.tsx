/**
 * Recording Cleanup Logs Page
 * Shows logs of automatic recording deletions from telecaller mobile app
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import api from '../../services/api';
import {
  TrashIcon,
  DevicePhoneMobileIcon,
  ArrowPathIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

interface CleanupLog {
  id: string;
  userId: string;
  deletedAt: string;
  totalFiles: number;
  totalFreedBytes: number;
  deviceBrand?: string;
  deviceModel?: string;
  files: Array<{
    fileName: string;
    directory: string;
    sizeBytes: number;
    ageHours: number;
  }>;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Totals {
  totalLogs: number;
  totalFilesDeleted: number;
  totalBytesFreed: number;
  totalMBFreed: string;
}

const RecordingCleanupLogsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [logs, setLogs] = useState<CleanupLog[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState('7d');
  const [selectedUser, setSelectedUser] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, [dateRange, selectedUser]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users?limit=100');
      setUsers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = { limit: 100 };

      // Calculate date range
      const now = new Date();
      if (dateRange === '1d') {
        params.startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === '7d') {
        params.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === '30d') {
        params.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      if (selectedUser) {
        params.userId = selectedUser;
      }

      const res = await api.get('/telecaller-analytics/recording-cleanup-logs', { params });
      setLogs(res.data.data || []);
      setTotals(res.data.totals || null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cleanup logs');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDirectoryName = (path: string): string => {
    // Extract just the last part of the path
    const parts = path.split('/');
    return parts[parts.length - 1] || parts[parts.length - 2] || path;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrashIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Recording Cleanup Logs</h1>
              <p className="text-sm text-slate-500">
                Track automatic deletion of call recordings from telecaller devices
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {totals && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ArrowPathIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Cleanup Runs</p>
                  <p className="text-2xl font-bold text-slate-900">{totals.totalLogs}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrashIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Files Deleted</p>
                  <p className="text-2xl font-bold text-slate-900">{totals.totalFilesDeleted}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DevicePhoneMobileIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Storage Freed</p>
                  <p className="text-2xl font-bold text-slate-900">{totals.totalMBFreed} MB</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FunnelIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Avg per Run</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {totals.totalLogs > 0
                      ? Math.round(totals.totalFilesDeleted / totals.totalLogs)
                      : 0}{' '}
                    files
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Employee</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Employees</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto">
              <button
                onClick={fetchLogs}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <ArrowPathIcon className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-500">Loading cleanup logs...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-500">{error}</p>
              <button
                onClick={fetchLogs}
                className="mt-3 text-primary-600 hover:text-primary-700"
              >
                Try again
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <TrashIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No cleanup logs found</p>
              <p className="text-sm text-slate-400 mt-1">
                Logs will appear here when telecaller devices run automatic cleanup
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Device
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Deleted At
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                    Files
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                    Storage Freed
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {log.user?.firstName?.[0]}
                              {log.user?.lastName?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {log.user?.firstName} {log.user?.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{log.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <DevicePhoneMobileIcon className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900 capitalize">
                              {log.deviceBrand || 'Unknown'}
                            </p>
                            <p className="text-xs text-slate-500">{log.deviceModel || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-900">{formatDate(log.deletedAt)}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-700">
                          {log.totalFiles} files
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-green-600">
                          {formatBytes(log.totalFreedBytes)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() =>
                            setExpandedLog(expandedLog === log.id ? null : log.id)
                          }
                          className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                          {expandedLog === log.id ? (
                            <ChevronUpIcon className="w-5 h-5 text-slate-500" />
                          ) : (
                            <ChevronDownIcon className="w-5 h-5 text-slate-500" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {expandedLog === log.id && log.files && log.files.length > 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 bg-slate-50">
                          <div className="ml-11">
                            <p className="text-xs font-medium text-slate-500 mb-2">
                              Deleted Files:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {log.files.map((file, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between bg-white p-2 rounded border border-slate-200"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-slate-700 truncate">
                                      {file.fileName}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {getDirectoryName(file.directory)} &bull; {file.ageHours}h old
                                    </p>
                                  </div>
                                  <span className="text-xs text-slate-500 ml-2">
                                    {formatBytes(file.sizeBytes)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordingCleanupLogsPage;
