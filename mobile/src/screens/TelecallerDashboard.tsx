import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import telecallerService, { TelecallerCall, TelecallerStats } from '../services/telecaller.service';

const OUTCOMES = [
  { value: 'INTERESTED', label: 'Interested', color: '#10b981', bg: '#d1fae5' },
  { value: 'CONVERTED', label: 'Converted', color: '#8b5cf6', bg: '#ede9fe' },
  { value: 'CALLBACK', label: 'Callback', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'NOT_INTERESTED', label: 'Not Interested', color: '#ef4444', bg: '#fee2e2' },
  { value: 'NO_ANSWER', label: 'No Answer', color: '#6b7280', bg: '#f3f4f6' },
  { value: 'BUSY', label: 'Busy', color: '#f97316', bg: '#ffedd5' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number', color: '#dc2626', bg: '#fee2e2' },
];

export default function TelecallerDashboard() {
  const navigation = useNavigation<any>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<TelecallerStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<TelecallerCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, callsRes] = await Promise.all([
        telecallerService.getMyStats().catch(() => null),
        telecallerService.getMyCalls({ limit: 10 }).catch(() => null),
      ]);

      if (statsRes?.data?.data) {
        setStats(statsRes.data.data);
      }
      if (callsRes?.data?.data?.calls) {
        setRecentCalls(callsRes.data.data.calls);
      }
    } catch (error) {
      console.error('Error fetching telecaller data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const getOutcomeStyle = (outcome?: string) => {
    const found = OUTCOMES.find(o => o.value === outcome);
    return found || { color: '#3b82f6', bg: '#dbeafe', label: 'Pending' };
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.firstName || 'Telecaller'}!</Text>
        <Text style={styles.subtitle}>Let's make some calls today</Text>
      </View>

      {/* Quick Action Button */}
      <TouchableOpacity
        style={styles.newCallButton}
        onPress={() => navigation.navigate('NewCall')}
      >
        <Text style={styles.newCallIcon}>📞</Text>
        <View>
          <Text style={styles.newCallText}>Log New Call</Text>
          <Text style={styles.newCallSubtext}>Record a call you just made</Text>
        </View>
        <Text style={styles.newCallArrow}>→</Text>
      </TouchableOpacity>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
            <Text style={[styles.statValue, { color: '#1d4ed8' }]}>{stats?.todayCalls || 0}</Text>
            <Text style={styles.statLabel}>Today's Calls</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
            <Text style={[styles.statValue, { color: '#059669' }]}>{stats?.interested || 0}</Text>
            <Text style={styles.statLabel}>Interested</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#ede9fe' }]}>
            <Text style={[styles.statValue, { color: '#7c3aed' }]}>{stats?.converted || 0}</Text>
            <Text style={styles.statLabel}>Converted</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Text style={[styles.statValue, { color: '#d97706' }]}>{stats?.callbacks || 0}</Text>
            <Text style={styles.statLabel}>Callbacks</Text>
          </View>
        </View>
        <View style={styles.avgDurationCard}>
          <Text style={styles.avgDurationLabel}>Average Call Duration</Text>
          <Text style={styles.avgDurationValue}>{formatDuration(stats?.avgDuration)}</Text>
        </View>
      </View>

      {/* Recent Calls */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Calls</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CallHistory')}>
            <Text style={styles.seeAllText}>See All →</Text>
          </TouchableOpacity>
        </View>

        {recentCalls.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📱</Text>
            <Text style={styles.emptyText}>No calls logged yet</Text>
            <Text style={styles.emptySubtext}>Start by logging your first call</Text>
          </View>
        ) : (
          recentCalls.map((call) => {
            const outcomeStyle = getOutcomeStyle(call.outcome);
            return (
              <TouchableOpacity
                key={call.id}
                style={styles.callCard}
                onPress={() => navigation.navigate('CallDetail', { call })}
              >
                <View style={styles.callLeft}>
                  <View style={styles.callAvatar}>
                    <Text style={styles.callAvatarText}>
                      {(call.contactName || call.phoneNumber).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.callInfo}>
                    <Text style={styles.callName}>{call.contactName || 'Unknown'}</Text>
                    <Text style={styles.callPhone}>{call.phoneNumber}</Text>
                  </View>
                </View>
                <View style={styles.callRight}>
                  <View style={[styles.outcomeBadge, { backgroundColor: outcomeStyle.bg }]}>
                    <Text style={[styles.outcomeText, { color: outcomeStyle.color }]}>
                      {outcomeStyle.label}
                    </Text>
                  </View>
                  <View style={styles.callMeta}>
                    <Text style={styles.callDuration}>{formatDuration(call.duration)}</Text>
                    <Text style={styles.callTime}>{formatTime(call.createdAt)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CallHistory')}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>Call History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('NewCall')}
          >
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.actionText}>New Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#bfdbfe',
    marginTop: 4,
  },
  newCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newCallIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  newCallText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  newCallSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  newCallArrow: {
    fontSize: 20,
    color: '#3b82f6',
    marginLeft: 'auto',
  },
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  avgDurationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avgDurationLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  avgDurationValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  recentSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  callCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  callLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  callAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  callAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  callInfo: {
    flex: 1,
  },
  callName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  callPhone: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  callRight: {
    alignItems: 'flex-end',
  },
  outcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  callMeta: {
    alignItems: 'flex-end',
  },
  callDuration: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
  },
  callTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  quickActions: {
    padding: 16,
    paddingTop: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
  },
});
