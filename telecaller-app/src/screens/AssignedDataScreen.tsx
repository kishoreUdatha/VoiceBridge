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
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { telecallerApi } from '../api/telecaller';
import { AssignedData, AssignedDataStats, RootStackParamList } from '../types';
import DateRangeFilter, { DateRangeType } from '../components/DateRangeFilter';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { Avatar, Badge } from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  ALL: { color: colors.primary[500], icon: 'format-list-bulleted', label: 'All' },
  ASSIGNED: { color: colors.primary[500], icon: 'phone-outline', label: 'New' },
  INTERESTED: { color: colors.success[500], icon: 'thumb-up', label: 'Interested' },
  NOT_INTERESTED: { color: colors.error[500], icon: 'thumb-down', label: 'Not Int.' },
  NO_ANSWER: { color: colors.warning[500], icon: 'phone-missed', label: 'No Answer' },
  CALLBACK_REQUESTED: { color: '#8B5CF6', icon: 'phone-return-outline', label: 'Callback' },
  CONVERTED: { color: colors.success[700], icon: 'check-circle', label: 'Converted' },
};

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
    { key: 'INTERESTED', label: 'Hot', count: stats?.interested || 0 },
    { key: 'CALLBACK_REQUESTED', label: 'Callback', count: stats?.callback || 0 },
    { key: 'NO_ANSWER', label: 'Pending', count: stats?.noAnswer || 0 },
    { key: 'NOT_INTERESTED', label: 'Cold', count: stats?.notInterested || 0 },
    { key: 'CONVERTED', label: 'Won', count: stats?.converted || 0 },
  ];

  const [allRecords, setAllRecords] = useState<AssignedData[]>([]);

  const fetchData = useCallback(async () => {
    try {
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

  const filteredRecords = useMemo(() => {
    const tabKey = tabs[activeTab]?.key;
    let filtered = allRecords;

    if (tabKey !== 'ALL') {
      filtered = filtered.filter(r => r.status === tabKey);
    }

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
    navigation.navigate('CallAssignedData', { data: record });
  };

  const renderItem = ({ item }: { item: AssignedData }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.ASSIGNED;
    const name = `${item.firstName} ${item.lastName || ''}`.trim();

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleCall(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <Avatar name={name} size="md" />
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
            <View style={styles.phoneRow}>
              <Icon name="phone" size={14} color={colors.text.tertiary} />
              <Text style={styles.cardPhone}>{item.phone}</Text>
            </View>
            {item.callAttempts > 0 && (
              <Text style={styles.cardAttempts}>
                {item.callAttempts} attempt{item.callAttempts > 1 ? 's' : ''}
              </Text>
            )}
          </View>
          <View style={styles.cardRight}>
            <Badge
              label={config.label}
              icon={config.icon}
              color={config.color}
              size="sm"
            />
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => handleCall(item)}
            >
              <Icon name="phone" size={20} color={colors.neutral[0]} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading leads...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary[600]} barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[colors.primary[600], colors.primary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color={colors.neutral[0]} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Assigned Leads</Text>
            <Text style={styles.headerSubtitle}>{filteredRecords.length} contacts ready</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

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
                  isActive && {
                    backgroundColor: `${config.color}15`,
                    borderColor: config.color,
                  },
                ]}
                onPress={() => setActiveTab(index)}
                activeOpacity={0.7}
              >
                <Icon
                  name={config.icon}
                  size={16}
                  color={isActive ? config.color : colors.text.tertiary}
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
                      { backgroundColor: isActive ? config.color : colors.neutral[400] },
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Icon name="phone-check" size={40} color={colors.neutral[400]} />
            </View>
            <Text style={styles.emptyTitle}>No contacts found</Text>
            <Text style={styles.emptyText}>Pull down to refresh or change filters</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24,
    paddingBottom: spacing.base,
    paddingHorizontal: spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${colors.neutral[0]}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: `${colors.neutral[0]}80`,
    marginTop: 2,
  },
  filtersContainer: {
    backgroundColor: colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingVertical: spacing.sm,
  },
  filtersList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  filterTabText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.medium,
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
    fontSize: 10,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.neutral[0],
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: 4,
  },
  cardPhone: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  cardAttempts: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.success[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.colored(colors.success[500]),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  emptyTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
});

export default AssignedDataScreen;
