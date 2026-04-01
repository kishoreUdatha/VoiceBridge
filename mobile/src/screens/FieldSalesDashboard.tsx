import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collegeService, visitService, expenseService } from '../services/fieldSales.service';

export default function FieldSalesDashboard() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [activeVisit, setActiveVisit] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [collegeStats, visitStats, active] = await Promise.all([
        collegeService.getStats(),
        visitService.getStats(),
        visitService.getActive(),
      ]);
      setStats({
        colleges: collegeStats.data?.data,
        visits: visitStats.data?.data,
      });
      setActiveVisit(active.data?.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Active Visit Banner */}
      {activeVisit && (
        <TouchableOpacity
          style={styles.activeVisitBanner}
          onPress={() => navigation.navigate('VisitCheckOut', { visit: activeVisit })}
        >
          <View style={styles.pulsingDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.activeVisitTitle}>Visit in Progress</Text>
            <Text style={styles.activeVisitCollege}>{activeVisit.college?.name}</Text>
          </View>
          <Text style={styles.checkOutBtn}>Check Out</Text>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]}
          onPress={() => navigation.navigate('Colleges')}
        >
          <Text style={styles.actionIcon}>🏫</Text>
          <Text style={styles.actionText}>Colleges</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
          onPress={() => navigation.navigate('VisitCheckIn')}
        >
          <Text style={styles.actionIcon}>📍</Text>
          <Text style={styles.actionText}>Check In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]}
          onPress={() => navigation.navigate('Visits')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>Visits</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]}
          onPress={() => navigation.navigate('Expenses')}
        >
          <Text style={styles.actionIcon}>💰</Text>
          <Text style={styles.actionText}>Expenses</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
            <Text style={[styles.statValue, { color: '#1d4ed8' }]}>
              {stats?.visits?.todayVisits || 0}
            </Text>
            <Text style={styles.statLabel}>Visits Today</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
            <Text style={[styles.statValue, { color: '#15803d' }]}>
              {stats?.visits?.completedThisWeek || 0}
            </Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Text style={[styles.statValue, { color: '#b45309' }]}>
              {stats?.colleges?.totalColleges || 0}
            </Text>
            <Text style={styles.statLabel}>Total Colleges</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fce7f3' }]}>
            <Text style={[styles.statValue, { color: '#be185d' }]}>
              {stats?.colleges?.categoryBreakdown?.HOT || 0}
            </Text>
            <Text style={styles.statLabel}>Hot Leads</Text>
          </View>
        </View>
      </View>

      {/* Deals Pipeline Button */}
      <TouchableOpacity
        style={styles.pipelineBtn}
        onPress={() => navigation.navigate('DealPipeline')}
      >
        <Text style={styles.pipelineBtnText}>View Deal Pipeline</Text>
        <Text style={styles.pipelineArrow}>→</Text>
      </TouchableOpacity>
    </ScrollView>
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
  activeVisitBanner: {
    backgroundColor: '#10b981',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginRight: 12,
  },
  activeVisitTitle: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  activeVisitCollege: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  checkOutBtn: {
    color: '#fff',
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  actionBtn: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  statsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
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
    color: '#64748b',
    marginTop: 4,
  },
  pipelineBtn: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pipelineBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pipelineArrow: {
    color: '#fff',
    fontSize: 20,
  },
});
