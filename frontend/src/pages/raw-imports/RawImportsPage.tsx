import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchBulkImports, fetchStats } from '../../store/slices/rawImportSlice';
import { fetchManagers } from '../../store/slices/userSlice';
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  TrashIcon,
  ArrowPathIcon,
  UserIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { showToast } from '../../utils/toast';
import { rawImportService } from '../../services/rawImport.service';

const PLATFORM_FILTERS = [
  { value: '', label: 'All Sources' },
  { value: 'YOUTUBE', label: 'YouTube Ads' },
  { value: 'GOOGLE', label: 'Google Ads' },
  { value: 'FACEBOOK', label: 'Facebook Ads' },
  { value: 'INSTAGRAM', label: 'Instagram Ads' },
  { value: 'LINKEDIN', label: 'LinkedIn Ads' },
  { value: 'TIKTOK', label: 'TikTok Ads' },
  { value: 'TWITTER', label: 'Twitter Ads' },
  { value: 'FORM', label: 'Form Submissions' },
];

export default function RawImportsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [platformFilter, setPlatformFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; importId: string | null }>({
    show: false,
    importId: null,
  });
  const [assignManagerModal, setAssignManagerModal] = useState<{ show: boolean; importId: string | null; importName: string }>({
    show: false,
    importId: null,
    importName: '',
  });
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const { imports, total, stats, isLoading } = useSelector(
    (state: RootState) => state.rawImports
  );
  const { managers } = useSelector((state: RootState) => state.users);
  const { user } = useSelector((state: RootState) => state.auth);

  const isAdmin = user?.role?.slug === 'admin' || user?.role?.slug === 'super_admin';

  useEffect(() => {
    dispatch(fetchBulkImports({ page: 1, limit: 50 }));
    dispatch(fetchStats());
    if (isAdmin) {
      dispatch(fetchManagers());
    }
  }, [dispatch, isAdmin]);

  const filteredImports = useMemo(() => {
    let filtered = imports;
    if (platformFilter) {
      filtered = filtered.filter((item) =>
        item.fileName.toUpperCase().includes(platformFilter)
      );
    }
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((item) => new Date(item.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((item) => new Date(item.createdAt) <= toDate);
    }
    return filtered;
  }, [imports, platformFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setPlatformFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteClick = (importId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ show: true, importId });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.importId) return;
    try {
      await api.delete(`/raw-imports/${deleteConfirm.importId}`);
      showToast.success('Import and all records deleted successfully');
      dispatch(fetchBulkImports({ page: 1, limit: 20 }));
      dispatch(fetchStats());
    } catch {
      showToast.error('Failed to delete import');
    } finally {
      setDeleteConfirm({ show: false, importId: null });
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ show: false, importId: null });
  };

  const handleRefresh = () => {
    dispatch(fetchBulkImports({ page: 1, limit: 50 }));
    dispatch(fetchStats());
  };

  const handleAssignManagerClick = (importId: string, importName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssignManagerModal({ show: true, importId, importName });
    setSelectedManagerId('');
  };

  const handleConfirmAssignManager = async () => {
    if (!assignManagerModal.importId || !selectedManagerId) return;
    setIsAssigning(true);
    try {
      await rawImportService.assignToManager(assignManagerModal.importId, selectedManagerId);
      showToast.success('Import assigned to manager successfully');
      dispatch(fetchBulkImports({ page: 1, limit: 50 }));
      setAssignManagerModal({ show: false, importId: null, importName: '' });
    } catch (error: any) {
      showToast.error(error?.response?.data?.message || 'Failed to assign manager');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCancelAssignManager = () => {
    setAssignManagerModal({ show: false, importId: null, importName: '' });
    setSelectedManagerId('');
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

  const getSourceFromFileName = (fileName: string) => {
    const name = fileName.toUpperCase();
    if (name.includes('AD_FACEBOOK') || name.includes('FACEBOOK')) return { label: 'Facebook Ads', color: 'blue' };
    if (name.includes('AD_INSTAGRAM') || name.includes('INSTAGRAM')) return { label: 'Instagram Ads', color: 'pink' };
    if (name.includes('AD_YOUTUBE') || name.includes('YOUTUBE')) return { label: 'YouTube Ads', color: 'red' };
    if (name.includes('AD_GOOGLE') || name.includes('GOOGLE')) return { label: 'Google Ads', color: 'red' };
    if (name.includes('AD_LINKEDIN') || name.includes('LINKEDIN')) return { label: 'LinkedIn Ads', color: 'blue' };
    if (name.includes('AD_TIKTOK') || name.includes('TIKTOK')) return { label: 'TikTok Ads', color: 'pink' };
    if (name.includes('AD_TWITTER') || name.includes('TWITTER')) return { label: 'Twitter Ads', color: 'slate' };
    if (name.includes('FORM')) return { label: 'Form Submissions', color: 'purple' };
    if (name.includes('LANDING_PAGE') || name.includes('LANDING')) return { label: 'Landing Page', color: 'green' };
    if (name.includes('WHATSAPP')) return { label: 'WhatsApp', color: 'green' };
    if (name.includes('EXCEL') || name.endsWith('.XLSX') || name.endsWith('.XLS')) return { label: 'Excel Import', color: 'green' };
    return { label: 'CSV Upload', color: 'gray' };
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Import Data</h1>
          <p className="text-xs text-gray-500">Upload and manage your lead data files</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="btn btn-outline btn-sm flex items-center gap-1 text-xs"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => navigate('/leads/bulk-upload')}
            className="btn btn-primary btn-sm flex items-center gap-1 text-xs"
          >
            <DocumentArrowUpIcon className="h-4 w-4" />
            Upload New Data
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mb-4">
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
            <p className="text-xs text-gray-500">Assigned</p>
            <p className="text-lg font-semibold text-blue-600">{stats.assignedRecords}</p>
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

      {/* Filters */}
      <div className="bg-white rounded-lg border p-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Filters:</span>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            {PLATFORM_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>{filter.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 bg-white"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 bg-white"
          />
          {(platformFilter || dateFrom || dateTo) && (
            <button
              onClick={clearFilters}
              className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Imports Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Source / File</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Records</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Pending</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Assigned</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Converted</th>
                {isAdmin && <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Manager</th>}
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="px-6 py-12 text-center text-gray-500">Loading...</td>
                </tr>
              ) : filteredImports.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-gray-500">
                    <DocumentArrowUpIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-medium">No imports yet</p>
                    <p className="text-xs mt-1">Upload a CSV or Excel file to get started</p>
                  </td>
                </tr>
              ) : (
                filteredImports.map((item: any) => {
                  const source = getSourceFromFileName(item.fileName);
                  const pendingCount = item.pendingCount || 0;
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
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[150px]">{item.fileName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{formatDate(item.createdAt)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">{item.validRows}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`text-xs font-medium ${pendingCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                          {pendingCount}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`text-xs font-medium ${(item.assignedCount || 0) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                          {item.assignedCount || 0}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        <span className="font-medium text-primary-600">{item.convertedCount}</span>
                        <span className="text-gray-400">/{item.validRows}</span>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-2 whitespace-nowrap">
                          {item.assignedManager ? (
                            <div className="flex items-center gap-1">
                              <UserIcon className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-xs text-gray-700">
                                {item.assignedManager.firstName} {item.assignedManager.lastName}
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => handleAssignManagerClick(item.id, item.fileName, e)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded"
                            >
                              <UserPlusIcon className="h-3.5 w-3.5" />
                              Assign
                            </button>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && item.assignedManager && (
                            <button
                              onClick={(e) => handleAssignManagerClick(item.id, item.fileName, e)}
                              className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-50"
                              title="Reassign Manager"
                            >
                              <UserPlusIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button className="text-primary-600 hover:text-primary-800 flex items-center gap-0.5 text-xs">
                            View <ArrowRightIcon className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(item.id, e)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {total > 50 && (
          <div className="px-3 py-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">Showing {imports.length} of {total} imports</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={handleCancelDelete} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <TrashIcon className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Import</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this import and <strong>ALL its records</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Manager Modal */}
      {assignManagerModal.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={handleCancelAssignManager} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <UserPlusIcon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Assign to Manager</h3>
                  <p className="text-xs text-gray-500 truncate max-w-[250px]">{assignManagerModal.importName}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Select a manager to assign this import. The manager will be able to see and distribute these records to their team.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a manager...</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.firstName} {manager.lastName} {manager.roleName ? `(${manager.roleName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelAssignManager}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={isAssigning}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssignManager}
                  disabled={!selectedManagerId || isAssigning}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAssigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
