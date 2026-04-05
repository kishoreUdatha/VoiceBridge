import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
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

interface StateOption {
  state: string;
  count?: number;
}

interface DistrictOption {
  district: string;
  state: string;
  count?: number;
}

interface CityOption {
  city: string;
  state: string;
  count?: number;
}

interface DropdownItem {
  label: string;
  value: string;
}

interface CustomDropdownProps {
  label: string;
  placeholder: string;
  value: string;
  items: DropdownItem[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

function CustomDropdown({ label, placeholder, value, items, onSelect, disabled, loading }: CustomDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedItem = items.find(item => item.value === value);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.dropdownButton, disabled && styles.dropdownDisabled]}
        onPress={() => !disabled && !loading && setModalVisible(true)}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#10b981" />
        ) : (
          <>
            <Text style={[styles.dropdownButtonText, !selectedItem && styles.dropdownPlaceholder]}>
              {selectedItem ? selectedItem.label : placeholder}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={items}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item.value === value && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      item.value === value && styles.modalItemTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function VisitCheckInScreen() {
  const navigation = useNavigation<any>();

  // Location hierarchy state
  const [states, setStates] = useState<StateOption[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);

  // Selected values
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [collegeName, setCollegeName] = useState<string>('');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('');

  // Loading states
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    fetchStates();
    getLocation();
  }, []);

  // Fetch districts when state changes
  useEffect(() => {
    if (selectedState) {
      fetchDistricts(selectedState);
      setSelectedDistrict('');
      setSelectedCity('');
      setDistricts([]);
      setCities([]);
    }
  }, [selectedState]);

  // Fetch cities when district changes
  useEffect(() => {
    if (selectedState && selectedDistrict) {
      fetchCities(selectedState, selectedDistrict);
      setSelectedCity('');
      setCities([]);
    }
  }, [selectedDistrict]);

  const fetchStates = async () => {
    setLoadingStates(true);
    try {
      const response = await collegeService.getStates();
      setStates(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch states:', error);
    } finally {
      setLoadingStates(false);
      setLoading(false);
    }
  };

  const fetchDistricts = async (state: string) => {
    setLoadingDistricts(true);
    try {
      const response = await collegeService.getDistricts(state);
      setDistricts(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch districts:', error);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const fetchCities = async (state: string, district: string) => {
    setLoadingCities(true);
    try {
      const response = await collegeService.getCities(state, district);
      setCities(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch cities:', error);
    } finally {
      setLoadingCities(false);
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
    if (!selectedState) {
      Alert.alert('Error', 'Please select a state');
      return;
    }
    if (!selectedDistrict) {
      Alert.alert('Error', 'Please select a district');
      return;
    }
    if (!selectedCity) {
      Alert.alert('Error', 'Please select a city');
      return;
    }
    if (!collegeName.trim()) {
      Alert.alert('Error', 'Please enter college name');
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
        collegeName: collegeName.trim(),
        state: selectedState,
        district: selectedDistrict,
        city: selectedCity,
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

  // Convert data to dropdown items
  const stateItems: DropdownItem[] = states.map(s => ({
    label: s.state,
    value: s.state,
  }));

  const districtItems: DropdownItem[] = districts.map(d => ({
    label: d.district,
    value: d.district,
  }));

  const cityItems: DropdownItem[] = cities.map(c => ({
    label: c.city,
    value: c.city,
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
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

      {/* Location Hierarchy Selection */}
      <Text style={styles.sectionTitle}>Select Location</Text>

      <CustomDropdown
        label="State"
        placeholder="Select State"
        value={selectedState}
        items={stateItems}
        onSelect={setSelectedState}
        loading={loadingStates}
      />

      <CustomDropdown
        label="District"
        placeholder={selectedState ? 'Select District' : 'Select State first'}
        value={selectedDistrict}
        items={districtItems}
        onSelect={setSelectedDistrict}
        disabled={!selectedState}
        loading={loadingDistricts}
      />

      <CustomDropdown
        label="City"
        placeholder={selectedDistrict ? 'Select City' : 'Select District first'}
        value={selectedCity}
        items={cityItems}
        onSelect={setSelectedCity}
        disabled={!selectedDistrict}
        loading={loadingCities}
      />

      {/* College Name Text Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.dropdownLabel}>College Name</Text>
        <TextInput
          style={[styles.textInput, !selectedCity && styles.textInputDisabled]}
          placeholder={selectedCity ? 'Enter college name' : 'Select City first'}
          placeholderTextColor="#94a3b8"
          value={collegeName}
          onChangeText={setCollegeName}
          editable={!!selectedCity}
        />
      </View>

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
        style={[styles.checkInBtn, (!collegeName.trim() || !selectedPurpose || !location || !selectedCity) && styles.checkInBtnDisabled]}
        onPress={handleCheckIn}
        disabled={checkingIn || !collegeName.trim() || !selectedPurpose || !location || !selectedCity}
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
    marginTop: 8,
  },
  dropdownContainer: {
    marginBottom: 12,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  dropdownButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownDisabled: {
    backgroundColor: '#f1f5f9',
    opacity: 0.6,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#94a3b8',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#64748b',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalClose: {
    fontSize: 18,
    color: '#64748b',
    padding: 4,
  },
  modalList: {
    paddingBottom: 20,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalItemSelected: {
    backgroundColor: '#ecfdf5',
  },
  modalItemText: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  modalItemTextSelected: {
    color: '#10b981',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '700',
  },
  inputContainer: {
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1e293b',
  },
  textInputDisabled: {
    backgroundColor: '#f1f5f9',
    opacity: 0.6,
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
