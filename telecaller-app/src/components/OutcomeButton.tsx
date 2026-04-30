import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CallOutcome } from '../types';
import { getOutcomeColor } from '../utils/formatters';

interface OutcomeButtonProps {
  outcome: CallOutcome;
  label: string;
  icon: string;
  color?: string; // Custom color from API
  selected?: boolean;
  onPress: (outcome: CallOutcome) => void;
  style?: ViewStyle;
}

const OutcomeButton: React.FC<OutcomeButtonProps> = ({
  outcome,
  label,
  icon,
  color: customColor,
  selected = false,
  onPress,
  style,
}) => {
  // Use custom color if provided, otherwise fall back to default
  const color = customColor || getOutcomeColor(outcome);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && { backgroundColor: color + '20', borderColor: color },
        style,
      ]}
      onPress={() => onPress(outcome)}
      activeOpacity={0.7}
    >
      <Icon
        name={icon}
        size={24}
        color={selected ? color : '#6B7280'}
        style={styles.icon}
      />
      <Text
        style={[
          styles.label,
          selected && { color: color, fontWeight: '600' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    margin: 4,
    minWidth: '45%',
  },
  icon: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
  },
});

export default OutcomeButton;
