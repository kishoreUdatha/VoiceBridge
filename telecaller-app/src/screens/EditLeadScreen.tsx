import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, LeadStatus, LeadFormData } from '../types';
import { useAppSelector, useAppDispatch } from '../store';
import { fetchLeadById, updateLead } from '../store/slices/leadsSlice';

type Props = NativeStackScreenProps<RootStackParamList, 'EditLead'>;

const STATUS_OPTIONS: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'NEGOTIATION',
  'CONVERTED',
  'LOST',
];

const SOURCE_OPTIONS = [
  'Website',
  'Referral',
  'Cold Call',
  'Social Media',
  'Advertisement',
  'Trade Show',
  'Email Campaign',
  'Other',
];

const EditLeadScreen: React.FC<Props> = ({ route, navigation }) => {
  const { leadId } = route.params;
  const dispatch = useAppDispatch();
  const { selectedLead, isLoading } = useAppSelector((state) => state.leads);

  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    phone: '',
    email: '',
    company: '',
    source: '',
    notes: '',
    status: 'NEW',
  });
  const [errors, setErrors] = useState<Partial<LeadFormData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  useEffect(() => {
    dispatch(fetchLeadById(leadId));
  }, [dispatch, leadId]);

  useEffect(() => {
    if (selectedLead) {
      setFormData({
        name: selectedLead.name,
        phone: selectedLead.phone,
        email: selectedLead.email || '',
        company: selectedLead.company || '',
        source: selectedLead.source || '',
        notes: selectedLead.notes || '',
        status: selectedLead.status,
      });
    }
  }, [selectedLead]);

  const validateForm = (): boolean => {
    const newErrors: Partial<LeadFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[+]?[\d\s-]{10,}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Invalid phone number';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await dispatch(updateLead({ leadId, data: formData })).unwrap();
      Alert.alert('Success', 'Lead updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update lead. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof LeadFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (isLoading && !selectedLead) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Name Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Name *</Text>
          <View style={[styles.inputContainer, errors.name ? styles.inputError : undefined]}>
            <Icon name="account" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              placeholder="Enter name"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Phone Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Phone *</Text>
          <View style={[styles.inputContainer, errors.phone ? styles.inputError : undefined]}>
            <Icon name="phone" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(value) => updateField('phone', value)}
              placeholder="Enter phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        {/* Email Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputContainer, errors.email ? styles.inputError : undefined]}>
            <Icon name="email" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              placeholder="Enter email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        {/* Company Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Company</Text>
          <View style={styles.inputContainer}>
            <Icon name="domain" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={formData.company}
              onChangeText={(value) => updateField('company', value)}
              placeholder="Enter company name"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Status Picker */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Status</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowStatusPicker(!showStatusPicker)}
          >
            <Icon name="tag" size={20} color="#6B7280" style={styles.inputIcon} />
            <Text style={styles.pickerText}>{formData.status}</Text>
            <Icon
              name={showStatusPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
          {showStatusPicker && (
            <View style={styles.optionsList}>
              {STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.optionItem,
                    formData.status === status && styles.optionItemActive,
                  ]}
                  onPress={() => {
                    updateField('status', status);
                    setShowStatusPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.status === status && styles.optionTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Source Picker */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Source</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowSourcePicker(!showSourcePicker)}
          >
            <Icon name="earth" size={20} color="#6B7280" style={styles.inputIcon} />
            <Text style={[styles.pickerText, !formData.source && styles.placeholderText]}>
              {formData.source || 'Select source'}
            </Text>
            <Icon
              name={showSourcePicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
          {showSourcePicker && (
            <View style={styles.optionsList}>
              {SOURCE_OPTIONS.map((source) => (
                <TouchableOpacity
                  key={source}
                  style={[
                    styles.optionItem,
                    formData.source === source && styles.optionItemActive,
                  ]}
                  onPress={() => {
                    updateField('source', source);
                    setShowSourcePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.source === source && styles.optionTextActive,
                    ]}
                  >
                    {source}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Notes Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Notes</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(value) => updateField('notes', value)}
              placeholder="Add notes about this lead..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="content-save" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 14,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 0,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  optionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
    overflow: 'hidden',
  },
  optionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionItemActive: {
    backgroundColor: '#EBF5FF',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
  },
  optionTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});

export default EditLeadScreen;
