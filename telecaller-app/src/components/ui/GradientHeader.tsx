import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, typography, spacing, borderRadius } from '../../theme';
import Avatar from './Avatar';

interface GradientHeaderProps {
  greeting?: string;
  userName?: string;
  subtitle?: string;
  onAvatarPress?: () => void;
  gradientColors?: string[];
  rightIcon?: string;
  onRightPress?: () => void;
  children?: React.ReactNode;
}

const GradientHeader: React.FC<GradientHeaderProps> = ({
  greeting,
  userName,
  subtitle,
  onAvatarPress,
  gradientColors = [colors.primary[600], colors.primary[700]],
  rightIcon,
  onRightPress,
  children,
}) => {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={gradientColors[0]} />
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <View style={styles.container}>
          <View style={styles.topRow}>
            <View style={styles.leftContent}>
              {greeting && <Text style={styles.greeting}>{greeting}</Text>}
              {userName && <Text style={styles.userName}>{userName}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>

            <View style={styles.rightContent}>
              {rightIcon && onRightPress && (
                <TouchableOpacity onPress={onRightPress} style={styles.iconButton}>
                  <Icon name={rightIcon} size={24} color={colors.neutral[0]} />
                </TouchableOpacity>
              )}
              {onAvatarPress && (
                <TouchableOpacity onPress={onAvatarPress}>
                  <View style={styles.avatarContainer}>
                    <Avatar
                      name={userName || 'User'}
                      size="md"
                      backgroundColor={`${colors.neutral[0]}20`}
                      textColor={colors.neutral[0]}
                    />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {children && <View style={styles.childrenContainer}>{children}</View>}
        </View>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  gradient: {
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
  },
  container: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greeting: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: `${colors.neutral[0]}90`,
    marginBottom: 2,
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: `${colors.neutral[0]}80`,
    marginTop: spacing.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.neutral[0]}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: `${colors.neutral[0]}30`,
    borderRadius: 24,
    padding: 2,
  },
  childrenContainer: {
    marginTop: spacing.base,
  },
});

export default GradientHeader;
