import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchTelecallers, fetchUsers } from '../../store/slices/userSlice';
import { fetchBranches } from '../../store/slices/branchSlice';
import {
  UserGroupIcon,
  PhoneIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { rawImportService, RawImportRecord, TelecallerAssignmentStats, TelecallerAssignmentStat } from '../../services/rawImport.service';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'CALLING', label: 'Calling' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
  { value: 'NO_ANSWER', label: 'No Answer' },
  { value: 'CALLBACK_REQUESTED', label: 'Callback' },
  { value: 'CONVERTED', label: 'Converted' },
];

export default function LeadDistributionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Check if URL has date=today param
  const dateParam = searchParams.get('date');
  const initialDateFrom = dateParam === 'today' ? getTodayDate() : '';
  const initialDateTo = dateParam === 'today' ? getTodayDate() : '';

  // Selected telecaller for detail view
  const [selectedTelecaller, setSelectedTelecaller] = useState<TelecallerAssignmentStat | null>(null);

  // Telecaller list state
  const [stats, setStats] = useState<TelecallerAssignmentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchTelecaller, setSearchTelecaller] = useState('');

  // Filter state for main list
  const [filterBranch, setFilterBranch] = useState('');
  const [filterReportingTo, setFilterReportingTo] = useState('');
  const [mainDateFrom, setMainDateFrom] = useState(initialDateFrom);
  const [mainDateTo, setMainDateTo] = useState(initialDateTo);

  // Records state (for detail view)
  const [records, setRecords] = useState<RawImportRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [recordDateFrom, setRecordDateFrom] = useState(initialDateFrom);
  const [recordDateTo, setRecordDateTo] = useState(initialDateTo);

  const { telecallers, users } = useSelector((state: RootState) => state.users);
  const { branches } = useSelector((state: RootState) => state.branches);

  // Get managers (users who can have reports)
  const managers = users.filter(u => {
    const roleSlug = u.role?.slug?.toLowerCase() || '';
    return ['admin', 'manager', 'team_lead'].includes(roleSlug);
  });

  useEffect(() => {
    dispatch(fetchTelecallers());
    dispatch(fetchBranches());
    dispatch(fetchUsers({ page: 1, limit: 100 }));
  }, [dispatch]);

  // Reload stats when date filters change
  useEffect(() => {
    loadStats();
  }, [mainDateFrom, mainDateTo]);

  useEffect(() => {
    if (selectedTelecaller) {
      loadRecords();
    }
  }, [selectedTelecaller, recordsPage, filterStatus, recordDateFrom, recordDateTo]);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const data = await rawImportService.getTelecallerAssignmentStats({
        assignedDateFrom: mainDateFrom || undefined,
        assignedDateTo: mainDateTo || undefined,
      });
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadRecords = async () => {
    if (!selectedTelecaller) return;
    setRecordsLoading(true);
    try {
      const data = await rawImportService.getRecords({
        page: recordsPage,
        limit: 50,
        assignedToId: selectedTelecaller.telecallerId,
        status: filterStatus as any || undefined,
        search: searchQuery || undefined,
        assignedDateFrom: recordDateFrom || undefined,
        assignedDateTo: recordDateTo || undefined,
      });
      setRecords(data.records);
      setRecordsTotal(data.total);
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    setRecordsPage(1);
    loadRecords();
  };

  const handleViewTelecaller = (tc: TelecallerAssignmentStat) => {
    setSelectedTelecaller(tc);
    setRecordsPage(1);
    setFilterStatus('');
    setSearchQuery('');
    setRecordDateFrom('');
    setRecordDateTo('');
  };

  const handleBack = () => {
    setSelectedTelecaller(null);
    setRecords([]);
  };

  const filteredTelecallers = stats?.telecallers.filter(tc => {
    // Search filter
    if (searchTelecaller && !tc.telecallerName.toLowerCase().includes(searchTelecaller.toLowerCase())) {
      return false;
    }
    // Branch filter - match by telecaller's branch
    if (filterBranch) {
      const telecallerUser = telecallers.find(t => t.id === tc.telecallerId) as any;
      if (!telecallerUser || telecallerUser.branchId !== filterBranch) {
        return false;
      }
    }
    // Reporting To filter (using managerId)
    if (filterReportingTo) {
      const telecallerUser = telecallers.find(t => t.id === tc.telecallerId);
      if (!telecallerUser || telecallerUser.managerId !== filterReportingTo) {
        return false;
      }
    }
    return true;
  }) || [];

  const clearMainFilters = () => {
    setSearchTelecaller('');
    setFilterBranch('');
    setFilterReportingTo('');
    setMainDateFrom('');
    setMainDateTo('');
  };

  const hasActiveFilters = searchTelecaller || filterBranch || filterReportingTo || mainDateFrom || mainDateTo;

  const totalAssigned = stats?.telecallers.reduce((sum, tc) => sum + tc.totalAssigned, 0) || 0;
  const totalPending = stats?.telecallers.reduce((sum, tc) => sum + tc.statusBreakdown.assigned, 0) || 0;
  const totalInterested = stats?.telecallers.reduce((sum, tc) => sum + tc.statusBreakdown.interested, 0) || 0;
  const totalConverted = stats?.telecallers.reduce((sum, tc) => sum + tc.statusBreakdown.converted, 0) || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'CALLING': return 'bg-orange-100 text-orange-800';
      case 'INTERESTED': return 'bg-green-100 text-green-800';
      case 'NOT_INTERESTED': return 'bg-red-100 text-red-800';
      case 'NO_ANSWER': return 'bg-yellow-100 text-yellow-800';
      case 'CALLBACK_REQUESTED': return 'bg-purple-100 text-purple-800';
      case 'CONVERTED': return 'bg-primary-100 text-primary-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Detail View - Shows records for selected telecaller
  if (selectedTelecaller) {
    return (
      <div className="space-y-4">
        {/* Header with Back Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">
              {selectedTelecaller.telecallerName}'s Assigned Data
            </h1>
            <p className="text-xs text-gray-500">
              {selectedTelecaller.totalAssigned} total leads assigned
            </p>
          </div>
          <button
            onClick={loadRecords}
            className="btn btn-outline btn-sm flex items-center gap-1 text-xs"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Summary Stats for this telecaller */}
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          <div className="bg-white rounded-lg border p-2 text-center">
            <p className="text-lg font-bold text-gray-900">{selectedTelecaller.totalAssigned}</p>
            <p className="text-[9px] text-gray-500 uppercase">Total</p>
          </div>
          <div className="bg-white rounded-lg border p-2 text-center">
            <p className="text-lg font-bold text-blue-600">{selectedTelecaller.statusBreakdown.assigned}</p>
            <p className="text-[9px] text-gray-500 uppercase">Pending</p>
          </div>
          <div className="bg-white rounded-lg border p-2 text-center">
            <p className="text-lg font-bold text-orange-600">{selectedTelecaller.statusBreakdown.calling}</p>
            <p className="text-[9px] text-gray-500 uppercase">Calling</p>
          </div>
          <div className="bg-white rounded-lg border p-2 text-center">
            <p className="text-lg font-bold text-green-600">{selectedTelecaller.statusBreakdown.interested}</p>
            <p className="text-[9px] text-gray-500 uppercase">Interested</p>
          </div>
          <div className="bg-white rounded-lg border p-2 text-center">
            <p className="text-lg font-bold text-red-600">{selectedTelecaller.statusBreakdown.notInterested}</p>
            <p className="text-[9px] text-gray-500 uppercase">Not Int.</p>
          </div>
          <div className="bg-white rounded-lg border p-2 text-center">
            <p className="text-lg font-bold text-yellow-600">{selectedTelecaller.statusBreakdown.noAnswer}</p>
            <p className="text-[9px] text-gray-500 uppercase">No Answer</p>
          </div>
          <div className="bg-white rounded-lg border p-2 text-center">
            <p className="text-lg font-bold text-primary-600">{selectedTelecaller.statusBreakdown.converted}</p>
            <p className="text-[9px] text-gray-500 uppercase">Converted</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Filters:</span>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                placeholder="Search name/phone..."
                className="pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 bg-white w-40"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setRecordsPage(1); }}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={recordDateFrom}
              onChange={(e) => { setRecordDateFrom(e.target.value); setRecordsPage(1); }}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 bg-white"
              title="Assigned From"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={recordDateTo}
              onChange={(e) => { setRecordDateTo(e.target.value); setRecordsPage(1); }}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 bg-white"
              title="Assigned To"
            />
            {(filterStatus || searchQuery || recordDateFrom || recordDateTo) && (
              <button
                onClick={() => {
                  setFilterStatus('');
                  setSearchQuery('');
                  setRecordDateFrom('');
                  setRecordDateTo('');
                  setRecordsPage(1);
                }}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Records Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Assigned Date</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Last Call</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recordsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      <UserGroupIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm font-medium">No records found</p>
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <p className="text-xs font-medium text-gray-900">
                          {record.firstName} {record.lastName || ''}
                        </p>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">{record.phone}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{record.email || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(record.status)}`}>
                          {record.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                        {record.assignedAt ? new Date(record.assignedAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        }) : '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                        {record.lastCallAt ? new Date(record.lastCallAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        }) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {recordsTotal > 50 && (
            <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Page {recordsPage} of {Math.ceil(recordsTotal / 50)} ({recordsTotal} records)
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setRecordsPage(Math.max(1, recordsPage - 1))}
                  disabled={recordsPage === 1}
                  className="btn btn-outline btn-sm text-xs disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setRecordsPage(recordsPage + 1)}
                  disabled={recordsPage * 50 >= recordsTotal}
                  className="btn btn-outline btn-sm text-xs disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Check if filtering by today
  const isFilteringToday = mainDateFrom === getTodayDate() && mainDateTo === getTodayDate();

  // Main View - Telecaller List
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Shared Data</h1>
            <p className="text-xs text-gray-500">View shared lead data by telecaller</p>
          </div>
          {isFilteringToday && (
            <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
              Today
            </span>
          )}
        </div>
        <button
          onClick={loadStats}
          className="btn btn-outline btn-sm flex items-center gap-1 text-xs"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Telecallers</p>
              <p className="text-xl font-bold text-gray-900">{stats?.totalTelecallers || 0}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Total Leads</p>
              <p className="text-xl font-bold text-gray-900">{totalAssigned}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <PhoneIcon className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Pending</p>
              <p className="text-xl font-bold text-blue-600">{totalPending}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClockIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Interested</p>
              <p className="text-xl font-bold text-green-600">{totalInterested}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Converted</p>
              <p className="text-xl font-bold text-primary-600">{totalConverted}</p>
            </div>
            <div className="p-2 bg-primary-100 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Unassigned Alert */}
      {stats && stats.unassignedCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              <strong>{stats.unassignedCount}</strong> leads are pending assignment
            </span>
          </div>
          <button
            onClick={() => navigate('/settings/auto-assign')}
            className="text-xs text-yellow-700 hover:text-yellow-900 font-medium"
          >
            Go to Auto-Assign
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <FunnelIcon className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">Filters:</span>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchTelecaller}
              onChange={(e) => setSearchTelecaller(e.target.value)}
              placeholder="Search telecaller..."
              className="pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 bg-white w-40"
            />
          </div>

          {/* Branch Filter */}
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            <option value="">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>

          {/* Reporting To Filter */}
          <select
            value={filterReportingTo}
            onChange={(e) => setFilterReportingTo(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            <option value="">All Managers</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.firstName} {manager.lastName}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={mainDateFrom}
            onChange={(e) => setMainDateFrom(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 bg-white"
            title="Assigned From"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            value={mainDateTo}
            onChange={(e) => setMainDateTo(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 bg-white"
            title="Assigned To"
          />

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearMainFilters}
              className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Telecaller List Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Telecaller</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Role</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase">Total</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase">Pending</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase">Interested</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase">Converted</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase">Conv. Rate</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {statsLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredTelecallers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    <UserGroupIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-medium">No telecallers found</p>
                  </td>
                </tr>
              ) : (
                filteredTelecallers.map((tc) => {
                  const conversionRate = tc.totalAssigned > 0
                    ? ((tc.statusBreakdown.converted / tc.totalAssigned) * 100).toFixed(1)
                    : '0';
                  const telecallerUser = telecallers.find(t => t.id === tc.telecallerId) as any;
                  // Use branchName from API if available, fallback to lookup
                  const branchName = telecallerUser?.branchName
                    || (telecallerUser?.branchId ? branches.find(b => b.id === telecallerUser.branchId)?.name : null)
                    || '-';

                  return (
                    <tr key={tc.telecallerId} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-semibold text-xs">
                              {tc.telecallerName.charAt(0)}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-gray-900">{tc.telecallerName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{tc.role}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{branchName}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <span className="text-xs font-bold text-gray-900">{tc.totalAssigned}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <span className="text-xs font-medium text-blue-600">{tc.statusBreakdown.assigned}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <span className="text-xs font-medium text-green-600">{tc.statusBreakdown.interested}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <span className="text-xs font-medium text-primary-600">{tc.statusBreakdown.converted}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <span className={`text-xs font-medium ${parseFloat(conversionRate) >= 10 ? 'text-green-600' : 'text-gray-600'}`}>
                          {conversionRate}%
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          tc.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {tc.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleViewTelecaller(tc)}
                          className="btn btn-outline btn-sm text-xs flex items-center gap-1 mx-auto"
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
