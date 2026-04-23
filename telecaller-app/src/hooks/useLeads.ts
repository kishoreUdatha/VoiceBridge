import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchLeads,
  fetchCachedLeads,
  searchLeads,
  fetchLead,
  updateLeadStatus,
  setFilter,
  clearFilters,
  selectLead,
  clearError,
} from '../store/slices/leadsSlice';
import { Lead, LeadStatus } from '../types';

export const useLeads = () => {
  const dispatch = useAppDispatch();
  const { leads, selectedLead, isLoading, error, pagination, filters } = useAppSelector(
    (state) => state.leads
  );

  // Fetch leads (paginated)
  const loadLeads = useCallback(
    async (refresh: boolean = false, showTeam: boolean = false) => {
      // Use ref to get current page to avoid dependency on pagination.page
      const currentPage = refresh ? 1 : pagination.page + 1;
      await dispatch(fetchLeads({ page: currentPage, refresh, showTeam }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch]
  );

  // Load cached leads for offline mode
  const loadCachedLeads = useCallback(async () => {
    await dispatch(fetchCachedLeads());
  }, [dispatch]);

  // Search leads
  const search = useCallback(
    async (query: string) => {
      if (query.length >= 2) {
        await dispatch(searchLeads(query));
      } else {
        await dispatch(fetchLeads({ page: 1, refresh: true }));
      }
    },
    [dispatch]
  );

  // Get single lead details
  const getLead = useCallback(
    async (leadId: string) => {
      await dispatch(fetchLead(leadId));
    },
    [dispatch]
  );

  // Update lead status
  const changeStatus = useCallback(
    async (leadId: string, status: LeadStatus) => {
      await dispatch(updateLeadStatus({ leadId, status }));
    },
    [dispatch]
  );

  // Filter by status
  const filterByStatus = useCallback(
    (status: LeadStatus | undefined) => {
      dispatch(setFilter({ status }));
      dispatch(fetchLeads({ page: 1, refresh: true }));
    },
    [dispatch]
  );

  // Set search filter
  const setSearchFilter = useCallback(
    (searchTerm: string) => {
      dispatch(setFilter({ search: searchTerm }));
    },
    [dispatch]
  );

  // Clear all filters
  const resetFilters = useCallback(() => {
    dispatch(clearFilters());
    dispatch(fetchLeads({ page: 1, refresh: true }));
  }, [dispatch]);

  // Select a lead
  const setSelectedLead = useCallback(
    (lead: Lead | null) => {
      dispatch(selectLead(lead));
    },
    [dispatch]
  );

  // Clear error
  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Filtered leads by status
  const filteredLeads = useMemo(() => {
    if (!filters.status) return leads;
    return leads.filter((lead) => lead.status === filters.status);
  }, [leads, filters.status]);

  // Leads grouped by status
  const leadsByStatus = useMemo(() => {
    return leads.reduce(
      (acc, lead) => {
        if (!acc[lead.status]) {
          acc[lead.status] = [];
        }
        acc[lead.status].push(lead);
        return acc;
      },
      {} as Record<LeadStatus, Lead[]>
    );
  }, [leads]);

  // Count by status
  const statusCounts = useMemo(() => {
    return leads.reduce(
      (acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      },
      {} as Record<LeadStatus, number>
    );
  }, [leads]);

  return {
    leads,
    filteredLeads,
    leadsByStatus,
    statusCounts,
    selectedLead,
    isLoading,
    error,
    pagination,
    filters,
    hasMore: pagination.hasMore,
    loadLeads,
    loadCachedLeads,
    search,
    getLead,
    changeStatus,
    filterByStatus,
    setSearchFilter,
    resetFilters,
    setSelectedLead,
    clearError: handleClearError,
  };
};

export default useLeads;
