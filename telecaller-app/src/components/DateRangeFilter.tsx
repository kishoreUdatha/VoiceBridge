import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

export type DateRangeType = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'custom' | 'all';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangeFilterProps {
  selectedRange: DateRangeType;
  onRangeChange: (range: DateRangeType, dates?: DateRange) => void;
  customDates?: DateRange;
}

interface FilterOption {
  key: DateRangeType;
  label: string;
  icon: string;
  color: string;
}

const DATE_FILTERS: FilterOption[] = [
  { key: 'all', label: 'All Time', icon: 'infinity', color: '#6366F1' },
  { key: 'today', label: 'Today', icon: 'calendar-today', color: '#10B981' },
  { key: 'yesterday', label: 'Yesterday', icon: 'calendar-minus', color: '#F59E0B' },
  { key: 'thisWeek', label: 'This Week', icon: 'calendar-week', color: '#3B82F6' },
  { key: 'thisMonth', label: 'This Month', icon: 'calendar-month', color: '#8B5CF6' },
  { key: 'custom', label: 'Custom', icon: 'calendar-range', color: '#EC4899' },
];

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  selectedRange,
  onRangeChange,
  customDates,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickingDate, setPickingDate] = useState<'start' | 'end'>('start');
  const [tempStartDate, setTempStartDate] = useState<Date>(customDates?.startDate || new Date());
  const [tempEndDate, setTempEndDate] = useState<Date>(customDates?.endDate || new Date());

  const handleFilterSelect = (key: DateRangeType) => {
    if (key === 'custom') {
      setShowDatePicker(true);
      setPickingDate('start');
    } else {
      onRangeChange(key);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      if (pickingDate === 'start') {
        setTempStartDate(selectedDate);
        setPickingDate('end');
      } else {
        setTempEndDate(selectedDate);
        setShowDatePicker(false);
        onRangeChange('custom', {
          startDate: tempStartDate,
          endDate: selectedDate,
        });
      }
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSelectedLabel = () => {
    if (selectedRange === 'custom' && customDates?.startDate && customDates?.endDate) {
      return `${formatDate(customDates.startDate)} - ${formatDate(customDates.endDate)}`;
    }
    return DATE_FILTERS.find(f => f.key === selectedRange)?.label || 'All Time';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersList}
      >
        {DATE_FILTERS.map((filter) => {
          const isActive = selectedRange === filter.key;

          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                isActive && { backgroundColor: filter.color + '15', borderColor: filter.color },
              ]}
              onPress={() => handleFilterSelect(filter.key)}
            >
              <Icon
                name={filter.icon}
                size={14}
                color={isActive ? filter.color : '#6B7280'}
              />
              <Text
                style={[
                  styles.filterTabText,
                  isActive && { color: filter.color, fontWeight: '600' },
                ]}
              >
                {filter.key === 'custom' && selectedRange === 'custom' && customDates?.startDate
                  ? getSelectedLabel()
                  : filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {showDatePicker && (
        <Modal transparent animationType="fade" visible={showDatePicker}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {pickingDate === 'start' ? 'Select Start Date' : 'Select End Date'}
              </Text>
              <DateTimePicker
                value={pickingDate === 'start' ? tempStartDate : tempEndDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersList: {
    paddingHorizontal: 12,
    gap: 6,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
    gap: 4,
  },
  filterTabText: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

export default DateRangeFilter;
