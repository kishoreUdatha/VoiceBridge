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
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../api';
import { followUpApi } from '../api/telecaller';
import { useAppSelector } from '../store';
import { MainTabParamList, RootStackParamList, isTeamLeadOrAbove } from '../types';

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

interface FollowUpSummary {
  overdue: number;
  today: number;
  upcoming: number;
  totalPending: number;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  todayCalls: number;
  status: 'active' | 'on_break' | 'offline';
}

interface TeamStats {
  totalMembers: number;
  activeNow: number;
  onBreak: number;
  todayTeamCalls: number;
  teamConversionRate: number;
  members: TeamMember[];
}

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAppSelector((state) => state.auth);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [followUpSummary, setFollowUpSummary] = useState<FollowUpSummary | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isTeamLead = isTeamLeadOrAbove(user?.role);

  const fetchData = useCallback(async () => {
    try {
      const promises: Promise<any>[] = [
        api.get('/telecaller/dashboard-stats'),
        followUpApi.getFollowUpStats().catch(() => null),
      ];

      // Fetch team stats if user is a team lead
      if (isTeamLead) {
        promises.push(api.get('/telecaller/team-stats').catch(() => null));
      }

      const results = await Promise.all(promises);
      const [statsRes, fuStats, teamStatsRes] = results;

      setStats(statsRes.data?.data || null);
      if (fuStats) {
        setFollowUpSummary({
          overdue: (fuStats as any).overdue || 0,
          today: (fuStats as any).today || 0,
          upcoming: (fuStats as any).upcoming || 0,
          totalPending:
            ((fuStats as any).overdue || 0) +
            ((fuStats as any).today || 0) +
            ((fuStats as any).upcoming || 0),
        });
      }

      // Set team stats for team leads
      if (isTeamLead && teamStatsRes?.data?.data) {
        setTeamStats(teamStatsRes.data.data);
      }
    } catch (err) {
      console.log('[Dashboard] Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, [isTeamLead]);

  const handleQuickAction = useCallback(
    (action: 'Import' | 'Assign' | 'Reports' | 'Team' | 'Campaigns' | 'Settings') => {
      switch (action) {
        case 'Assign':
          navigation.navigate('AssignedData' as any);
          return;
        case 'Reports':
          navigation.navigate('Performance' as any);
          return;
        case 'Settings':
          navigation.navigate('Settings' as any);
          return;
        case 'Import':
        case 'Team':
        case 'Campaigns':
        default:
          Alert.alert(
            `${action}`,
            `${action} is available on the web dashboard. Sign in at app.myleadx.ai to use this feature.`
          );
      }
    },
    [navigation]
  );

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

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
              {isTeamLead && (
                <View style={styles.roleBadge}>
                  <Icon name="account-supervisor" size={12} color="#7C3AED" />
                  <Text style={styles.roleText}>Team Lead</Text>
                </View>
              )}
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Icon name="refresh" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {loading && !stats ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : (
          <>
            {/* KPI Grid — mirrors the 6 cards on the web dashboard */}
            <View style={styles.kpiGrid}>
              <KpiCard
                label="Leads"
                value={stats?.leads?.total || 0}
                gradient={['#4F46E5', '#6366F1']}
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
                gradient={['#3B82F6', '#2563EB']}
                onPress={() => navigation.navigate('History' as any)}
              />
              <KpiCard
                label="Pending"
                value={stats?.assignedData?.rawRecords || 0}
                gradient={['#F97316', '#EA580C']}
                onPress={() => navigation.navigate('AssignedData' as any)}
              />
              <KpiCard
                label="Converted"
                value={stats?.leads?.converted || 0}
                gradient={['#10B981', '#059669']}
              />
              <KpiCard
                label="Conv. Rate"
                value={`${stats?.leads?.conversionRate || 0}%`}
                gradient={['#8B5CF6', '#7C3AED']}
              />
              <KpiCard
                label="Assigned"
                value={stats?.assignedData?.total || 0}
                gradient={['#0EA5E9', '#0284C7']}
                onPress={() => navigation.navigate('AssignedData' as any)}
              />
            </View>

            {/* Team Overview Section - Only for Team Leads */}
            {isTeamLead && teamStats && (
              <>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Team Overview</Text>
                  <View style={styles.teamBadge}>
                    <Icon name="account-group" size={14} color="#7C3AED" />
                    <Text style={styles.teamBadgeText}>{teamStats.totalMembers} members</Text>
                  </View>
                </View>
                <View style={styles.teamStatsStrip}>
                  <View style={[styles.teamStatCard, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
                    <Text style={[styles.teamStatValue, { color: '#166534' }]}>{teamStats.activeNow}</Text>
                    <Text style={[styles.teamStatLabel, { color: '#15803D' }]}>Active</Text>
                  </View>
                  <View style={[styles.teamStatCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                    <Text style={[styles.teamStatValue, { color: '#92400E' }]}>{teamStats.onBreak}</Text>
                    <Text style={[styles.teamStatLabel, { color: '#B45309' }]}>On Break</Text>
                  </View>
                  <View style={[styles.teamStatCard, { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' }]}>
                    <Text style={[styles.teamStatValue, { color: '#1E40AF' }]}>{teamStats.todayTeamCalls}</Text>
                    <Text style={[styles.teamStatLabel, { color: '#1D4ED8' }]}>Team Calls</Text>
                  </View>
                  <View style={[styles.teamStatCard, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}>
                    <Text style={[styles.teamStatValue, { color: '#5B21B6' }]}>{teamStats.teamConversionRate}%</Text>
                    <Text style={[styles.teamStatLabel, { color: '#6D28D9' }]}>Conv.</Text>
                  </View>
                </View>

                {/* Team Members List */}
                {teamStats.members && teamStats.members.length > 0 && (
                  <View style={styles.teamMembersList}>
                    {teamStats.members.slice(0, 5).map((member) => (
                      <View key={member.id} style={styles.teamMemberCard}>
                        <View style={styles.teamMemberAvatar}>
                          <Text style={styles.teamMemberInitial}>
                            {member.firstName?.charAt(0) || '?'}
                          </Text>
                          <View
                            style={[
                              styles.statusIndicator,
                              {
                                backgroundColor:
                                  member.status === 'active'
                                    ? '#22C55E'
                                    : member.status === 'on_break'
                                    ? '#F59E0B'
                                    : '#9CA3AF',
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.teamMemberInfo}>
                          <Text style={styles.teamMemberName}>
                            {member.firstName} {member.lastName}
                          </Text>
                          <Text style={styles.teamMemberStatus}>
                            {member.status === 'active'
                              ? 'Active now'
                              : member.status === 'on_break'
                              ? 'On break'
                              : 'Offline'}
                          </Text>
                        </View>
                        <View style={styles.teamMemberCalls}>
                          <Text style={styles.teamMemberCallCount}>{member.todayCalls}</Text>
                          <Text style={styles.teamMemberCallLabel}>calls</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Today's Highlights — 2x2 grid matching web */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Today's Highlights</Text>
              <Text style={styles.sectionDate}>{formatDate(new Date())}</Text>
            </View>
            <View style={styles.highlightsGrid}>
              <View style={[styles.highlightCard, { backgroundColor: '#EEF2FF' }]}>
                <Text style={[styles.highlightValue, { color: '#4F46E5' }]}>
                  {stats?.today?.followUpsCompleted || 0}
                </Text>
                <Text style={styles.highlightLabel}>New Leads</Text>
              </View>
              <View style={[styles.highlightCard, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.highlightValue, { color: '#B45309' }]}>
                  {stats?.today?.pendingFollowUps || 0}
                </Text>
                <Text style={styles.highlightLabel}>Follow-ups Due</Text>
              </View>
              <View style={[styles.highlightCard, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.highlightValue, { color: '#047857' }]}>
                  {`${stats?.leads?.conversionRate || 0}%`}
                </Text>
                <Text style={styles.highlightLabel}>Conversion Rate</Text>
              </View>
              <View style={[styles.highlightCard, { backgroundColor: '#EDE9FE' }]}>
                <Text style={[styles.highlightValue, { color: '#6D28D9' }]}>
                  {todayCalls}
                </Text>
                <Text style={styles.highlightLabel}>Assigned Today</Text>
              </View>
            </View>

            {/* Follow-ups Overview — 4 count cards in a row */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Follow-ups Overview</Text>
              <TouchableOpacity onPress={() => navigation.navigate('FollowUps' as any)}>
                <Text style={styles.sectionLink}>View All →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.followUpStrip}>
              <View style={[styles.followUpStripCard, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                <Text style={[styles.followUpStripLabel, { color: '#B91C1C' }]}>Overdue</Text>
                <Text style={[styles.followUpStripValue, { color: '#7F1D1D' }]}>
                  {followUpSummary?.overdue ?? 0}
                </Text>
              </View>
              <View style={[styles.followUpStripCard, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
                <Text style={[styles.followUpStripLabel, { color: '#B45309' }]}>Today</Text>
                <Text style={[styles.followUpStripValue, { color: '#78350F' }]}>
                  {followUpSummary?.today ?? 0}
                </Text>
              </View>
              <View style={[styles.followUpStripCard, { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' }]}>
                <Text style={[styles.followUpStripLabel, { color: '#1E40AF' }]}>Upcoming</Text>
                <Text style={[styles.followUpStripValue, { color: '#1E3A8A' }]}>
                  {followUpSummary?.upcoming ?? 0}
                </Text>
              </View>
              <View style={[styles.followUpStripCard, { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' }]}>
                <Text style={[styles.followUpStripLabel, { color: '#047857' }]}>Pending</Text>
                <Text style={[styles.followUpStripValue, { color: '#064E3B' }]}>
                  {followUpSummary?.totalPending ?? 0}
                </Text>
              </View>
            </View>

            {/* Quick Actions — 3x2 grid */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={styles.quickActionsGrid}>
              {(
                [
                  { key: 'Import', label: 'Import', icon: 'file-upload', gradient: ['#4F46E5', '#6366F1'] },
                  { key: 'Assign', label: 'Assign', icon: 'account-multiple', gradient: ['#8B5CF6', '#7C3AED'] },
                  { key: 'Reports', label: 'Reports', icon: 'chart-bar', gradient: ['#10B981', '#059669'] },
                  { key: 'Team', label: 'Team', icon: 'account-group', gradient: ['#0EA5E9', '#0284C7'] },
                  { key: 'Campaigns', label: 'Campaigns', icon: 'rocket-launch', gradient: ['#EC4899', '#BE185D'] },
                  { key: 'Settings', label: 'Settings', icon: 'cog', gradient: ['#4B5563', '#1F2937'] },
                ] as const
              ).map(action => (
                <Pressable
                  key={action.key}
                  style={styles.quickActionWrap}
                  onPress={() => handleQuickAction(action.key as any)}
                >
                  <LinearGradient
                    colors={action.gradient as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.quickActionCard}
                  >
                    <Icon name={action.icon} size={22} color="#FFFFFF" />
                    <Text style={styles.quickActionLabel}>{action.label}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
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
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  roleText: { fontSize: 10, color: '#7C3AED', fontWeight: '600' },
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

  /* Section header (for Today's Highlights / Follow-ups Overview / Quick Actions) */
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionDate: { fontSize: 12, color: '#6B7280' },
  sectionLink: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },

  /* Today's Highlights */
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 4,
  },
  highlightCard: {
    width: '50%',
    borderRadius: 12,
    padding: 14,
    minHeight: 76,
    justifyContent: 'center',
    marginHorizontal: 6,
    marginVertical: 6,
    flexGrow: 0,
    flexBasis: '46%',
    maxWidth: '46%',
  },
  highlightValue: { fontSize: 22, fontWeight: '700' },
  highlightLabel: { fontSize: 12, color: '#374151', marginTop: 2, fontWeight: '500' },

  /* Follow-ups Overview strip */
  followUpStrip: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  followUpStripCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  followUpStripLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  followUpStripValue: { fontSize: 20, fontWeight: '700' },

  /* Quick Actions */
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 10,
  },
  quickActionWrap: {
    width: '33.33%',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  quickActionCard: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  quickActionLabel: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', marginTop: 6 },

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

  /* Team Section Styles */
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
  },
  teamBadgeText: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },
  teamStatsStrip: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  teamStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  teamStatValue: { fontSize: 18, fontWeight: '700' },
  teamStatLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  teamMembersList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    overflow: 'hidden',
  },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  teamMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  teamMemberInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  teamMemberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  teamMemberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  teamMemberStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  teamMemberCalls: {
    alignItems: 'center',
  },
  teamMemberCallCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
  },
  teamMemberCallLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
});

export default DashboardScreen;
