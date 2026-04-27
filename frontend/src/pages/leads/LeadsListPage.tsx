import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../../store';
import { fetchLeads, deleteLead } from '../../store/slices/leadSlice';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import leadTagsService, { LeadTag } from '../../services/lead-tags.service';
import { customFieldsService, CustomField } from '../../services/custom-fields.service';
import { PermissionGate } from '../../components/PermissionGate';

// Debounce delay in milliseconds
const SEARCH_DEBOUNCE_MS = 400;
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  PhoneIcon,
  UserGroupIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  BookmarkIcon,
  UserIcon,
  TagIcon,
  RectangleStackIcon,
  MegaphoneIcon,
  UsersIcon,
  AdjustmentsHorizontalIcon,
  GlobeAltIcon,
  CalendarDaysIcon,
  FlagIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon as CheckBadgeSolidIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/solid';

// Helper to get relative time string
const getRelativeTime = (date: string | Date) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Filter panel tab type
type FilterTab = 'saved' | 'leadDetails' | 'campaign' | 'users' | 'source' | 'status' | 'stages' | 'tags' | 'date' | 'priority' | 'customFields';

// Date filter preset type
type DatePreset = '' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';

// Advanced filter state interface
interface AdvancedFilters {
  contactName: string;
  contactNumber: string;
  email: string;
  companyName: string;
  campaign: string;
  assignedUser: string;
  status: string;
  stage: string;
  source: string;
  priority: string;
  selectedTags: string[];
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  customFieldFilters: Record<string, any>; // Custom field filters
}

interface LeadStage {
  id: string;
  name: string;
  slug: string;
  color: string;
}

// Default status colors (fallback when stage color not available)
const defaultStatusColors: Record<string, { bg: string; text: string; dot: string }> = {
  NEW: { bg: 'bg-primary-50', text: 'text-primary-700', dot: 'bg-primary-500' },
  CONTACTED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  QUALIFIED: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  PROPOSAL: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  NEGOTIATION: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  FOLLOW_UP: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  ENROLLED: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  INQUIRY: { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500' },
  INTERESTED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  VISIT_SCHEDULED: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  VISIT_COMPLETED: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  DOCUMENTS_PENDING: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  PROCESSING: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  PAYMENT_PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  ADMITTED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  WON: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  LOST: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  DROPPED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  UNASSIGNED: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' },
};

// Helper to get status style from stage color or fallback
const getStatusStyle = (stageName: string, stageColor?: string) => {
  const key = stageName.toUpperCase().replace(/\s+/g, '_');
  if (defaultStatusColors[key]) {
    return defaultStatusColors[key];
  }
  // Generate style from stage color if available
  if (stageColor) {
    return {
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      dot: 'bg-slate-500',
    };
  }
  return { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500' };
};

export default function LeadsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation(['leads', 'common', 'notifications']);
  const { leads, total, isLoading, page, limit } = useSelector(
    (state: RootState) => state.leads
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('pipelineStageId') || searchParams.get('status') || '');
  const [source, setSource] = useState(searchParams.get('source') || '');
  const [assignedToId] = useState(searchParams.get('assignedToId') || '');
  const [conversionFilter, setConversionFilter] = useState<'all' | 'active' | 'converted'>(
    searchParams.get('isConverted') === 'true' ? 'converted' :
    searchParams.get('isConverted') === 'false' ? 'active' : 'all'
  );
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [tags, setTags] = useState<LeadTag[]>([]);
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag') || '');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchParamsRef = useRef(searchParams);

  // Bulk selection state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    leadId: string | null;
    leadName: string;
    isBulk: boolean;
    count: number;
  }>({ isOpen: false, leadId: null, leadName: '', isBulk: false, count: 0 });
  const [isDeleting, setIsDeleting] = useState(false);

  // Advanced Filter Panel State
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('leadDetails');
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    contactName: '',
    contactNumber: '',
    email: '',
    companyName: '',
    campaign: '',
    assignedUser: '',
    status: '',
    stage: '',
    source: '',
    priority: '',
    selectedTags: [],
    datePreset: '',
    dateFrom: '',
    dateTo: '',
    customFieldFilters: {},
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Lock body scroll when filter panel is open
  useEffect(() => {
    if (showFilterPanel) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showFilterPanel]);

  // Keep ref updated with latest searchParams
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  // Debounced search - auto-filter as user types
  const debouncedSearch = useCallback((searchValue: string) => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      // Use ref to get latest searchParams (avoids stale closure)
      const params = new URLSearchParams(searchParamsRef.current.toString());
      if (searchValue.trim()) {
        params.set('search', searchValue.trim());
      } else {
        params.delete('search');
      }
      params.set('page', '1'); // Reset to page 1 on new search
      setSearchParams(params);
    }, SEARCH_DEBOUNCE_MS);
  }, [setSearchParams]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Fetch dynamic stages, tags, and users from API
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        let stagesData: LeadStage[] = [];

        // Fetch pipelines directly (same as Pipeline Settings page)
        try {
          const pipelinesRes = await api.get('/pipelines');
          const pipelines = pipelinesRes.data?.data || pipelinesRes.data || [];

          // Find default pipeline or use first LEAD pipeline
          const leadPipelines = pipelines.filter((p: any) => p.entityType === 'LEAD');
          const defaultPipeline = leadPipelines.find((p: any) => p.isDefault) || leadPipelines[0];

          if (defaultPipeline && defaultPipeline.stages?.length > 0) {
            // Sort stages by order and map to expected format
            const sortedStages = [...defaultPipeline.stages].sort((a: any, b: any) => a.order - b.order);
            stagesData = sortedStages.map((stage: any) => ({
              id: stage.id,
              name: stage.name,
              slug: stage.slug || stage.name.toLowerCase().replace(/\s+/g, '-'),
              color: stage.color,
            }));
          }
        } catch (pipelineError) {
          console.warn('Pipeline fetch failed:', pipelineError);
        }

        // Fallback to old lead-stages API only if no pipeline stages found
        if (stagesData.length === 0) {
          try {
            const oldStagesRes = await api.get('/lead-stages');
            stagesData = oldStagesRes.data?.data?.stages || [];
          } catch (oldStagesError) {
            console.warn('Old stages API also failed:', oldStagesError);
          }
        }

        // Fetch tags
        const tagsData = await leadTagsService.getTags(true);

        // Fetch users for filter
        try {
          const usersRes = await api.get('/users');
          const usersData = usersRes.data?.data || usersRes.data || [];
          setUsers(usersData.map((u: any) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName })));
        } catch (usersError) {
          console.warn('Users fetch failed:', usersError);
        }

        // Fetch custom fields for filtering
        try {
          const customFieldsData = await customFieldsService.getAll(false);
          setCustomFields(customFieldsData);
        } catch (customFieldsError) {
          console.warn('Custom fields fetch failed:', customFieldsError);
        }

        setStages(stagesData);
        setTags(tagsData.tags || []);
      } catch (error) {
        console.error('Failed to fetch filter data:', error);
      }
    };
    fetchFilterData();
  }, []);

  // Dynamic status options from API stages - use stage ID for reliable filtering
  const statusOptions = [
    { value: '', label: t('leads:filters.allStatuses') },
    ...stages.map((stage) => ({
      value: stage.id, // Use ID for filtering
      label: stage.name,
    })),
  ];

  const sourceOptions = [
    { value: '', label: t('leads:filters.allSources') },
    { value: 'MANUAL', label: t('leads:source.MANUAL') },
    { value: 'BULK_UPLOAD', label: t('leads:source.BULK_UPLOAD') },
    { value: 'FORM', label: t('leads:source.FORM') },
    { value: 'LANDING_PAGE', label: t('leads:source.LANDING_PAGE') },
    { value: 'CHATBOT', label: t('leads:source.CHATBOT') },
    { value: 'AD_FACEBOOK', label: t('leads:source.AD_FACEBOOK') },
    { value: 'AD_INSTAGRAM', label: t('leads:source.AD_INSTAGRAM') },
    { value: 'AD_LINKEDIN', label: t('leads:source.AD_LINKEDIN') },
  ];

  useEffect(() => {
    const params: Record<string, string> = {};

    // Get search from URL
    const searchParam = searchParams.get('search');
    if (searchParam) params.search = searchParam;

    // Support both pipelineStageId (new) and status (legacy)
    const pipelineStageIdParam = searchParams.get('pipelineStageId');
    const statusParam = searchParams.get('status');
    if (pipelineStageIdParam) {
      params.pipelineStageId = pipelineStageIdParam;
    } else if (statusParam) {
      params.status = statusParam; // Legacy support
    }

    // Source filter
    const sourceParam = searchParams.get('source');
    if (sourceParam) params.source = sourceParam;

    // Assigned to filter
    const assignedToIdParam = searchParams.get('assignedToId');
    if (assignedToIdParam) params.assignedToId = assignedToIdParam;

    // Add tag filter from URL
    const tagParam = searchParams.get('tag');
    if (tagParam) params.tag = tagParam;

    // Add conversion filter
    const isConvertedParam = searchParams.get('isConverted');
    if (isConvertedParam !== null) {
      params.isConverted = isConvertedParam;
    }

    // Add date filters from URL
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');
    if (dateFromParam) params.dateFrom = dateFromParam;
    if (dateToParam) params.dateTo = dateToParam;

    // Add priority filter from URL
    const priorityParam = searchParams.get('priority');
    if (priorityParam) params.priority = priorityParam;

    // Add custom fields filter from URL
    const customFieldsParam = searchParams.get('customFields');
    if (customFieldsParam) params.customFields = customFieldsParam;

    // Add pending follow-up filter from URL
    const pendingFollowUpParam = searchParams.get('pendingFollowUp');
    if (pendingFollowUpParam === 'true') params.pendingFollowUp = 'true';

    // Add stage filter from URL (for pipeline stage links)
    const stageParam = searchParams.get('stage');
    if (stageParam) params.status = stageParam;

    // Add converted filter from URL
    const convertedParam = searchParams.get('converted');
    if (convertedParam === 'true') params.isConverted = 'true';

    dispatch(
      fetchLeads({
        ...params,
        page: parseInt(searchParams.get('page') || '1'),
        limit: 20,
      })
    );
  }, [dispatch, searchParams]);

  // Open filter panel
  const handleOpenFilterPanel = () => {
    // Sync current filters to advanced filters
    const dateFromParam = searchParams.get('dateFrom') || '';
    const dateToParam = searchParams.get('dateTo') || '';
    // Detect preset from URL params
    let detectedPreset: DatePreset = '';
    if (dateFromParam || dateToParam) {
      detectedPreset = 'custom';
    }

    // Parse custom field filters from URL
    let customFieldFiltersFromUrl: Record<string, any> = {};
    const customFieldsParam = searchParams.get('customFields');
    if (customFieldsParam) {
      try {
        customFieldFiltersFromUrl = JSON.parse(customFieldsParam);
      } catch (e) {
        console.warn('Failed to parse customFields from URL:', e);
      }
    }

    setAdvancedFilters({
      contactName: search,
      contactNumber: '',
      email: '',
      companyName: '',
      campaign: '',
      assignedUser: assignedToId,
      status: conversionFilter === 'converted' ? 'converted' : conversionFilter === 'active' ? 'active' : '',
      stage: status,
      source: source,
      priority: searchParams.get('priority') || '',
      selectedTags: tagFilter ? [tagFilter] : [],
      datePreset: detectedPreset,
      dateFrom: dateFromParam,
      dateTo: dateToParam,
      customFieldFilters: customFieldFiltersFromUrl,
    });
    setShowFilterPanel(true);
  };

  // Helper function to calculate date range from preset
  const getDateRangeFromPreset = (preset: DatePreset): { dateFrom: string; dateTo: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (preset) {
      case 'today':
        return { dateFrom: formatDate(today), dateTo: formatDate(today) };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { dateFrom: formatDate(yesterday), dateTo: formatDate(yesterday) };
      }
      case 'last7days': {
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 6);
        return { dateFrom: formatDate(last7), dateTo: formatDate(today) };
      }
      case 'last30days': {
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 29);
        return { dateFrom: formatDate(last30), dateTo: formatDate(today) };
      }
      case 'thisMonth': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return { dateFrom: formatDate(firstDay), dateTo: formatDate(today) };
      }
      case 'lastMonth': {
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return { dateFrom: formatDate(firstDayLastMonth), dateTo: formatDate(lastDayLastMonth) };
      }
      default:
        return { dateFrom: '', dateTo: '' };
    }
  };

  // Apply advanced filters
  const handleApplyFilters = () => {
    const params = new URLSearchParams();

    // Build search query from multiple fields
    const searchParts: string[] = [];
    if (advancedFilters.contactName) searchParts.push(advancedFilters.contactName);
    if (advancedFilters.contactNumber) params.set('phone', advancedFilters.contactNumber);
    if (advancedFilters.email) params.set('email', advancedFilters.email);

    if (searchParts.length > 0) params.set('search', searchParts.join(' '));
    if (advancedFilters.stage) params.set('pipelineStageId', advancedFilters.stage);
    if (advancedFilters.source) params.set('source', advancedFilters.source);
    if (advancedFilters.priority) params.set('priority', advancedFilters.priority);
    if (advancedFilters.selectedTags.length > 0) params.set('tag', advancedFilters.selectedTags[0]);
    if (advancedFilters.assignedUser) params.set('assignedToId', advancedFilters.assignedUser);
    if (advancedFilters.status === 'converted') params.set('isConverted', 'true');
    if (advancedFilters.status === 'active') params.set('isConverted', 'false');

    // Calculate date range from preset or use custom dates
    let dateFrom = '';
    let dateTo = '';
    if (advancedFilters.datePreset && advancedFilters.datePreset !== 'custom') {
      const dateRange = getDateRangeFromPreset(advancedFilters.datePreset);
      dateFrom = dateRange.dateFrom;
      dateTo = dateRange.dateTo;
    } else if (advancedFilters.datePreset === 'custom') {
      dateFrom = advancedFilters.dateFrom;
      dateTo = advancedFilters.dateTo;
    }

    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    // Add custom field filters
    const activeCustomFilters = Object.entries(advancedFilters.customFieldFilters || {})
      .filter(([_, value]) => value !== undefined && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    if (Object.keys(activeCustomFilters).length > 0) {
      params.set('customFields', JSON.stringify(activeCustomFilters));
    }

    params.set('page', '1');

    setSearchParams(params);

    // Update local state
    setSearch(advancedFilters.contactName);
    setStatus(advancedFilters.stage);
    setSource(advancedFilters.source);
    setTagFilter(advancedFilters.selectedTags[0] || '');
    setConversionFilter(advancedFilters.status === 'converted' ? 'converted' : advancedFilters.status === 'active' ? 'active' : 'all');

    // Close panel
    setShowFilterPanel(false);

    // Force re-fetch
    dispatch(
      fetchLeads({
        search: advancedFilters.contactName || undefined,
        pipelineStageId: advancedFilters.stage || undefined,
        source: advancedFilters.source || undefined,
        priority: advancedFilters.priority || undefined,
        tag: advancedFilters.selectedTags[0] || undefined,
        assignedToId: advancedFilters.assignedUser || undefined,
        isConverted: advancedFilters.status === 'converted' ? 'true' : advancedFilters.status === 'active' ? 'false' : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        customFields: Object.keys(activeCustomFilters).length > 0 ? JSON.stringify(activeCustomFilters) : undefined,
        page: 1,
        limit: 20,
      })
    );
  };

  // Reset all filters
  const handleResetFilters = () => {
    setAdvancedFilters({
      contactName: '',
      contactNumber: '',
      email: '',
      companyName: '',
      campaign: '',
      assignedUser: '',
      status: '',
      stage: '',
      source: '',
      priority: '',
      selectedTags: [],
      datePreset: '',
      dateFrom: '',
      dateTo: '',
      customFieldFilters: {},
    });
  };

  // Toggle tag selection
  const toggleTagSelection = (tagId: string) => {
    setAdvancedFilters(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter(id => id !== tagId)
        : [...prev.selectedTags, tagId],
    }));
  };

  const handleConversionFilterChange = (filter: 'all' | 'active' | 'converted') => {
    setConversionFilter(filter);
    const params = new URLSearchParams(searchParams.toString());
    if (filter === 'converted') {
      params.set('isConverted', 'true');
    } else if (filter === 'active') {
      params.set('isConverted', 'false');
    } else {
      params.delete('isConverted');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  // Open delete confirmation modal for single lead
  const openDeleteModal = (id: string, firstName: string, lastName?: string) => {
    setDeleteModal({
      isOpen: true,
      leadId: id,
      leadName: `${firstName} ${lastName || ''}`.trim(),
      isBulk: false,
      count: 1,
    });
  };

  // Open delete confirmation modal for bulk delete
  const openBulkDeleteModal = () => {
    if (selectedLeads.size === 0) return;
    setDeleteModal({
      isOpen: true,
      leadId: null,
      leadName: '',
      isBulk: true,
      count: selectedLeads.size,
    });
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, leadId: null, leadName: '', isBulk: false, count: 0 });
  };

  // Confirm delete action
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteModal.isBulk) {
        // Bulk delete
        for (const id of selectedLeads) {
          await dispatch(deleteLead(id)).unwrap();
        }
        showToast.success(`${selectedLeads.size} lead(s) deleted`);
        setSelectedLeads(new Set());
      } else if (deleteModal.leadId) {
        // Single delete
        await dispatch(deleteLead(deleteModal.leadId)).unwrap();
        showToast.success('Lead deleted');
      }
      closeDeleteModal();
    } catch (error) {
      showToast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  // Count active filters from URL params
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    const filterParams = ['pipelineStageId', 'status', 'source', 'priority', 'tag', 'assignedToId', 'dateFrom', 'dateTo', 'isConverted', 'search'];
    filterParams.forEach(param => {
      if (searchParams.get(param)) count++;
    });
    // Count dateFrom and dateTo as one filter if both present
    if (searchParams.get('dateFrom') && searchParams.get('dateTo')) {
      count--; // Reduce by 1 since we counted both
    }
    // Count custom field filters
    const customFieldsParam = searchParams.get('customFields');
    if (customFieldsParam) {
      try {
        const customFilters = JSON.parse(customFieldsParam);
        count += Object.keys(customFilters).length;
      } catch {
        // Invalid JSON, count as 1
        count++;
      }
    }
    return count;
  }, [searchParams]);

  const activeFilterCount = getActiveFilterCount();

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)));
    }
  };

  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };


  // Clear selection when leads change
  useEffect(() => {
    setSelectedLeads(new Set());
  }, [page]);

  // Clear all filters
  const handleClearAllFilters = () => {
    // Reset local state
    setSearch('');
    setStatus('');
    setSource('');
    setTagFilter('');
    setConversionFilter('all');

    // Reset advanced filters including custom fields
    setAdvancedFilters({
      contactName: '',
      contactNumber: '',
      email: '',
      companyName: '',
      campaign: '',
      assignedUser: '',
      status: '',
      stage: '',
      source: '',
      priority: '',
      selectedTags: [],
      datePreset: '',
      dateFrom: '',
      dateTo: '',
      customFieldFilters: {},
    });

    // Clear URL params (keep only page)
    const params = new URLSearchParams();
    params.set('page', '1');
    setSearchParams(params);

    // Re-fetch with no filters
    dispatch(fetchLeads({ page: 1, limit: 20 }));
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar - Shows when leads are selected */}
      {selectedLeads.size > 0 && (
        <div className="bg-purple-600 rounded-xl shadow-sm px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-medium">
              {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedLeads(new Set())}
              className="text-purple-200 hover:text-white text-xs underline"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGate module="leads" action="delete">
              <button
                onClick={openBulkDeleteModal}
                className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1.5"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Delete Selected
              </button>
            </PermissionGate>
          </div>
        </div>
      )}

      {/* Single Row Header: Title, Tabs, Search, Filters, Add Button */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Title with Count */}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 whitespace-nowrap">{t('leads:title')}</h1>
            {total > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full">
                {total.toLocaleString()}
              </span>
            )}
          </div>

          {/* Conversion Tabs */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => handleConversionFilterChange('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                conversionFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleConversionFilterChange('active')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                conversionFilter === 'active'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => handleConversionFilterChange('converted')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                conversionFilter === 'converted'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckBadgeSolidIcon className="h-3 w-3" />
              Converted
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

          {/* Search - Auto-filters with debounce */}
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                setSearch(value);
                debouncedSearch(value);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Filter Button - Opens advanced filter panel */}
          <button onClick={handleOpenFilterPanel} className="relative px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5">
            <FunnelIcon className="h-3.5 w-3.5" />
            Filter
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-purple-600 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Clear Filters Button - Shows when filters are active */}
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearAllFilters}
              className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              Clear {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Create Single Lead Button - requires leads_create permission */}
          <PermissionGate module="leads" action="create">
            <Link to="/leads/new" className="px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5 whitespace-nowrap">
              <PlusIcon className="h-4 w-4" />
              Create Lead
            </Link>
          </PermissionGate>

          {/* Bulk Upload Button - requires leads_import permission */}
          <PermissionGate permission="leads_import">
            <Link to="/leads/bulk-upload" className="px-3 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap">
              Bulk Upload
            </Link>
          </PermissionGate>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-2 py-2 text-center w-8">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selectedLeads.size === leads.length}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                </th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-8">#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('leads:table.lead')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('leads:table.contact')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">Priority</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('leads:table.status')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Last Activity</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('leads:table.assignedTo')}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">{t('leads:table.created')}</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">{t('leads:table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <span className="spinner spinner-lg"></span>
                      <p className="text-slate-500">{t('leads:loading')}</p>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="empty-state">
                      <UserGroupIcon className="empty-state-icon" />
                      <p className="empty-state-title">{t('leads:empty.title')}</p>
                      <p className="empty-state-text">
                        {t('leads:empty.description')}
                      </p>
                      <Link to="/leads/bulk-upload" className="btn btn-primary mt-4">
                        <PlusIcon className="h-4 w-4" />
                        {t('leads:addLeads')}
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead, index) => {
                  // Prefer pipelineStage (unified system) over old stage
                  const stageName = lead.pipelineStage?.name || lead.stage?.name || 'NEW';
                  const stageColor = lead.pipelineStage?.color || lead.stage?.color;
                  const statusStyle = getStatusStyle(stageName, stageColor);
                  const serialNumber = (page - 1) * limit + index + 1;

                  return (
                    <tr key={lead.id} className={`group border-b border-slate-100 last:border-0 transition-colors ${
                      selectedLeads.has(lead.id)
                        ? 'bg-purple-50'
                        : lead.isConverted
                        ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                        : 'hover:bg-slate-50'
                    }`}>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead.id)}
                          onChange={() => handleSelectLead(lead.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-xs font-medium text-slate-500">{serialNumber}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={`relative w-7 h-7 rounded-full flex items-center justify-center text-white font-medium text-[10px] ${
                            lead.isConverted
                              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                              : 'bg-gradient-to-br from-primary-500 to-primary-600'
                          }`}>
                            {lead.firstName?.[0]}{lead.lastName?.[0]}
                            {lead.isConverted && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <CheckBadgeSolidIcon className="w-2.5 h-2.5 text-emerald-500" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium text-slate-900">
                                {lead.firstName} {lead.lastName}
                              </p>
                              {lead.isConverted && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                                  <CheckBadgeSolidIcon className="w-2.5 h-2.5" />
                                  Converted
                                </span>
                              )}
                            </div>
                            {lead.convertedAt && (
                              <p className="text-[10px] text-emerald-600">
                                {new Date(lead.convertedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(lead.phone || '');
                                  showToast.success('Phone copied!');
                                }}
                                className="text-xs text-slate-900 hover:text-primary-600 hover:underline cursor-pointer"
                                title="Click to copy"
                              >
                                {lead.phone}
                              </button>
                              {/* Quick Action Buttons */}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {lead.phone && (
                                  <>
                                    <a
                                      href={`https://wa.me/${(lead.phone || '').replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors"
                                      title="WhatsApp"
                                    >
                                      <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                                    </a>
                                    <a
                                      href={`tel:${lead.phone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                                      title="Call"
                                    >
                                      <PhoneIcon className="w-3.5 h-3.5" />
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                            {lead.email && (
                              <p
                                className="text-[10px] text-slate-500 truncate max-w-[150px] cursor-help"
                                title={lead.email}
                              >
                                {lead.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {lead.priority === 'HIGH' || lead.priority === 'hot' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            Hot
                          </span>
                        ) : lead.priority === 'MEDIUM' || lead.priority === 'warm' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Warm
                          </span>
                        ) : lead.priority === 'LOW' || lead.priority === 'cold' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Cold
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${statusStyle.dot}`}></span>
                          {stageName}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {lead.lastContactedAt ? (
                          <div className="flex items-center gap-1.5">
                            <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span
                              className="text-[10px] text-slate-600 cursor-help"
                              title={new Date(lead.lastContactedAt).toLocaleString()}
                            >
                              {getRelativeTime(lead.lastContactedAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No activity</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {lead.assignments?.[0]?.assignedTo ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-600">
                              {lead.assignments[0].assignedTo.firstName?.[0]}
                              {lead.assignments[0].assignedTo.lastName?.[0]}
                            </div>
                            <span className="text-xs text-slate-700">
                              {lead.assignments[0].assignedTo.firstName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-500 font-medium">Unassigned</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="text-xs text-slate-500 cursor-help"
                          title={new Date(lead.createdAt).toLocaleString()}
                        >
                          {getRelativeTime(lead.createdAt)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative flex justify-center">
                          <div className="group/dropdown">
                            <button
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                              title="Actions"
                            >
                              <EllipsisVerticalIcon className="h-5 w-5" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all">
                              <Link
                                to={`/leads/${lead.id}`}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <EyeIcon className="h-4 w-4 text-slate-400" />
                                View Details
                              </Link>
                              <PermissionGate module="leads" action="delete">
                                <button
                                  onClick={() => openDeleteModal(lead.id, lead.firstName, lead.lastName)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                  Delete
                                </button>
                              </PermissionGate>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-3 py-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/50">
            <div className="text-xs text-slate-500">
              Showing <span className="font-medium">{(page - 1) * limit + 1}</span>-<span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', String(page - 1));
                  setSearchParams(params);
                }}
                disabled={page === 1}
                className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeftIcon className="h-3 w-3" />
                Prev
              </button>
              <div className="flex items-center">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('page', String(pageNum));
                        setSearchParams(params);
                      }}
                      className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', String(page + 1));
                  setSearchParams(params);
                }}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRightIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Filter Panel - Slide Over */}
      {showFilterPanel && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 transition-opacity"
            onClick={() => setShowFilterPanel(false)}
          />

          {/* Panel */}
          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-lg h-full">
              <div className="flex h-full flex-col bg-white shadow-xl overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">Search & Filter</h2>
                    <button
                      onClick={() => setShowFilterPanel(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Left Sidebar - Tabs */}
                  <div className="w-40 border-r border-slate-200 bg-slate-50 py-3 overflow-y-auto">
                    <nav className="space-y-0.5 px-2">
                      {[
                        { id: 'saved' as FilterTab, label: 'Saved Filters', icon: BookmarkIcon },
                        { id: 'leadDetails' as FilterTab, label: 'Lead Details', icon: UserIcon },
                        { id: 'customFields' as FilterTab, label: 'Custom Fields', icon: DocumentTextIcon },
                        { id: 'date' as FilterTab, label: 'Date', icon: CalendarDaysIcon },
                        { id: 'campaign' as FilterTab, label: 'Campaign', icon: MegaphoneIcon },
                        { id: 'users' as FilterTab, label: 'Users', icon: UsersIcon },
                        { id: 'source' as FilterTab, label: 'Source', icon: GlobeAltIcon },
                        { id: 'priority' as FilterTab, label: 'Priority', icon: FlagIcon },
                        { id: 'status' as FilterTab, label: 'Status', icon: AdjustmentsHorizontalIcon },
                        { id: 'stages' as FilterTab, label: 'Stages', icon: RectangleStackIcon },
                        { id: 'tags' as FilterTab, label: 'Tags', icon: TagIcon },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setFilterTab(tab.id)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            filterTab === tab.id
                              ? 'bg-white text-purple-700 shadow-sm border-l-2 border-purple-600'
                              : 'text-slate-600 hover:bg-white hover:text-slate-900'
                          }`}
                        >
                          <tab.icon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Right Content */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {/* Lead Details Tab */}
                    {filterTab === 'leadDetails' && (
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-xs font-semibold text-slate-900 mb-2">Basic Details</h3>
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Contact Name"
                              value={advancedFilters.contactName}
                              onChange={(e) => setAdvancedFilters(prev => ({ ...prev, contactName: e.target.value }))}
                              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                            <input
                              type="text"
                              placeholder="Contact Number"
                              value={advancedFilters.contactNumber}
                              onChange={(e) => setAdvancedFilters(prev => ({ ...prev, contactNumber: e.target.value }))}
                              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                            <input
                              type="email"
                              placeholder="Email"
                              value={advancedFilters.email}
                              onChange={(e) => setAdvancedFilters(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold text-slate-900 mb-2">Custom Contact Property</h3>
                          <input
                            type="text"
                            placeholder="Company Name"
                            value={advancedFilters.companyName}
                            onChange={(e) => setAdvancedFilters(prev => ({ ...prev, companyName: e.target.value }))}
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Saved Filters Tab */}
                    {filterTab === 'saved' && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-slate-900 mb-2">Saved Filters</h3>
                        <p className="text-xs text-slate-500">No saved filters yet. Apply filters and save them for quick access.</p>
                      </div>
                    )}

                    {/* Campaign Tab */}
                    {filterTab === 'campaign' && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-900 mb-2">Campaign</h3>
                        <select
                          value={advancedFilters.campaign}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, campaign: e.target.value }))}
                          className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="">All Campaigns</option>
                        </select>
                      </div>
                    )}

                    {/* Users Tab */}
                    {filterTab === 'users' && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-900 mb-2">Assigned User</h3>
                        <select
                          value={advancedFilters.assignedUser}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, assignedUser: e.target.value }))}
                          className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="">All Users</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Source Tab */}
                    {filterTab === 'source' && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-900 mb-2">Lead Source</h3>
                        <div className="space-y-1">
                          {[
                            { value: '', label: 'All Sources' },
                            { value: 'MANUAL', label: 'Manual Entry' },
                            { value: 'BULK_UPLOAD', label: 'Bulk Upload' },
                            { value: 'FORM', label: 'Web Form' },
                            { value: 'LANDING_PAGE', label: 'Landing Page' },
                            { value: 'CHATBOT', label: 'Chatbot' },
                            { value: 'WEBSITE', label: 'Website' },
                            { value: 'REFERRAL', label: 'Referral' },
                            { value: 'AD_FACEBOOK', label: 'Facebook Ads' },
                            { value: 'AD_INSTAGRAM', label: 'Instagram Ads' },
                            { value: 'AD_LINKEDIN', label: 'LinkedIn Ads' },
                            { value: 'AD_GOOGLE', label: 'Google Ads' },
                          ].map((option) => (
                            <label key={option.value} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                              <input
                                type="radio"
                                name="source"
                                value={option.value}
                                checked={advancedFilters.source === option.value}
                                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, source: e.target.value }))}
                                className="w-3 h-3 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-xs text-slate-700">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Priority Tab */}
                    {filterTab === 'priority' && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-900 mb-2">Lead Priority</h3>
                        <div className="space-y-1">
                          {[
                            { value: '', label: 'All Priorities', color: '' },
                            { value: 'HIGH', label: 'High', color: 'bg-red-500' },
                            { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-500' },
                            { value: 'LOW', label: 'Low', color: 'bg-green-500' },
                          ].map((option) => (
                            <label key={option.value || 'all'} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                              <input
                                type="radio"
                                name="priority"
                                value={option.value}
                                checked={advancedFilters.priority === option.value}
                                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, priority: e.target.value }))}
                                className="w-3 h-3 text-purple-600 focus:ring-purple-500"
                              />
                              {option.color && (
                                <span className={`w-2 h-2 rounded-full ${option.color}`}></span>
                              )}
                              <span className="text-xs text-slate-700">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status Tab */}
                    {filterTab === 'status' && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-900 mb-2">Lead Status</h3>
                        <div className="space-y-1">
                          {[
                            { value: '', label: 'All Statuses' },
                            { value: 'active', label: 'Active Leads' },
                            { value: 'converted', label: 'Converted Leads' },
                          ].map((option) => (
                            <label key={option.value} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                              <input
                                type="radio"
                                name="status"
                                value={option.value}
                                checked={advancedFilters.status === option.value}
                                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="w-3 h-3 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-xs text-slate-700">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stages Tab */}
                    {filterTab === 'stages' && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-900 mb-2">Pipeline Stages</h3>
                        <div className="space-y-1">
                          <label className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                            <input
                              type="radio"
                              name="stage"
                              value=""
                              checked={advancedFilters.stage === ''}
                              onChange={(e) => setAdvancedFilters(prev => ({ ...prev, stage: e.target.value }))}
                              className="w-3 h-3 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-xs text-slate-700">All Stages</span>
                          </label>
                          {stages.map((stage) => (
                            <label key={stage.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                              <input
                                type="radio"
                                name="stage"
                                value={stage.id}
                                checked={advancedFilters.stage === stage.id}
                                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, stage: e.target.value }))}
                                className="w-3 h-3 text-purple-600 focus:ring-purple-500"
                              />
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: stage.color || '#6366f1' }}
                              />
                              <span className="text-xs text-slate-700 truncate">{stage.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags Tab */}
                    {filterTab === 'tags' && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-900 mb-2">Tags</h3>
                        <div className="space-y-1">
                          {tags.length === 0 ? (
                            <p className="text-xs text-slate-500">No tags available.</p>
                          ) : (
                            tags.map((tag) => (
                              <label key={tag.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                                <input
                                  type="checkbox"
                                  checked={advancedFilters.selectedTags.includes(tag.id)}
                                  onChange={() => toggleTagSelection(tag.id)}
                                  className="w-3 h-3 text-purple-600 focus:ring-purple-500 rounded"
                                />
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                                  style={{ backgroundColor: tag.color }}
                                >
                                  {tag.name}
                                </span>
                                <span className="text-[10px] text-slate-500">({tag._count?.leadAssignments || 0})</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Custom Fields Tab */}
                    {filterTab === 'customFields' && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Custom Fields</h3>
                        {customFields.length === 0 ? (
                          <p className="text-sm text-slate-500">No custom fields defined. Go to Settings &gt; Custom Contact Property to create fields.</p>
                        ) : (
                          <div className="space-y-3">
                            {customFields.map((field) => (
                              <div key={field.id}>
                                <label className="block text-xs font-medium text-slate-600 mb-1">{field.name}</label>
                                {field.fieldType === 'SELECT' || field.fieldType === 'RADIO' ? (
                                  <select
                                    value={advancedFilters.customFieldFilters?.[field.slug] || ''}
                                    onChange={(e) => setAdvancedFilters(prev => ({
                                      ...prev,
                                      customFieldFilters: {
                                        ...(prev.customFieldFilters || {}),
                                        [field.slug]: e.target.value || undefined,
                                      },
                                    }))}
                                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                  >
                                    <option value="">All</option>
                                    {field.options?.map((opt) => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                ) : field.fieldType === 'CHECKBOX' ? (
                                  <select
                                    value={advancedFilters.customFieldFilters?.[field.slug] ?? ''}
                                    onChange={(e) => setAdvancedFilters(prev => ({
                                      ...prev,
                                      customFieldFilters: {
                                        ...(prev.customFieldFilters || {}),
                                        [field.slug]: e.target.value === '' ? undefined : e.target.value === 'true',
                                      },
                                    }))}
                                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                  >
                                    <option value="">All</option>
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                  </select>
                                ) : field.fieldType === 'NUMBER' ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      placeholder="Min"
                                      value={advancedFilters.customFieldFilters?.[`${field.slug}_min`] || ''}
                                      onChange={(e) => setAdvancedFilters(prev => ({
                                        ...prev,
                                        customFieldFilters: {
                                          ...(prev.customFieldFilters || {}),
                                          [`${field.slug}_min`]: e.target.value ? Number(e.target.value) : undefined,
                                        },
                                      }))}
                                      className="w-1/2 px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Max"
                                      value={advancedFilters.customFieldFilters?.[`${field.slug}_max`] || ''}
                                      onChange={(e) => setAdvancedFilters(prev => ({
                                        ...prev,
                                        customFieldFilters: {
                                          ...(prev.customFieldFilters || {}),
                                          [`${field.slug}_max`]: e.target.value ? Number(e.target.value) : undefined,
                                        },
                                      }))}
                                      className="w-1/2 px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                  </div>
                                ) : field.fieldType === 'DATE' || field.fieldType === 'DATETIME' ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="date"
                                      value={advancedFilters.customFieldFilters?.[`${field.slug}_from`] || ''}
                                      onChange={(e) => setAdvancedFilters(prev => ({
                                        ...prev,
                                        customFieldFilters: {
                                          ...(prev.customFieldFilters || {}),
                                          [`${field.slug}_from`]: e.target.value || undefined,
                                        },
                                      }))}
                                      className="w-1/2 px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                    <input
                                      type="date"
                                      value={advancedFilters.customFieldFilters?.[`${field.slug}_to`] || ''}
                                      onChange={(e) => setAdvancedFilters(prev => ({
                                        ...prev,
                                        customFieldFilters: {
                                          ...(prev.customFieldFilters || {}),
                                          [`${field.slug}_to`]: e.target.value || undefined,
                                        },
                                      }))}
                                      className="w-1/2 px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder={`Search ${field.name}...`}
                                    value={advancedFilters.customFieldFilters?.[field.slug] || ''}
                                    onChange={(e) => setAdvancedFilters(prev => ({
                                      ...prev,
                                      customFieldFilters: {
                                        ...(prev.customFieldFilters || {}),
                                        [field.slug]: e.target.value || undefined,
                                      },
                                    }))}
                                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Date Tab */}
                    {filterTab === 'date' && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-slate-900 mb-2">Filter by Date</h3>
                        <div className="space-y-1">
                          {[
                            { value: '' as DatePreset, label: 'All Time' },
                            { value: 'today' as DatePreset, label: 'Today' },
                            { value: 'yesterday' as DatePreset, label: 'Yesterday' },
                            { value: 'last7days' as DatePreset, label: 'Last 7 Days' },
                            { value: 'last30days' as DatePreset, label: 'Last 30 Days' },
                            { value: 'thisMonth' as DatePreset, label: 'This Month' },
                            { value: 'lastMonth' as DatePreset, label: 'Last Month' },
                            { value: 'custom' as DatePreset, label: 'Custom Range' },
                          ].map((option) => (
                            <label key={option.value || 'all'} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
                              <input
                                type="radio"
                                name="datePreset"
                                value={option.value}
                                checked={advancedFilters.datePreset === option.value}
                                onChange={(e) => setAdvancedFilters(prev => ({
                                  ...prev,
                                  datePreset: e.target.value as DatePreset,
                                  dateFrom: e.target.value === 'custom' ? prev.dateFrom : '',
                                  dateTo: e.target.value === 'custom' ? prev.dateTo : '',
                                }))}
                                className="w-3 h-3 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-xs text-slate-700">{option.label}</span>
                            </label>
                          ))}
                        </div>

                        {/* Custom Date Range Inputs */}
                        {advancedFilters.datePreset === 'custom' && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-md space-y-2">
                            <h4 className="text-xs font-medium text-slate-700">Custom Date Range</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-medium text-slate-600 mb-1">From</label>
                                <input
                                  type="date"
                                  value={advancedFilters.dateFrom}
                                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-slate-600 mb-1">To</label>
                                <input
                                  type="date"
                                  value={advancedFilters.dateTo}
                                  onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer - Always visible at bottom */}
                <div className="shrink-0 px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                  <button
                    onClick={handleResetFilters}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Reset
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFilterPanel(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyFilters}
                      className="px-4 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={closeDeleteModal}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
              {/* Icon */}
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>

              {/* Content */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {deleteModal.isBulk ? 'Delete Selected Leads' : 'Delete Lead'}
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  {deleteModal.isBulk ? (
                    <>
                      Are you sure you want to delete <span className="font-semibold text-red-600">{deleteModal.count} lead(s)</span>?
                      This action cannot be undone.
                    </>
                  ) : (
                    <>
                      Are you sure you want to delete <span className="font-semibold text-red-600">{deleteModal.leadName}</span>?
                      This action cannot be undone.
                    </>
                  )}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={closeDeleteModal}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <TrashIcon className="h-4 w-4" />
                        Delete {deleteModal.isBulk ? `${deleteModal.count} Lead(s)` : 'Lead'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
