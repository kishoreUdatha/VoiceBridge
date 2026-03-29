/**
 * Notification Settings Screen
 * Allows users to configure push notification preferences
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useNotifications } from '../hooks/useNotifications';
import { NotificationSettings } from '../services/notificationService';

const NotificationSettingsScreen: React.FC = () => {
  const { settings, updateSettings, isInitialized } = useNotifications();
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggle = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    await updateSettings({ [key]: value });
  };

  const handleTimeChange = async (
    key: 'quietHoursStart' | 'quietHoursEnd',
    time: Date
  ) => {
    const timeString = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    const newSettings = { ...localSettings, [key]: timeString };
    setLocalSettings(newSettings);
    await updateSettings({ [key]: timeString });
  };

  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const SettingRow = ({
    icon,
    title,
    description,
    value,
    onToggle,
    disabled = false,
  }: {
    icon: string;
    title: string;
    description?: string;
    value: boolean;
    onToggle: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={styles.settingIcon}>
        <Icon name={icon} size={22} color={disabled ? '#9CA3AF' : '#374151'} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, disabled && styles.textDisabled]}>
          {title}
        </Text>
        {description && (
          <Text style={[styles.settingDescription, disabled && styles.textDisabled]}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
        thumbColor={value ? '#3B82F6' : '#F3F4F6'}
      />
    </View>
  );

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Master Toggle */}
      <View style={styles.section}>
        <View style={styles.masterToggle}>
          <View style={styles.masterContent}>
            <Icon
              name={localSettings.enabled ? 'bell' : 'bell-off'}
              size={28}
              color={localSettings.enabled ? '#3B82F6' : '#9CA3AF'}
            />
            <View style={styles.masterText}>
              <Text style={styles.masterTitle}>Push Notifications</Text>
              <Text style={styles.masterDescription}>
                {localSettings.enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          <Switch
            value={localSettings.enabled}
            onValueChange={(value) => handleToggle('enabled', value)}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={localSettings.enabled ? '#3B82F6' : '#F3F4F6'}
          />
        </View>
      </View>

      {/* Notification Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Types</Text>
        <View style={styles.sectionCard}>
          <SettingRow
            icon="clipboard-plus"
            title="New Assignments"
            description="When new data is assigned to you"
            value={localSettings.newAssignments}
            onToggle={(value) => handleToggle('newAssignments', value)}
            disabled={!localSettings.enabled}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="calendar-clock"
            title="Follow-up Reminders"
            description="Reminders for scheduled follow-ups"
            value={localSettings.followUpReminders}
            onToggle={(value) => handleToggle('followUpReminders', value)}
            disabled={!localSettings.enabled}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="phone-callback"
            title="Callback Reminders"
            description="Reminders for callback requests"
            value={localSettings.callbackReminders}
            onToggle={(value) => handleToggle('callbackReminders', value)}
            disabled={!localSettings.enabled}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="account-edit"
            title="Lead Updates"
            description="When leads you qualified are updated"
            value={localSettings.leadUpdates}
            onToggle={(value) => handleToggle('leadUpdates', value)}
            disabled={!localSettings.enabled}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="robot"
            title="AI Analysis Complete"
            description="When call analysis is ready"
            value={localSettings.aiAnalysis}
            onToggle={(value) => handleToggle('aiAnalysis', value)}
            disabled={!localSettings.enabled}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="chart-line"
            title="Performance Alerts"
            description="Daily performance summaries"
            value={localSettings.performanceAlerts}
            onToggle={(value) => handleToggle('performanceAlerts', value)}
            disabled={!localSettings.enabled}
          />
        </View>
      </View>

      {/* Sound & Vibration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sound & Vibration</Text>
        <View style={styles.sectionCard}>
          <SettingRow
            icon="volume-high"
            title="Sound"
            description="Play notification sounds"
            value={localSettings.sound}
            onToggle={(value) => handleToggle('sound', value)}
            disabled={!localSettings.enabled}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="vibrate"
            title="Vibration"
            description="Vibrate for notifications"
            value={localSettings.vibrate}
            onToggle={(value) => handleToggle('vibrate', value)}
            disabled={!localSettings.enabled}
          />
        </View>
      </View>

      {/* Quiet Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiet Hours</Text>
        <View style={styles.sectionCard}>
          <SettingRow
            icon="moon-waning-crescent"
            title="Enable Quiet Hours"
            description="Silence notifications during set hours"
            value={localSettings.quietHoursEnabled}
            onToggle={(value) => handleToggle('quietHoursEnabled', value)}
            disabled={!localSettings.enabled}
          />

          {localSettings.quietHoursEnabled && localSettings.enabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.timeRow}>
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Start</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Icon name="clock-outline" size={18} color="#3B82F6" />
                    <Text style={styles.timeValue}>
                      {formatTime(localSettings.quietHoursStart)}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Icon name="arrow-right" size={20} color="#9CA3AF" />
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>End</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Icon name="clock-outline" size={18} color="#3B82F6" />
                    <Text style={styles.timeValue}>
                      {formatTime(localSettings.quietHoursEnd)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Icon name="information" size={20} color="#6B7280" />
        <Text style={styles.infoText}>
          Notifications help you stay on top of your tasks and never miss a follow-up.
          You can customize which notifications you receive above.
        </Text>
      </View>

      <View style={{ height: 40 }} />

      {/* Time Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={parseTime(localSettings.quietHoursStart)}
          mode="time"
          display="spinner"
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) handleTimeChange('quietHoursStart', date);
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={parseTime(localSettings.quietHoursEnd)}
          mode="time"
          display="spinner"
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) handleTimeChange('quietHoursEnd', date);
          }}
        />
      )}
    </ScrollView>
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
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  masterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  masterText: {
    marginLeft: 16,
  },
  masterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  masterDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  textDisabled: {
    color: '#9CA3AF',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 68,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 16,
  },
  timeItem: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#3B82F6',
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginLeft: 12,
  },
});

export default NotificationSettingsScreen;
