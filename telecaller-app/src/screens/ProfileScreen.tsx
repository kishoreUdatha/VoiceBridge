import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import { useAppSelector, useAppDispatch } from '../store';
import { updateProfile, logout } from '../store/slices/authSlice';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    email: user?.email || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setIsSaving(true);
    try {
      await dispatch(updateProfile(formData)).unwrap();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => dispatch(logout()),
        },
      ],
      { cancelable: true }
    );
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'A password reset link will be sent to your email address.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: () => {
            // In a real app, this would trigger a password reset email
            Alert.alert('Success', 'Password reset link sent to your email');
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarText}>
              {`${user.firstName || ''} ${user.lastName || ''}`.trim().charAt(0).toUpperCase()}
            </Text>
          )}
          <TouchableOpacity style={styles.editAvatarButton}>
            <Icon name="camera" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{`${user.firstName || ''} ${user.lastName || ''}`.trim()}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user.role}</Text>
        </View>
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <TouchableOpacity
            onPress={() => {
              if (isEditing) {
                setFormData({
                  name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                  email: user.email,
                });
              }
              setIsEditing(!isEditing);
            }}
          >
            <Text style={styles.editButton}>
              {isEditing ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="account" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter name"
              />
            ) : (
              <Text style={styles.infoValue}>{`${user.firstName || ''} ${user.lastName || ''}`.trim()}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Icon name="email" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="shield-account" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{user.role}</Text>
          </View>

          <View style={[styles.infoRow, styles.lastInfoRow]}>
            <Icon name="calendar" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>Joined</Text>
            <Text style={styles.infoValue}>
              {new Date(user.createdAt).toLocaleDateString()}
            </Text>
          </View>

          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={handleChangePassword}>
            <Icon name="lock-reset" size={20} color="#6B7280" />
            <Text style={styles.actionText}>Change Password</Text>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('Settings' as any)}
          >
            <Icon name="cog" size={20} color="#6B7280" />
            <Text style={styles.actionText}>Settings</Text>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow}>
            <Icon name="bell" size={20} color="#6B7280" />
            <Text style={styles.actionText}>Notifications</Text>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.lastActionRow]}
            onPress={() => Alert.alert('Help', 'Contact support at support@example.com')}
          >
            <Icon name="help-circle" size={20} color="#6B7280" />
            <Text style={styles.actionText}>Help & Support</Text>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Performance Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Summary</Text>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>--</Text>
            <Text style={styles.statLabel}>Total Calls</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>--%</Text>
            <Text style={styles.statLabel}>Conversion</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>--</Text>
            <Text style={styles.statLabel}>Leads</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.viewAnalyticsButton}
          onPress={() => navigation.navigate('Analytics')}
        >
          <Text style={styles.viewAnalyticsText}>View Full Analytics</Text>
          <Icon name="arrow-right" size={16} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
  header: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
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
    color: '#1F2937',
  },
  editButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  lastInfoRow: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    textAlign: 'right',
  },
  infoInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  lastActionRow: {
    borderBottomWidth: 0,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  viewAnalyticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
    gap: 8,
  },
  viewAnalyticsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  bottomPadding: {
    height: 32,
  },
});

export default ProfileScreen;
