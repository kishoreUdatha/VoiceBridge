import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { telecallerApi, QualifiedLead, QualifiedLeadsStats } from '../api/telecaller';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  NEW: { label: 'New', color: '#3B82F6', bg: '#EFF6FF', icon: 'new-box' },
  CONTACTED: { label: 'Contacted', color: '#8B5CF6', bg: '#F5F3FF', icon: 'phone-check' },
  QUALIFIED: { label: 'Qualified', color: '#F59E0B', bg: '#FEF3C7', icon: 'star' },
  NEGOTIATION: { label: 'Negotiation', color: '#EC4899', bg: '#FCE7F3', icon: 'handshake' },
  CONVERTED: { label: 'Converted', color: '#10B981', bg: '#D1FAE5', icon: 'check-circle' },
  LOST: { label: 'Lost', color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle' },
};

const QualifiedLeadsScreen: React.FC = () => {
  const [leads, setLeads] = useState<QualifiedLead[]>([]);
  const [stats, setStats] = useState<QualifiedLeadsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');

  const fetchData = useCallback(async () => {
    try {
      const [leadsData, statsData] = await Promise.all([
        telecallerApi.getMyQualifiedLeads(filter !== 'ALL' ? filter : undefined),
        telecallerApi.getMyQualifiedLeadsStats(),
      ]);
      setLeads(leadsData.leads);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch qualified leads:', error);
    }
  }, [filter]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    loadData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const renderStats = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>Your Conversion Performance</Text>
          <View style={styles.conversionBadge}>
            <Text style={styles.conversionRate}>{stats.conversionRate}%</Text>
            <Text style={styles.conversionLabel}>Rate</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Qualified</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <Icon name="check-circle" size={18} color="#10B981" />
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.converted}</Text>
            <Text style={styles.statLabel}>Converted</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="clock-outline" size={18} color="#F59E0B" />
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="close-circle" size={18} color="#EF4444" />
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>{stats.lost}</Text>
            <Text style={styles.statLabel}>Lost</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {['ALL', 'CONVERTED', 'LOST', 'NEW', 'NEGOTIATION'].map((status) => (
        <TouchableOpacity
          key={status}
          style={[styles.filterChip, filter === status && styles.filterChipActive]}
          onPress={() => setFilter(status)}
        >
          <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>
            {status === 'ALL' ? 'All' : STATUS_CONFIG[status]?.label || status}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderItem = ({ item }: { item: QualifiedLead }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.NEW;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.leadInfo}>
            <Text style={styles.leadName}>{item.name}</Text>
            <Text style={styles.leadPhone}>{item.phone}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Icon name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Icon name="account" size={16} color="#9CA3AF" />
            <Text style={styles.infoLabel}>Assigned to:</Text>
            <Text style={styles.infoValue}>
              {item.assignedTo || 'Unassigned (waiting)'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="calendar" size={16} color="#9CA3AF" />
            <Text style={styles.infoLabel}>Qualified:</Text>
            <Text style={styles.infoValue}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>

          {item.status === 'CONVERTED' && item.convertedAt && (
            <View style={styles.infoRow}>
              <Icon name="check-decagram" size={16} color="#10B981" />
              <Text style={[styles.infoLabel, { color: '#10B981' }]}>Converted:</Text>
              <Text style={[styles.infoValue, { color: '#10B981' }]}>
                {new Date(item.convertedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {item.status === 'CONVERTED' && (
          <View style={styles.successBanner}>
            <Icon name="party-popper" size={16} color="#10B981" />
            <Text style={styles.successText}>This lead became a customer!</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading your qualified leads...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats */}
      {renderStats()}

      {/* Filters */}
      {renderFilters()}

      {/* List */}
      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="clipboard-check-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No qualified leads yet</Text>
            <Text style={styles.emptyText}>
              Leads you qualify from raw data will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  conversionBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  conversionRate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  conversionLabel: {
    fontSize: 10,
    color: '#D1FAE5',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 12,
    paddingTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  leadPhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default QualifiedLeadsScreen;
