import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import api from '../api';
import { useAppSelector } from '../store';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  todayCalls: number;
  totalAssigned: number;
  pending: number;
  interested: number;
  converted: number;
  conversionRate: number;
  status: 'active' | 'on_break' | 'offline';
}

interface TeamStats {
  teamSize: number;
  totalAssigned: number;
  totalPending: number;
  totalInterested: number;
  totalConverted: number;
  callsToday: number;
  avgConversionRate: number;
  teamMembers: TeamMember[];
}

const TeamScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAppSelector((state) => state.auth);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTeamStats = useCallback(async () => {
    try {
      const response = await api.get('/telecaller/team-dashboard-stats');
      setStats(response.data?.data || null);
    } catch (err) {
      console.log('[TeamScreen] Failed to fetch team stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamStats();
    const interval = setInterval(fetchTeamStats, 30000);
    return () => clearInterval(interval);
  }, [fetchTeamStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTeamStats();
    setRefreshing(false);
  }, [fetchTeamStats]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#22C55E';
      case 'on_break':
        return '#F59E0B';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'on_break':
        return 'On Break';
      default:
        return 'Offline';
    }
  };

  const renderMember = ({ item }: { item: TeamMember }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberInitial}>
            {item.firstName?.charAt(0)?.toUpperCase() || '?'}
          </Text>
          <View
            style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]}
          />
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.memberStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.todayCalls}</Text>
          <Text style={styles.statLabel}>Calls Today</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.totalAssigned}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{item.interested}</Text>
          <Text style={styles.statLabel}>Interested</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#6366F1' }]}>{item.conversionRate}%</Text>
          <Text style={styles.statLabel}>Conv.</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Team Summary Header */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryHeader}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{stats?.teamSize || 0}</Text>
            <Text style={styles.summaryLabel}>Team Size</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{stats?.callsToday || 0}</Text>
            <Text style={styles.summaryLabel}>Calls Today</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{stats?.totalConverted || 0}</Text>
            <Text style={styles.summaryLabel}>Converted</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{stats?.avgConversionRate || 0}%</Text>
            <Text style={styles.summaryLabel}>Avg Conv.</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Stats Row */}
      <View style={styles.quickStats}>
        <View style={[styles.quickStatCard, { backgroundColor: '#FEF3C7' }]}>
          <Icon name="clipboard-list-outline" size={20} color="#B45309" />
          <Text style={[styles.quickStatValue, { color: '#92400E' }]}>{stats?.totalAssigned || 0}</Text>
          <Text style={styles.quickStatLabel}>Total Assigned</Text>
        </View>
        <View style={[styles.quickStatCard, { backgroundColor: '#DCFCE7' }]}>
          <Icon name="thumb-up-outline" size={20} color="#15803D" />
          <Text style={[styles.quickStatValue, { color: '#166534' }]}>{stats?.totalInterested || 0}</Text>
          <Text style={styles.quickStatLabel}>Interested</Text>
        </View>
        <View style={[styles.quickStatCard, { backgroundColor: '#FEE2E2' }]}>
          <Icon name="clock-outline" size={20} color="#B91C1C" />
          <Text style={[styles.quickStatValue, { color: '#991B1B' }]}>{stats?.totalPending || 0}</Text>
          <Text style={styles.quickStatLabel}>Pending</Text>
        </View>
      </View>

      {/* Team Members List */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Team Members</Text>
        <Text style={styles.listCount}>{stats?.teamMembers?.length || 0} members</Text>
      </View>

      <FlatList
        data={stats?.teamMembers || []}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-group-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Team Members</Text>
            <Text style={styles.emptyText}>No telecallers are assigned to your team yet.</Text>
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
  summaryHeader: {
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  quickStats: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  quickStatLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  listCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  memberEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  memberStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default TeamScreen;
