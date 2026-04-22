import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../api';
import { workSessionApi } from '../api/telecaller';
import { useAppSelector } from '../store';
import { MainTabParamList, RootStackParamList } from '../types';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24;
const H_PAD = 16;

interface PendingFollowUp {
  id: string;
  leadId: string;
  leadName: string;
  phone: string | null;
  scheduledAt: string | null;
  notes: string | null;
  type: 'scheduled' | 'needs_attention';
}

interface DashboardStats {
  today: {
    calls: number;
    followUpsCompleted: number;
    pendingFollowUps: number;
    target: { calls: number; followUps: number };
  };
  assignedData: {
    leads: number;
    rawRecords: number;
    totalRawRecords: number;
    queueItems: number;
    total: number;
  };
  leads: {
    total: number;
    byStage: Record<string, number>;
    converted: number;
    won: number;
    conversionRate: number;
    winRate: number;
  };
  outcomes: Record<string, number>;
  callTypes?: { OUTBOUND: number; INBOUND: number };
  pendingFollowUpsList?: PendingFollowUp[];
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const formatScheduled = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  gradient: [string, string];
  onPress?: () => void;
  badge?: string;
}> = ({ label, value, gradient, onPress, badge }) => (
  <Pressable onPress={onPress} style={styles.kpiWrap}>
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <View style={styles.kpiValueRow}>
        <Text style={styles.kpiValue}>{value}</Text>
        {badge && (
          <View style={styles.kpiBadge}>
            <Text style={styles.kpiBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  </Pressable>
);

const OutcomeCell: React.FC<{
  label: string;
  value: number;
  gradient: [string, string];
}> = ({ label, value, gradient }) => (
  <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.outcomeCell}>
    <View style={styles.outcomeDotRow}>
      <View style={styles.outcomeDot} />
      <Text style={styles.outcomeLabel}>{label}</Text>
    </View>
    <Text style={styles.outcomeValue}>{value}</Text>
  </LinearGradient>
);

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAppSelector((state) => state.auth);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [breakDuration, setBreakDuration] = useState(0);
  const [breakLoading, setBreakLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/telecaller/dashboard-stats');
      setStats(res.data?.data || null);
    } catch (err) {
      console.log('[Dashboard] Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessionStatus = useCallback(async () => {
    try {
      const session = await workSessionApi.getCurrentSession();
      if (session?.status === 'ON_BREAK') {
        setOnBreak(true);
        // Find active break (no endTime)
        const activeBreak = session.breaks?.find((b) => !b.endTime);
        if (activeBreak?.startTime) {
          setBreakStartTime(new Date(activeBreak.startTime));
        }
      } else {
        setOnBreak(false);
        setBreakStartTime(null);
        setBreakDuration(0);
      }
    } catch (err) {
      console.log('[Dashboard] Failed to fetch session status:', err);
    }
  }, []);

  const toggleBreak = useCallback(async () => {
    if (breakLoading) return;
    setBreakLoading(true);
    try {
      if (onBreak) {
        await workSessionApi.endBreak();
        setOnBreak(false);
        setBreakStartTime(null);
        setBreakDuration(0);
      } else {
        const breakRecord = await workSessionApi.startBreak('BREAK', 'Taking a break');
        setOnBreak(true);
        setBreakStartTime(new Date(breakRecord.startTime));
      }
    } catch (err: any) {
      console.log('[Dashboard] Failed to toggle break:', err);
    } finally {
      setBreakLoading(false);
    }
  }, [onBreak, breakLoading]);

  useEffect(() => {
    fetchData();
    fetchSessionStatus();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData, fetchSessionStatus]);

  // Update break duration every second when on break
  useEffect(() => {
    if (!onBreak || !breakStartTime) return;
    const updateDuration = () => {
      const elapsed = Math.floor((Date.now() - breakStartTime.getTime()) / 1000);
      setBreakDuration(elapsed);
    };
    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [onBreak, breakStartTime]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchSessionStatus()]);
    setRefreshing(false);
  }, [fetchData, fetchSessionStatus]);

  const formatBreakDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const firstName = user?.firstName
    ? user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1).toLowerCase()
    : '';

  const todayCalls = stats?.today?.calls || 0;
  const dailyTarget = stats?.today?.target?.calls || stats?.assignedData?.total || 0;
  const callsProgress = dailyTarget > 0 ? Math.min((todayCalls / dailyTarget) * 100, 100) : 0;

  const interested = stats?.outcomes?.INTERESTED || 0;
  const notInt = stats?.outcomes?.NOT_INTERESTED || 0;
  const noAns = stats?.outcomes?.NO_ANSWER || 0;
  const callbacks = stats?.outcomes?.CALLBACK || stats?.outcomes?.CALLBACK_REQUESTED || 0;

  const pendingList = stats?.pendingFollowUpsList || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} tintColor="#6366F1" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {getGreeting()}
              {firstName ? `, ${firstName}` : ''}
            </Text>
            <View style={styles.headerMeta}>
              <Text style={styles.headerDate}>{formatDate(new Date())}</Text>
              {onBreak ? (
                <View style={styles.breakBadge}>
                  <Icon name="coffee" size={12} color="#DC2626" />
                  <Text style={styles.breakText}>On Break {formatBreakDuration(breakDuration)}</Text>
                </View>
              ) : (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Live</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={toggleBreak}
              disabled={breakLoading}
              style={[styles.breakBtn, onBreak && styles.breakBtnActive]}
            >
              {breakLoading ? (
                <ActivityIndicator size="small" color={onBreak ? '#FFFFFF' : '#F59E0B'} />
              ) : (
                <>
                  <Icon
                    name={onBreak ? 'play' : 'coffee'}
                    size={16}
                    color={onBreak ? '#FFFFFF' : '#F59E0B'}
                  />
                  <Text style={[styles.breakBtnText, onBreak && styles.breakBtnTextActive]}>
                    {onBreak ? 'Resume' : 'Break'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
              <Icon name="refresh" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {loading && !stats ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : (
          <>
            {/* KPI Grid (2 cols) */}
            <View style={styles.kpiGrid}>
              <KpiCard
                label="Leads"
                value={stats?.leads?.total || 0}
                gradient={['#3B82F6', '#4F46E5']}
                onPress={() => navigation.navigate('Leads' as any)}
              />
              <KpiCard
                label="Calls Today"
                value={
                  <Text>
                    {todayCalls}
                    <Text style={styles.kpiValueSub}>/{dailyTarget}</Text>
                  </Text>
                }
                badge={`${Math.round(callsProgress)}%`}
                gradient={['#8B5CF6', '#7C3AED']}
                onPress={() => navigation.navigate('History' as any)}
              />
              <KpiCard
                label="Follow-ups"
                value={
                  <Text>
                    {stats?.today?.followUpsCompleted || 0}
                    <Text style={styles.kpiValueSub}> +{stats?.today?.pendingFollowUps || 0}</Text>
                  </Text>
                }
                gradient={['#F59E0B', '#F97316']}
                onPress={() => navigation.navigate('FollowUps' as any)}
              />
              <KpiCard
                label="Conversion"
                value={`${stats?.leads?.conversionRate || 0}%`}
                gradient={['#10B981', '#14B8A6']}
              />
              <KpiCard
                label="Win Rate"
                value={`${stats?.leads?.winRate || 0}%`}
                gradient={['#06B6D4', '#3B82F6']}
              />
              <KpiCard
                label="Won"
                value={stats?.leads?.won || 0}
                gradient={['#22C55E', '#059669']}
              />
            </View>

            {/* Today's Calls */}
            <LinearGradient
              colors={['#F5F3FF', '#FDF4FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.panel}
            >
              <View style={styles.panelHead}>
                <View style={styles.panelTitleRow}>
                  <LinearGradient
                    colors={['#8B5CF6', '#D946EF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.accentBar}
                  />
                  <Text style={styles.panelTitle}>Today's Calls</Text>
                </View>
                <View style={styles.pillViolet}>
                  <Text style={styles.pillVioletText}>Raw List + Leads</Text>
                </View>
              </View>

              {/* Donut-style total + 2x2 outcome grid */}
              <View style={styles.donutRow}>
                <View style={styles.donut}>
                  <View style={styles.donutInner}>
                    <Text style={styles.donutTotal}>{todayCalls}</Text>
                    <Text style={styles.donutLabel}>TOTAL CALLS</Text>
                  </View>
                </View>
                <View style={styles.outcomeGrid}>
                  <OutcomeCell label="INTERESTED" value={interested} gradient={['#34D399', '#10B981']} />
                  <OutcomeCell label="NOT INT." value={notInt} gradient={['#FB7185', '#EF4444']} />
                  <OutcomeCell label="NO ANSWER" value={noAns} gradient={['#FBBF24', '#F97316']} />
                  <OutcomeCell label="CALLBACKS" value={callbacks} gradient={['#60A5FA', '#6366F1']} />
                </View>
              </View>

              {/* Call Types */}
              <View style={styles.callTypesWrap}>
                <View style={styles.callTypesHead}>
                  <Icon name="phone" size={14} color="#64748B" />
                  <Text style={styles.callTypesTitle}>CALL TYPES</Text>
                </View>
                <View style={styles.callTypesRow}>
                  <View style={[styles.callTypeCard, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
                    <View style={styles.callTypeLeft}>
                      <View style={[styles.callTypeDot, { backgroundColor: '#0EA5E9' }]} />
                      <Text style={[styles.callTypeLabel, { color: '#0369A1' }]}>Outbound</Text>
                    </View>
                    <Text style={[styles.callTypeValue, { color: '#0284C7' }]}>
                      {stats?.callTypes?.OUTBOUND || 0}
                    </Text>
                  </View>
                  <View style={[styles.callTypeCard, { backgroundColor: '#CCFBF1', borderColor: '#99F6E4' }]}>
                    <View style={styles.callTypeLeft}>
                      <View style={[styles.callTypeDot, { backgroundColor: '#14B8A6' }]} />
                      <Text style={[styles.callTypeLabel, { color: '#0F766E' }]}>Inbound</Text>
                    </View>
                    <Text style={[styles.callTypeValue, { color: '#0D9488' }]}>
                      {stats?.callTypes?.INBOUND || 0}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Pending Follow-ups */}
            <LinearGradient
              colors={['#FEF3C7', '#FFEDD5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.panel}
            >
              <View style={styles.panelTitleRow}>
                <LinearGradient
                  colors={['#F59E0B', '#F97316']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.accentBar}
                />
                <Text style={[styles.panelTitle, { color: '#92400E' }]}>Pending Follow-ups</Text>
              </View>
              <View style={{ marginTop: 12 }}>
                {pendingList.length > 0 ? (
                  pendingList.map((f) => (
                    <Pressable
                      key={f.id}
                      onPress={() =>
                        navigation.navigate('LeadDetail' as any, { leadId: f.leadId } as any)
                      }
                      style={styles.followUpCard}
                    >
                      <View style={styles.followUpHead}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.followUpName}>{f.leadName}</Text>
                          {f.phone && <Text style={styles.followUpPhone}>{f.phone}</Text>}
                        </View>
                        <LinearGradient
                          colors={
                            f.type === 'scheduled' ? ['#34D399', '#10B981'] : ['#FB7185', '#EF4444']
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.followUpBadge}
                        >
                          <Text style={styles.followUpBadgeText}>
                            {f.type === 'scheduled' ? 'Scheduled' : 'Overdue'}
                          </Text>
                        </LinearGradient>
                      </View>
                      {f.scheduledAt && (
                        <Text style={styles.followUpTime}>{formatScheduled(f.scheduledAt)}</Text>
                      )}
                      {f.notes ? (
                        <Text style={styles.followUpNotes} numberOfLines={1}>
                          {f.notes}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No pending follow-ups</Text>
                )}
              </View>
            </LinearGradient>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingBottom: 100,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  headerDate: { fontSize: 12, color: '#6B7280' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveText: { fontSize: 10, color: '#059669', fontWeight: '600' },
  breakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FEF2F2',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  breakText: { fontSize: 10, color: '#DC2626', fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  breakBtnActive: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  breakBtnText: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  breakBtnTextActive: { color: '#FFFFFF' },
  refreshBtn: { padding: 6, borderRadius: 8 },

  loadingBox: { paddingVertical: 48, alignItems: 'center' },

  /* KPI grid */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  kpiWrap: {
    width: '50%',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  kpiCard: {
    borderRadius: 14,
    padding: 12,
    minHeight: 78,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  kpiLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  kpiValueRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  kpiValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  kpiValueSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '400' },
  kpiBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kpiBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  /* Panels */
  panel: {
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  panelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accentBar: { width: 4, height: 18, borderRadius: 2 },
  panelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5B21B6',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pillViolet: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillVioletText: { color: '#7C3AED', fontSize: 10, fontWeight: '600' },

  /* Donut */
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  donut: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 12,
    borderColor: '#C4B5FD',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopColor: '#34D399',
    borderRightColor: '#60A5FA',
  },
  donutInner: { alignItems: 'center', justifyContent: 'center' },
  donutTotal: { fontSize: 24, fontWeight: '800', color: '#6D28D9' },
  donutLabel: { fontSize: 9, color: '#7C3AED', fontWeight: '600', letterSpacing: 0.6 },

  outcomeGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  outcomeCell: {
    width: '50%',
    marginHorizontal: 4,
    marginVertical: 4,
    padding: 10,
    borderRadius: 12,
    flexBasis: '46%',
    flexGrow: 0,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  outcomeDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  outcomeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  outcomeLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  outcomeValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },

  /* Call types */
  callTypesWrap: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  callTypesHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  callTypesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  callTypesRow: { flexDirection: 'row', gap: 8 },
  callTypeCard: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  callTypeLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  callTypeDot: { width: 8, height: 8, borderRadius: 4 },
  callTypeLabel: { fontSize: 12, fontWeight: '600' },
  callTypeValue: { fontSize: 18, fontWeight: '800' },

  /* Follow-ups */
  followUpCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  followUpHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  followUpName: { fontSize: 14, fontWeight: '700', color: '#78350F' },
  followUpPhone: { fontSize: 12, color: '#B45309', fontWeight: '500', marginTop: 2 },
  followUpBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  followUpBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  followUpTime: { fontSize: 12, color: '#C2410C', fontWeight: '700', marginTop: 6 },
  followUpNotes: { fontSize: 12, color: '#B45309', marginTop: 4 },

  emptyText: { fontSize: 13, color: '#B45309', textAlign: 'center', paddingVertical: 16 },
});

export default DashboardScreen;
