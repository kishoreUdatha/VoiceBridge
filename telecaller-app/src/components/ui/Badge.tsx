import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, typography, borderRadius, spacing } from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  icon?: string;
  style?: ViewStyle;
  color?: string;
}

const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'sm',
  icon,
  style,
  color,
}) => {
  const getColors = () => {
    if (color) {
      return {
        bg: `${color}15`,
        text: color,
        icon: color,
      };
    }

    switch (variant) {
      case 'success':
        return {
          bg: colors.success[50],
          text: colors.success[700],
          icon: colors.success[500],
        };
      case 'warning':
        return {
          bg: colors.warning[50],
          text: colors.warning[700],
          icon: colors.warning[500],
        };
      case 'error':
        return {
          bg: colors.error[50],
          text: colors.error[700],
          icon: colors.error[500],
        };
      case 'info':
        return {
          bg: colors.primary[50],
          text: colors.primary[700],
          icon: colors.primary[500],
        };
      case 'neutral':
        return {
          bg: colors.neutral[100],
          text: colors.neutral[600],
          icon: colors.neutral[500],
        };
      default:
        return {
          bg: colors.primary[50],
          text: colors.primary[700],
          icon: colors.primary[500],
        };
    }
  };

  const colorScheme = getColors();

  return (
    <View
      style={[
        styles.container,
        styles[size],
        { backgroundColor: colorScheme.bg },
        style,
      ]}
    >
      {icon && (
        <Icon
          name={icon}
          size={size === 'sm' ? 12 : 14}
          color={colorScheme.icon}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          styles[`text_${size}`],
          { color: colorScheme.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: typography.fontWeight.semiBold,
  },
  text_sm: {
    fontSize: 10,
  },
  text_md: {
    fontSize: typography.fontSize.sm,
  },
});

export default Badge;
