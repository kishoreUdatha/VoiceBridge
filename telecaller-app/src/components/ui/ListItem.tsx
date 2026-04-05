import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, typography, spacing } from '../../theme';

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  leftIconColor?: string;
  leftIconBgColor?: string;
  rightIcon?: string;
  rightText?: string;
  badge?: React.ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
  style?: ViewStyle;
}

const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  leftIcon,
  leftIconColor = colors.text.secondary,
  leftIconBgColor,
  rightIcon = 'chevron-right',
  rightText,
  badge,
  onPress,
  showDivider = true,
  style,
}) => {
  const content = (
    <View style={[styles.container, !showDivider && styles.noDivider, style]}>
      {leftIcon && (
        <View
          style={[
            styles.leftIconContainer,
            leftIconBgColor && { backgroundColor: leftIconBgColor },
          ]}
        >
          <Icon name={leftIcon} size={22} color={leftIconColor} />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightSection}>
        {badge}
        {rightText && <Text style={styles.rightText}>{rightText}</Text>}
        {onPress && rightIcon && (
          <Icon name={rightIcon} size={20} color={colors.text.tertiary} />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  noDivider: {
    borderBottomWidth: 0,
  },
  leftIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    backgroundColor: colors.neutral[100],
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rightText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
});

export default ListItem;
