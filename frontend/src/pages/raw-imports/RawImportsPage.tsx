import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchBulkImports, fetchStats } from '../../store/slices/rawImportSlice';
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

export default function RawImportsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { imports, total, stats, isLoading } = useSelector(
    (state: RootState) => state.rawImports
  );

  useEffect(() => {
    dispatch(fetchBulkImports({ page: 1, limit: 20 }));
    dispatch(fetchStats());
  }, [dispatch]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-2.5 w-2.5 mr-0.5" />
            Done
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="h-2.5 w-2.5 mr-0.5" />
            Processing
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
            <ExclamationCircleIcon className="h-2.5 w-2.5 mr-0.5" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Raw Data Imports</h1>
          <p className="text-xs text-gray-500">
            Manage uploaded data before converting to leads
          </p>
        </div>
        <button
          onClick={() => navigate('/leads/bulk-upload')}
          className="btn btn-primary btn-sm flex items-center gap-1 text-xs"
        >
          <DocumentArrowUpIcon className="h-4 w-4" />
          Upload New Data
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          <div className="card p-2">
            <p className="text-xs text-gray-500">Total Imports</p>
            <p className="text-lg font-semibold text-gray-900">{stats.totalImports}</p>
          </div>
          <div className="card p-2">
            <p className="text-xs text-gray-500">Total Records</p>
            <p className="text-lg font-semibold text-gray-900">{stats.totalRecords}</p>
          </div>
          <div className="card p-2">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-lg font-semibold text-yellow-600">{stats.pendingRecords}</p>
          </div>
          <div className="card p-2">
            <p className="text-xs text-gray-500">Interested</p>
            <p className="text-lg font-semibold text-green-600">{stats.interestedRecords}</p>
          </div>
          <div className="card p-2">
            <p className="text-xs text-gray-500">Converted</p>
            <p className="text-lg font-semibold text-primary-600">{stats.convertedRecords}</p>
          </div>
          <div className="card p-2">
            <p className="text-xs text-gray-500">Not Interested</p>
            <p className="text-lg font-semibold text-red-600">{stats.notInterestedRecords}</p>
          </div>
        </div>
      )}

      {/* Imports Table */}
      <div className="card">
        <div className="card-header py-2">
          <h2 className="text-sm font-medium">Recent Uploads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Source / File
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Records
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Pending
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Converted
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : imports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <DocumentArrowUpIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-medium">No imports yet</p>
                    <p className="text-xs mt-1">Upload a CSV or Excel file to get started</p>
                    <button
                      onClick={() => navigate('/leads/bulk-upload')}
                      className="mt-2 btn btn-primary btn-sm text-xs"
                    >
                      Upload Data
                    </button>
                  </td>
                </tr>
              ) : (
                imports.map((item) => {
                  // Parse source from fileName (e.g., "AD_FACEBOOK Import - 2026-03-16")
                  const getSourceFromFileName = (fileName: string) => {
                    const name = fileName.toUpperCase();
                    if (name.includes('AD_FACEBOOK') || name.includes('FACEBOOK')) return { label: 'Facebook Ads', color: 'blue' };
                    if (name.includes('AD_INSTAGRAM') || name.includes('INSTAGRAM')) return { label: 'Instagram Ads', color: 'pink' };
                    if (name.includes('AD_GOOGLE') || name.includes('GOOGLE')) return { label: 'Google Ads', color: 'red' };
                    if (name.includes('AD_LINKEDIN') || name.includes('LINKEDIN')) return { label: 'LinkedIn Ads', color: 'blue' };
                    if (name.includes('FORM')) return { label: 'Form Submissions', color: 'purple' };
                    if (name.includes('LANDING_PAGE') || name.includes('LANDING')) return { label: 'Landing Page', color: 'green' };
                    if (name.includes('WHATSAPP')) return { label: 'WhatsApp', color: 'green' };
                    if (name.includes('EXCEL') || name.endsWith('.XLSX') || name.endsWith('.XLS')) return { label: 'Excel Import', color: 'green' };
                    return { label: 'CSV Upload', color: 'gray' };
                  };
                  const source = getSourceFromFileName(item.fileName);
                  const pendingCount = item.statusBreakdown?.PENDING || 0;

                  return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/raw-imports/${item.id}`)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentArrowUpIcon className="h-4 w-4 text-gray-400 mr-1.5" />
                        <div>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-${source.color}-100 text-${source.color}-800`}>
                            {source.label}
                          </span>
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[150px]">
                            {item.fileName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-xs">
                        <span className="font-medium text-gray-900">
                          {item.validRows}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-xs">
                        <span className={`font-medium ${pendingCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                          {pendingCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-xs">
                        <span className="font-medium text-primary-600">
                          {item.convertedCount}
                        </span>
                        <span className="text-gray-400">/{item.validRows}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <button className="text-primary-600 hover:text-primary-800 flex items-center gap-0.5 text-xs">
                        View
                        <ArrowRightIcon className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing {imports.length} of {total} imports
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
