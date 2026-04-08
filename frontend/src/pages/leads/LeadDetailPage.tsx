/**
 * Lead Detail Page
 * Displays comprehensive lead information with multiple tabs
 * Refactored to use extracted hooks and components (SOLID principles)
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchLeadById, updateLead, assignLead } from '../../store/slices/leadSlice';
import { fetchCounselors } from '../../store/slices/userSlice';
import {
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  VideoCameraIcon,
  PencilSquareIcon,
  XMarkIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckBadgeIcon,
  EllipsisHorizontalIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon as CheckBadgeSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

// Custom WhatsApp Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Local imports - extracted components and hooks
import { useLeadDetailData } from './hooks';
// Status options removed - now using industry-specific stages
import SmartCallPrep from '../../components/SmartCallPrep';
import {
  DocumentIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ChatBubbleOvalLeftIcon,
  CalendarIcon,
  PaperClipIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  CurrencyRupeeIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

// All tabs shown directly - compact labels to fit all
const allTabs = [
  { id: 'overview', label: 'Overview', icon: DocumentIcon },
  { id: 'calls', label: 'Calls', icon: PhoneIcon },
  { id: 'notes', label: 'Notes', icon: ChatBubbleOvalLeftIcon },
  { id: 'tasks', label: 'Tasks', icon: ClipboardDocumentListIcon },
  { id: 'followups', label: 'Follow-ups', icon: CalendarIcon },
  { id: 'timelines', label: 'Timeline', icon: ClockIcon },
  { id: 'interests', label: 'Interests', icon: ClipboardDocumentListIcon },
  { id: 'attachments', label: 'Files', icon: PaperClipIcon },
  { id: 'queries', label: 'Queries', icon: QuestionMarkCircleIcon },
  { id: 'applications', label: 'Apps', icon: DocumentTextIcon, educationOnly: true },
  { id: 'payments', label: 'Payments', icon: CurrencyRupeeIcon },
  { id: 'documents', label: 'Docs', icon: FolderIcon },
];

// No more tabs - all visible
const moreTabs: typeof allTabs = [];
import {
  OverviewTab,
  NotesTab,
  TasksTab,
  FollowUpsTab,
  CallsTab,
  InterestsTab,
  TimelineTab,
  AttachmentsTab,
  QueriesTab,
  ApplicationsTab,
  PaymentsTab,
  DocumentsTab,
  LeadPayment,
  LeadDocument,
  TaskModal,
  FollowUpModal,
  QueryModal,
  ApplicationModal,
  InterestModal,
  CallLogModal,
  WhatsAppModal,
  SmsModal,
  EditLeadModal,
  EditLeadFormData,
  PaymentModal,
  DocumentModal,
  AdmissionStatusTracker,
  CloseAdmissionModal,
  IndustryJourneyTracker,
  QuickReminderDropdown,
  IndustryFieldsForm,
} from './components';
import leadDetailsService from '../../services/leadDetails.service';
import { leadService, AdmissionStatus } from '../../services/lead.service';
import { OrganizationIndustry, LeadStage } from './industry-stages.constants';
import api from '../../services/api';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentLead, isLoading } = useSelector((state: RootState) => state.leads);
  const { counselors } = useSelector((state: RootState) => state.users);

  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState('');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showCallPrepModal, setShowCallPrepModal] = useState(false);
  const [showCloseAdmissionModal, setShowCloseAdmissionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  // Industry-specific lead stages state
  const [organizationIndustry, setOrganizationIndustry] = useState<OrganizationIndustry>('GENERAL');
  const [leadStages, setLeadStages] = useState<LeadStage[]>([]);
  const [loadingStages, setLoadingStages] = useState(true);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setShowMoreDropdown(false);
      }
      // Also close agent dropdown on outside click
      const agentDropdown = document.querySelector('[data-agent-dropdown]');
      if (agentDropdown && !agentDropdown.contains(event.target as Node)) {
        setShowAgentDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Use the extracted data hook
  const leadData = useLeadDetailData(id);

  // Load lead data on mount
  useEffect(() => {
    if (id) {
      dispatch(fetchLeadById(id));
      dispatch(fetchCounselors());
    }
  }, [dispatch, id]);

  // Load organization industry and lead stages
  useEffect(() => {
    const loadIndustryAndStages = async () => {
      try {
        setLoadingStages(true);
        const [industryRes, stagesRes] = await Promise.all([
          api.get('/lead-stages/industry'),
          api.get('/lead-stages/journey'),
        ]);
        setOrganizationIndustry(industryRes.data.data?.industry || 'GENERAL');
        const allStages = [
          ...(stagesRes.data.data?.progressStages || []),
          ...(stagesRes.data.data?.lostStage ? [stagesRes.data.data.lostStage] : []),
        ];
        setLeadStages(allStages);
      } catch (error) {
        console.error('Failed to load industry/stages:', error);
      } finally {
        setLoadingStages(false);
      }
    };
    loadIndustryAndStages();
  }, []);

  // Sync stage with lead data
  useEffect(() => {
    if (currentLead) {
      setSelectedStageId(currentLead.stageId || '');
    }
  }, [currentLead]);

  // Load tab data when tab changes
  useEffect(() => {
    leadData.loadTabData(activeTab);
  }, [activeTab, leadData.loadTabData]);

  // Stage change handler - updates stage and auto-syncs status
  const handleStageChange = async (newStageId: string) => {
    if (!id) return;
    try {
      // Find the selected stage to determine auto-sync status
      const selectedStage = leadStages.find(s => s.id === newStageId);

      // Determine status based on stage position
      let newStatus = 'NEW';
      if (selectedStage) {
        if (selectedStage.journeyOrder < 0) {
          newStatus = 'LOST'; // Lost stage
        } else if (selectedStage.autoSyncStatus === 'WON') {
          newStatus = 'WON';
        } else if (selectedStage.autoSyncStatus === 'LOST') {
          newStatus = 'LOST';
        } else if (selectedStage.journeyOrder > 1) {
          newStatus = 'CONTACTED'; // After first stage
        }
      }

      // Update both stage and status
      await api.put(`/lead-stages/lead/${id}/stage`, { stageId: newStageId });

      setSelectedStageId(newStageId);
      setIsEditingStage(false);
      dispatch(fetchLeadById(id)); // Refresh lead data
      toast.success('Lead stage updated successfully');
    } catch {
      toast.error('Failed to update lead stage');
    }
  };

  // Assignment handler
  const handleAssign = async (counselorId: string) => {
    if (!id) return;
    try {
      await dispatch(assignLead({ leadId: id, assignedToId: counselorId })).unwrap();
      dispatch(fetchLeadById(id));
      setShowAgentDropdown(false);
      toast.success('Lead assigned successfully');
    } catch {
      toast.error('Failed to assign lead');
    }
  };

  // WhatsApp handler
  const handleSendWhatsApp = async (data: { message: string; mediaUrl: string }) => {
    if (!id) return;
    try {
      await leadDetailsService.sendWhatsApp(id, {
        message: data.message,
        mediaUrl: data.mediaUrl || undefined,
      });
      toast.success('WhatsApp message sent');
    } catch {
      toast.error('Failed to send WhatsApp message');
    }
  };

  // SMS handler
  const handleSendSms = async (message: string) => {
    if (!id) return;
    try {
      await leadDetailsService.sendSms(id, { message });
      toast.success('SMS sent');
    } catch {
      toast.error('Failed to send SMS');
    }
  };

  // Edit lead handler
  const handleEditLead = async (data: EditLeadFormData) => {
    if (!id) return;
    try {
      await dispatch(updateLead({ id, data })).unwrap();
      dispatch(fetchLeadById(id));
      toast.success('Lead details updated successfully');
    } catch {
      toast.error('Failed to update lead details');
    }
  };

  // Conversion handler
  const handleMarkAsConverted = async () => {
    if (!id) return;
    if (currentLead?.isConverted) {
      toast.error('Lead is already converted');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to mark "${currentLead?.firstName} ${currentLead?.lastName}" as converted?\n\nThis action indicates the lead has become a customer.`
    );

    if (!confirmed) return;

    try {
      await dispatch(updateLead({ id, data: { isConverted: true } })).unwrap();
      dispatch(fetchLeadById(id));
      toast.success('🎉 Lead marked as converted!');
    } catch {
      toast.error('Failed to mark lead as converted');
    }
  };

  // Admission status change handler (legacy - for education industry fallback)
  const handleAdmissionStatusChange = async (newStatus: string) => {
    if (!id) return;
    await leadService.updateAdmissionStatus(id, newStatus as AdmissionStatus);
    dispatch(fetchLeadById(id));
  };

  // Handle admission closed success
  const handleAdmissionSuccess = () => {
    if (id) {
      dispatch(fetchLeadById(id));
    }
  };

  // Loading state
  if (isLoading || !currentLead) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const assignedUser = currentLead.assignments?.[0]?.assignedTo;

  // Check if current tab is in more tabs
  const isMoreTabActive = moreTabs.some(t => t.id === activeTab);
  const activeMoreTab = moreTabs.find(t => t.id === activeTab);

  // Get initials for avatar
  const initials = `${currentLead.firstName?.[0] || ''}${currentLead.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 relative z-10">
        <div className="px-3 py-3">
          {/* Row 1: Back, Name, Status, Badges, Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/leads')}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4 text-slate-500" />
            </button>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-semibold">
              {initials}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-slate-900 truncate">
                  {currentLead.firstName} {currentLead.lastName}
                </h1>
                <span className="text-slate-400 text-xs">#{currentLead.id?.slice(0, 7)}</span>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                  title="Edit Lead Details"
                >
                  <PencilSquareIcon className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{currentLead.phone}</span>
                <span className="text-slate-300">|</span>
                <span className="truncate max-w-[150px]">{currentLead.email || 'No email'}</span>
              </div>
            </div>

            {/* Stage Badge */}
            {isEditingStage ? (
              <div className="flex items-center gap-1">
                <select
                  value={selectedStageId}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Select Stage</option>
                  {leadStages.filter(s => s.journeyOrder >= 0).map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                  {leadStages.filter(s => s.journeyOrder < 0).map((stage) => (
                    <option key={stage.id} value={stage.id}>--- {stage.name} ---</option>
                  ))}
                </select>
                <button onClick={() => setIsEditingStage(false)} className="p-0.5 hover:bg-slate-100 rounded">
                  <XMarkIcon className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingStage(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${leadStages.find(s => s.id === selectedStageId)?.color || '#94A3B8'}20`,
                  color: leadStages.find(s => s.id === selectedStageId)?.color || '#64748B',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: leadStages.find(s => s.id === selectedStageId)?.color || '#94A3B8' }}
                />
                {leadStages.find(s => s.id === selectedStageId)?.name || 'Select Stage'}
                <ChevronDownIcon className="h-3 w-3 opacity-60" />
              </button>
            )}

            {currentLead.isConverted && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                <CheckBadgeSolidIcon className="h-3 w-3" />
                Converted
              </span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowCallPrepModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
              >
                <PhoneIcon className="h-3.5 w-3.5" />
                Call
              </button>
              <button onClick={() => setShowWhatsappModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors">
                <WhatsAppIcon className="h-3.5 w-3.5" />
                WhatsApp
              </button>
              <button onClick={() => setShowSmsModal(true)} className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-600 transition-colors" title="SMS">
                <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
              </button>
              <QuickReminderDropdown
                leadId={currentLead.id}
                leadName={`${currentLead.firstName} ${currentLead.lastName}`}
                compact
              />
              <a href={`mailto:${currentLead.email}`} className="p-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-600 transition-colors" title="Email">
                <EnvelopeIcon className="h-4 w-4" />
              </a>
              <button
                onClick={() => toast('Video call feature coming soon!', { icon: '📹' })}
                className="p-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-600 transition-colors"
                title="Video Call"
              >
                <VideoCameraIcon className="h-4 w-4" />
              </button>
              {!currentLead.isConverted && (
                <>
                  <div className="h-5 w-px bg-slate-200 mx-1" />
                  <button
                    onClick={handleMarkAsConverted}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                  >
                    <CheckBadgeIcon className="h-3.5 w-3.5" />
                    Convert
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Row 2: Lead Info */}
          <div className="flex items-center gap-4 mt-2 pl-12 text-xs relative z-20">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Source:</span>
              <span className="font-medium text-slate-700">{(currentLead.source || 'Unknown').replace(/_/g, ' ')}</span>
            </div>
            <div className="flex items-center gap-1.5 relative">
              <span className="text-slate-400">Assigned:</span>
              <button
                onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                className="font-medium text-slate-700 hover:text-primary-600 flex items-center gap-0.5"
              >
                {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned'}
                <ChevronDownIcon className="h-3 w-3" />
              </button>
              {showAgentDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[160px] py-1">
                  {counselors.map((counselor) => (
                    <button
                      key={counselor.id}
                      onClick={() => handleAssign(counselor.id)}
                      className="block w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs"
                    >
                      {counselor.firstName} {counselor.lastName}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Created:</span>
              <span className="font-medium text-slate-700">
                {new Date(currentLead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            {currentLead.convertedAt && (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CheckBadgeSolidIcon className="h-3.5 w-3.5" />
                <span className="font-medium">
                  Converted {new Date(currentLead.convertedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs - Clean Full Width Style */}
        <div className="px-3 border-t border-slate-100">
          <div className="flex items-center">
            {/* Tab Container - Full Width */}
            <div className="flex items-center gap-0 overflow-x-auto flex-1 scrollbar-hide">
              {allTabs.filter(tab => !tab.educationOnly || organizationIndustry === 'EDUCATION').map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                // Get counts for tabs
                const getTabCount = () => {
                  switch (tab.id) {
                    case 'notes': return leadData.notes?.length || 0;
                    case 'tasks': return leadData.tasks?.length || 0;
                    case 'followups': return leadData.followUps?.length || 0;
                    case 'calls': return leadData.callLogs?.length || 0;
                    case 'timelines': return leadData.activities?.length || 0;
                    case 'interests': return leadData.interests?.length || 0;
                    case 'attachments': return leadData.attachments?.length || 0;
                    case 'queries': return leadData.queries?.length || 0;
                    case 'applications': return leadData.applications?.length || 0;
                    case 'payments': return leadData.payments?.length || 0;
                    case 'documents': return leadData.documents?.length || 0;
                    default: return 0;
                  }
                };
                const count = getTabCount();

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-1 px-2.5 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${
                      isActive
                        ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                        : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-100/50'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary-600' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                    <span className={`ml-1 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-semibold rounded-full transition-opacity ${
                      count > 0
                        ? isActive
                          ? 'bg-primary-600 text-white opacity-100'
                          : 'bg-slate-200 text-slate-600 opacity-100'
                        : 'opacity-0'
                    }`}>
                      {count || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* More Dropdown - Only show if there are more tabs */}
            {moreTabs.length > 0 && (
              <div className="relative" ref={moreDropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreDropdown(!showMoreDropdown);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap rounded-lg transition-all duration-200 ${
                    isMoreTabActive
                      ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <EllipsisHorizontalIcon className="h-4 w-4" />
                  <span>{isMoreTabActive ? activeMoreTab?.label : 'More'}</span>
                  <ChevronDownIcon className={`h-3 w-3 transition-transform duration-200 ${showMoreDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showMoreDropdown && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] min-w-[180px] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      More Options
                    </div>
                    {moreTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab(tab.id);
                            setShowMoreDropdown(false);
                          }}
                          className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? 'text-primary-700 bg-primary-50'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                          <span className="font-medium">{tab.label}</span>
                          {isActive && (
                            <CheckIcon className="h-4 w-4 ml-auto text-primary-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-3 py-4">
        {/* Industry Journey Tracker - Uses organization's industry-specific stages */}
        {!loadingStages && leadStages.length > 0 ? (
          <IndustryJourneyTracker
            industry={organizationIndustry}
            stages={leadStages}
            currentStageId={currentLead.stageId || null}
            onStageChange={handleStageChange}
            onMarkLost={() => {}}
            isConverted={currentLead.isConverted}
            closedAt={currentLead.admissionClosedAt}
            showCloseButton={organizationIndustry === 'EDUCATION'}
            onClose={() => setShowCloseAdmissionModal(true)}
          />
        ) : organizationIndustry === 'EDUCATION' ? (
          /* Fallback to legacy AdmissionStatusTracker for education without stages */
          <AdmissionStatusTracker
            currentStatus={currentLead.admissionStatus || 'INQUIRY'}
            onStatusChange={handleAdmissionStatusChange}
            onCloseAdmission={() => setShowCloseAdmissionModal(true)}
            isConverted={currentLead.isConverted}
            admissionClosedAt={currentLead.admissionClosedAt}
          />
        ) : null}

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <OverviewTab lead={currentLead} />
            {/* Industry-specific custom fields - show for all industries except EDUCATION (has dedicated models) */}
            {organizationIndustry !== 'EDUCATION' && organizationIndustry !== 'GENERAL' && (
              <IndustryFieldsForm
                leadId={currentLead.id}
                industry={organizationIndustry}
                initialValues={currentLead.customFields as Record<string, any>}
                onSave={() => dispatch(fetchLeadById(currentLead.id))}
              />
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <NotesTab
            notes={leadData.notes}
            loading={leadData.loadingNotes}
            onAdd={leadData.addNote}
            onUpdate={leadData.updateNote}
            onDelete={leadData.deleteNote}
            onTogglePin={leadData.togglePinNote}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksTab
            tasks={leadData.tasks}
            loading={leadData.loadingTasks}
            onAddClick={() => setShowTaskModal(true)}
            onUpdateStatus={leadData.updateTaskStatus}
            onDelete={leadData.deleteTask}
          />
        )}

        {activeTab === 'followups' && (
          <FollowUpsTab
            followUps={leadData.followUps}
            loading={leadData.loadingFollowUps}
            onAddClick={() => setShowFollowUpModal(true)}
            onUpdateStatus={leadData.updateFollowUpStatus}
            onDelete={leadData.deleteFollowUp}
          />
        )}

        {activeTab === 'calls' && (
          <CallsTab
            callLogs={leadData.callLogs}
            loading={leadData.loadingCalls}
            phone={currentLead.phone}
            onLogCallClick={() => setShowCallLogModal(true)}
          />
        )}

        {activeTab === 'interests' && (
          <InterestsTab
            interests={leadData.interests}
            loading={leadData.loadingInterests}
            onAddClick={() => setShowInterestModal(true)}
            onDelete={leadData.deleteInterest}
          />
        )}

        {activeTab === 'timelines' && (
          <TimelineTab
            activities={leadData.activities}
            loading={leadData.loadingActivities}
          />
        )}

        {activeTab === 'attachments' && (
          <AttachmentsTab
            attachments={leadData.attachments}
            loading={leadData.loadingAttachments}
            onUpload={leadData.uploadAttachment}
            onDelete={leadData.deleteAttachment}
          />
        )}

        {activeTab === 'queries' && (
          <QueriesTab
            queries={leadData.queries}
            loading={leadData.loadingQueries}
            onAddClick={() => setShowQueryModal(true)}
            onUpdate={leadData.updateQuery}
            onDelete={leadData.deleteQuery}
          />
        )}

        {activeTab === 'applications' && (
          <ApplicationsTab
            applications={leadData.applications}
            loading={leadData.loadingApplications}
            onAddClick={() => setShowApplicationModal(true)}
            onUpdateStatus={leadData.updateApplicationStatus}
            onDelete={leadData.deleteApplication}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsTab
            payments={leadData.payments}
            loading={leadData.loadingPayments}
            onAddClick={() => setShowPaymentModal(true)}
            onUpdateStatus={leadData.updatePaymentStatus}
            onDelete={leadData.deletePayment}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsTab
            documents={leadData.documents}
            loading={leadData.loadingDocuments}
            onAddClick={() => setShowDocumentModal(true)}
            onUpdateStatus={leadData.updateDocumentStatus}
            onDelete={leadData.deleteDocument}
            onDownload={leadData.downloadDocument}
          />
        )}
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSubmit={(task) => leadData.addTask(task)}
        counselors={counselors}
      />

      <FollowUpModal
        isOpen={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        onSubmit={(followUp) => leadData.addFollowUp(followUp)}
        counselors={counselors}
      />

      <QueryModal
        isOpen={showQueryModal}
        onClose={() => setShowQueryModal(false)}
        onSubmit={(query) => leadData.addQuery(query)}
      />

      <ApplicationModal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        onSubmit={(programName) => leadData.addApplication(programName)}
      />

      <InterestModal
        isOpen={showInterestModal}
        onClose={() => setShowInterestModal(false)}
        onSubmit={(interest) => leadData.addInterest(interest)}
      />

      <CallLogModal
        isOpen={showCallLogModal}
        onClose={() => setShowCallLogModal(false)}
        onSubmit={(callLog) => leadData.addCallLog(callLog)}
        defaultPhone={currentLead.phone}
      />

      <WhatsAppModal
        isOpen={showWhatsappModal}
        onClose={() => setShowWhatsappModal(false)}
        onSubmit={handleSendWhatsApp}
        phone={currentLead.phone || ''}
      />

      <SmsModal
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        onSubmit={handleSendSms}
        phone={currentLead.phone || ''}
      />

      <EditLeadModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditLead}
        lead={currentLead}
      />

      <SmartCallPrep
        isOpen={showCallPrepModal}
        onClose={() => setShowCallPrepModal(false)}
        phoneNumber={currentLead.phone || ''}
        leadName={`${currentLead.firstName} ${currentLead.lastName}`}
        onProceedToCall={() => {
          setShowCallPrepModal(false);
          // Trigger the actual call
          window.location.href = `tel:${currentLead.phone}`;
        }}
      />

      <CloseAdmissionModal
        isOpen={showCloseAdmissionModal}
        onClose={() => setShowCloseAdmissionModal(false)}
        leadId={currentLead.id}
        leadName={`${currentLead.firstName} ${currentLead.lastName || ''}`}
        onSuccess={handleAdmissionSuccess}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={(payment) => leadData.addPayment(payment)}
      />

      <DocumentModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        onSubmit={(file, documentType, documentName) => leadData.addDocument(file, documentType, documentName)}
      />
    </div>
  );
}
