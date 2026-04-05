import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, typography, spacing, shadows } from '../../theme';
import Avatar from './Avatar';

interface HeaderProps {
  title?: string;
  greeting?: string;
  userName?: string;
  showAvatar?: boolean;
  onAvatarPress?: () => void;
  leftIcon?: string;
  onLeftPress?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
  rightComponent?: React.ReactNode;
  variant?: 'default' | 'transparent' | 'elevated';
  statusBarStyle?: 'dark-content' | 'light-content';
}

const Header: React.FC<HeaderProps> = ({
  title,
  greeting,
  userName,
  showAvatar = false,
  onAvatarPress,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
  rightComponent,
  variant = 'default',
  statusBarStyle = 'dark-content',
}) => {
  const headerStyle = [
    styles.container,
    variant === 'elevated' && styles.elevated,
    variant === 'transparent' && styles.transparent,
  ];

  return (
    <>
      <StatusBar
        backgroundColor={variant === 'transparent' ? 'transparent' : colors.background.primary}
        barStyle={statusBarStyle}
        translucent={variant === 'transparent'}
      />
      <View style={headerStyle}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          {leftIcon && (
            <TouchableOpacity onPress={onLeftPress} style={styles.iconButton}>
              <Icon name={leftIcon} size={24} color={colors.text.primary} />
            </TouchableOpacity>
          )}
          {greeting && userName && (
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
          )}
          {title && !greeting && <Text style={styles.title}>{title}</Text>}
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          {rightComponent}
          {rightIcon && (
            <TouchableOpacity onPress={onRightPress} style={styles.iconButton}>
              <Icon name={rightIcon} size={24} color={colors.text.primary} />
            </TouchableOpacity>
          )}
          {showAvatar && (
            <TouchableOpacity onPress={onAvatarPress}>
              <Avatar
                name={userName || 'User'}
                size="md"
                backgroundColor={colors.primary[500]}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  elevated: {
    ...shadows.md,
    borderBottomWidth: 0,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  greeting: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: 2,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
});

export default Header;
