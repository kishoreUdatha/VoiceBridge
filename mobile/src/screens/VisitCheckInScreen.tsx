import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { collegeService, visitService } from '../services/fieldSales.service';

const visitPurposes = [
  { value: 'FIRST_INTRODUCTION', label: 'Introduction', icon: '👋' },
  { value: 'PRODUCT_DEMO', label: 'Demo', icon: '📱' },
  { value: 'PROPOSAL_PRESENTATION', label: 'Proposal', icon: '📄' },
  { value: 'NEGOTIATION', label: 'Negotiate', icon: '🤝' },
  { value: 'DOCUMENT_COLLECTION', label: 'Documents', icon: '📋' },
  { value: 'AGREEMENT_SIGNING', label: 'Agreement', icon: '✍️' },
  { value: 'RELATIONSHIP_BUILDING', label: 'Relation', icon: '💼' },
  { value: 'PAYMENT_FOLLOWUP', label: 'Payment', icon: '💰' },
];

export default function VisitCheckInScreen() {
  const navigation = useNavigation<any>();
  const [colleges, setColleges] = useState<any[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<string>('');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('');
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    fetchColleges();
    getLocation();
  }, []);

  const fetchColleges = async () => {
    try {
      const response = await collegeService.getAll({ limit: 100 });
      setColleges(response.data?.data?.colleges || []);
    } catch (error) {
      console.error('Failed to fetch colleges:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for check-in');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    } catch (error) {
      console.error('Failed to get location:', error);
      Alert.alert('Error', 'Failed to get your location');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedCollege) {
      Alert.alert('Error', 'Please select a college');
      return;
    }
    if (!selectedPurpose) {
      Alert.alert('Error', 'Please select visit purpose');
      return;
    }
    if (!location) {
      Alert.alert('Error', 'Location is required. Please enable GPS.');
      return;
    }

    setCheckingIn(true);
    try {
      await visitService.checkIn({
        collegeId: selectedCollege,
        purpose: selectedPurpose,
        checkInLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });
      Alert.alert('Success', 'Checked in successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Location Status */}
      <View style={styles.locationCard}>
        <Text style={styles.locationIcon}>{location ? '📍' : '⏳'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.locationTitle}>
            {gettingLocation ? 'Getting location...' : location ? 'Location captured' : 'No location'}
          </Text>
          {location && (
            <Text style={styles.locationCoords}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={getLocation}>
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* College Selection */}
      <Text style={styles.sectionTitle}>Select College</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.collegeList}>
        {colleges.map((college) => (
          <TouchableOpacity
            key={college.id}
            style={[
              styles.collegeChip,
              selectedCollege === college.id && styles.collegeChipSelected,
            ]}
            onPress={() => setSelectedCollege(college.id)}
          >
            <Text
              style={[
                styles.collegeChipText,
                selectedCollege === college.id && styles.collegeChipTextSelected,
              ]}
              numberOfLines={1}
            >
              {college.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Purpose Selection */}
      <Text style={styles.sectionTitle}>Visit Purpose</Text>
      <View style={styles.purposeGrid}>
        {visitPurposes.map((purpose) => (
          <TouchableOpacity
            key={purpose.value}
            style={[
              styles.purposeCard,
              selectedPurpose === purpose.value && styles.purposeCardSelected,
            ]}
            onPress={() => setSelectedPurpose(purpose.value)}
          >
            <Text style={styles.purposeIcon}>{purpose.icon}</Text>
            <Text
              style={[
                styles.purposeLabel,
                selectedPurpose === purpose.value && styles.purposeLabelSelected,
              ]}
            >
              {purpose.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Check In Button */}
      <TouchableOpacity
        style={[styles.checkInBtn, (!selectedCollege || !selectedPurpose || !location) && styles.checkInBtnDisabled]}
        onPress={handleCheckIn}
        disabled={checkingIn || !selectedCollege || !selectedPurpose || !location}
      >
        {checkingIn ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.checkInBtnText}>Check In Now</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  locationCoords: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  refreshBtn: {
    padding: 8,
  },
  refreshBtnText: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  collegeList: {
    marginBottom: 20,
  },
  collegeChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  collegeChipSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  collegeChipText: {
    fontSize: 13,
    color: '#64748b',
    maxWidth: 150,
  },
  collegeChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  purposeCard: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  purposeCardSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  purposeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  purposeLabel: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
  },
  purposeLabelSelected: {
    color: '#10b981',
    fontWeight: '600',
  },
  checkInBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  checkInBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  checkInBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
