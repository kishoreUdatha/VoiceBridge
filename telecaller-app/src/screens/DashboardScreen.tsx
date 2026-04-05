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
  Platform,
} from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchStats } from '../store/slices/callsSlice';
import { getGreeting } from '../utils/formatters';
import { MainTabParamList, RootStackParamList } from '../types';
import SyncStatus from '../components/SyncStatus';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { Avatar } from '../components/ui';

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

  const firstName = user?.firstName || 'User';
  const todayCalls = stats?.todayCalls ?? 0;
  const assignedLeads = stats?.assignedLeads ?? 0;
  const pendingFollowUps = stats?.pendingFollowUps ?? 0;
  const qualifiedLeads = stats?.qualifiedLeads ?? 0;
  const conversionRate = stats?.conversionRate ?? 0;
  const totalCalls = stats?.totalCalls ?? 0;
  const totalLeads = stats?.totalLeads ?? 0;

  const MetricCard = ({ title, value, subtitle, icon, iconColor, trend, onPress }: any) => (
    <TouchableOpacity style={styles.metricCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${iconColor}15` }]}>
          <Icon name={icon} size={18} color={iconColor} />
        </View>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      {trend !== undefined && (
        <View style={[styles.trendContainer, { backgroundColor: trend >= 0 ? colors.success[50] : colors.error[50] }]}>
          <Icon
            name={trend >= 0 ? 'trending-up' : 'trending-down'}
            size={12}
            color={trend >= 0 ? colors.success[600] : colors.error[600]}
          />
          <Text style={[styles.trendText, { color: trend >= 0 ? colors.success[600] : colors.error[600] }]}>
            {Math.abs(trend)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const QuickAction = ({ icon, label, color, onPress }: any) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary[600]} />

      {/* Gradient Header */}
      <LinearGradient
        colors={[colors.primary[600], colors.primary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.avatarContainer}
          >
            <Avatar
              name={firstName}
              size="md"
              backgroundColor={`${colors.neutral[0]}20`}
              textColor={colors.neutral[0]}
            />
          </TouchableOpacity>
        </View>

        {/* Primary CTA Card */}
        <TouchableOpacity
          style={styles.ctaCard}
          onPress={() => navigation.navigate('AssignedData')}
          activeOpacity={0.9}
        >
          <View style={styles.ctaLeft}>
            <View style={styles.ctaIconContainer}>
              <Icon name="phone-plus" size={24} color={colors.primary[600]} />
            </View>
            <View>
              <Text style={styles.ctaTitle}>Start Calling</Text>
              <Text style={styles.ctaSubtitle}>{assignedLeads} leads waiting</Text>
            </View>
          </View>
          <View style={styles.ctaButton}>
            <Icon name="arrow-right" size={20} color={colors.neutral[0]} />
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* Sync Status */}
      <SyncStatus style={styles.syncStatus} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <QuickAction
            icon="account-multiple"
            label="All Leads"
            color={colors.primary[500]}
            onPress={() => navigation.navigate('Leads')}
          />
          <QuickAction
            icon="star"
            label="Qualified"
            color={colors.warning[500]}
            onPress={() => navigation.navigate('QualifiedLeads')}
          />
          <QuickAction
            icon="clock-outline"
            label="History"
            color={colors.secondary[500]}
            onPress={() => navigation.navigate('History')}
          />
          <QuickAction
            icon="calendar-check"
            label="Follow-ups"
            color={colors.success[500]}
            onPress={() => navigation.navigate('FollowUps')}
          />
        </View>

        {/* Metrics Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Calls Made"
              value={todayCalls}
              icon="phone-check"
              iconColor={colors.primary[500]}
              onPress={() => navigation.navigate('History')}
            />
            <MetricCard
              title="Conversion"
              value={`${conversionRate}%`}
              icon="chart-line"
              iconColor={colors.success[500]}
              trend={conversionRate > 10 ? 5 : -2}
              onPress={() => navigation.navigate('Performance')}
            />
            <MetricCard
              title="Qualified"
              value={qualifiedLeads}
              icon="star-circle"
              iconColor={colors.warning[500]}
              subtitle="hot leads"
              onPress={() => navigation.navigate('QualifiedLeads')}
            />
            <MetricCard
              title="Pipeline"
              value={totalLeads}
              icon="account-group"
              iconColor={colors.secondary[500]}
              subtitle="total leads"
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
                <View style={[styles.summaryIconBg, { backgroundColor: colors.warning[50] }]}>
                  <Icon name="clock-alert" size={20} color={colors.warning[600]} />
                </View>
                <Text style={styles.summaryValue}>{pendingFollowUps}</Text>
                <Text style={styles.summaryLabel}>Follow-ups</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <View style={[styles.summaryIconBg, { backgroundColor: colors.primary[50] }]}>
                  <Icon name="phone" size={20} color={colors.primary[600]} />
                </View>
                <Text style={styles.summaryValue}>{totalCalls}</Text>
                <Text style={styles.summaryLabel}>Total Calls</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <View style={[styles.summaryIconBg, { backgroundColor: colors.success[50] }]}>
                  <Icon name="trending-up" size={20} color={colors.success[600]} />
                </View>
                <Text style={styles.summaryValue}>{Math.round(totalCalls / 7) || 0}</Text>
                <Text style={styles.summaryLabel}>Avg/Day</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Navigation Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="chart-bar"
              label="Performance Analytics"
              onPress={() => navigation.navigate('Performance')}
            />
            <MenuItem
              icon="brain"
              label="AI Call Analysis"
              onPress={() => navigation.navigate('AIAnalysis')}
            />
            <MenuItem
              icon="cog"
              label="Settings"
              onPress={() => navigation.navigate('Settings')}
              showDivider={false}
            />
          </View>
        </View>

        {/* Alert Card */}
        {pendingFollowUps > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.alertCard}
              onPress={() => navigation.navigate('FollowUps')}
              activeOpacity={0.8}
            >
              <View style={styles.alertLeft}>
                <View style={styles.alertIconBg}>
                  <Icon name="bell-ring" size={20} color={colors.warning[600]} />
                </View>
                <View>
                  <Text style={styles.alertTitle}>Action Required</Text>
                  <Text style={styles.alertMessage}>
                    You have {pendingFollowUps} pending follow-up{pendingFollowUps > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color={colors.warning[500]} />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const MenuItem = ({ icon, label, onPress, showDivider = true }: any) => (
  <TouchableOpacity
    style={[styles.menuItem, !showDivider && styles.menuItemNoBorder]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.menuLeft}>
      <Icon name={icon} size={22} color={colors.text.secondary} />
      <Text style={styles.menuLabel}>{label}</Text>
    </View>
    <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerLeft: {},
  greeting: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: `${colors.neutral[0]}90`,
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
    marginTop: 2,
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: `${colors.neutral[0]}30`,
    borderRadius: 24,
    padding: 2,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[0],
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
  },
  ctaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  ctaTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  ctaSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  ctaButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncStatus: {
    marginHorizontal: spacing.base,
    marginTop: -spacing.md,
    marginBottom: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    marginBottom: spacing.sm,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quickActionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: cardWidth,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  metricHeader: {
    marginBottom: spacing.sm,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  metricTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  metricSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  trendText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    marginLeft: 2,
  },
  summaryCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.base,
  },
  menuCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  menuItemNoBorder: {
    borderBottomWidth: 0,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginLeft: spacing.md,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warning[50],
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.warning[200],
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.warning[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  alertTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.warning[800],
  },
  alertMessage: {
    fontSize: typography.fontSize.xs,
    color: colors.warning[600],
    marginTop: 2,
  },
});

export default DashboardScreen;
