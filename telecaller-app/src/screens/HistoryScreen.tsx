import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  NativeModules,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_URL } from '../config';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCalls } from '../store/slices/callsSlice';
import {
  formatDateTime,
  formatDuration,
  formatOutcome,
  getOutcomeColor,
  formatPhoneNumber,
} from '../utils/formatters';
import { Call, CallOutcome, RootStackParamList } from '../types';
import DateRangeFilter, { DateRangeType } from '../components/DateRangeFilter';
import ConversationTranscript from '../components/ConversationTranscript';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface OutcomeFilter {
  label: string;
  value: CallOutcome | 'ALL' | 'PENDING';
  icon: string;
  color: string;
}

const OUTCOME_FILTERS: OutcomeFilter[] = [
  { label: 'All', value: 'ALL', icon: 'format-list-bulleted', color: '#6366F1' },
  { label: 'Pending', value: 'PENDING', icon: 'clock-outline', color: '#F97316' },
  { label: 'Interested', value: 'INTERESTED', icon: 'thumb-up', color: '#10B981' },
  { label: 'Not Interested', value: 'NOT_INTERESTED', icon: 'thumb-down', color: '#EF4444' },
  { label: 'Callback', value: 'CALLBACK', icon: 'phone-return', color: '#F59E0B' },
  { label: 'Converted', value: 'CONVERTED', icon: 'check-circle', color: '#8B5CF6' },
  { label: 'No Answer', value: 'NO_ANSWER', icon: 'phone-missed', color: '#6B7280' },
];

// Helper function to get date range
const getDateRange = (rangeType: DateRangeType, customDates?: { startDate: Date | null; endDate: Date | null }) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (rangeType) {
    case 'today':
      return { startDate: today.toISOString(), endDate: now.toISOString() };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: yesterday.toISOString(), endDate: today.toISOString() };
    case 'thisWeek':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { startDate: weekStart.toISOString(), endDate: now.toISOString() };
    case 'thisMonth':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: monthStart.toISOString(), endDate: now.toISOString() };
    case 'custom':
      if (customDates?.startDate && customDates?.endDate) {
        return {
          startDate: customDates.startDate.toISOString(),
          endDate: customDates.endDate.toISOString(),
        };
      }
      return null;
    default:
      return null;
  }
};

// Audio playback component for expanded call items
const ExpandedCallContent: React.FC<{ item: Call }> = ({ item }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getRecordingUrl = () => {
    if (!item.recordingUrl) return null;
    // If already absolute URL (S3), use as-is
    if (item.recordingUrl.startsWith('http://') || item.recordingUrl.startsWith('https://')) {
      return item.recordingUrl;
    }
    const baseUrl = API_URL.replace(/\/api$/, '');
    return `${baseUrl}${item.recordingUrl}`;
  };

  const maxDuration = item.duration || 60; // Use call duration as max playback limit

  const stopPlayback = useCallback(() => {
    try { NativeModules.AudioPlayer?.stop(); } catch (e) {}
    setIsPlaying(false);
    setPlayTime(0);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const handlePlay = async () => {
    if (isPlaying) {
      try { await NativeModules.AudioPlayer?.pause(); } catch (e) {}
      setIsPlaying(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }

    // Resume if paused
    if (playTime > 0 && !isPlaying) {
      try {
        await NativeModules.AudioPlayer?.resume();
        setIsPlaying(true);
        timerRef.current = setInterval(() => {
          setPlayTime(t => {
            if (t + 1 >= maxDuration) {
              stopPlayback();
              return 0;
            }
            return t + 1;
          });
        }, 1000);
        return;
      } catch (e) {}
    }

    const url = getRecordingUrl();
    if (!url) return;

    setIsLoading(true);
    try {
      await NativeModules.AudioPlayer.play(url);
      setIsPlaying(true);
      setPlayTime(0);
      timerRef.current = setInterval(() => {
        setPlayTime(t => {
          if (t + 1 >= maxDuration) {
            stopPlayback();
            return 0;
          }
          return t + 1;
        });
      }, 1000);
    } catch (e) {
      console.error('[Audio] Play failed:', e);
    }
    setIsLoading(false);
  };

  // Listen for playback completion and cleanup on unmount
  useEffect(() => {
    const { DeviceEventEmitter } = require('react-native');
    const sub = DeviceEventEmitter.addListener('onPlaybackComplete', () => {
      setIsPlaying(false);
      setPlayTime(0);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    });
    return () => {
      sub.remove();
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      try { NativeModules.AudioPlayer?.stop(); } catch (e) {}
    };
  }, []);

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <View style={styles.expandedContent}>
      {/* Play Recording Button */}
      {item.recordingUrl && (
        <View style={{ marginBottom: 12 }}>
          {isLoading ? (
            <View style={styles.playRecordingButton}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.playRecordingText}>Loading...</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={[styles.playRecordingButton, isPlaying && { backgroundColor: '#059669' }]}
                onPress={handlePlay}
              >
                <Icon name={isPlaying ? 'pause' : 'play'} size={20} color="#FFFFFF" />
                <Text style={styles.playRecordingText}>
                  {isPlaying ? `Playing ${fmtTime(playTime)}` : 'Play Recording'}
                </Text>
              </TouchableOpacity>
              {isPlaying && (
                <TouchableOpacity
                  style={{ backgroundColor: '#FEE2E2', padding: 8, borderRadius: 20 }}
                  onPress={stopPlayback}
                >
                  <Icon name="stop" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {item.notes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}
      {item.transcript && (
        <View style={styles.transcriptSection}>
          <ConversationTranscript transcript={item.transcript} title="Transcript" />
          {(item as any).qualification?.englishTranscript ? (
            <View style={{ marginTop: 12 }}>
              <ConversationTranscript
                transcript={(item as any).qualification.englishTranscript}
                title="English Translation"
              />
            </View>
          ) : null}
        </View>
      )}

      {/* Call Details */}
      <View style={{ marginTop: 8, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#4B5563', marginBottom: 6 }}>Call Details</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {item.outcome && (
            <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: '#3B82F6' }}>Outcome: {item.outcome}</Text>
            </View>
          )}
          {item.duration !== undefined && item.duration > 0 && (
            <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: '#16A34A' }}>Duration: {fmtTime(item.duration)}</Text>
            </View>
          )}
          {item.recordingUrl && (
            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: '#D97706' }}>Recording saved</Text>
            </View>
          )}
          {item.sentimentScore !== undefined && (
            <View style={{ backgroundColor: '#F5F3FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: '#7C3AED' }}>Sentiment: {item.sentimentScore}%</Text>
            </View>
          )}
        </View>
        {!item.transcript && (
          <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' }}>
            AI analysis requires OpenAI API key to be configured
          </Text>
        )}
      </View>
    </View>
  );
};

const HistoryScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();
  const { calls, isLoading, pagination, outcomeCounts } = useAppSelector((state) => state.calls);

  const [activeFilter, setActiveFilter] = useState<CallOutcome | 'ALL' | 'PENDING'>('ALL');
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [customDates, setCustomDates] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  });

  const hasInitializedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const currentPageRef = useRef(1);

  const loadCalls = useCallback(
    async (refresh: boolean = false) => {
      const page = refresh ? 1 : currentPageRef.current + 1;
      if (refresh) {
        currentPageRef.current = 1;
      }

      let filters: { outcome?: string; startDate?: string; endDate?: string } | undefined = {};

      // Add outcome filter
      if (activeFilter === 'PENDING') {
        filters.outcome = 'PENDING';
      } else if (activeFilter !== 'ALL') {
        filters.outcome = activeFilter;
      }

      // Add date range filter
      const dates = getDateRange(dateRange, customDates);
      if (dates) {
        filters.startDate = dates.startDate;
        filters.endDate = dates.endDate;
      }

      await dispatch(
        fetchCalls({
          page,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          refresh,
        })
      );
      if (!refresh) {
        currentPageRef.current = page;
      }
    },
    [dispatch, activeFilter, dateRange, customDates]
  );

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      loadCalls(true);
    }
  }, [loadCalls]);

  const handleRefresh = useCallback(() => {
    isLoadingRef.current = false;
    loadCalls(true);
  }, [loadCalls]);

  const handleLoadMore = useCallback(() => {
    const now = Date.now();
    // Debounce: prevent calls within 1 second
    if (now - lastLoadTimeRef.current < 1000) {
      return;
    }
    if (isLoadingRef.current || isLoading || !pagination.hasMore) {
      return;
    }
    if (calls.length === 0) {
      return;
    }
    lastLoadTimeRef.current = now;
    isLoadingRef.current = true;
    loadCalls(false).finally(() => {
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 500);
    });
  }, [isLoading, pagination.hasMore, loadCalls, calls.length]);

  const handleFilterChange = useCallback(
    (outcome: CallOutcome | 'ALL' | 'PENDING') => {
      setActiveFilter(outcome);
      currentPageRef.current = 1;
      // loadCalls will be triggered by useEffect
    },
    []
  );

  const handleDateRangeChange = useCallback(
    (range: DateRangeType, dates?: { startDate: Date | null; endDate: Date | null }) => {
      setDateRange(range);
      if (dates) {
        setCustomDates(dates);
      }
      currentPageRef.current = 1;
      // loadCalls will be triggered by useEffect
    },
    []
  );

  // Reload when filters change
  useEffect(() => {
    if (hasInitializedRef.current) {
      loadCalls(true);
    }
  }, [activeFilter, dateRange, customDates]);

  const toggleExpand = useCallback((callId: string) => {
    setExpandedCallId((prev) => (prev === callId ? null : callId));
  }, []);

  const renderCallItem = useCallback(
    ({ item }: { item: Call }) => {
      const isExpanded = expandedCallId === item.id;
      const outcomeColor = item.outcome ? getOutcomeColor(item.outcome) : '#6B7280';

      return (
        <TouchableOpacity
          style={styles.callCard}
          onPress={() =>
            navigation.navigate('CallAnalysis', {
              callId: item.id,
              duration: item.duration || 0,
              recordingPath: item.recordingUrl,
            })
          }
          onLongPress={() => toggleExpand(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.callHeader}>
            <View style={styles.callInfo}>
              <Text style={styles.callName}>{item.leadName}</Text>
              <Text style={styles.callPhone}>{formatPhoneNumber(item.leadPhone)}</Text>
            </View>
            <View style={styles.callMeta}>
              <Text style={styles.callTime}>{formatDateTime(item.createdAt)}</Text>
              {item.outcome && (
                <View style={[styles.outcomeBadge, { backgroundColor: outcomeColor + '20' }]}>
                  <Text style={[styles.outcomeText, { color: outcomeColor }]}>
                    {formatOutcome(item.outcome)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.callStats}>
            <View style={styles.stat}>
              <Icon name="timer-outline" size={14} color="#6B7280" />
              <Text style={styles.statText}>
                {item.duration ? formatDuration(item.duration) : '--:--'}
              </Text>
            </View>
            {item.recordingUrl && (
              <View style={styles.stat}>
                <Icon name="microphone" size={14} color="#10B981" />
                <Text style={[styles.statText, { color: '#10B981' }]}>Recorded</Text>
              </View>
            )}
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#9CA3AF"
            />
          </View>

          {isExpanded && (
            <ExpandedCallContent item={item} />
          )}
        </TouchableOpacity>
      );
    },
    [expandedCallId, toggleExpand]
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Icon name="phone-off" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Call History</Text>
        <Text style={styles.emptySubtitle}>
          {activeFilter
            ? 'No calls match this filter'
            : 'Your call history will appear here'}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || !calls.length) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  };

  const getFilterCount = (value: CallOutcome | 'ALL' | 'PENDING'): number => {
    return outcomeCounts[value] || 0;
  };

  return (
    <View style={styles.container}>
      {/* Date Range Filter */}
      <DateRangeFilter
        selectedRange={dateRange}
        onRangeChange={handleDateRangeChange}
        customDates={customDates}
      />

      {/* Status Filter Tabs */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        >
          {OUTCOME_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.value;
            const count = getFilterCount(filter.value);

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

      {/* Call List */}
      <FlatList
        data={calls}
        renderItem={renderCallItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !calls.length}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    padding: 16,
    paddingBottom: 24,
  },
  callCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  callInfo: {
    flex: 1,
  },
  callName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  callPhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  callMeta: {
    alignItems: 'flex-end',
  },
  callTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  outcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  callStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  notesSection: {
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  transcriptSection: {
    marginBottom: 8,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  sentimentSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentimentLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginRight: 8,
  },
  sentimentScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  playRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  playRecordingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default HistoryScreen;
