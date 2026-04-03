import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { telecallerApi } from '../api/telecaller';
import { AssignedData, AssignedDataStats, RootStackParamList } from '../types';
import DateRangeFilter, { DateRangeType } from '../components/DateRangeFilter';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  ALL: { color: '#6366F1', icon: 'format-list-bulleted', label: 'All' },
  ASSIGNED: { color: '#3B82F6', icon: 'phone-outline', label: 'New' },
  INTERESTED: { color: '#10B981', icon: 'thumb-up', label: 'Interested' },
  NOT_INTERESTED: { color: '#EF4444', icon: 'thumb-down', label: 'Not Int.' },
  NO_ANSWER: { color: '#F59E0B', icon: 'phone-missed', label: 'No Answer' },
  CALLBACK_REQUESTED: { color: '#8B5CF6', icon: 'phone-return-outline', label: 'Callback' },
  CONVERTED: { color: '#059669', icon: 'check-circle', label: 'Converted' },
};

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

const AssignedDataScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [stats, setStats] = useState<AssignedDataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [customDates, setCustomDates] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  });

  const tabs = [
    { key: 'ALL', label: 'All', count: stats?.total || 0 },
    { key: 'ASSIGNED', label: 'New', count: stats?.assigned || 0 },
    { key: 'INTERESTED', label: 'Interested', count: stats?.interested || 0 },
    { key: 'CALLBACK_REQUESTED', label: 'Callback', count: stats?.callback || 0 },
    { key: 'NO_ANSWER', label: 'No Ans', count: stats?.noAnswer || 0 },
    { key: 'NOT_INTERESTED', label: 'Not Int', count: stats?.notInterested || 0 },
    { key: 'CONVERTED', label: 'Done', count: stats?.converted || 0 },
  ];

  // Store all records, filter locally for instant tab switching
  const [allRecords, setAllRecords] = useState<AssignedData[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // Fetch ALL records
      const data = await telecallerApi.getAssignedData();
      setAllRecords(data.records);
    } catch (error) {
      console.error('Failed to fetch:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await telecallerApi.getAssignedDataStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  // Filter records locally based on active tab and date range (instant, no refresh)
  const filteredRecords = useMemo(() => {
    const tabKey = tabs[activeTab]?.key;
    let filtered = allRecords;

    // Filter by status
    if (tabKey !== 'ALL') {
      filtered = filtered.filter(r => r.status === tabKey);
    }

    // Filter by date range
    const dates = getDateRange(dateRange, customDates);
    if (dates) {
      filtered = filtered.filter(r => {
        const recordDate = new Date(r.createdAt || r.updatedAt || Date.now());
        return recordDate >= dates.startDate && recordDate <= dates.endDate;
      });
    }

    return filtered;
  }, [allRecords, activeTab, dateRange, customDates]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchData(), fetchStats()]);
      setLoading(false);
    };
    load();
  }, []);

  // Refresh data when screen comes into focus (after returning from CallAssignedDataScreen)
  useFocusEffect(
    useCallback(() => {
      fetchData();
      fetchStats();
    }, [fetchData, fetchStats])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchStats()]);
    setRefreshing(false);
  };

  const handleDateRangeChange = useCallback(
    (range: DateRangeType, dates?: { startDate: Date | null; endDate: Date | null }) => {
      setDateRange(range);
      if (dates) {
        setCustomDates(dates);
      }
    },
    []
  );

  const handleCall = (record: AssignedData) => {
    // Navigate to CallAssignedDataScreen for proper call handling with recording
    // This ensures calls are tracked in history and recordings work on all Android devices
    navigation.navigate('CallAssignedData', { data: record });
  };

  const renderItem = ({ item }: { item: AssignedData }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.ASSIGNED;
    const name = `${item.firstName} ${item.lastName || ''}`.trim();

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => handleCall(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: config.color }]}>
            <Text style={styles.avatarText}>{(item.firstName || '?').charAt(0)}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
            <Text style={styles.cardPhone}>{item.phone}</Text>
            {item.callAttempts > 0 && (
              <Text style={styles.cardAttempts}>
                {item.callAttempts} attempt{item.callAttempts > 1 ? 's' : ''}
              </Text>
            )}
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
              <Icon name={config.icon} size={12} color={config.color} />
              <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(item)}>
              <Icon name="phone" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFF" barStyle="dark-content" />

      {/* Date Range Filter */}
      <DateRangeFilter
        selectedRange={dateRange}
        onRangeChange={handleDateRangeChange}
        customDates={customDates}
      />

      {/* Filter Tabs */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        >
          {tabs.map((tab, index) => {
            const isActive = activeTab === index;
            const config = STATUS_CONFIG[tab.key] || STATUS_CONFIG.ALL;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  isActive && { backgroundColor: config.color + '15', borderColor: config.color },
                ]}
                onPress={() => setActiveTab(index)}
              >
                <Icon
                  name={config.icon}
                  size={16}
                  color={isActive ? config.color : '#6B7280'}
                />
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && { color: config.color, fontWeight: '600' },
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    style={[
                      styles.filterBadge,
                      { backgroundColor: isActive ? config.color : '#9CA3AF' },
                    ]}
                  >
                    <Text style={styles.filterBadgeText}>{tab.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Icon name="phone-check" size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No contacts</Text>
            <Text style={styles.emptyText}>Pull down to refresh</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#1F2937',
    padding: 0,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    marginBottom: 8,
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
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardPhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  cardAttempts: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
});

export default AssignedDataScreen;
