import React, { useState, useEffect } from 'react';
import {
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  PhoneXMarkIcon,
  DocumentCheckIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface AuditLog {
  id: string;
  eventType: string;
  actorType: string;
  actorId: string | null;
  targetType: string;
  targetId: string | null;
  action: string;
  description: string | null;
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
}

const EVENT_TYPES = [
  { value: 'CONSENT_OBTAINED', label: 'Consent Obtained', icon: DocumentCheckIcon, color: 'green' },
  { value: 'CONSENT_REVOKED', label: 'Consent Revoked', icon: DocumentCheckIcon, color: 'red' },
  { value: 'DNC_ADDED', label: 'DNC Added', icon: PhoneXMarkIcon, color: 'red' },
  { value: 'DNC_REMOVED', label: 'DNC Removed', icon: PhoneXMarkIcon, color: 'green' },
  { value: 'RECORDING_DISCLOSURE', label: 'Recording Disclosure', icon: ShieldCheckIcon, color: 'blue' },
  { value: 'DATA_ACCESS', label: 'Data Access', icon: EyeIcon, color: 'purple' },
  { value: 'DATA_DELETION', label: 'Data Deletion', icon: ClipboardDocumentListIcon, color: 'red' },
  { value: 'COMPLIANCE_CHECK', label: 'Compliance Check', icon: ShieldCheckIcon, color: 'gray' },
];

const ComplianceAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [actorTypeFilter, setActorTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [eventTypeFilter, actorTypeFilter, startDate, endDate, page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 50 };
      if (eventTypeFilter) params.eventType = eventTypeFilter;
      if (actorTypeFilter) params.actorType = actorTypeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get('/compliance/audit-logs', { params });
      setLogs(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      // Default to last 30 days if no dates specified
      if (!startDate) {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        params.startDate = start.toISOString();
      }
      if (!endDate) {
        params.endDate = new Date().toISOString();
      }

      const response = await api.get('/compliance/report', { params });
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.json`;
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

  const getEventTypeConfig = (eventType: string) => {
    return EVENT_TYPES.find(e => e.value === eventType) || {
      value: eventType,
      label: eventType,
      icon: ClipboardDocumentListIcon,
      color: 'gray',
    };
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700',
      blue: 'bg-blue-100 text-blue-700',
      purple: 'bg-purple-100 text-purple-700',
      gray: 'bg-gray-100 text-gray-700',
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
            Compliance Audit Logs
          </h1>
          <p className="text-gray-600 mt-1">
            Track all compliance-related activities in your organization
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Event Types</option>
            {EVENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={actorTypeFilter}
            onChange={(e) => setActorTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Actors</option>
            <option value="user">User</option>
            <option value="system">System</option>
            <option value="voice_agent">Voice Agent</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Audit Logs</h3>
          <p className="text-gray-600 mt-1">Compliance activities will be logged here automatically</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => {
                const eventConfig = getEventTypeConfig(log.eventType);
                const IconComponent = eventConfig.icon;
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`p-1.5 rounded ${getColorClasses(eventConfig.color)}`}>
                          <IconComponent className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium text-gray-900">{eventConfig.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{log.actorType}</div>
                      {log.actorId && (
                        <div className="text-xs text-gray-500 font-mono">{log.actorId.slice(0, 8)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.targetType}</div>
                      {log.targetId && (
                        <div className="text-xs text-gray-500 font-mono">{log.targetId.slice(0, 8)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {log.description || log.action}
                    </td>
                  </tr>
                );
              })}
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

export default ComplianceAuditLogsPage;
