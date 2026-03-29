import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLeads } from '../hooks/useLeads';
import { useCallRecording } from '../hooks/useCallRecording';
import LeadCard from '../components/LeadCard';
import { Lead, LeadStatus, RootStackParamList } from '../types';
import DateRangeFilter, { DateRangeType } from '../components/DateRangeFilter';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface StatusFilter {
  label: string;
  value: LeadStatus | 'ALL';
  icon: string;
  color: string;
}

const STATUS_FILTERS: StatusFilter[] = [
  { label: 'All', value: 'ALL', icon: 'format-list-bulleted', color: '#6366F1' },
  { label: 'New', value: 'NEW', icon: 'new-box', color: '#3B82F6' },
  { label: 'Contacted', value: 'CONTACTED', icon: 'phone-check', color: '#F59E0B' },
  { label: 'Qualified', value: 'QUALIFIED', icon: 'star', color: '#8B5CF6' },
  { label: 'Negotiation', value: 'NEGOTIATION', icon: 'handshake', color: '#EC4899' },
  { label: 'Converted', value: 'CONVERTED', icon: 'check-circle', color: '#10B981' },
  { label: 'Lost', value: 'LOST', icon: 'close-circle', color: '#EF4444' },
];

// Helper function to get date range
const getDateRange = (rangeType: DateRangeType, customDates?: { startDate: Date | null; endDate: Date | null }) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (rangeType) {
    case 'today':
      return { startDate: today, endDate: now };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: yesterday, endDate: today };
    case 'thisWeek':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { startDate: weekStart, endDate: now };
    case 'thisMonth':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: monthStart, endDate: now };
    case 'custom':
      if (customDates?.startDate && customDates?.endDate) {
        return { startDate: customDates.startDate, endDate: customDates.endDate };
      }
      return null;
    default:
      return null;
  }
};

const LeadsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    leads,
    isLoading,
    hasMore,
    filters,
    loadLeads,
    search,
    filterByStatus,
  } = useLeads();
  const { initiateCall } = useCallRecording();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [customDates, setCustomDates] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  });
  const isLoadingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  useEffect(() => {
    // Only load once on mount
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      console.log('[LeadsScreen] Initial load triggered');
      loadLeads(true).then(() => {
        console.log('[LeadsScreen] Leads loaded, count:', leads.length);
      });
    }
  }, [loadLeads]);

  useEffect(() => {
    console.log('[LeadsScreen] Leads state updated, count:', leads.length, 'isLoading:', isLoading);
  }, [leads, isLoading]);

  // Filter leads by date range first
  const dateFilteredLeads = useMemo(() => {
    const dates = getDateRange(dateRange, customDates);
    if (!dates) return leads;
    return leads.filter(lead => {
      const leadDate = new Date(lead.createdAt || Date.now());
      return leadDate >= dates.startDate && leadDate <= dates.endDate;
    });
  }, [leads, dateRange, customDates]);

  // Get final filtered leads (date + status)
  const displayLeads = useMemo(() => {
    if (activeFilter === 'ALL') return dateFilteredLeads;
    return dateFilteredLeads.filter(l => l.status === activeFilter);
  }, [dateFilteredLeads, activeFilter]);

  // Calculate counts for each status (based on date-filtered leads)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: dateFilteredLeads.length };
    STATUS_FILTERS.forEach(filter => {
      if (filter.value !== 'ALL') {
        counts[filter.value] = dateFilteredLeads.filter(l => l.status === filter.value).length;
      }
    });
    return counts;
  }, [dateFilteredLeads]);

  const handleDateRangeChange = useCallback(
    (range: DateRangeType, dates?: { startDate: Date | null; endDate: Date | null }) => {
      setDateRange(range);
      if (dates) {
        setCustomDates(dates);
      }
    },
    []
  );

  const handleRefresh = useCallback(() => {
    isLoadingRef.current = false; // Reset on refresh
    loadLeads(true);
  }, [loadLeads]);

  const handleLoadMore = useCallback(() => {
    const now = Date.now();
    // Debounce: prevent calls within 1 second of each other
    if (now - lastLoadTimeRef.current < 1000) {
      return;
    }
    // Prevent multiple concurrent calls
    if (isLoadingRef.current || isLoading || !hasMore) {
      return;
    }
    // Prevent loading if we have no data yet (initial load in progress)
    if (displayLeads.length === 0) {
      return;
    }
    lastLoadTimeRef.current = now;
    isLoadingRef.current = true;
    loadLeads(false).finally(() => {
      // Reset after a delay to prevent rapid re-triggering
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 500);
    });
  }, [isLoading, hasMore, loadLeads, displayLeads.length]);

  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (text.length >= 2) {
        search(text);
      } else if (text.length === 0) {
        loadLeads(true);
      }
    },
    [search, loadLeads]
  );

  const handleFilterChange = useCallback(
    (status: LeadStatus | 'ALL') => {
      setActiveFilter(status);
      filterByStatus(status === 'ALL' ? undefined : status);
    },
    [filterByStatus]
  );

  const handleCall = useCallback(
    (lead: Lead) => {
      // Navigate to Smart Call Prep first for AI suggestions
      navigation.navigate('SmartCallPrep', { lead });
    },
    [navigation]
  );

  const handleLeadPress = useCallback(
    (lead: Lead) => {
      navigation.navigate('LeadDetail', { leadId: lead.id });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Lead }) => (
      <LeadCard
        lead={item}
        onCall={handleCall}
        onPress={handleLeadPress}
      />
    ),
    [handleCall, handleLeadPress]
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Icon name="account-search" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Leads Found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery
            ? 'Try a different search term'
            : 'No leads assigned to you yet'}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || !displayLeads.length) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Date Range Filter */}
      <DateRangeFilter
        selectedRange={dateRange}
        onRangeChange={handleDateRangeChange}
        customDates={customDates}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        >
          {STATUS_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.value;
            const count = statusCounts[filter.value] || 0;

            return (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterTab,
                  isActive && { backgroundColor: filter.color + '15', borderColor: filter.color },
                ]}
                onPress={() => handleFilterChange(filter.value)}
              >
                <Icon
                  name={filter.icon}
                  size={16}
                  color={isActive ? filter.color : '#6B7280'}
                />
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && { color: filter.color, fontWeight: '600' },
                  ]}
                >
                  {filter.label}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.filterBadge,
                      { backgroundColor: isActive ? filter.color : '#9CA3AF' },
                    ]}
                  >
                    <Text style={styles.filterBadgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Leads List */}
      <FlatList
        data={displayLeads}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !displayLeads.length}
            onRefresh={handleRefresh}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateLead')}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  filtersList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginRight: 8,
    gap: 6,
  },
  filterTabText: {
    fontSize: 13,
    color: '#6B7280',
  },
  filterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});

export default LeadsScreen;
