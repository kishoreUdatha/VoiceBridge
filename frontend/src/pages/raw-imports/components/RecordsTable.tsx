/**
 * Raw Import Records Table Component
 */

import React from 'react';
import {
  UserGroupIcon,
  CpuChipIcon,
  PhoneIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { RawImportRecordStatus } from '../../../services/rawImport.service';
import { STATUS_BADGE_STYLES, SOURCE_BADGE_STYLES, formatDate } from '../raw-import-detail.constants';

interface ImportRecord {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  status: RawImportRecordStatus;
  customFields?: Record<string, unknown>;
  assignedTo?: { firstName: string; lastName: string };
  assignedAgent?: { name: string };
  callAttempts: number;
  lastCallAt?: string;
}

interface RecordsTableProps {
  records: ImportRecord[];
  selectedRecords: string[];
  isLoading: boolean;
  recordsTotal: number;
  page: number;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onPageChange: (page: number) => void;
}

const getStatusBadge = (status: RawImportRecordStatus) => (
  <span
    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
      STATUS_BADGE_STYLES[status] || 'bg-gray-100 text-gray-800'
    }`}
  >
    {status.replace(/_/g, ' ')}
  </span>
);

const getSourceBadge = (source: string) => {
  const style = SOURCE_BADGE_STYLES[source] || { bg: 'bg-gray-100', text: 'text-gray-800', label: source };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

export const RecordsTable: React.FC<RecordsTableProps> = ({
  records,
  selectedRecords,
  isLoading,
  recordsTotal,
  page,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onPageChange,
}) => (
  <div className="card">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">
              <input
                type="checkbox"
                checked={records.length > 0 && records.every((r) => selectedRecords.includes(r.id))}
                onChange={(e) => (e.target.checked ? onSelectAll() : onClearSelection())}
                className="h-3.5 w-3.5 text-primary-600 rounded border-gray-300"
              />
            </th>
            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Name</th>
            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Contact</th>
            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Source</th>
            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Status</th>
            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Assigned To</th>
            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Calls</th>
            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Last Call</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-xs text-gray-500">
                Loading...
              </td>
            </tr>
          ) : records.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-xs text-gray-500">
                No records found
              </td>
            </tr>
          ) : (
            records.map((record) => {
              const customFields = record.customFields || {};
              const source = (customFields.source as string) || 'BULK_UPLOAD';
              const sourceDetails = customFields.sourceDetails as string;

              return (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedRecords.includes(record.id)}
                      onChange={() => onToggleSelection(record.id)}
                      className="h-3.5 w-3.5 text-primary-600 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <p className="text-xs font-medium text-gray-900">
                      {record.firstName} {record.lastName}
                    </p>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <p className="text-xs text-gray-900">{record.phone}</p>
                    {record.email && <p className="text-[10px] text-gray-500">{record.email}</p>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {getSourceBadge(source)}
                    {sourceDetails && <p className="text-[10px] text-gray-500 mt-0.5">{sourceDetails}</p>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{getStatusBadge(record.status)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {record.assignedTo ? (
                      <span className="flex items-center gap-0.5">
                        <UserGroupIcon className="h-3 w-3" />
                        {record.assignedTo.firstName} {record.assignedTo.lastName}
                      </span>
                    ) : record.assignedAgent ? (
                      <span className="flex items-center gap-0.5 text-purple-600">
                        <CpuChipIcon className="h-3 w-3" />
                        {record.assignedAgent.name}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {record.callAttempts > 0 ? (
                      <span className="flex items-center gap-0.5">
                        <PhoneIcon className="h-3 w-3" />
                        {record.callAttempts}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {record.lastCallAt ? (
                      <span className="flex items-center gap-0.5">
                        <ClockIcon className="h-3 w-3" />
                        {formatDate(record.lastCallAt)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>

    {/* Pagination */}
    {recordsTotal > 50 && (
      <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Page {page} of {Math.ceil(recordsTotal / 50)}
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="btn btn-outline btn-sm text-xs"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page * 50 >= recordsTotal}
            className="btn btn-outline btn-sm text-xs"
          >
            Next
          </button>
        </div>
      </div>
    )}
  </div>
);

export default RecordsTable;
