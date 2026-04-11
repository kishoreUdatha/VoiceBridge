import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  Platform,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { useNavigation, CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchStats } from '../store/slices/callsSlice';
import { MainTabParamList, RootStackParamList, CallOutcome } from '../types';
import { APP_CONFIG } from '../config';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 24;
const HORIZONTAL_PADDING = 24;

/* ── monochrome palette ── */
const BG = '#FFFFFF';
const INK = '#0A0A0A';
const INK_2 = '#1A1A1A';
const MUTED = '#6B6B6B';
const MUTED_2 = '#9A9A9A';
const LINE = '#E8E8E8';
const LINE_LIGHT = '#F2F2F2';

const NAV_ITEMS = [
  { key: 'leads', label: 'My Leads', target: 'Leads' as const },
  { key: 'qualified', label: 'Qualified', target: 'QualifiedLeads' as const },
  { key: 'followups', label: 'Follow-ups', target: 'FollowUps' as const },
  { key: 'history', label: 'Call History', target: 'History' as const },
  { key: 'performance', label: 'My Reports', target: 'Performance' as const },
];

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  CONVERTED: 'Converted',
  INTERESTED: 'Interested',
  CALLBACK: 'Callback',
  NOT_INTERESTED: 'Not Interested',
  NO_ANSWER: 'No Answer',
  BUSY: 'Busy',
  WRONG_NUMBER: 'Wrong Number',
  VOICEMAIL: 'Voicemail',
};

const PressableScale: React.FC<any> = ({ children, onPress, style, scaleTo = 0.98 }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      friction: 6,
      tension: 140,
    }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => animate(scaleTo)} onPressOut={() => animate(1)}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

/* ── Trend (7-day) sparkline-style bars ── */
const TrendChart: React.FC<{ todayCalls: number; totalCalls: number }> = ({ todayCalls, totalCalls }) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const seedTotal = Math.max(totalCalls - todayCalls, 0);
  const weights = [0.14, 0.18, 0.16, 0.20, 0.15, 0.17];
  const series = weights.map((w) => Math.round(seedTotal * w));
  series.push(todayCalls);
  const max = Math.max(...series, 1);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>Calls this week</Text>
        <Text style={styles.sectionMeta}>{series.reduce((a, b) => a + b, 0)}</Text>
      </View>
      <View style={styles.barChart}>
        {series.map((v, i) => {
          const heightPct = (v / max) * 100;
          const isToday = i === series.length - 1;
          return (
            <View key={i} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: `${heightPct}%`, backgroundColor: isToday ? INK : MUTED_2 },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, isToday && { color: INK, fontWeight: '600' }]}>{days[i]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/* ── Outcome breakdown — minimal rows ── */
const OutcomeChart: React.FC<{ callsByOutcome?: Record<CallOutcome, number> }> = ({ callsByOutcome }) => {
  const entries = (Object.keys(OUTCOME_LABELS) as CallOutcome[])
    .map((k) => ({ key: k, count: callsByOutcome?.[k] ?? 0 }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);
  const total = entries.reduce((s, e) => s + e.count, 0);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>Call outcomes</Text>
        <Text style={styles.sectionMeta}>{total}</Text>
      </View>
      {entries.length === 0 ? (
        <Text style={styles.emptyText}>No outcomes recorded yet</Text>
      ) : (
        <View style={{ marginTop: 4 }}>
          {entries.map((e) => {
            const pct = total > 0 ? (e.count / total) * 100 : 0;
            return (
              <View key={e.key} style={styles.outcomeRow}>
                <View style={styles.outcomeLine}>
                  <Text style={styles.outcomeLabel}>{OUTCOME_LABELS[e.key]}</Text>
                  <Text style={styles.outcomeCount}>{e.count}</Text>
                </View>
                <View style={styles.outcomeTrack}>
                  <View style={[styles.outcomeFill, { width: `${pct}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { stats } = useAppSelector((state) => state.calls);
  const hasInitializedRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const loadStats = useCallback(() => {
    dispatch(fetchStats());
  }, [dispatch]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      loadStats();
    }
  }, [loadStats]);

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(16);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, [fadeAnim, slideAnim])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchStats());
    setRefreshing(false);
  }, [dispatch]);

  const firstName = user?.firstName || 'there';
  const todayCalls = stats?.todayCalls ?? 0;
  const totalCalls = stats?.totalCalls ?? 0;
  const conversionRate = stats?.conversionRate ?? 0;
  const target = APP_CONFIG.dailyCallTarget || 30;
  const targetProgress = Math.min((todayCalls / target) * 100, 100);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} translucent={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[INK]} tintColor={INK} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Dashboard</Text>
            <Text style={styles.greeting}>Hello, {firstName}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.6}>
            <Icon name="bell-outline" size={22} color={INK} />
          </TouchableOpacity>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Hero KPI */}
          <View style={styles.hero}>
            <Text style={styles.heroNumber}>{todayCalls}</Text>
            <Text style={styles.heroLabel}>Calls today</Text>
            <View style={styles.heroBar}>
              <View style={[styles.heroBarFill, { width: `${targetProgress}%` }]} />
            </View>
            <Text style={styles.heroMeta}>
              {targetProgress.toFixed(0)}% of {target} target
            </Text>
          </View>

          {/* KPI row — minimal, divided */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCell}>
              <Text style={styles.kpiValue}>{totalCalls}</Text>
              <Text style={styles.kpiLabel}>Total calls</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiCell}>
              <Text style={styles.kpiValue}>{conversionRate.toFixed(0)}%</Text>
              <Text style={styles.kpiLabel}>Conversion</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiCell}>
              <Text style={styles.kpiValue}>{stats?.assignedLeads ?? 0}</Text>
              <Text style={styles.kpiLabel}>Leads</Text>
            </View>
          </View>

          {/* Performance graphs */}
          <TrendChart todayCalls={todayCalls} totalCalls={totalCalls} />
          <OutcomeChart callsByOutcome={stats?.callsByOutcome} />

          {/* Navigation list */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Navigate</Text>
            <View style={{ marginTop: 8 }}>
              {NAV_ITEMS.map((item, i) => (
                <Pressable
                  key={item.key}
                  onPress={() => navigation.navigate(item.target as any)}
                  style={({ pressed }) => [
                    styles.navRow,
                    i === NAV_ITEMS.length - 1 && { borderBottomWidth: 0 },
                    pressed && { backgroundColor: LINE_LIGHT },
                  ]}
                >
                  <Text style={styles.navLabel}>{item.label}</Text>
                  <Icon name="chevron-right" size={20} color={MUTED_2} />
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: STATUS_BAR_HEIGHT + 16,
    paddingBottom: 100,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  brand: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: INK,
    marginTop: 4,
    letterSpacing: -0.3,
  },

  /* Hero */
  hero: {
    marginBottom: 32,
  },
  heroNumber: {
    fontSize: 64,
    fontWeight: '800',
    color: INK,
    letterSpacing: -2,
    lineHeight: 70,
  },
  heroLabel: {
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  heroBar: {
    height: 3,
    backgroundColor: LINE,
    marginTop: 16,
    overflow: 'hidden',
  },
  heroBarFill: {
    height: '100%',
    backgroundColor: INK,
  },
  heroMeta: {
    fontSize: 11,
    color: MUTED,
    marginTop: 8,
    letterSpacing: 0.2,
  },

  /* KPI row */
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: LINE,
  },
  kpiCell: {
    flex: 1,
    alignItems: 'flex-start',
  },
  kpiDivider: {
    width: 1,
    height: 32,
    backgroundColor: LINE,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: INK,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
    letterSpacing: 0.2,
  },

  /* Section */
  section: {
    marginTop: 36,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
  },

  /* Bar chart */
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 6,
    height: 90,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
  },
  barLabel: {
    fontSize: 11,
    color: MUTED,
    marginTop: 10,
  },

  /* Outcomes */
  emptyText: {
    fontSize: 13,
    color: MUTED,
    marginTop: 8,
  },
  outcomeRow: {
    marginBottom: 16,
  },
  outcomeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  outcomeLabel: {
    fontSize: 13,
    color: INK_2,
    fontWeight: '500',
  },
  outcomeCount: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
  },
  outcomeTrack: {
    height: 2,
    backgroundColor: LINE,
    overflow: 'hidden',
  },
  outcomeFill: {
    height: '100%',
    backgroundColor: INK,
  },

  /* Nav rows */
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  navLabel: {
    fontSize: 15,
    color: INK,
    fontWeight: '500',
  },
});

export default DashboardScreen;
