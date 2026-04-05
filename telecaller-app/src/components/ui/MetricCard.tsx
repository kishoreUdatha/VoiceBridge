import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, typography, borderRadius, spacing, shadows } from '../../theme';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  trend?: number;
  trendLabel?: string;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'gradient' | 'outlined';
  gradientColors?: string[];
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconColor = colors.primary[500],
  trend,
  trendLabel,
  onPress,
  style,
  variant = 'default',
}) => {
  const isPositive = trend !== undefined && trend >= 0;

  const content = (
    <>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
            <Icon name={icon} size={20} color={iconColor} />
          </View>
        )}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      <Text style={styles.value}>{value}</Text>

      <View style={styles.footer}>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {trend !== undefined && (
          <View style={styles.trendContainer}>
            <Icon
              name={isPositive ? 'trending-up' : 'trending-down'}
              size={14}
              color={isPositive ? colors.success[500] : colors.error[500]}
            />
            <Text
              style={[
                styles.trendText,
                { color: isPositive ? colors.success[600] : colors.error[600] },
              ]}
            >
              {Math.abs(trend)}%{trendLabel && ` ${trendLabel}`}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  const cardStyle = [
    styles.container,
    variant === 'outlined' && styles.outlined,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    ...shadows.md,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.none,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  value: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  trendText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    marginLeft: 2,
  },
});

export default MetricCard;
