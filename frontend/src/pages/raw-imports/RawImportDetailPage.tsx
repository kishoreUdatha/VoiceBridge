/**
 * Raw Import Detail Page
 * Shows records from a bulk import with assignment and campaign features
 * Refactored to use extracted components (SOLID principles)
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  fetchBulkImportById,
  fetchRecords,
  toggleRecordSelection,
  selectAllRecords,
  clearSelectedRecords,
  assignToTelecallers,
  assignToAIAgent,
  clearCurrentImport,
} from '../../store/slices/rawImportSlice';
import { fetchTelecallers } from '../../store/slices/userSlice';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  CpuChipIcon,
  ArrowPathIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { RawImportRecordStatus } from '../../services/rawImport.service';

// Local imports - extracted components
import { STATUS_TABS, formatDate } from './raw-import-detail.constants';
import { TelecallerAssignPanel, AICampaignPanel, RecordsTable } from './components';

interface VoiceAgent {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function RawImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { currentImport, records, selectedRecords, recordsTotal, isLoading } = useSelector(
    (state: RootState) => state.rawImports
  );
  const { telecallers } = useSelector((state: RootState) => state.users);

  // UI state
  const [activeTab, setActiveTab] = useState<RawImportRecordStatus | 'ALL'>('ALL');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedTelecallers, setSelectedTelecallers] = useState<string[]>([]);
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [page, setPage] = useState(1);

  // Campaign modal state
  const [campaignName, setCampaignName] = useState('');
  const [callingHoursStart, setCallingHoursStart] = useState('09:00');
  const [callingHoursEnd, setCallingHoursEnd] = useState('18:00');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  // Add manual record modal state
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternatePhone: '',
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('');

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'single' | 'bulk';
    recordId?: string;
  }>({ show: false, type: 'single' });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (id) {
      dispatch(fetchBulkImportById(id));
      dispatch(fetchTelecallers());
      loadRecords();
      loadVoiceAgents();
    }
    return () => {
      dispatch(clearCurrentImport());
    };
  }, [dispatch, id]);

  useEffect(() => {
    loadRecords();
  }, [activeTab, page, debouncedSearch, filterAssignedTo]);

  // Lock body scroll when panels are open
  useEffect(() => {
    if (showCampaignModal || showAssignModal || showAddRecordModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCampaignModal, showAssignModal, showAddRecordModal]);

  const loadRecords = () => {
    if (!id) return;
    dispatch(
      fetchRecords({
        bulkImportId: id,
        status: activeTab === 'ALL' ? undefined : activeTab,
        page,
        limit: 50,
        search: debouncedSearch || undefined,
        assignedToId: filterAssignedTo || undefined,
      })
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setFilterAssignedTo('');
    setPage(1);
  };

  const loadVoiceAgents = async () => {
    try {
      const res = await api.get('/voice-ai/agents');
      setVoiceAgents(res.data.data || []);
    } catch {
      // Voice agents not available
    }
  };

  const toggleTelecaller = (telecallerId: string) => {
    setSelectedTelecallers((prev) =>
      prev.includes(telecallerId)
        ? prev.filter((c) => c !== telecallerId)
        : [...prev, telecallerId]
    );
  };

  const handleAssignTelecallers = async () => {
    if (selectedTelecallers.length === 0) {
      showToast.custom.error('Please select at least one telecaller');
      return;
    }
    if (selectedRecords.length === 0) {
      showToast.custom.error('Please select records to assign');
      return;
    }

    try {
      await dispatch(
        assignToTelecallers({ recordIds: selectedRecords, telecallerIds: selectedTelecallers })
      ).unwrap();
      showToast.success('rawImports.assignedToTelecallers');
      closeAssignModal();
      loadRecords();
      dispatch(fetchBulkImportById(id!));
    } catch (error: any) {
      // Show the actual error message from API
      const errorMessage = typeof error === 'string' ? error : (error?.message || 'Could not assign records');

      // Make error message more user-friendly
      if (errorMessage.toLowerCase().includes('no pending')) {
        showToast.custom.error('All selected records are already assigned. Please select unassigned records.');
      } else {
        showToast.custom.error(errorMessage);
      }
    }
  };

  const handleOpenCampaignModal = () => {
    const sourceName = currentImport?.fileName?.replace(/\.[^/.]+$/, '') || 'Raw Import';
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setCampaignName(`${sourceName} - ${dateStr}`);
    setShowCampaignModal(true);
  };

  const handleCreateAndStartCampaign = async () => {
    if (!selectedAgent) {
      showToast.custom.error('Please select an AI agent');
      return;
    }
    if (selectedRecords.length === 0) {
      showToast.custom.error('Please select records to assign');
      return;
    }
    if (!campaignName.trim()) {
      showToast.custom.error('Please enter a campaign name');
      return;
    }

    setIsCreatingCampaign(true);

    try {
      const selectedRecordsData = records.filter(r => selectedRecords.includes(r.id));
      const contacts = selectedRecordsData.map(record => ({
        phone: record.phone,
        name: `${record.firstName} ${record.lastName || ''}`.trim(),
        email: record.email,
        customData: {
          rawImportRecordId: record.id,
          ...(record.customFields as object || {})
        }
      }));

      // Create the campaign
      const campaignRes = await api.post('/outbound-calls/campaigns', {
        name: campaignName,
        agentId: selectedAgent,
        contacts,
        callingHours: { start: callingHoursStart, end: callingHoursEnd }
      });

      const campaignId = campaignRes.data.data?.id;
      if (!campaignId) throw new Error('Failed to create campaign');

      // Update raw import records
      await dispatch(assignToAIAgent({ recordIds: selectedRecords, agentId: selectedAgent })).unwrap();

      // Start the campaign
      await api.post(`/outbound-calls/campaigns/${campaignId}/start`);

      showToast.custom.success(`Campaign "${campaignName}" started with ${contacts.length} contacts!`);
      closeCampaignModal();
      loadRecords();
      dispatch(fetchBulkImportById(id!));
      dispatch(clearSelectedRecords());
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      const errorMessage = error.response?.data?.message || error?.message || '';

      // Make error messages more user-friendly
      if (errorMessage.toLowerCase().includes('no pending')) {
        showToast.custom.error('All selected records are already assigned. Please select unassigned records.');
      } else if (errorMessage.toLowerCase().includes('agent')) {
        showToast.custom.error('Could not connect to AI agent. Please check agent settings and try again.');
      } else if (errorMessage) {
        showToast.custom.error(errorMessage);
      } else {
        showToast.custom.error('Could not start campaign. Please check your settings and try again.');
      }
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedTelecallers([]);
  };

  const handleDeleteRecord = (recordId: string) => {
    setDeleteConfirm({ show: true, type: 'single', recordId });
  };

  const handleBulkDelete = () => {
    if (selectedRecords.length === 0) {
      showToast.custom.error('Please select records to delete');
      return;
    }
    setDeleteConfirm({ show: true, type: 'bulk' });
  };

  const handleConfirmDelete = async () => {
    try {
      if (deleteConfirm.type === 'single' && deleteConfirm.recordId) {
        await api.delete(`/raw-imports/records/${deleteConfirm.recordId}`);
        showToast.custom.success('Record deleted successfully');
      } else if (deleteConfirm.type === 'bulk') {
        await api.post('/raw-imports/records/bulk-delete', { recordIds: selectedRecords });
        showToast.custom.success(`${selectedRecords.length} record(s) deleted successfully`);
        dispatch(clearSelectedRecords());
      }
      loadRecords();
      dispatch(fetchBulkImportById(id!));
    } catch {
      showToast.custom.error('Failed to delete record(s)');
    } finally {
      setDeleteConfirm({ show: false, type: 'single' });
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ show: false, type: 'single' });
  };

  const closeCampaignModal = () => {
    setShowCampaignModal(false);
    setSelectedAgent('');
    setCampaignName('');
    setCallingHoursStart('09:00');
    setCallingHoursEnd('18:00');
  };

  const handleAddManualRecord = async () => {
    if (!newRecord.firstName.trim()) {
      showToast.custom.error('First name is required');
      return;
    }
    if (!newRecord.phone.trim()) {
      showToast.custom.error('Phone number is required');
      return;
    }

    setIsAddingRecord(true);
    try {
      await api.post('/raw-imports/records/add-manual', {
        bulkImportId: id,
        ...newRecord,
      });
      showToast.custom.success('Record added successfully');
      closeAddRecordModal();
      loadRecords();
      dispatch(fetchBulkImportById(id!));
    } catch (error: any) {
      showToast.custom.error(error.response?.data?.message || 'Failed to add record');
    } finally {
      setIsAddingRecord(false);
    }
  };

  const closeAddRecordModal = () => {
    setShowAddRecordModal(false);
    setNewRecord({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      alternatePhone: '',
    });
  };

  if (!currentImport) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/raw-imports')}
          className="flex items-center text-xs text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5 mr-1" />
          Back to Raw Imports
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{currentImport.fileName}</h1>
            <p className="text-xs text-gray-500">
              Uploaded{' '}
              {currentImport.uploadedBy
                ? `by ${currentImport.uploadedBy.firstName} ${currentImport.uploadedBy.lastName}`
                : ''}{' '}
              on {formatDate(currentImport.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddRecordModal(true)}
              className="btn btn-primary btn-sm flex items-center gap-1 text-xs"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add Record
            </button>
            <button onClick={loadRecords} className="btn btn-outline btn-sm flex items-center gap-1 text-xs">
              <ArrowPathIcon className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <div className="card p-2">
          <p className="text-xs text-gray-500">Total Records</p>
          <p className="text-lg font-semibold text-gray-900">{currentImport.validRows}</p>
        </div>
        <div className="card p-2">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-lg font-semibold text-yellow-600">{currentImport.statusBreakdown?.PENDING || 0}</p>
        </div>
        <div className="card p-2">
          <p className="text-xs text-gray-500">Assigned</p>
          <p className="text-lg font-semibold text-blue-600">
            {(currentImport.statusBreakdown?.ASSIGNED || 0) + (currentImport.statusBreakdown?.CALLING || 0)}
          </p>
        </div>
        <div className="card p-2">
          <p className="text-xs text-gray-500">Interested</p>
          <p className="text-lg font-semibold text-green-600">{currentImport.statusBreakdown?.INTERESTED || 0}</p>
        </div>
        <div className="card p-2">
          <p className="text-xs text-gray-500">Converted</p>
          <p className="text-lg font-semibold text-primary-600">{currentImport.convertedCount}</p>
        </div>
      </div>

      {/* Search and Filters - Inline Compact Design */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Assigned To Filter */}
        <select
          value={filterAssignedTo}
          onChange={(e) => { setFilterAssignedTo(e.target.value); setPage(1); }}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[140px]"
        >
          <option value="">All Telecallers</option>
          {telecallers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.firstName} {t.lastName}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {(searchQuery || filterAssignedTo) && (
          <button
            onClick={clearFilters}
            className="px-2 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedRecords.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-primary-800 font-medium text-xs">
              {selectedRecords.length} record(s) selected
            </span>
            <button
              onClick={() => dispatch(clearSelectedRecords())}
              className="text-primary-600 hover:text-primary-800 text-[10px]"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowAssignModal(true)}
              className="btn btn-outline btn-sm flex items-center gap-1 text-xs"
            >
              <UserGroupIcon className="h-3.5 w-3.5" />
              Telecallers
            </button>
            <button
              onClick={handleOpenCampaignModal}
              className="btn btn-outline btn-sm flex items-center gap-1 text-xs bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              <CpuChipIcon className="h-3.5 w-3.5" />
              AI Campaign
            </button>
            <button
              onClick={handleBulkDelete}
              className="btn btn-outline btn-sm flex items-center gap-1 text-xs bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="border-b border-gray-200 mb-3">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const count = tab.key === 'ALL' ? currentImport.validRows : currentImport.statusBreakdown?.[tab.key] || 0;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-xs ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === tab.key ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Records Table */}
      <RecordsTable
        records={records}
        selectedRecords={selectedRecords}
        isLoading={isLoading}
        recordsTotal={recordsTotal}
        page={page}
        onToggleSelection={(id) => dispatch(toggleRecordSelection(id))}
        onSelectAll={() => dispatch(selectAllRecords())}
        onClearSelection={() => dispatch(clearSelectedRecords())}
        onPageChange={setPage}
        onDelete={handleDeleteRecord}
      />

      {/* Telecaller Assignment Panel */}
      {showAssignModal && (
        <TelecallerAssignPanel
          selectedRecordsCount={selectedRecords.length}
          telecallers={telecallers.map(t => ({ ...t, activeRecordCount: (t as any).activeRecordCount }))}
          selectedTelecallers={selectedTelecallers}
          onToggleTelecaller={toggleTelecaller}
          onAssign={handleAssignTelecallers}
          onClose={closeAssignModal}
        />
      )}

      {/* AI Campaign Panel */}
      {showCampaignModal && (
        <AICampaignPanel
          selectedRecordsCount={selectedRecords.length}
          campaignName={campaignName}
          callingHoursStart={callingHoursStart}
          callingHoursEnd={callingHoursEnd}
          voiceAgents={voiceAgents}
          selectedAgent={selectedAgent}
          isCreating={isCreatingCampaign}
          onCampaignNameChange={setCampaignName}
          onCallingHoursStartChange={setCallingHoursStart}
          onCallingHoursEndChange={setCallingHoursEnd}
          onAgentSelect={setSelectedAgent}
          onCreateCampaign={handleCreateAndStartCampaign}
          onCreateAgent={() => navigate('/voice-ai/create')}
          onClose={closeCampaignModal}
        />
      )}

      {/* Add Manual Record Modal */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={closeAddRecordModal} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Record Manually</h3>
                <button
                  onClick={closeAddRecordModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newRecord.firstName}
                      onChange={(e) => setNewRecord({ ...newRecord, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={newRecord.lastName}
                      onChange={(e) => setNewRecord({ ...newRecord, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newRecord.phone}
                    onChange={(e) => setNewRecord({ ...newRecord, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alternate Phone
                  </label>
                  <input
                    type="tel"
                    value={newRecord.alternatePhone}
                    onChange={(e) => setNewRecord({ ...newRecord, alternatePhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="+91 9876543211"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newRecord.email}
                    onChange={(e) => setNewRecord({ ...newRecord, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={closeAddRecordModal}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddManualRecord}
                  disabled={isAddingRecord}
                  className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isAddingRecord ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-4 w-4" />
                      Add Record
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <h3 className="text-lg font-semibold text-gray-900">
                  {deleteConfirm.type === 'bulk' ? 'Delete Selected Records' : 'Delete Record'}
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                {deleteConfirm.type === 'bulk'
                  ? `Are you sure you want to delete ${selectedRecords.length} selected record(s)? This action cannot be undone.`
                  : 'Are you sure you want to delete this record? This action cannot be undone.'}
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
    </div>
  );
}
