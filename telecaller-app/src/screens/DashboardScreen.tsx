import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchStats } from '../store/slices/callsSlice';
import { getGreeting } from '../utils/formatters';
import { MainTabParamList, RootStackParamList } from '../types';
import SyncStatus from '../components/SyncStatus';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { stats } = useAppSelector((state) => state.calls);
  const hasInitializedRef = useRef(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadStats = useCallback(() => {
    dispatch(fetchStats());
  }, [dispatch]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      loadStats();
    }
  }, [loadStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchStats());
    setRefreshing(false);
  }, [dispatch]);

  // Debug: log user object to see what we're getting
  useEffect(() => {
    if (user) {
      console.log('[Dashboard] User object:', JSON.stringify(user));
    }
  }, [user]);

  // Get user's first name from backend data
  const firstName = user?.firstName || 'User';
  const todayCalls = stats?.todayCalls ?? 0;
  const assignedLeads = stats?.assignedLeads ?? 0;
  const pendingFollowUps = stats?.pendingFollowUps ?? 0;
  const qualifiedLeads = stats?.qualifiedLeads ?? 0;
  const conversionRate = stats?.conversionRate ?? 0;
  const totalCalls = stats?.totalCalls ?? 0;
  const totalLeads = stats?.totalLeads ?? 0;

  const MetricCard = ({ title, value, subtitle, trend, onPress }: any) => (
    <TouchableOpacity style={styles.metricCard} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      {trend !== undefined && (
        <View style={styles.trendContainer}>
          <Icon
            name={trend >= 0 ? "trending-up" : "trending-down"}
            size={14}
            color={trend >= 0 ? "#059669" : "#DC2626"}
          />
          <Text style={[styles.trendText, { color: trend >= 0 ? "#059669" : "#DC2626" }]}>
            {Math.abs(trend)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{firstName}</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName.charAt(0)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Sync Status - Shows when offline or has pending uploads */}
      <SyncStatus style={styles.syncStatus} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
      >
        {/* Primary Action Card */}
        <TouchableOpacity
          style={styles.primaryCard}
          onPress={() => navigation.navigate('AssignedData')}
          activeOpacity={0.8}
        >
          <View style={styles.primaryLeft}>
            <View style={styles.primaryIconContainer}>
              <Icon name="phone-outline" size={24} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.primaryTitle}>Ready to Call</Text>
              <Text style={styles.primarySubtitle}>{assignedLeads} leads in queue</Text>
            </View>
          </View>
          <View style={styles.primaryRight}>
            <Text style={styles.primaryAction}>Start</Text>
            <Icon name="arrow-right" size={18} color="#2563EB" />
          </View>
        </TouchableOpacity>

        {/* Key Metrics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Today's Calls"
              value={todayCalls}
              subtitle="calls completed"
              onPress={() => navigation.navigate('History')}
            />
            <MetricCard
              title="Conversion Rate"
              value={`${conversionRate}%`}
              trend={conversionRate > 10 ? 5 : -2}
              onPress={() => navigation.navigate('Performance')}
            />
            <MetricCard
              title="Qualified Leads"
              value={qualifiedLeads}
              subtitle="this period"
              onPress={() => navigation.navigate('QualifiedLeads')}
            />
            <MetricCard
              title="Total Pipeline"
              value={totalLeads}
              subtitle="active leads"
              onPress={() => navigation.navigate('Leads')}
            />
          </View>
        </View>

        {/* Activity Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Pending Follow-ups</Text>
                <Text style={styles.summaryValue}>{pendingFollowUps}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Calls</Text>
                <Text style={styles.summaryValue}>{totalCalls}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Avg/Day</Text>
                <Text style={styles.summaryValue}>{Math.round(totalCalls / 7) || 0}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('Leads')}
            >
              <Icon name="account-multiple-outline" size={22} color="#374151" />
              <Text style={styles.quickAccessText}>All Leads</Text>
              <Icon name="chevron-right" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('QualifiedLeads')}
            >
              <Icon name="star-outline" size={22} color="#374151" />
              <Text style={styles.quickAccessText}>Qualified</Text>
              <Icon name="chevron-right" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('History')}
            >
              <Icon name="clock-outline" size={22} color="#374151" />
              <Text style={styles.quickAccessText}>Call History</Text>
              <Icon name="chevron-right" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('FollowUps')}
            >
              <Icon name="calendar-clock" size={22} color="#374151" />
              <Text style={styles.quickAccessText}>Follow-ups</Text>
              {pendingFollowUps > 0 && (
                <View style={styles.followUpBadge}>
                  <Text style={styles.followUpBadgeText}>{pendingFollowUps}</Text>
                </View>
              )}
              <Icon name="chevron-right" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAccessItem, { borderBottomWidth: 0 }]}
              onPress={() => navigation.navigate('Performance')}
            >
              <Icon name="chart-line" size={22} color="#374151" />
              <Text style={styles.quickAccessText}>Performance</Text>
              <Icon name="chevron-right" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Alerts */}
        {pendingFollowUps > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.alertCard}
              onPress={() => navigation.navigate('FollowUps')}
            >
              <View style={styles.alertIconContainer}>
                <Icon name="bell-outline" size={20} color="#D97706" />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Action Required</Text>
                <Text style={styles.alertMessage}>{pendingFollowUps} follow-ups pending</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#D97706" />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  syncStatus: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {},
  greeting: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  profileBtn: {},
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  primaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  primaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  primarySubtitle: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 2,
  },
  primaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginRight: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: cardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  quickAccessGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  quickAccessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  quickAccessText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    marginLeft: 14,
    fontWeight: '500',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  alertMessage: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  followUpBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  followUpBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default DashboardScreen;
