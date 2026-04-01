import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collegeService } from '../services/fieldSales.service';

const categoryColors: Record<string, { bg: string; text: string }> = {
  HOT: { bg: '#fef2f2', text: '#dc2626' },
  WARM: { bg: '#fefce8', text: '#ca8a04' },
  COLD: { bg: '#eff6ff', text: '#2563eb' },
};

export default function CollegesScreen() {
  const navigation = useNavigation<any>();
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchColleges = async () => {
    try {
      const response = await collegeService.getAll({ search, limit: 50 });
      setColleges(response.data?.data?.colleges || []);
    } catch (error) {
      console.error('Failed to fetch colleges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchColleges();
  };

  const renderCollege = ({ item }: { item: any }) => {
    const colors = categoryColors[item.category] || { bg: '#f1f5f9', text: '#64748b' };

    return (
      <TouchableOpacity
        style={styles.collegeCard}
        onPress={() => navigation.navigate('CollegeDetail', { collegeId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.collegeName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.collegeCity}>📍 {item.city}</Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.categoryText, { color: colors.text }]}>{item.category}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>👤 {item._count?.contacts || 0} contacts</Text>
          <Text style={styles.footerText}>📋 {item._count?.visits || 0} visits</Text>
        </View>
      </TouchableOpacity>
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
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search colleges..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94a3b8"
        />
      </View>
      <FlatList
        data={colleges}
        keyExtractor={(item) => item.id}
        renderItem={renderCollege}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No colleges found</Text>
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
  searchContainer: {
    padding: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
  },
  listContainer: {
    padding: 12,
  },
  collegeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  collegeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  collegeCity: {
    fontSize: 13,
    color: '#64748b',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
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
