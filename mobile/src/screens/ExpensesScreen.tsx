import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { expenseService } from '../services/fieldSales.service';

const categoryLabels: Record<string, string> = {
  TRAVEL_FUEL: 'Fuel',
  TRAVEL_TAXI: 'Taxi',
  TRAVEL_AUTO: 'Auto',
  FOOD_MEALS: 'Meals',
  ACCOMMODATION: 'Stay',
  OTHER: 'Other',
};

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: '#f1f5f9', text: '#64748b' },
  SUBMITTED: { bg: '#fef3c7', text: '#b45309' },
  APPROVED: { bg: '#dcfce7', text: '#15803d' },
  REJECTED: { bg: '#fee2e2', text: '#dc2626' },
  PAID: { bg: '#dbeafe', text: '#1d4ed8' },
};

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpenses = async () => {
    try {
      const [expRes, sumRes] = await Promise.all([
        expenseService.getAll({ limit: 50 }),
        expenseService.getMySummary(),
      ]);
      setExpenses(expRes.data?.data?.expenses || []);
      setSummary(sumRes.data?.data);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const handleSubmit = async (id: string) => {
    try {
      await expenseService.submit(id);
      Alert.alert('Success', 'Expense submitted for approval');
      fetchExpenses();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderExpense = ({ item }: { item: any }) => {
    const colors = statusColors[item.status] || statusColors.DRAFT;

    return (
      <View style={styles.expenseCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.category}>{categoryLabels[item.category] || item.category}</Text>
            <Text style={styles.description} numberOfLines={1}>{item.description || 'No description'}</Text>
            <Text style={styles.date}>{formatDate(item.expenseDate)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amount}>₹{Number(item.amount).toLocaleString()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
              <Text style={[styles.statusText, { color: colors.text }]}>
                {item.status === 'SUBMITTED' ? 'Pending' : item.status}
              </Text>
            </View>
          </View>
        </View>
        {item.status === 'DRAFT' && (
          <TouchableOpacity style={styles.submitBtn} onPress={() => handleSubmit(item.id)}>
            <Text style={styles.submitBtnText}>Submit for Approval</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: '#f1f5f9' }]}>
            <Text style={styles.summaryValue}>₹{summary.draft?.amount?.toLocaleString() || 0}</Text>
            <Text style={styles.summaryLabel}>Draft</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
            <Text style={styles.summaryValue}>₹{summary.submitted?.amount?.toLocaleString() || 0}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
            <Text style={styles.summaryValue}>₹{summary.approved?.amount?.toLocaleString() || 0}</Text>
            <Text style={styles.summaryLabel}>Approved</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#dbeafe' }]}>
            <Text style={styles.summaryValue}>₹{summary.paid?.amount?.toLocaleString() || 0}</Text>
            <Text style={styles.summaryLabel}>Paid</Text>
          </View>
        </View>
      )}

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No expenses found</Text>
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
  summaryContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  listContainer: {
    padding: 12,
  },
  expenseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
  },
  category: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 4,
  },
  description: {
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#64748b',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#10b981',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
