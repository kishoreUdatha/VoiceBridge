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
  }, [activeTab, page]);

  // Lock body scroll when panels are open
  useEffect(() => {
    if (showCampaignModal || showAssignModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCampaignModal, showAssignModal]);

  const loadRecords = () => {
    if (!id) return;
    dispatch(
      fetchRecords({
        bulkImportId: id,
        status: activeTab === 'ALL' ? undefined : activeTab,
        page,
        limit: 50,
      })
    );
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
      showToast.error('Please select at least one telecaller');
      return;
    }
    if (selectedRecords.length === 0) {
      showToast.error('Please select records to assign');
      return;
    }

    try {
      await dispatch(
        assignToTelecallers({ recordIds: selectedRecords, telecallerIds: selectedTelecallers })
      ).unwrap();
      showToast.success('Records assigned to telecallers successfully');
      closeAssignModal();
      loadRecords();
      dispatch(fetchBulkImportById(id!));
    } catch {
      showToast.error('Failed to assign records');
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
      showToast.error('Please select an AI agent');
      return;
    }
    if (selectedRecords.length === 0) {
      showToast.error('Please select records to assign');
      return;
    }
    if (!campaignName.trim()) {
      showToast.error('Please enter a campaign name');
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

      showToast.success(`Campaign "${campaignName}" started with ${contacts.length} contacts!`);
      closeCampaignModal();
      loadRecords();
      dispatch(fetchBulkImportById(id!));
      dispatch(clearSelectedRecords());
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      showToast.error(error.response?.data?.message || 'Failed to create campaign');
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedTelecallers([]);
  };

  const closeCampaignModal = () => {
    setShowCampaignModal(false);
    setSelectedAgent('');
    setCampaignName('');
    setCallingHoursStart('09:00');
    setCallingHoursEnd('18:00');
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
          <button onClick={loadRecords} className="btn btn-outline btn-sm flex items-center gap-1 text-xs">
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Refresh
          </button>
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
    </div>
  );
}
