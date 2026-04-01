import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { visitService } from '../services/fieldSales.service';

const statusColors: Record<string, { bg: string; text: string }> = {
  Completed: { bg: '#dcfce7', text: '#15803d' },
  'In Progress': { bg: '#dbeafe', text: '#1d4ed8' },
  Scheduled: { bg: '#fef3c7', text: '#b45309' },
  Missed: { bg: '#fee2e2', text: '#dc2626' },
};

export default function VisitsScreen() {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchVisits = async () => {
    try {
      const response = await visitService.getAll({ filter, limit: 50 });
      setVisits(response.data?.data?.visits || []);
    } catch (error) {
      console.error('Failed to fetch visits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVisits();
  };

  const getStatus = (visit: any) => {
    if (visit.checkOutTime) return 'Completed';
    if (visit.checkInTime && !visit.checkOutTime) return 'In Progress';
    const visitDate = new Date(visit.visitDate);
    const now = new Date();
    if (visitDate < now) return 'Missed';
    return 'Scheduled';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderVisit = ({ item }: { item: any }) => {
    const status = getStatus(item);
    const colors = statusColors[status] || { bg: '#f1f5f9', text: '#64748b' };

    return (
      <View style={styles.visitCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.collegeName} numberOfLines={1}>{item.college?.name}</Text>
            <Text style={styles.visitDate}>📅 {formatDate(item.visitDate)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusText, { color: colors.text }]}>{status}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.purposeText}>{item.purpose?.replace(/_/g, ' ')}</Text>
          {item.outcome && (
            <Text style={styles.outcomeText}>→ {item.outcome}</Text>
          )}
        </View>
      </View>
    );
  };

  const filters = ['all', 'today', 'upcoming', 'completed'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        renderItem={renderVisit}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No visits found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#10b981',
  },
  filterText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 12,
  },
  visitCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  collegeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  visitDate: {
    fontSize: 12,
    color: '#64748b',
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
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  purposeText: {
    fontSize: 12,
    color: '#64748b',
  },
  outcomeText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
  },
});
