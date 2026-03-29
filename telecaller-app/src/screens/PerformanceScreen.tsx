import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { telecallerApi, PerformanceStats, PerformancePeriod } from '../api/telecaller';

const { width } = Dimensions.get('window');

const PERIODS: { key: PerformancePeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7days', label: '7 Days' },
  { key: 'last30days', label: '30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

const PerformanceScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PerformancePeriod>('today');

  // Custom date range
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());

  const fetchPerformance = useCallback(async () => {
    try {
      let data: PerformanceStats;
      if (selectedPeriod === 'custom') {
        data = await telecallerApi.getPerformance(
          'custom',
          customStartDate.toISOString().split('T')[0],
          customEndDate.toISOString().split('T')[0]
        );
      } else {
        data = await telecallerApi.getPerformance(selectedPeriod);
      }
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch performance:', error);
    }
  }, [selectedPeriod, customStartDate, customEndDate]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchPerformance();
      setLoading(false);
    };
    load();
  }, [selectedPeriod]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPerformance();
    setRefreshing(false);
  };

  const handlePeriodChange = (period: PerformancePeriod) => {
    setSelectedPeriod(period);
    if (period === 'custom') {
      setShowStartPicker(true);
    }
  };

  const handleCustomDateSearch = () => {
    fetchPerformance();
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getMaxCalls = () => {
    if (!stats?.dailyBreakdown.length) return 10;
    return Math.max(...stats.dailyBreakdown.map(d => d.calls), 10);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading performance...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Period Selector */}
      <View style={styles.periodContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {PERIODS.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[styles.periodTab, selectedPeriod === period.key && styles.periodTabActive]}
              onPress={() => handlePeriodChange(period.key)}
            >
              <Text style={[styles.periodText, selectedPeriod === period.key && styles.periodTextActive]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Custom Date Range */}
      {selectedPeriod === 'custom' && (
        <View style={styles.customDateContainer}>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
            <Icon name="calendar" size={18} color="#6366F1" />
            <Text style={styles.dateButtonText}>{customStartDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <Text style={styles.dateSeparator}>to</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
            <Icon name="calendar" size={18} color="#6366F1" />
            <Text style={styles.dateButtonText}>{customEndDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchButton} onPress={handleCustomDateSearch}>
            <Icon name="magnify" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={customStartDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) {
              setCustomStartDate(date);
              setShowEndPicker(true);
            }
          }}
          maximumDate={new Date()}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={customEndDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) setCustomEndDate(date);
          }}
          minimumDate={customStartDate}
          maximumDate={new Date()}
        />
      )}

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#EEF2FF' }]}>
          <Icon name="phone-outgoing" size={24} color="#6366F1" />
          <Text style={styles.summaryValue}>{stats?.calls.total || 0}</Text>
          <Text style={styles.summaryLabel}>Total Calls</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5' }]}>
          <Icon name="account-check" size={24} color="#10B981" />
          <Text style={styles.summaryValue}>{stats?.contacts.interested || 0}</Text>
          <Text style={styles.summaryLabel}>Interested</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]}>
          <Icon name="swap-horizontal" size={24} color="#F59E0B" />
          <Text style={styles.summaryValue}>{stats?.contacts.converted || 0}</Text>
          <Text style={styles.summaryLabel}>Converted</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' }]}>
          <Icon name="phone-missed" size={24} color="#EF4444" />
          <Text style={styles.summaryValue}>{stats?.calls.noAnswer || 0}</Text>
          <Text style={styles.summaryLabel}>No Answer</Text>
        </View>
      </View>

      {/* Call Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Call Statistics</Text>
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Answer Rate</Text>
            <View style={styles.statValueRow}>
              <View style={[styles.progressBar, { width: `${stats?.calls.answerRate || 0}%`, backgroundColor: '#10B981' }]} />
              <Text style={styles.statValue}>{stats?.calls.answerRate || 0}%</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Avg Duration</Text>
            <Text style={styles.statValue}>{formatDuration(stats?.calls.avgDuration || 0)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Talk Time</Text>
            <Text style={styles.statValue}>{formatDuration(stats?.calls.totalDuration || 0)}</Text>
          </View>
        </View>
      </View>

      {/* Conversion Rates */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conversion Metrics</Text>
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Interest Rate</Text>
            <View style={styles.statValueRow}>
              <View style={[styles.progressBar, { width: `${stats?.contacts.interestRate || 0}%`, backgroundColor: '#6366F1' }]} />
              <Text style={styles.statValue}>{stats?.contacts.interestRate || 0}%</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Conversion Rate</Text>
            <View style={styles.statValueRow}>
              <View style={[styles.progressBar, { width: `${stats?.contacts.conversionRate || 0}%`, backgroundColor: '#F59E0B' }]} />
              <Text style={styles.statValue}>{stats?.contacts.conversionRate || 0}%</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Contacts Reached</Text>
            <Text style={styles.statValue}>{stats?.contacts.contacted || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Callbacks Pending</Text>
            <Text style={styles.statValue}>{stats?.contacts.callback || 0}</Text>
          </View>
        </View>
      </View>

      {/* Lead Performance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lead Performance</Text>
        <View style={styles.leadStatsRow}>
          <View style={styles.leadStatCard}>
            <Icon name="account-plus" size={28} color="#6366F1" />
            <Text style={styles.leadStatValue}>{stats?.leads.created || 0}</Text>
            <Text style={styles.leadStatLabel}>Created</Text>
          </View>
          <View style={styles.leadStatCard}>
            <Icon name="trophy" size={28} color="#10B981" />
            <Text style={styles.leadStatValue}>{stats?.leads.won || 0}</Text>
            <Text style={styles.leadStatLabel}>Won</Text>
          </View>
          <View style={styles.leadStatCard}>
            <Icon name="close-circle" size={28} color="#EF4444" />
            <Text style={styles.leadStatValue}>{stats?.leads.lost || 0}</Text>
            <Text style={styles.leadStatLabel}>Lost</Text>
          </View>
          <View style={styles.leadStatCard}>
            <Icon name="check-all" size={28} color="#8B5CF6" />
            <Text style={styles.leadStatValue}>{stats?.leads.followUpsCompleted || 0}</Text>
            <Text style={styles.leadStatLabel}>Follow-ups</Text>
          </View>
        </View>
      </View>

      {/* Daily Chart */}
      {stats?.dailyBreakdown && stats.dailyBreakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Activity</Text>
          <View style={styles.chartCard}>
            <View style={styles.chartContainer}>
              {stats.dailyBreakdown.slice(-7).map((day, index) => (
                <View key={day.date} style={styles.barContainer}>
                  <Text style={styles.barValue}>{day.calls}</Text>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        { height: `${(day.calls / getMaxCalls()) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{day.dayName}</Text>
                </View>
              ))}
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
                <Text style={styles.legendText}>Calls</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Outcome Breakdown */}
      {stats?.calls.outcomes && Object.keys(stats.calls.outcomes).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Call Outcomes</Text>
          <View style={styles.statsCard}>
            {Object.entries(stats.calls.outcomes).map(([outcome, count]) => (
              <View key={outcome} style={styles.outcomeRow}>
                <View style={styles.outcomeLabel}>
                  <Icon
                    name={getOutcomeIcon(outcome)}
                    size={18}
                    color={getOutcomeColor(outcome)}
                  />
                  <Text style={styles.outcomeName}>{formatOutcome(outcome)}</Text>
                </View>
                <Text style={styles.outcomeCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

// Helper functions
const getOutcomeIcon = (outcome: string): string => {
  const icons: Record<string, string> = {
    INTERESTED: 'thumb-up',
    NOT_INTERESTED: 'thumb-down',
    NO_ANSWER: 'phone-missed',
    CALLBACK_REQUESTED: 'phone-clock',
    CONVERTED: 'check-circle',
    BUSY: 'phone-off',
  };
  return icons[outcome] || 'phone';
};

const getOutcomeColor = (outcome: string): string => {
  const colors: Record<string, string> = {
    INTERESTED: '#10B981',
    NOT_INTERESTED: '#EF4444',
    NO_ANSWER: '#F59E0B',
    CALLBACK_REQUESTED: '#8B5CF6',
    CONVERTED: '#059669',
    BUSY: '#6B7280',
  };
  return colors[outcome] || '#6B7280';
};

const formatOutcome = (outcome: string): string => {
  return outcome
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  periodContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  periodTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  periodTabActive: {
    backgroundColor: '#6366F1',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  periodTextActive: {
    color: '#FFF',
  },
  customDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  dateSeparator: {
    marginHorizontal: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: '#6366F1',
    padding: 10,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    flex: 1,
    maxWidth: 120,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  leadStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  leadStatCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  leadStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 6,
  },
  leadStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
  },
  barWrapper: {
    height: 80,
    width: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  outcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  outcomeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  outcomeName: {
    fontSize: 14,
    color: '#374151',
  },
  outcomeCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
});

export default PerformanceScreen;
